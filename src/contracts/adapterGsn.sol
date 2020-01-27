pragma solidity 0.5.12;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/Math.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/ownership/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/GSN/GSNRecipient.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-sdk/blob/master/packages/lib/contracts/Initializable.sol";

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
}

interface IShifter {
    function shiftIn(bytes32 _pHash, uint256 _amount, bytes32 _nHash, bytes calldata _sig) external returns (uint256);
    function shiftOut(bytes calldata _to, uint256 _amount) external returns (uint256);
}

interface ShifterRegistry {
    function getShifterBySymbol(string calldata _tokenSymbol) external view returns (IShifter);
    function getShifterByToken(address  _tokenAddress) external view returns (IShifter);
    function getTokenBySymbol(string calldata _tokenSymbol) external view returns (IERC20);
}

contract Vesting is GSNRecipient {
    using SafeMath for uint256;

    ShifterRegistry public registry;

    uint256 private constant SECONDS_PER_MONTH = 365 days / 12;
    uint256 private constant SECONDS_PER_MINUTE = 1 minutes;

    /// @notice Defines the fields required for a vesting schedule.
    struct VestingSchedule {
        // Unique id
        uint256 id;

        // The start time (in seconds since Unix epoch) at which the vesting
        // period should begin.
        uint256 startTime;

        // The number of minutes for the vesting period.
        uint16 duration;

        // The total amount of Bitcoin apart of the vesting schedule.
        uint256 amount;

        // The number of minutes claimed by the user.
        uint256 minutesClaimed;

        // The total amount of Bitcoin claimed by the user.
        uint256 amountClaimed;
    }

    uint256 public latestScheduleId;

    /// @notice Mapping of a beneficiary address to a vesting schedule. Each
    //          beneficiary can have a maximum of 1 vesting schedule.
    mapping (bytes => VestingSchedule) public schedules;

    /// @notice Mapping of a stream id to a beneficiary address. Each
    //          beneficiary can have a maximum of 1 vesting schedule.
    mapping (uint256 => bytes) public schedulesToBeneficiaries;

    /// @notice The contract constructor.
    /// @param _registry The Shifter registry contract address.
    constructor(ShifterRegistry _registry) public {
        registry = _registry;
        latestScheduleId = 0;
    }

    function acceptRelayedCall(
        address,
        address,
        bytes calldata,
        uint256,
        uint256,
        uint256,
        uint256,
        bytes calldata,
        uint256
    ) external view returns (uint256, bytes memory) {
        return _approveRelayedCall();
    }

    /// @notice Add a vesting schedule for a beneficiary.
    /// @param _amount The amount of Bitcoin provided to the Darknodes in Sats.
    /// @param _nHash The hash of the nonce returned by the Darknodes.
    /// @param _sig The signature returned by the Darknodes.
    /// @param _beneficiary The address of the recipient entitled to claim the vested tokens.
    /// @param _startTime The start time (in seconds since Unix epoch) at which the vesting
    ///                   period should begin.
    /// @param _duration The number of months for the vesting period.
    function addVestingSchedule(
        // Payload
        bytes calldata _beneficiary,
        uint256        _startTime,
        uint16         _duration,
        // Required
        uint256        _amount,
        bytes32        _nHash,
        bytes calldata _sig
    ) external {
        require(schedules[_beneficiary].startTime == 0, "vesting schedule already exists");
        require(_amount > 0, "amount must be greater than 0");
        require(_duration > 0, "duration must be at least 1 month");

        // Construct the payload hash and mint new tokens using the Shifter
        // contract. This will verify the signature to ensure the Darknodes have
        // received the Bitcoin.
        bytes32 pHash = keccak256(abi.encode(_beneficiary, _startTime, _duration));
        uint256 finalAmount = registry.getShifterBySymbol("zBTC").shiftIn(pHash, _amount, _nHash, _sig);

        require(finalAmount > 0, "bitcoin shifted must be greater than 0");

        latestScheduleId = latestScheduleId + 1;

        // Construct a vesting schedule and assign it to the beneficiary.
        VestingSchedule memory schedule = VestingSchedule({
            id: latestScheduleId,
            startTime: _startTime == 0 ? now : _startTime,
            duration: _duration,
            amount: finalAmount,
            minutesClaimed: 0,
            amountClaimed: 0
        });

        schedules[_beneficiary] = schedule;
        schedulesToBeneficiaries[schedule.id] = _beneficiary;
    }

    function _preRelayedCall(bytes memory context) internal returns (bytes32) {
    }

    function _postRelayedCall(bytes memory context, bool, uint256 actualCharge, bytes32) internal {
    }

    /// @notice Allows a beneficiary to withdraw their vested Bitcoin.
    /// @param _to The Bitcoin address to which the beneficiary will receive
    ///            their Bitcoin.
    function claim(bytes calldata _to) external {
        // Calculate the claimable amount for the caller of the function.
        uint256 minutesClaimable;
        uint256 amountClaimable;
        (minutesClaimable, amountClaimable) = calculateClaimable(_to);

        require(amountClaimable > 0, "no amount claimable");

        // Update the claimed details in the vesting schedule.
        VestingSchedule storage schedule = schedules[_to];
        schedule.minutesClaimed = schedule.minutesClaimed.add(minutesClaimable);
        schedule.amountClaimed = schedule.amountClaimed.add(amountClaimable);

        // Shift out the tokens using the Shifter contract. This will burn the
        // tokens after taking a fee. The Darknodes will watch for this event to
        // transfer the user the Bitcoin.
        registry.getShifterBySymbol("zBTC").shiftOut(_to, amountClaimable);
    }

    /// @notice Retrieves the claimable amount for a given beneficiary.
    /// @param _to The Ethereum address of the beneficiary.
    function calculateClaimable(bytes memory _to) public view returns (uint256, uint256) {
        VestingSchedule storage schedule = schedules[_to];

        // Return if the vesting schedule does not exist or has not yet started.
        if (schedule.amount == 0 || now < schedule.startTime) {
            return (0, 0);
        }

        // Calculate the months elapsed since the start of the vesting period.
        uint256 elapsedTime = now.sub(schedule.startTime);
        uint256 elapsedMinutes = elapsedTime.div(SECONDS_PER_MINUTE);

        // Calculate the months elapsed and amount claimable since the last
        // claim attempt.
        uint256 minutesClaimable = Math.min(schedule.duration, elapsedMinutes).sub(schedule.minutesClaimed);
        uint256 amountClaimable = schedule.amount.mul(minutesClaimable).div(schedule.duration);

        return (minutesClaimable, amountClaimable);
    }
}
