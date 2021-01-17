import React, { Component, Fragment } from 'react'
import { gql } from 'apollo-boost'
import { withApollo } from 'react-apollo'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import AuthorizedUser from './AuthorizedUser'
import Users from './Users'
import Photos from './Photos'
import PostPhoto from './PostPhoto'
import './App.css'

export const ROOT_QUERY = gql`
    query allUsers {
        totalUsers  
        totalPhotos      
        allUsers { ...userInfo }
        me { ...userInfo }
        allPhotos {
            id
            name
            url
        }
    }

    fragment userInfo on User {
        githubLogin
        name
        avatar
    }
`

const LISTEN_FOR_USERS = gql`
    subscription {
        newUser {
            githubLogin
            name
            avatar
        }
    }
`
class App extends Component {

  componentDidMount() {
    let { client } = this.props
    this.listenForUsers = client
      .subscribe({ query: LISTEN_FOR_USERS })
      .subscribe(({ data: { newUser } }) => {
        const data = client.readQuery({ query: ROOT_QUERY })
        data.totalUsers += 1
        data.allUsers = [
          ...data.allUsers,
          newUser
        ]
        client.writeQuery({ query: ROOT_QUERY, data })
        // Simulating a click on the Add Fake User button in the Users component
        document.getElementById('refetch')?.click()
      })
  }

  componentWillUnmount() {
    this.listenForUsers.unsubscribe()
  }

  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/"
            component={() =>
              <Fragment>
                <AuthorizedUser />
                <Photos />
                <Users />
              </Fragment>
            } />
          <Route path="/newPhoto" component={PostPhoto} />
          <Route component={({ location }) => <h1>"{location.pathname}" not found</h1>} />
        </Switch>
      </BrowserRouter>
    )
  }
}

export default withApollo(App)