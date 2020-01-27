import React from 'react';
import theme from '../theme/theme'
import classNames from 'classnames'
import { withStyles } from '@material-ui/styles';

import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';

const styles = () => ({
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
    totalStreamed: {
        fontSize: 24,
        paddingBottom: theme.spacing(2)
    },
})

class Progress extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            availableAmount: '',
            availablePercentage: ''
        }
    }

    componentDidMount() {
        const { stream } = this.props

        this.interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000)
            const period = stream.end - stream.start
            let availablePercentage = 0
            if (now > stream.end) {
                availablePercentage = 100
                clearInterval(this.interval)
            } else if (stream.start > 0){
                availablePercentage = Number((((now - stream.start) / period) * 100).toFixed(1))
            }
            const availableAmount = ((availablePercentage / 100) * stream.amount).toFixed(6)

            this.setState({
                availableAmount,
                availablePercentage
            })
        }, 10);
    }

    componentWillUnmount() {
        clearInterval(this.interval)
    }

    render() {
        const {
            classes,
            stream
        } = this.props

        const {
            availableAmount,
            availablePercentage
        } = this.state

        console.log(this.state, this.props)

        return <Grid item xs={12} className={classes.progressContainer}>
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
                    value={Number(availablePercentage)}
                    thickness={2}
                  />
                  <CircularProgress
                    variant="static"
                    className={classes.progressBottom}
                    size={250}
                    value={Number(0.1)}
                    thickness={2}
                  />
            </div>
            <div className={classes.progressText}>
                <div>
                    <p className={classes.totalStreamed}>
                        <b>{stream.amount} BTC</b>
                    </p>
                </div>
                <p>
                    <b>0.000000 / {availableAmount} BTC</b>
                </p>
                <p>
                    <span>claimed</span>
                </p>
            </div>
        </Grid>
    }
}

export default withStyles(styles)(Progress);
