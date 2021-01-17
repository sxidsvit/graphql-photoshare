import React, { Component } from 'react'
import { withRouter, NavLink } from 'react-router-dom'
import { Query, Mutation, withApollo } from 'react-apollo'
import { compose } from "recompose"
import { gql } from 'apollo-boost'
import { ROOT_QUERY } from './App'

const GITHUB_AUTH_MUTATION = gql`
mutation githubAuth($code:String!) {
githubAuth(code:$code) { token }
}
`
const Me = ({ logout, requestCode, signingIn }) =>
  <Query query={ROOT_QUERY}>
    {({ loading, data }) => data?.me ?
      <CurrentUser {...data.me} logout={logout} /> :
      loading ?
        <p>loading... </p> :
        (
          <div id="signin">
            <button onClick={requestCode} isabled={signingIn}>Sign In with GitHub </button>
          </div>
        )
    }
  </Query>

const CurrentUser = ({ name, avatar, logout }) =>
  <div id="current">
    <img src={avatar} width={48} height={48} alt="" />
    <h4>{name}</h4>
    <button onClick={logout}>logout</button>
    <NavLink to="/newPhoto">Post Photo</NavLink>
    <hr />
  </div>

class AuthorizedUser extends Component {
  state = { signingIn: false, mekey: Math.random() }

  authorizationComplete = (cache, { data }) => {
    localStorage.setItem('token', data.githubAuth.token)
    this.props.history.replace('/')
    this.setState({ signingIn: false })
  }

  componentDidMount() {
    if (window.location.search.match(/code=/)) {
      this.setState({ signingIn: true })
      const code = window.location.search.replace(
        "?code=", "")
      this.githubAuthMutation({ variables: { code } })
    }
  }

  logout = () => {
    const { client } = this.props
    localStorage.removeItem('token')
    let data = client.readQuery({ query: ROOT_QUERY })
    data.me = null
    client.writeQuery({ query: ROOT_QUERY, data })
    this.setState({ key: Math.random() })
    // this.forceUpdate()
  }

  requestCode() {
    const clientID = "5d7dc052d5a867ffb1f4"
    console.log('requestCode - clientID: ', clientID);
    window.location = `https://github.com/login/oauth/authorize?client_id=${clientID}&scope=user`
  }

  render() {
    return (
      <Mutation mutation={GITHUB_AUTH_MUTATION}
        update={this.authorizationComplete}
        refetchQueries={[{ query: ROOT_QUERY }]}>
        {mutation => {
          this.githubAuthMutation = mutation
          return (
            <Me signingIn={this.state.signingIn}
              requestCode={this.requestCode}
              logout={this.logout}
              key={this.state.mekey}
            />
          )
        }}
      </Mutation>

    )
  }
}

export default compose(withApollo, withRouter)(AuthorizedUser)