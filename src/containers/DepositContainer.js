import React from 'react';
import { withStore } from '@spyna/react-store'
import { withStyles } from '@material-ui/styles';
import theme from '../theme/theme'
import classNames from 'classnames'
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
// import Tabs from '@material-ui/core/Tabs';
// import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import InputAdornment from '@material-ui/core/InputAdornment';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Switch from '@material-ui/core/Switch';
import CircularProgress from '@material-ui/core/CircularProgress';
import LinearProgress from '@material-ui/core/LinearProgress';


import BigNumber from "bignumber.js";
import RenJS from "@renproject/ren";

import {
    fromConnection,
    ephemeral
} from "@openzeppelin/network/lib";

import {
    initDeposit,
    initMonitoring,
    initInstantMonitoring,
    removeTx,
    initInstantSwap
} from '../utils/txUtils'

const REACT_APP_TX_FEE = 100;
const signKey = ephemeral();
const gasPrice = 2000000000;
const relay_client_config = {
  txfee: REACT_APP_TX_FEE,
  force_gasPrice: gasPrice, //override requested gas price
  gasPrice: gasPrice, //override requested gas price
  force_gasLimit: 500000, //override requested gas limit.
  gasLimit: 500000, //override requested gas limit.
  verbose: true
};
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
      border: '1px solid #eee',
      padding: theme.spacing(3),
      marginTop: theme.spacing(4),
      marginBottom: theme.spacing(3),
      '& input': {
      }
  },
  input: {
      marginBottom: theme.spacing(2),
      width: '100%',
      '& input': {
          fontSize: 12
      },
      '& p': {
          fontSize: 12
      },
      // '& .MuiOutlinedInput-notchedOutline': {
      //     borderColor: 'rgba(0, 0, 0, 0.5) !important'
      // }
  },
  amountContainer: {
    // paddingRight: theme.spacing(1)
  },
  amount: {
  },
  title: {
      fontSize: 16,
      fontWeight: 500,
      marginTop: theme.spacing(4),
      fontWeight: 'bold'
  },
  unfinished: {
      // marginTop: theme.spacing(3)
  },
  depositItem: {
      fontSize: 12,
      marginBottom: theme.spacing(1)
  },
  depositStatus: {
      display: 'flex',
      justifyContent: 'space-between'
  },
  info: {
      fontSize: 12,
      marginBottom: theme.spacing(1),
      '& p': {
          marginBottom: 0
      }
  },
  divider: {
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(3)
  },
  desc: {
      marginBottom: theme.spacing(3),
      fontSize: 14,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
  },
  btcLink: {
      fontSize: 12
  },
  viewLink: {
      fontSize: 12,
      marginRight: theme.spacing(1),
  },
  actionTabs: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2)
  },
  swapButtonContainer: {
      textAlign: 'center',
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1)
  },
  switchContainer: {
      textAlign: 'center',
      paddingBottom: theme.spacing(1),
      '& .MuiFormControlLabel-label': {
          fontSize: 12
      }
  },
  swapButton: {
  },
  navTab: {
      textAlign: 'center',
      padding: theme.spacing(3),
      cursor: 'pointer'
  },
  spinner: {
      position: 'relative',
      margin: '0px auto',
      width: 24,
      marginBottom: theme.spacing(2)
  },
  spinnerTop: {
      color: '#eee',
  },
  spinnerBottom: {
      color: theme.palette.primary.main,
      animationDuration: '550ms',
      position: 'absolute',
      left: 0,
  },
  progress: {
      position: 'relative',
      margin: '0px auto',
      width: 250,
      // marginBottom: theme.spacing(2)
  },
  progressTop: {
      color: '#eee',
  },
  progressMiddle: {
      color: '#63ccff78',
      animationDuration: '550ms',
      position: 'absolute',
      left: 0,
  },
  progressBottom: {
      color: theme.palette.primary.main,
      animationDuration: '550ms',
      position: 'absolute',
      left: 0,
  },
  progressContainer: {
      position: 'relative',
      marginBottom: theme.spacing(4)
  },
  progressText: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      '& p': {
          margin: '0px'
      }
      // paddingTop: theme.spacing(5)
  },
  awaitingStatus: {
      textAlign: 'center',
      paddingBottom: theme.spacing(4),
      fontSize: 12
  },
  claimButton: {
      // margin: '0px auto'
      textAlign: 'center',
      paddingBottom: theme.spacing(3)
  },
  streamHeader: {
      textAlign: 'center',
      paddingBottom: theme.spacing(4)
  },
  date: {
      fontSize: 12
  },
  totalStreamed: {
      fontSize: 24,
      paddingBottom: theme.spacing(2)
  }
})

class Ellipsis extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            string: ''
        }
        this.interval = null
    }

    componentDidMount() {
        this.interval = setInterval(() => {
            const string = this.state.string
            if (string.length < 3) {
                this.setState({ string: (string + '.') })
            } else {
                this.setState({ string: '' })
            }
        }, 500);
    }

    componentWillUnmount() {
        clearInterval(this.interval)
    }

    render() {
        return <span>{this.state.string}</span>
    }
}

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
        store.set('web3', web3Context.lib)

        const sdk = new RenJS('testnet')
        store.set('sdk', sdk)

        const txs = localStorage.getItem('transactions')

        if (txs) {
            store.set('transactions', JSON.parse(txs))
        }

        // monitor normal swaps
        initMonitoring.bind(this)()

        // monitor instant swaps
        initInstantMonitoring.bind(this)()
    }

    componentWillUnmount() {
        clearInterval(this.swapMonitor)
    }

    async start() {
        const { store } = this.props
        const amount = store.get('amount')
        const address = store.get('address')
        const transactions = store.get('transactions')

        const tx = {
            id: Math.random(),
            type: 'deposit',
            instant: false,
            awaiting: 'btc-init',
            source: 'btc',
            dest: 'eth',
            destAddress: address,
            amount: amount,
            error: false,
            txHash: ''
        }

        store.set('activeStreamView', 'awaiting-init')

        // initDeposit.bind(this)(tx)
    }

    async startInstant() {
        const { store } = this.props
        const amount = store.get('amount')
        const address = store.get('address')
        const transactions = store.get('transactions')

        const tx = {
            id: Math.random(),
            type: 'deposit',
            instant: true,
            awaiting: 'btc-init',
            source: 'btc',
            dest: 'eth',
            destAddress: address,
            amount: amount,
            error: false,
            txHash: ''
        }

        // initInstantSwap.bind(this)(tx)
    }

    render() {
        const {
            classes,
            store
        } = this.props

        const {
            transactions,
            adapterAddress,
            selectedTab,
            instantSwapSelected,
            amount,
            address,
            activeStreamView
        } = store.getState()

        console.log(store.getState())

        // const disabled = amount < 0.0001 || (amount > 0.0005 && instantSwapSelected) || !address
        const disabled = false

        return <Grid container>
            <Typography variant={'h1'} className={classes.title}>Overflow</Typography>

            <Grid item xs={12} className={classes.contentContainer}>
                <Grid container direction='column'>
                    <Grid className={classes.desc} item xs={12}>
                        <Grid container>
                            <Grid className={classes.navTab} item xs={6} onClick={() => store.set('selectedTab', 'stream')}>
                                {selectedTab === 'stream' ? <b>Stream</b> : <span>Stream</span>}
                            </Grid>
                            <Grid className={classes.navTab} item xs={6} onClick={() => store.set('selectedTab', 'monitor')}>
                                {selectedTab === 'monitor' ? <b>Monitor</b> : <span>Monitor</span>}
                            </Grid>
                        </Grid>
                    </Grid>
                    {selectedTab === 'stream' && <Grid className={''} item xs={12}>
                        {activeStreamView === 'start' && <React.Fragment>
                            <Grid item xs={12}>
                                <Grid container>
                                    <Grid item xs={12} className={classes.amountContainer}>
                                        <TextField className={classNames(classes.input, classes.amount)}
                                            variant='outlined'
                                            size='small'
                                            placeholder='0.000000'
                                            onChange={e => {
                                                store.set('amount', e.target.value)
                                            }}
                                            InputProps={{
                                                endAdornment: <InputAdornment className={classes.endAdornment} position="end">BTC</InputAdornment>
                                            }}/>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField className={classNames(classes.input, classes.address)} variant='outlined' size='small' placeholder='Stream to BTC Address' onChange={e => {
                                            store.set('address', e.target.value)
                                        }}/>
                                    </Grid>
                                </Grid>

                            </Grid>
                            <Grid item xs={12} className={classes.swapButtonContainer}>
                                <Button disabled={disabled} className={classes.swapButton} variant='outlined' color='primary' onClick={instantSwapSelected ? this.startInstant.bind(this) : this.start.bind(this)}>Next</Button>
                            </Grid>
                            {transactions && transactions.length ? <Divider className={classes.divider} /> : null}
                            <Grid item xs={12} className={classes.unfinished}>
                                {transactions && transactions.length ? transactions.map((tx, index) => {
                                    return <Grid key={index} container direction='row' className={classes.depositItem}>
                                        <Grid item xs={3}>
                                            {tx.amount} BTC
                                        </Grid>
                                        <Grid className={classes.depositStatus} item xs={9}>
                                            {tx.awaiting === 'btc-init' ? <span>
                                                {`Waiting for ${tx.instant ? '0' : '2'} confirmations to`}<Ellipsis/>{` ${tx.renBtcAddress}`}
                                            </span> : null}
                                            {tx.awaiting === 'ren-settle' ? <span>
                                                {`Submitting to RenVM`}<Ellipsis/>
                                            </span> : null}
                                            {tx.awaiting === 'eth-settle' ? <span>
                                                {`Submitting to Ethereum`}<Ellipsis/>
                                            </span> : null}
                                            {!tx.awaiting ? `Deposit complete` : null}
                                            {tx.awaiting === 'btc-init' || tx.error || !tx.awaiting ? <div>
                                                {tx.txHash ? <a className={classes.viewLink} target='_blank' href={'https://kovan.etherscan.io/tx/'+tx.txHash}>View transaction</a> : null}
                                                <a href='javascript:;' onClick={() => {
                                                    removeTx(store, tx.id)
                                                }}>{!tx.awaiting ? 'Clear' : 'Cancel'}</a></div> : null}
                                        </Grid>
                                    </Grid>
                                }) : null}
                            </Grid>
                        </React.Fragment>}
                        {activeStreamView === 'awaiting-init' && <React.Fragment>
                            <Grid item xs={12}>
                                <Grid container>
                                    <Grid item xs={12}>
                                        <div className={classes.spinner}>
                                              <CircularProgress
                                                variant="determinate"
                                                value={100}
                                                className={classes.spinnerTop}
                                                size={24}
                                                thickness={4}
                                              />
                                              <CircularProgress
                                                variant="indeterminate"
                                                disableShrink
                                                className={classes.spinnerBottom}
                                                size={24}
                                                thickness={4}
                                              />
                                        </div>
                                    </Grid>
                                    <Grid item xs={12} className={classes.awaitingStatus}>
                                        <span>Waiting for {amount} BTC transaction to be initiated</span>
                                    </Grid>
                                    <Grid item xs={12} onClick={() => store.set('selectedTab', 'monitor')}>
                                        <TextField className={classNames(classes.input, classes.address)}
                                            variant='outlined'
                                            size='small'
                                            placeholder='Deposit Address'
                                            onChange={e => {
                                                store.set('address', e.target.value)
                                            }}
                                            InputProps={{
                                                endAdornment: <InputAdornment className={classes.endAdornment} position="end">COPY</InputAdornment>
                                            }}/>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </React.Fragment>}
                    </Grid>}
                    {selectedTab === 'monitor' && <Grid className={''} item xs={12}>
                        <Grid item xs={12}>
                            <Grid container>

                                <Grid item xs={12} className={classes.progressContainer}>
                                    <div className={classes.progress}>
                                          <CircularProgress
                                            variant="static"
                                            value={100}
                                            className={classes.progressTop}
                                            size={250}
                                            thickness={2}
                                          />
                                          <CircularProgress
                                            variant="static"
                                            className={classes.progressMiddle}
                                            size={250}
                                            value={40}
                                            thickness={2}
                                          />
                                          <CircularProgress
                                            variant="static"
                                            className={classes.progressBottom}
                                            size={250}
                                            value={20}
                                            thickness={2}
                                          />
                                    </div>
                                    <div className={classes.progressText}>
                                        <div>
                                            <p className={classes.totalStreamed}>
                                                <b>0.2000 BTC</b>
                                            </p>
                                        </div>
                                        <p>
                                            <b>0.0567 / 0.1000</b>
                                        </p>
                                        <p>
                                            <span>claimed</span>
                                        </p>
                                    </div>
                                </Grid>
                                <Grid item xs={12} className={classes.streamHeader}>
                                    <Typography variant={'body1'} className={classes.date}>Stream to 3uty2NVNTKdXg6W8NthBHcDjrbfcb6kn8b</Typography>
                                    <Typography variant={'body1'} className={classes.date}>will complete on 01/30/2020 at 2:30 pm</Typography>
                                </Grid>
                                <Grid item xs={12} className={classes.claimButton}>
                                    <Button disabled={false}
                                        className={''}
                                        variant='outlined'
                                        color='primary'
                                        onClick={() => {}}>
                                        Claim BTC
                                    </Button>
                                </Grid>
                                <Grid item xs={12}>

                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>}
                </Grid>
            </Grid>

        </Grid>
    }
}

export default withStyles(styles)(withStore(DepositContainer))
