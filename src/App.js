import React from 'react';
import { createStore, withStore } from '@spyna/react-store'

import NavContainer from './containers/NavContainer'
import DepositContainer from './containers/DepositContainer'


import theme from './theme/theme'
import classNames from 'classnames'

import { withStyles, ThemeProvider } from '@material-ui/styles';
import Container from '@material-ui/core/Container'
import Grid from '@material-ui/core/Grid'

const styles = () => ({})

const initialState = {
    unfinishedTrades: []
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {}
    }

    async componentDidMount() {
    }

    render() {
        const { classes, store } = this.props
        return (
            <ThemeProvider theme={theme}>
                <Container maxWidth="sm">
                    <NavContainer />
                    <DepositContainer />
                </Container>
            </ThemeProvider>
        );
    }
}

export default createStore(withStyles(styles)(App), initialState)
