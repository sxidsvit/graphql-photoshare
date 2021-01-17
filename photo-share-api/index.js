const express = require('express')
const { createServer } = require('http')
const { ApolloServer, PubSub } = require('apollo-server-express')
const { MongoClient } = require('mongodb')
require('dotenv').config()
const { readFileSync } = require('fs')
const expressPlayground = require('graphql-playground-middleware-express').default
const path = require('path')
const resolvers = require('./resolvers')
const {
  graphqlUploadExpress, // The Express middleware.
} = require('graphql-upload');

var typeDefs = readFileSync('./typeDefs.graphql', 'UTF-8')

async function start() {
  const MONGO_DB = process.env.DB_HOST
  let db

  try {
    const client = await MongoClient.connect(MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true })
    console.log('Connected to MONGO_DB')
    db = client.db()
    // db.collection.renameCollection('graphql-photoshare')
  } catch (error) {
    console.log(`
    
      Mongo DB Host not found!
      please add DB_HOST environment variable to .env file

      exiting...
       
    `)
    process.exit(1)
  }

  const app = express()
  app.use(graphqlUploadExpress()); // New!

  const pubsub = new PubSub()
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    uploads: false,
    context: async ({ req, connection }) => {
      const githubToken = req ?
        req.headers.authorization :
        connection.context.Authorization
      const currentUser = await db.collection('users').findOne({ githubToken })
      return { db, currentUser, pubsub }
    }
  })

  server.applyMiddleware({ app })


  app.use(
    '/img/photos',
    express.static(path.join(__dirname, 'assets', 'photos'))
  )

  app.get('/playground', expressPlayground({ endpoint: '/graphql' }))

  app.get('/', (req, res) => {
    let url = `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=user`
    res.end(`<a href="${url}">Sign In with Github</a>`)
  })


  const httpServer = createServer(app)
  server.installSubscriptionHandlers(httpServer)

  httpServer.timeout = 5000

  httpServer.listen({ port: 4000 }, () =>
    console.log(`GraphQL Server running at localhost:4000${server.graphqlPath}`)
  )
}

start()
