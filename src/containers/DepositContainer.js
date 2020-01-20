import React from 'react';
import Web3 from "web3";
import { withStore } from '@spyna/react-store'
import { withStyles } from '@material-ui/styles';
import theme from '../theme/theme'
import config from '../utils/config.js'
import adapterGsnABI from '../utils/adapterGsnABI.json'

import classNames from 'classnames'

import BigNumber from "bignumber.js";
import RenJS from "@renproject/ren";
import GatewayJS from "@renproject/gateway-js";

import AccountIcon from '@material-ui/icons/AccountCircle';
import WifiIcon from '@material-ui/icons/Wifi';


import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import Backdrop from '@material-ui/core/Backdrop';
import Fade from '@material-ui/core/Fade';


import {
  fromConnection,
  ephemeral
} from "@openzeppelin/network/lib";

const REACT_APP_TX_FEE = process.env.REACT_APP_TX_FEE || 90;
const signKey = ephemeral();
const gasPrice = 22000000000;
const relay_client_config = {
  txfee: REACT_APP_TX_FEE,
  force_gasPrice: gasPrice, //override requested gas price
  gasPrice: gasPrice, //override requested gas price
  force_gasLimit: 500000, //override requested gas limit.
  gasLimit: 500000, //override requested gas limit.
  verbose: true
};

console.log('signKey', signKey)

const ShiftInStatus = {
    Committed: "shiftIn_committed",
    Deposited: "shiftIn_deposited",
    SubmittedToRenVM: "shiftIn_submittedToRenVM",
    ReturnedFromRenVM: "shiftIn_returnedFromRenVM",
    SubmittedToEthereum: "shiftIn_submittedToEthereum",
    ConfirmedOnEthereum: "shiftIn_confirmedOnEthereum",
    RefundedOnEthereum: "shiftIn_refundedOnEthereum",
}


const styles = () => ({
  root: {
    flexGrow: 1,
  },
  paper: {
  },
  navContainer: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(3),
    minHeight: 52
  },
  contentContainer: {
      boxShadow: '0px 0px 30px 0px rgba(0, 0, 0, 0.05)',
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(3),
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(3),
      // '& input': {
      //     marginBottom: theme.spacing(1)
      // }
  },
  gateway: {
      marginTop: theme.spacing(2)
  },
  status: {
      fontSize: 14
  },
  unfinished: {
      marginTop: theme.spacing(2)
  },
  input: {
       marginBottom: theme.spacing(3)
  }
})

class DepositContainer extends React.Component {

    constructor(props) {
        super(props);
    }

    async componentDidMount() {
        const { store } = this.props

        const web3Context = await fromConnection(
            "https://kovan.infura.io/v3/7be66f167c2e4a05981e2ffc4653dec2",
            {
                gsn: { signKey, ...relay_client_config }
            }
        )

        store.set('web3Context', web3Context)

        function updateNetwork(networkId, networkName) {}
        function updateAccounts(accounts) {}
        function updateConnection(connected) {}

        const gw = new GatewayJS('testnet');
        const ren = new RenJS('testnet');

        store.set('gw', gw)
        store.set('ren', ren)
        // Recover in-progress shift-ins
        const unfinishedTrades = await gw.getGateways();
        store.set('unfinishedTrades', Array.from(unfinishedTrades.values()))
    }

    async start() {
        const { store } = this.props
        const gw = store.get('gw')
        const amount = new BigNumber(store.get('amount'))
        const address = store.get('address')
        const web3Context = store.get('web3Context')

        console.log(amount, address)

        const response = await gw.open({
            // Send BTC from the Bitcoin blockchain to the Ethereum blockchain.
            // TODO: Expose from GatewayJS
            sendToken: RenJS.Tokens.BTC.Btc2Eth,

            // Amount of BTC we are sending (in Satoshis)
            sendAmount: amount.times(10 ** 8).toNumber(), // Convert to Satoshis

            // The contract we want to interact with
            sendTo: config.adapterGsnAddress,

            // The name of the function we want to call
            contractFn: "addVestingSchedule",

            // TODO: Expose from GatewayJS
            nonce: RenJS.utils.randomNonce(),

            // Arguments expected for calling `deposit`
            contractParams: [
                {
                    name: "_beneficiary",
                    type: "bytes",
                    value: web3Context.lib.utils.fromAscii(address),
                },
                {
                    name: "_startTime",
                    type: "uint256",
                    value: 1579491027,
                },
                {
                    name: "_duration",
                    type: "uint16",
                    value: 60,
                }
            ],
        });
    }

    async resume(trade) {
        const { store } = this.props
        const gw = store.get('gw')
        const ren = store.get('ren')
        const { lib, accounts } = store.get('web3Context');

        console.log(trade);

        // use gatway gs
        const responsePromise = gw.open(trade.commitment);

        // submit using gsn
        // if (trade.status === "shiftIn_returnedFromRenVM") {
        //     const adapterGsnContract = new lib.eth.Contract(adapterGsnABI, config.adapterGsnAddress)
        //
        //     const shiftIn = ren.shiftIn({
        //         messageID: trade.messageID,
        //         sendTo: trade.commitment.sendTo,
        //         contractFn: trade.commitment.contractFn,
        //         contractParams: trade.commitment.contractParams
        //     })
        //
        //     const deposit = await shiftIn.waitForDeposit(2)
        //     const renvmResponse = await deposit.submitToRenVM()
        //
        //     console.log(deposit, renvmResponse, adapterGsnContract)
        //
        //     const result = await adapterGsnContract.methods.addVestingSchedule(
        //         trade.commitment.contractParams[0].value,
        //         trade.commitment.contractParams[1].value,
        //         trade.commitment.contractParams[2].value,
        //         trade.commitment.sendAmount,
        //         renvmResponse.response.args.nhash,
        //         renvmResponse.signature
        //     ).send({
        //         from: accounts[0]
        //     })
        //
        //     console.log('result', result)
        // }

        store.set('gatewayJsOpen', true)
    }

    async claim(trade){
        const { store } = this.props
        const { lib, accounts } = store.get('web3Context');

        console.log(trade)

        // const adapterGsnContract = new lib.eth.Contract(adapterGsnABI, config.adapterGsnAddress)
        //
        // const result = await adapterGsnContract.methods.claim(
        //     trade.commitment.contractParams[0].value
        // ).send({
        //     from: accounts[0]
        // })
        //
        // console.log('result', result)
    }

    render() {
        const {
            classes,
            store
        } = this.props

        const {
            address,
            amount,
            gateway,
            gatewayJsOpen,
            unfinishedTrades,
            web3Context,
            txHash,
            status
        } = store.getState()

        console.log(store.getState())

        return <Grid container>
            <Grid item xs={12}>

            </Grid>


            <Grid item xs={12} className={classes.contentContainer}>
                <Grid container direction='column'>
                    <Grid item xs={12}>
                        <TextField className={classes.input} onChange={(e) => { store.set('amount', e.target.value) }} placeholder="Stream Amount" variant="outlined" />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField className={classes.input} onChange={(e) => { store.set('address', e.target.value) }} placeholder="Destination Address" variant="outlined" />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField className={classes.input} placeholder="End stream in" variant="outlined" />
                    </Grid>
                    <Grid item xs={12}>
                        <Button size={'large'} variant='contained'color='primary' onClick={this.start.bind(this)}>Next</Button>
                    </Grid>
                    {gateway && <React.Fragment><Grid className={classes.gateway} item xs={12}>
                            {gateway}
                        </Grid>
                        <Grid className={classes.status} item xs={12}>
                            {status === 'complete' ? <span>
                                Swap submitted! <a href={'https://kovan.etherscan.io/tx/' + txHash} target='_blank'>View transaction</a>
                            </span> : <span>Waiting for {amount} BTC sent to gateway...</span>}
                        </Grid></React.Fragment>}

                    <Grid item xs={12} className={classes.unfinished}>
                        {unfinishedTrades.length ? unfinishedTrades.map((trade, index) => {
                            return <Grid container key={index} direction='row'>
                                <Grid item xs={6}>
                                    {trade.commitment.sendAmount / (10 ** 8)} BTC
                                </Grid>
                                <Grid item xs={6}>
                                    <button onClick={() => {
                                        this.resume.bind(this)(trade)
                                    }}>Resume</button>
                                    <button onClick={() => {
                                        this.claim.bind(this)(trade)
                                    }}>Claim</button>
                                </Grid>
                            </Grid>
                        }) : null}
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    }
}

export default withStyles(styles)(withStore(DepositContainer))
