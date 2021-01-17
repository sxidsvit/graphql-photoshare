### Работа над проектом

```js
// ./photo-share-api
 npm init -y
 npm install apollo-server graphql nodemon
 ...
// ./photo-share-api/package.json
"main": "index.js",
...
 "scripts": {
    "start": "nodemon -e js,json,graphql"
  },
...
// ./photo-share-api
npm start
```

---

#### apollo-server-express

В некоторых ситуациях вам может понадобиться добавить Apollo Server в существующее приложение, или, возможно, вы захотите воспользоваться промежуточным программным обеспечением Express.
В этом случае вы можете задействовать apollo-server-express. С помощью Apollo Server Express вы сможете применять все новейшие функции Apollo Server, а также реализовать собственную конфигурацию.

```js
// Начнем с удаления apollo-server:
npm remove apollo-server
// Теперь установим Apollo Server Express и Express:
npm install apollo-server-express express
```

Настраиваем сервер в файле ./photo-share-api/index.js

```js
const { ApolloServer } = require('apollo-server-express')
const express = require('express')
const { readFileSync } = require('fs')

const resolvers = require('./resolvers')
var typeDefs = readFileSync('./typeDefs.graphql', 'UTF-8')

var app = express()
const server = new ApolloServer({
    typeDefs,
    resolvers,
    }
  })

server.applyMiddleware({ app })
app.get('/', (req, res) => res.end('Welcome to the PhotoShare
API'))

app.listen({ port: 4000 }, () =>
console.log(`GraphQL Server running @ http://
localhost:4000${server.graphqlPath}`)
)
```

Express подключаем как middleware. Теперь мы можем воспользоваться всеми функциями
промежуточного программного обеспечения, предоставляемыми нам фреймворком

---

#### Подключаем ApolloPlayground

```js
npm install graphql-playground-middleware-express
```

```js
// ./photo-share-api
const expressPlayground = require('graphql-playground-middlewareexpress').default
...
 server.applyMiddleware({ app })
 app.get('/playground', expressPlayground({ endpoint: '/graphql' }))
```

Теперь наш сервер настроен на запуск Apollo Server Express и у нас
ть три различных маршрута:

- / — для домашней страницы
- /graphql — для конечной точки GraphQL
- /playground — для GraphQL Playground

---

#### Контекст: хранение глобальных значений нашего приложения

К контексту может обратиться любой распознаватель.

Это хорошее место для хранения информации аутентификации, сведений о базе данныхб локальных кэшей данных и всего остального, что необходимо для распознования операци GraphQL.

Вы можете напрямую обращаться к API REST и базам данных в своих распознавателях, но мы обычно абстрагируем эту логику в объект, который помещаем в контекст, чтобы обеспечить разделение проблем и позже предоставить более простую возможность рефакторизации.

Сначала подключаемся к базе данных MOngoDB и затем уже создадим контекст для Apollo Server

```js
//  ./photo-share-api/.env
DB_HOST=mongodb+srv://sxidsvit:1234****@cluster0.b7vva.azure.mongodb.net/learning-graphql?authSource=admin&replicaSet=atlas-umab7t-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true
CLIENT_ID= <GitHub>
CLIENT_SECRET=<GitHub>
```

Для подключения к базе нужно установить пвкет mongodb, а чтобы извлекать константу DB_HOST из файла ./photo-share-api/.env - нужно установить dotenv (работа с переменными окружения)

```js
//  ./photo-share-api/index.js
...
const { MongoClient } = require('mongodb')
require('dotenv').config()
...
async function start() {
  const app = express()
  const MONGO_DB = process.env.DB_HOST
  let db

  try {
    const client = await MongoClient.connect(MONGO_DB,  {useNewUrlParser: true, useUnifiedTopology: true} )
    db = client.db()
  } catch (error) {
    console.log(`Mongo DB Host not found!
    Please add DB_HOST environment variable to .env file ...    `)
    process.exit(1)
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const githubToken = req.headers.authorization
      const currentUser = await db.collection('users').findOne({ githubToken })
      return { db, currentUser }
    }
  })

  server.applyMiddleware({ app })

  app.get('/playground', expressPlayground({ endpoint: '/graphql' }))

  app.get('/', (req, res) => {
    let url = `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=user`
    res.end(`<a href="${url}">Sign In with Github</a>`)
  })

  app.listen({ port: 4000 }, () =>
    console.log(`GraphQL Server running at http://localhost:4000${server.graphqlPath}`)
  )
}

start()

```

После запуска мы подключаемся к базе данных. Подключение к базе данных — асинхронный процесс. Для успешного подключения потребуется некоторое время. Эта асинхронная функция позволяет нам ожидать распознавания с помощью ключевого слова await. Первое, что мы делаем в данной функции, — ожидаем успешного
подключения к локальной или удаленной базе данных. После подключения к базе данных мы можем добавить указанное соединение к объекту контекста и запустить наш сервер.

Теперь мы можем изменить наши распознаватели запросов, чтобы возвращать информацию из наших коллекций Mongo вместо локальных массивов

---

#### Авторизация с помощью аккаунта GitHub

Авторизация и аутентификация пользователей — важная часть любого приложения. Существует ряд стратегий, которые можно применить.

Авторизация через социальные сети популярна, поскольку в этом случае много данных об управлении учетной записью передается из социальной сети

- Сначала настраиваем GitHub OAuth (Developer Settings в личном профиле на сайте www.github.com)
- Полученные значения client_id и client_secret заносим в константы CLIENT_ID и CLIENT_SECRET файла ./photo-share-api/.env

#####

![](./img/Authorization-process.jpg)

тобы реализовать мутацию githubAuth, предположим, что у нас есть код. После того как мы применим код для получения токена, мы сохраним новую информацию пользователя и токен в нашей локальной базе данных и вернем эту информацию клиенту. Клиент будет сохранять токен локально и отправлять его нам с каждым запросом.
Мы будем применять токен для авторизации пользователя и доступа к его записи в данных

---

##### Мутация githubAuth

```js
//  ./photo-share-api/typeDefs.graphql
type AuthPayload {
token: String!
user: User!
}

type Mutation {
...
githubAuth(code: String!): AuthPayload!
...
}

//  Вспомогательная функция authorizeWithGithub реализована
// в файле chapter-07/photo-share-api/lib.js с вспомогательными функциями (утилитами)
...
// Значение credentials состоит из трех элементов: client_id, client_secret и code
const requestGithubToken = async (credentials) => {
    let response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credentials)
        }
    )
    let res = await response.json()
    return res
}

const requestGithubUserAccount = token =>
    fetch(`https://api.github.com/user?access_token=${token}`)
        .then(res => res.json())
...
// Наше целевая функция, которая используется в мутации githubAut(parent, { code }, { db, pubsub })
const authorizeWithGithub = async credentials => {
    const { access_token } = await requestGithubToken(credentials)
    const githubUser = await requestGithubUserAccount(access_token)
    return { ...githubUser, access_token }
}
```

---

##### authorizeWithGithub(credentials)

_Сначала мы запрашиваем токен доступа и ожидаем ответа. Затем, задействуя access_token, запрашиваем информацию учетной записи пользователя GitHub и ожидаем ответа. После того как у нас будут данные, мы объединим все вместе в одном объекте_

```js

Мы создали вспомогательные функции, которые будут поддерживать функциональность распознавателя.
Теперь напишем распознаватель (мутацию), чтобы получить токен и учетную запись пользователя из GitHub

// ./photo-share-api/resolvers/Mutation.js
async githubAuth(parent, { code }, { db }) {
  let {
    message,
    access_token,
    avatar_url,
    login,
    name
  } = await authorizeWithGithub({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    code
  })
  if (message) {
    throw new Error(message)
  }
  let latestUserInfo = {
    name,
    githubLogin: login,
    githubToken: access_token,
    avatar: avatar_url
  }
  const { ops:[user] } = await db
    .collection('users')
    .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true })
  return { user, token: access_token }
}
```

```js
//  chapter-06/photo-share-api/lib.js
const authorizeWithGithub = async credentials => {
    const { access_token } = await requestGithubToken(credentials)
    const githubUser = await requestGithubUserAccount(access_token)
    return { ...githubUser, access_token }
}
...
const requestGithubToken = async (credentials) => {
    let response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credentials)
        }
    )
    let res = await response.json()
    return res
}

const requestGithubUserAccount = token =>
    fetch('https://api.github.com/user',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())

const authorizeWithGithub = async credentials => {
    const { access_token } = await requestGithubToken(credentials)
    const githubUser = await requestGithubUserAccount(access_token)
    return { ...githubUser, access_token }
}
```

---

Для дальнейшей работы приложения нам нужны token и user

###### Тестирование

- Отправляем запрос:
  https://github.com/login/oauth/authorize?client_id=6c17187dac745de87f68&scope=user

- Получаем ответ:
  http://localhost:3000/?code=888a67c6ffadee66599b

- Копируем код из URL-адреса и отправляем его с помощью мутации

```js
mutation {
  githubAuth(code:"888a67c6ffadee66599b") {
    user {
      githubLogin
      name
      avatar
    }
  }
}
```

Получаем ответ с token и информацией о текущем пользователе:

```js
{
  "data": {
    "githubAuth": {
      "token": "e311c2210cd294d922b109e240f6a1712b40fc5e",
      "user": {
        "githubLogin": "sxidsvit",
        "name": "Sergiy Antonyuk",
        "avatar": "https://avatars2.githubusercontent.com/u/16037668?v=4"
      }
    }
  }
}
```

---

##### Аутентификация пользователей

Чтобы идентифицировать себя в будущих запросах, вам нужно отправить токен с каждым запросом в заголовке Authorization. Этот токен будет применяться для идентификации пользователя путем поиска его записи в базе данных

На платформе GraphQL Playground вы можете добавлять заголовки к каждому запросу. Перейдите на вкладку HTTP Headers рядом с вкладкой Query Variables. Вы можете добавить HTTP-заголовки к запросу на этой вкладке.
Просто отправьте заголовки в формате JSON:

```js
{
  "Authorization": "<ВАШ_ТОКЕН>"
}
```

Изменим контекст ApolloServer чтобы он был функцией и вызывался при каждом GraphQL запросе.
Тгода информация из контекста будет доступна в каждом распознователе.

```js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const githubToken = req.headers.authorization
    const currentUser = await db.collection('users').findOne({ githubToken })
    return { db, currentUser }
  },
})
```

После того как у нас есть токен, мы можем применить его для поиска пользователя в нашей базе данных. Если у нас есть пользователь, он будет добавлен в контекст. Если нет, значение для пользователя в контексте будет равно null

Вот пример:

```js
const resolvers = {
  Query: {
    me: (parent, args, { currentUser }) => currentUser,
    ...
  }
}
```

```js
query currentUser {
  me {
    githubLogin
    name
    avatar
  }
}
//  HTTP HEADER
{
   "Authorization": "ed829720993600aded085b405c884cf169fb605"
}
```

---

##### Мутация postPhoto

Чтобы отправить фотографию в наше приложение, пользователь должен авторизоваться. Мутация postPhoto может определить, кто авторизуется, проверяя контекст

```js
  async postPhoto(parent, args, { db, currentUser }) {

    if (!currentUser) {
      throw new Error('only an authorized user can post a photo')
    }

    const newPhoto = {
      ...args.input,
      userID: currentUser.githubLogin,
      created: new Date()
    }

    const { insertedIds } = await db.collection('photos').insert(newPhoto)
    console.log('postPhoto - insertedIds: ', insertedIds);
    newPhoto.id = insertedIds[0]

    return newPhoto

  },
```

---

##### Мутация поддельных пользователей

Чтобы протестировать наше приложение с различными пользователями, добавим мутацию, которая позволит нам заполнить базу данных поддельными пользователями из API random.me

```js
addFakeUsers: async (parent, { count }, { db }) => {
    var randomUserApi = `https://randomuser.me/api/?results=${count}`

    var { results } = await fetch(randomUserApi).then(res => res.json())

    var users = results.map(r => ({
      githubLogin: r.login.username,
      name: `${r.name.first} ${r.name.last}`,
      avatar: r.picture.thumbnail,
      githubToken: r.login.sha1
    }))

    await db.collection('users').insert(users)

    return users
  },

```

Проверить её работу можно так:

```js
mutation {
  addFakeUsers(count: 2) {
    name
    githubToken
    avatar
  }
}
```

Теперь, когда у нас есть поддельные пользователи ( поле githubToken в БД содержит нужный для авторизации токен), мы можем авторизоваться с помощью поддельной учетной записи пользователя через мутацию

```js
async fakeUserAuth(parent, { githubLogin }, { db }) {
    var user = await db.collection('users').findOne({ githubLogin })

    if (!user) {
      throw new Error(`Cannot find user with githubLogin "${githubLogin}"`)
    }

    return {
      token: user.githubToken,
      user
    }
  }
```

```js
type Mutation {
fakeUserAuth(githubLogin: ID!): AuthPayload!
...
}
```

Распознаватель fakeUserAuth получает githubLogin из аргументов мутации и применяет его для поиска этого пользователя в базе данных. После того как он найдет этого пользователя, токен и учетная запись
последнего будут возвращены в форме нашего типа AuthPayload.

Теперь мы можем аутентифицировать поддельного пользователя, отправив мутацию

```js
mutation {
   fakeUserAuth(githubLogin: "sxidsvit"){
    token
    user {
      name
      avatar
      githubLogin
    }
  }
}
```

Теперь можно добавить возвращенный токен в HTTP-заголовок авторизации, чтобы публиковать новые фотографии от имени этого поддельного пользователя

---

#### Клиенты GraphQL

##### Запросы на выборку

Из-за гибкости GraphQL нет конкретного рецепта того, как создать клиент.

Все, что вам нужно, чтобы отправлять запросы и мутации, — это реализовать возможность отправлять HTTP-запросы

Mожно отправлять запросы в сервис GraphQL с помощью cURL. Нужно лишь несколько разных значений:

- запрос — {totalPhotos, totalUsers};
- конечная точка GraphQL — http://localhost:4000/graphql;
- тип содержимого — Content-Type: application/json.

Теперь мы отправляем запрос cURL _непосредственно из оболочки командной строки_, используя метод POST:

```js
 curl -X POST /
 -H "Content-Type: application/json" /
 --data '{ "query": "{totalUsers, totalPhotos}" }' /
 http://localhost:4000/graphql
```

C помощью объекта fetch можно построить маленький клиент, который будет работать в браузере:

```js
var query = `{totalPhotos, totalUsers}`
var url = 'http://localhost:4000/graphql'
var opts = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
}
fetch(url, opts)
  .then((res) => res.json())
  .then(
    ({ data }) => `
<p>photos: ${data.totalPhotos}</p>
<p>users: ${data.totalUsers}</p>
`
  )
  .then((text) => (document.body.innerHTML = text))
  .catch(console.error)
```

Если вы знаете, как отправлять HTTP-запросы, применяя свой клиент, у вас уже есть инструменты, необходимые для создания клиентского приложения, взаимодействующего с любым API GraphQL.

---

##### Инструмент graphql-request

Хотя cURL и fetch великолепны, существуют другие фреймворки,которые можно использовать для передачи операций GraphQL в API. Один из наиболее примечательных — graphql-request. Он обертывает запросы на выборку в промис, который может быть применен для запросов на сервер GraphQL. Кроме того, он обрабатывает детали запроса и выполняет анализ данных

```js
npm install graphql-request
```

```js
import { request } from 'graphql-request'
var query = `
query listUsers {
  allUsers {
    name
    avatar 
  }
}
`
request('http://localhost:4000/graphql', query)
  .then(console.log)
  .catch(console.error)
```

Более сложный пример

```js
import React from 'react'
import ReactDOM from 'react-dom'
import { request } from 'graphql-request'

var url = 'http://localhost:4000/graphql'

var query = `
query listUsers {
  allUsers {
    avatar
    name
  }
}
`
var mutation = `
mutation populate($count: Int!) {
  addFakeUsers(count:$count) {
    githubLogin
  }
}
`
const App = ({ users = [] }) => (
  <div>
    {users.map((user) => (
      <div key={user.githubLogin}>
        <img src={user.avatar} alt="" />
        {user.name}
      </div>
    ))}
    <button onClick={addUser}>Add User</button>
  </div>
)

const render = ({ allUsers = [] }) =>
  ReactDOM.render(<App users={allUsers} />, document.getElementById('root'))
const addUser = () =>
  request(url, mutation, { count: 1 })
    .then(requestAndRender)
    .catch(console.error)
const requestAndRender = () =>
  request(url, query).then(render).catch(console.error)

requestAndRender()
```

##### _Резюме_

- Вы можете писать сценарии оболочки с помощью cURL.
- Создавать веб-страницы с помощью фреймворка fetch.
- Создавать приложения быстрее с помощью graphql-request.
- Есть еще _более мощные клиенты GraphQL_

---

#### Apollo Client

Чтобы создать надежное, эффективное приложение, нам нужен способ кэширования запросов и объектов их результатов. Мы могли бы создать что-то подобное сами или опереться на один из проверенных клиентов, которые уже существуют. Наиболее известными клиентскими решениями GraphQL, доступными сегодня, являются Relay и Apollo Client. Relay совместим только с React и React Native.

Apollo Client — это проект гибкого клиентского решения GraphQL для выполнения таких процедур, как кэширование, обновления пользовательского интерфейса и многое другое. Команда разработчиков создала пакеты, которые предоставляют связки для React, Angular, Ember, Vue, iOS и Android

Apollo Client фокусируется на отправке запросов от клиента на сервер и их получении. Он обрабатывает сетевые запросы с помощью Apollo Link и выполняет все кэширование с помощью Apollo Cache.

---

#### Apollo Client и React

##### Настройка проекта

```js
npx create-react-app photo-share-client
```

Эта команда устанавливает новое базовое приложение React в папку photo-share-client

```js
// ./photo-share-api
npm start
```

##### Конфигурирование Apollo Client

```js
npm install graphql apollo-boost react-apollo
```

- graphql включает в себя парсер языка GraphQL
- apollo-boost включает пакеты Apollo, необходимые для создания клиента Apollo и отправки операций клиенту
- react-apollo — библиотека npm, содержащая компоненты React, которые мы будем задействовать для создания пользовательского интерфейса с помощью Apollo

```js
// photo-share-client/src/index.js
import ApolloClient, { gql } from 'apollo-boost'

const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
})
const query = gql`
  {
    totalUsers
    totalPhotos
  }
`
client
  .query({ query })
  .then(({ data }) => console.log('data', data))
  .then(() => console.log('cache', client.extract()))
  .catch(console.error)
```

Функция gql используется для анализа запроса в дереве синтаксиса АСД или дерева абстрактного синтаксиса.

Мы также видим, что теперь у нас есть результаты, сохраненные в локальном объекте, который управляется клиентом:

```js
{
  ROOT_QUERY: {
    totalPhotos: 0,
    totalUsers: 3
  }
}
```

По умолчанию Apollo Client автоматически кэширует результаты локально и отдает предпочтение локальному кэшу, чтобы улучшить производительность наших приложений

Чтобы начать работу с react-apollo, нам нужно лишь создать клиент и добавить его в наш пользовательский интерфейс с компонентом ApolloProvider

```js
// photo-share-client/src/index.js
import React from 'react'
import { render } from 'react-dom'
import App from './App'
import { ApolloProvider } from 'react-apollo'
import ApolloClient from 'apollo-boost'

const client = new ApolloClient({ uri: 'http://localhost:4000/graphql' })

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root')
)
```

Это весь код, который необходим для взаимодействия Apollo с React. Мы создали клиент, а затем разместили его в глобальной области React с помощью компонента, называемого ApolloProvider. Любой дочерний компонент, обернутый ApolloProvider, будет иметь доступ к клиенту. Это означает, что компонент <App /> и любой из его дочерних элементов готов принимать данные из нашего сервиса GraphQL через Apollo Client

---

##### Компонент Query

Компонент Query позаботится об извлечении данных, обработке состояния загрузки и обновлении нашего пользовательского интерфейса. Мы можем применить компонент Query в любой позиции ApolloProvider

Компонент Query отправляет query с использованием клиента. После разрешения клиент вернет результаты, которые мы будем применять для создания пользовательского интерфейса

```js
// photo-share-client/src/App.js
import React from 'react'
import Users from './Users'
import { gql } from 'apollo-boost'

export const ROOT_QUERY = gql`
  query allUsers {
    totalUsers
    allUsers {
      githubLogin
      name
      avatar
    }
  }
`
const App = () => <Users />
export default App
```

Создаём компонент photo-share-client/src/Users.js

```js
import React from 'react'
import { Query } from 'react-apollo'
import { ROOT_QUERY } from './App'

const Users = () => (
  <Query query={ROOT_QUERY}>
    {(result) => <p>Users are loading: {result.loading ? 'yes' : 'no'}</p>}
  </Query>
)
export default Users
```

Получаем result из функции и возвращаем элемент абзаца. Это т.н. методика визуализации, используемая в React. Результат содержит больше информации, чем лишь данные в ответе. Поэтому усложним наш компонент photo-share-client/src/Users.js

```js
import React from 'react'
import { Query } from 'react-apollo'
import { ROOT_QUERY } from './App'

const Users = () => (
  <Query query={ROOT_QUERY}>
    {({ data, loading }) =>
      loading ? (
        <p>loading users...</p>
      ) : (
        <UserList count={data.totalUsers} users={data.allUsers} />
      )
    }
  </Query>
)

const UserList = ({ count, users }) => (
  <div>
    <p>{count} Users</p>
    <ul>
      {users.map((user) => (
        <UserListItem
          key={user.githubLogin}
          name={user.name}
          avatar={user.avatar}
        />
      ))}
    </ul>
  </div>
)

const UserListItem = ({ name, avatar }) => (
  <li>
    <img src={avatar} width={48} height={48} alt="" />
    {name}
  </li>
)

export default Users
```

Объект results также имеет несколько полезных функций для пагинации, повторного выбора и опроса. Применим функцию refetch, чтобы повторно запросить список пользователей, когда мы нажимаем
кнопку:

```js
const Users = () => (
  <Query query={ROOT_QUERY}>
    {({ data, loading, refetch }) =>
      loading ? (
        <p>loading users...</p>
      ) : (
        <UserList
          count={data.totalUsers}
          users={data.allUsers}
          refetchUsers={refetch}
        />
      )
    }
  </Query>
)
```

Свойство refetch — это просто функция. Мы можем передать его
в UserList, где его можно добавить к событию нажатия кнопки:

```js
const UserList = ({ count, users, refetchUsers }) => (
  <div>
    <p>{count} Users</p>
    <button onClick={() => refetchUsers()}>Refetch Users</button>
    <ul>
      {users.map((user) => (
        <UserListItem
          key={user.githubLogin}
          name={user.name}
          avatar={user.avatar}
        />
      ))}
    </ul>
  </div>
)
```

Когда мы добавляем свойство pollInterval к компоненту Query, данные автоматически извлекаются снова и снова на основе заданного интервала:

```js
<Query query={ROOT_QUERY} pollInterval={1000}>
```

В дополнение к loading, data и refetch объект ответа имеет несколько дополнительных параметров.

- stopPolling — функция, останавливающая опрос.
- startPolling — функция, запускающая опрос.
- fetchMore — функция, которая может быть использована для
  получения следующей страницы данных

---

##### Компонент Mutation

Когда нужно отправить мутации в сервис GraphQL, мы можем применить компонент Mutation

```js
//  photo-share-client/src/Users.js
import React from 'react'
import { Query, Mutation } from 'react-apollo'
import { gql } from 'apollo-boost'
import { ROOT_QUERY } from './App'

const ADD_FAKE_USERS_MUTATION = gql`
  mutation addFakeUsers($count: Int!) {
    addFakeUsers(count: $count) {
      githubLogin
      name
      avatar
    }
  }
`

const Users = () => (
  <Query query={ROOT_QUERY}>
    {({ data, loading, refetch }) =>
      loading ? (
        <p>loading users...</p>
      ) : (
        <UserList
          count={data.totalUsers}
          users={data.allUsers}
          refetchUsers={refetch}
        />
      )
    }
  </Query>
)

const UserList = ({ count, users, refetchUsers }) => (
  <div>
    <p>{count} Users</p>
    <button onClick={() => refetchUsers()}>Refetch Users</button>
    <Mutation mutation={ADD_FAKE_USERS_MUTATION} variables={{ count: 1 }}>
      {(addFakeUsers) => <button onClick={addFakeUsers}>Add Fake Users</button>}
    </Mutation>
    <ul>
      {users.map((user) => (
        <UserListItem
          key={user.githubLogin}
          name={user.name}
          avatar={user.avatar}
        />
      ))}
    </ul>
  </div>
)

const UserListItem = ({ name, avatar }) => (
  <li>
    <img src={avatar} width={48} height={48} alt="" />
    {name}
  </li>
)

export default Users
```

Так же, как мы отправили запрос в качестве свойства для компонента Query, отправим мутацию в компонент Mutation. Мы применяем свойство variables. При этом отправятся необходимые переменные запроса с мутацией.

Компонент Mutation применяет функцию addFakeUsers, которая будет отправлять мутацию после ее вызова

Мы можем указать компоненту Mutation выполнить повторную загрузку определенных запросов после завершения мутации

```js
//  photo-share-client/src/Users.js
<Mutation
  mutation={ADD_FAKE_USERS_MUTATION}
  variables={{ count: 1 }}
  refetchQueries={[{ query: ROOT_QUERY }]}
>
  {(addFakeUsers) => <button onClick={addFakeUsers}>Add Fake Users</button>}
</Mutation>
```

refetchQueries — свойство, которое позволяет указать, какие запросы будут вызваны после отправки мутации

---

##### Авторизация

Настроим авторизацию пользователя на стороне клиента

![](./img/Authorization-process.jpg)

Устанавливаем Router

```js
npm install react-router-dom
```

##### Авторизация пользователя

Включим компонент BrowserRouter и добавим новый компонент AuthorizedUser, который можем применять для авторизации пользователей с помощью GitHub

```js
// .photo-share-client/src/App.js
import React from 'react'
import Users from './Users'
import { BrowserRouter } from 'react-router-dom'
import { gql } from 'apollo-boost'
import AuthorizedUser from './AuthorizedUser'

export const ROOT_QUERY = gql`
  query allUsers {
    totalUsers
    allUsers {
      ...userInfo
    }
    me {
      ...userInfo
    }
  }
  fragment userInfo on User {
    githubLogin
    name
    avatar
  }
`
const App = () => (
  <BrowserRouter>
    <div>
      <AuthorizedUser />
      <Users />
    </div>
  </BrowserRouter>
)
export default App
```

Компонент AuthorizedUser отвечает за кнопку Sign In with GitHub (Подписаться через GitHub). После ее нажатия пользователь перенаправляется к процессу OAuth GitHub. ПО завершению авторизации GitHub передаст код обратно в браузер: http://localhost:3000?code=XYZGNARLYSENDABC. Если код найден в строке запроса, компонент анализирует его, исходя из адресной строки, изменяет State, очищает code из адресной строки и запускает процесс авторизации с помощью мутации githubAuthMutation.

После его завершения будет вызван метод authorizationComplete. Ему передаются данные, выбранные нами в мутации, в том числе token. Сохраним token локально и применим history роутера React, чтобы удалить строку запроса кода из адресной строки окна.

```js
// /photo-share-client/src/AuthorizedUser.js

import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { Mutation } from 'react-apollo'
import { gql } from 'apollo-boost'
import { ROOT_QUERY } from './App'
const GITHUB_AUTH_MUTATION = gql`
  mutation githubAuth($code: String!) {
    githubAuth(code: $code) {
      token
    }
  }
`

class AuthorizedUser extends Component {
  state = { signingIn: false }

  authorizationComplete = (cache, { data }) => {
    localStorage.setItem('token', data.githubAuth.token)
    this.props.history.replace('/')
    this.setState({ signingIn: false })
  }

  componentDidMount() {
    if (window.location.search.match(/code=/)) {
      this.setState({ signingIn: true })
      const code = window.location.search.replace('?code=', '')
      this.githubAuthMutation({ variables: { code } })
    }
  }

  requestCode() {
    var clientID = '6c17187dac745de87f68'
    window.location = `https://github.com/login/oauth/authorize?client_id=${clientID}&scope=user`
  }
  render() {
    return (
      <Mutation
        mutation={GITHUB_AUTH_MUTATION}
        update={this.authorizationComplete}
        refetchQueries={[{ query: ROOT_QUERY }]}
      >
        {(mutation) => {
          this.githubAuthMutation = mutation
          return (
            <button onClick={this.requestCode} disabled={this.state.signingIn}>
              Sign In with GitHub
            </button>
          )
        }}
      </Mutation>
    )
  }
}

export default withRouter(AuthorizedUser)
```

На данный момент мы подписаны как текущий пользователь GitHub.

---

##### Идентификация пользователя

Наша следующая задача — добавить токен в заголовок авторизации для каждого запроса

Сделаем это так:

```js
const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  request: (operation) => {
    operation.setContext((context) => ({
      headers: {
        ...context.headers,
        aothorization: localStorage.getItem('token'),
      },
    }))
  },
})
```

![](./img/link.jpg)

Мы добавили [метод запроса](https://www.apollographql.com/docs/link/overview/#request) в нашу конфигурацию клиента Apollo. Этот метод передает сведения о каждой операции operation непосредственно перед отправкой в сервис GraphQL. Здесь мы устанавливаем контекст каждой операции для включения заголовка авторизации, который содержит маркер, сохраненный в локальном хранилище. Если у нас нет сохраненного токена, значение этого заголовка будет просто null, и наш сервис будет считать, что пользователь не был авторизован.

Изменяем компонент Mutation так, чтобы он обращался к компоненту Me

Компонент Me будет выводить либо информацию о текущем авторизованном пользователе, либо кнопку авторизации. Он должен будет знать, находится ли пользователь в настоящее время в процессе авторизации. Ему также необходимо получить доступ к методам requestCode для компонента AuthorizedUser. Наконец, нам нужно предоставить функцию, которая может деавторизовать текущего пользователя. На данный момент мы просто удалим токен из localStorage, когда пользователь выйдет из системы.

Все эти значения были переданы компоненту Me как свойства

```js
//  photo-share-client/src/AuthorizedUser.js
<Mutation
  mutation={GITHUB_AUTH_MUTATION}
  update={this.authorizationComplete}
  refetchQueries={[{ query: ROOT_QUERY }]}
>
  {(mutation) => {
    this.githubAuthMutation = mutation
    return (
      <Me
        signingIn={this.state.signingIn}
        requestCode={this.requestCode}
        logout={() => localStorage.removeItem('token')}
      />
    )
  }}
</Mutation>
```

Создаем компонент Me

```js
//  photo-share-client/src/AuthorizedUser.js
 logout = () => {
    localStorage.removeItem('token')
    let data = this.props.client.readQuery({ query: ROOT_QUERY })
    data.me = null
    this.props.client.writeQuery({ query: ROOT_QUERY, data })
  }
  ...
const Me = ({ logout, requestCode, signingIn }) =>
  <Query query={ROOT_QUERY}>
    {({ loading, data }) => data?.me ?
      <CurrentUser {...data.me} logout={logout} /> :
      loading ?
        <p>loading... </p> :
        <button onClick={requestCode} isabled={signingIn}>
          Sign In with GitHub
        </button>
    }
  </Query>

const CurrentUser = ({ name, avatar, logout }) =>
  <div>
    <img src={avatar} width={48} height={48} alt="" />
    <h1>{name}</h1>
    <button onClick={logout}>logout</button>
  </div>
```

Компонент Me отображает компонент Query для получения данных о текущем пользователе из ROOT_QUERY. Если есть токен, поле me в ROOT_QUERY не будет равно null. Внутри компонента запроса мы проверяем, является ли data.me значением null. Если в этом поле есть данные, мы отобразим компонент CurrentUser и передадим данные о текущем пользователе указанному компоненту в качестве
свойств. Код {... data.me} применяет оператор sread для передачи всех полей компоненту CurrentUser в качестве отдельных свойств. Кроме того, функция выхода из системы также передается компоненту CurrentUser. Когда пользователь нажмет кнопку выхода из системы, эта функция будет вызвана и его токен будет удален.

---

#### Работа с кэшем

Чтобы свести к минимуму количество сетевых запросов, отправляемых нашими приложениями, мы можем
настроить Apollo Cache

##### Политики выборки

По умолчанию Apollo Client хранит данные в локальной переменной JavaScript. Каждый раз, когда мы отправляем операцию, ответ кэшируется локально. Свойство fetchPolicy сообщает Apollo Client, где искать данные для разрешения операции: либо локальный кэш, либо сетевой запрос.

Есть политики: cache-first, cache-only, cache-and-network, network-only, no-cache

Можно изменить политику выбора отдельных запросов, добавив? например, свойство fetchPolicy:

```js
// photo-share-client/src/Users.js
<Query query={{ query: ROOT_QUERY }} fetchPolicy="cache-only">
```

---

##### Сохранение кэша

Чтобы сохранять данные кэша локально, нам нужно установить следующий npm-пакет:

```js
npm install apollo-cache-persist
```

Пакет apollo-cache-persist содержит функцию, которая расширяет кэш, сохраняя его в локальном хранилище всякий раз, когда он изменяется. Чтобы реализовать работу с кэшем, нам нужно создать
собственный объект cache и добавить его к объекту client при настройке нашего приложения

```js
// photo-share-client/src/index.js
import ApolloClient, { InMemoryCache } from 'apollo-boost'
import { persistCache } from 'apollo-cache-persist'

const cache = new InMemoryCache()
persistCache({
  cache,
  storage: localStorage
})

const client = new ApolloClient({
  cache,
  ...
```

Кэш у нас находится в localStorage в ключе apollo-cache-persist. Это означает, что, как только мы запустим наше приложение, мы увидим значение кэша, сохраненного в хранилище

Следующим шагом будет проверка localStorage при запуске,чтобы узнать, есть ли у нас уже сохраненный кэш. Если да, тогда нам нужно инициализировать локальный cache со следующими данными перед созданием клиента

```js
// photo-share-client/src/index.js
const cache = new InMemoryCache()
persistCache({
  cache,
  storage: localStorage,
})

if (localStorage['apollo-cache-persist']) {
  let cacheData = JSON.parse(localStorage['apollo-cache-persist'])
  cache.restore(cacheData)
}
```

Теперь наше приложение будет загружать любые кэшированные данные до запуска.

Продолжаем двигаться по пути минимизации сетевых запросов

---

##### Обновление кэша

Мы также можем напрямую взаимодействовать с Apollo Cache. Мы можем считывать текущие данные из кэша или записывать их непосредственно в кэш.

Каждый раз, когда мы меняем данные, хранящиеся в кэше, response-apollo обнаруживает изменение и повторно отображает все затронутые компоненты. Все, что нам нужно сделать, — это изменить кэш, и _пользовательский интерфейс автоматически обновится_, чтобы отобразить изменения

Данные считываются из Apollo Cache с помощью GraphQL

Мы можем считывать любые данные, которые в настоящее время хранятся в нашем кэше, используя метод cache.readQuery:

```js
let { totalUsers, allUsers, me } = cache.readQuery({ query: ROOT_QUERY })
```

Мы считали данные из полей запроса ROOT_QUERY с использованием метода cache.writeQuery:

Можем записать данные в отдельные поля

```js
cache.writeQuery({
  query: ROOT_QUERY,
  data: {
    me: null,
    allUsers: [],
    totalUsers: 0,
  },
})
```

Здесь мы фактически очистили все поля. Поскольку мы применяем react-apollo, такое изменение приведет к обновлению пользовательского интерфейса и очистит весь список пользователей в текущей DOM

Подходящее расположение для записи данных непосредственно в кэш находится внутри функции logout, в компоненте AuthorizedUse

Компонент должен получить доступ к объекту client. Проще всего это сделать с помощьъ HOC-компонента withApollo. Он добавит client как props(!) в компонент AuthorizedUse.

```js
// photo-share-client/src/AuthorizedUser.js
import { Query, Mutation, withApollo, compose } from 'react-apollo'
...
export default compose(withApollo, withRouter)(AuthorizedUser)
```

Используя функцию compose, мы объединяем функции withApollo и withRouter в одну. Функция withRouter добавляет свойство history роутера, а withApollo добавляет к свойствам Apollo Client

Вносим изменения в функцию logout() - удаляем токен текущего пользователя и информацию о нём:

```js
// photo-share-client/src/AuthorizedUser.js
logout = () => {
  localStorage.removeItem('token')
  let data = this.props.client.readQuery({ query: ROOT_QUERY })
  data.me = null
  this.props.client.writeQuery({ query: ROOT_QUERY, data })
}
```

Уменьшим количество запросов к серверу при выполнении мутации по созданию фейкового пользователя.
Для этого создадим функцию updateUserCache(). Мутация ADD_FAKE_USERS_MUTATION вызовет функию когда будет выполнять метод, сохраненный в props update. К уже сохранённым в кеше данным добавятся новые.

```js
// photo-share-client/src/Users.js
const updateUserCache = (cache, { data: { addFakeUsers } }) => {
  let data = cache.readQuery({ query: ROOT_QUERY })
  data.totalUsers += addFakeUsers.length
  data.allUsers = [
    ...data.allUsers,
    ...addFakeUsers
  ]
  cache.writeQuery({ query: ROOT_QUERY, data })
}

const UserList = ({ count, users, refetchUsers }) =>
  <div>
    <p>{count} Users</p>
    <button onClick={() => refetchUsers()}>Refetch Users</button>
    <Mutation mutation={ADD_FAKE_USERS_MUTATION}
      variables={{ count: 1 }}
      update={updateUserCache}>
      {addFakeUsers =>
        <button onClick={addFakeUsers}>Add Fake Users</button>
      }
    </Mutation>
    ...
```

Замена данных в кэше заставит пользовательский интерфейс обновиться и отобразить нового поддельного пользователя

###### Резюме

- На данном этапе мы можем перечислить всех пользователей, добавить поддельных пользователей и авторизоваться с помощью аккаунта GitHub.
- Мы создали приложение GraphQL с полным стеком, применяя Apollo Server и Apollo Client.
- Компоненты Query и Mutation — это инструменты, которые мы можем задействовать для быстрого создания клиентов с помощью Apollo Client и React

---

#### GraphQL в реальном мире

Чтобы применить полученные навыки в реальной среде, нужно сделать так, чтобы приложения соответствовали необходимым требованиям:

- Приложения должны передавать файлы между клиентом и сервером.
- Использовать веб-сокеты, чтобы передавать данные в реальном времени своим клиентам.
- Современные API д.б. безопасными и защищають от вредоносных запросов.
- Обеспечивать командную разработку (взаимодействие фронтенд и бэкенд разработчиков)

Чтобы работать с GraphQL в реальной среде, наше приложение должно соответствовать этим требованиям

Мы начнем с еще двух итераций API PhotoShare.

- Во-первых, включим подписки и передачу данных в режиме реального времени.
- Во-вторых,разрешим пользователям публиковать фотографии, реализуя решение для передачи файлов с помощью GraphQL.

В приложении PhotoShare, мы рассмотрим способы защиты нашего API GraphQL для противостояния вредоносным клиентским запросам.

---

##### Подписки

Современная технология для передачи данных в реальном времени между сайтами и мобильными приложениями — веб-сокеты. Вы можете использовать протокол WebSocket для открытия дуплексных каналов двусторонней связи через TCP-сокет. Это означает, что веб-страницы и приложения могут отправлять и получать данные по одному соединению. Такая технология позволяет получать обновления с сервера непосредственно на веб-страницу в режиме реального времени.

До текущего момента мы реализовали запросы и мутации GraphQL с применением протокола HTTP. HTTP позволяет отправлять и получать данные между клиентом и сервером, но не помогает подключиться к серверу и отслеживать изменения состояния.

Если мы хотим полностью использовать преимущества новой сети, GraphQL должен иметь возможность поддерживать передачу данных в реальном времени через веб-сокеты в дополнение к HTTPзапросам. Наилучшее решение — использовать подписки.

---

##### Работа с подписками

В GraphQL вы используете подписки для отслеживания вашего API на предмет конкретных изменений данных. Apollo Server по умолчанию поддерживает подписки. Он включает пару пакетов npm, которые
бычно применяются для настройки веб-сокетов в приложениях GraphQL: graphql-subscriptions и subscriptions-transport-ws

- graphql-subscriptions обеспечивает реализацию шаблона проектирования «Издатель/подписчик» (Pub/Sub). Pub/Sub необходим для публикации изменений данных, которые могут использовать клиентские подписчики
- subscriptions-transport-ws — это сервер и клиент WebSocket, который позволяет передавать подписки через веб-сокеты.

Apollo Server автоматически включает оба указанных пакета для поддержки подписок (то есть, поддерживает веб-сокеты без дополнительной настройки по адресу

```js
ws://localhost:4000
```

Мы работаем с apollo-server-express. Поэтому нужно выполнить несколько шагов, чтобы подписки работали.

Apollo Server автоматически настраивает поддержку подписки через веб-сокеты, но для этого ему нужен HTTP-сервер.

```js
// photo-share-api/index.js
const { createServer } = require('http')
...
  const httpServer = createServer(app)
  server.installSubscriptionHandlers(httpServer) // Поддержка веб-сокетов

  httpServer.listen({ port: 4000 }, () =>
    console.log(`GraphQL Server running at localhost:4000${server.graphqlPath}`)
...
```

В дополнение к HTTP-серверу наш бэкенд теперь готов принимать запросы по адресу ws://localhost:4000/graphql

---

###### Публикация фотографий

Добавим в Схему новый тип Subscription и создадим запрос newPhoto на продписку:

```js
// photo-share-api/typeDefs.graphql
type Subscription {
newPhoto: Photo!
}
```

Подписка newPhoto будет применяться для передачи данных клиенту при добавлении фотографий

```js
subscription {
  newPhoto {
    url
    category
    postedBy {
      githubLogin
      avata
    }
  }
}

```

Эта подписка будет передавать клиенту сведения о новых фотографиях. Подобно Query или Mutation, GraphQL позволяет нам запрашивать данные о конкретных полях с помощью выборок.

Благодаря данной подписке каждый раз, когда появляется новая фотография, мы получим ее url и category вместе с githubLogin и avatar пользователя, разместившего эту фотографию.

Когда подписка отправляется нашему сервису, соединение остается открытым. Отслеживаются изменения данных. Каждая добавленная фотография подталкивает данные к подписчику.

Нужно откорректировать мутацию postPhoto, чтобы она могла сообщать по подписке photo-added о проишедших изменениях - вставили новое фото в базу данных.

```js
//  /photo-share-api/resolvers/Mutation.js
async postPhoto(root, args, { db, currentUser, pubsub }) {
  if (!currentUser) {
    throw new Error('only an authorized user can post a photo')
  }
  const newPhoto = {
    ...args.input,
    userID: currentUser.githubLogin,
    created: new Date()
  }
  const { insertedIds } =
    await db.collection('photos').insert(newPhoto)
  newPhoto.id = insertedIds[0]
  pubsub.publish('photo-added', { newPhoto })
  return newPhoto
}
```

Этот распознаватель ожидает, что в контекст был добавлен экземпляр pubsub. Объект pubsub может публиковать события и отправлять данные нашему распознавателю. Он похож на EventEmitter Node.js.

Теперь нужно добавить распознователь (resolver), который будет применятся (реагировать) на событие photo-added :

```js
const resolvers = {
  ...
  Subscription: {
    newPhoto: {
      subscribe: (parent, args, { pubsub }) =>
        pubsub.asyncIterator('photo-added')
    }
  }
}
```

Распознаватель Subscription является корневым. Он должен быть добавлен непосредственно к объекту распознавателя сразу за распознавателями Query и Mutation.

Метод подписки subscribe получает parent, args и context. Внутри этого метода мы подписываемся на конкретные события. Здесь мы используем pubsub.asyncIterator для подписки на
события photo-added. Каждый раз, когда оно создается в
pubsub, оно будет будет эмитится в эту новую подписку на фото

Выше была - теория. Перейдём к практике.

На практике создадим файл photo-share-api/resolvers/Subscription.js

```js
module.exports = {
  newPhoto: {
    subscribe: (parent, args, { pubsub }) =>
      pubsub.asyncIterator('photo-added'),
  },
  newUser: {
    subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('user-added'),
  },
}
```

и подключим его в photo-share-api/resolvers/index.js

```js
const resolvers = {
  Query,
  Mutation,
  Subscription,
  ...Type,
}
```

В файл с описанием /photo-share-api/typeDefs.graphql добавим описание схемы для подписки:

```js
//  photo-share-api/typeDefs.graphql
...
type User {
  githubLogin: ID!
  name: String
  avatar: String
  postedPhotos: [Photo!]!
  inPhotos: [Photo!]!
}

type Photo {
  id: ID!
  name: String!
  url: String!
  description: String
  category: PhotoCategory!
  postedBy: User!
  taggedUsers: [User!]!
  created: DateTime!
}
...
type Subscription {
  newPhoto: Photo!
  newUser: User!
}
```

Осталось в context добавить pubsub:

```js
//  photo-share-api/index.js
const { ApolloServer, PubSub } = require('apollo-server-express')
...
async function start() {
...
const pubsub = new PubSub()
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req, connection }) => {
    const githubToken = req
      ? req.headers.authorization
      : connection.context.Authorization
    const currentUser = await db.collection('users').findOne({ githubToken })
    return { db, currentUser, pubsub }
  },
})
```

Здесь нужны пояснения:

- Запросы и мутации будут по-прежнему использовать HTTP, то есть в этом случае req !== null.
- Когда операция является подпиской, HTTP-запрос отсутствует - req === null. Информация для подписок вместо этого передается в тот момент, когда клиент подключается к веб-сокету. Через сокет-соединение будет отправлен аргумент connection.
- Когда у нас будет подписка, нам придется передавать данные авторизации через контекст подключения - connection.context, а не заголовки HTTP-запросов.

В качестве упражнения создадим подписку newUser

- резолвер

```js
//  photo-share-api/resolvers/Subscription.js
newUser: {
  subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('user-added')
}
```

- событие, в нашем случае мутация addFakeUsers, на которую подписываемся

```js
// photo-share-api/resolvers/Mutation.js
addFakeUsers: async (root, { count }, { db, pubsub }) => {
  var randomUserApi = `https://randomuser.me/api/?results=${count}`

  var { results } = await fetch(randomUserApi).then((res) => res.json())

  var users = results.map((r) => ({
    githubLogin: r.login.username,
    name: `${r.name.first} ${r.name.last}`,
    avatar: r.picture.thumbnail,
    githubToken: r.login.sha1,
  }))

  await db.collection('users').insert(users)
  var newUsers = await db
    .collection('users')
    .find()
    .sort({ _id: -1 })
    .limit(count)
    .toArray()

  newUsers.forEach((newUser) => pubsub.publish('user-added', { newUser }))

  return users
}
```

- на платформе Playground (http://localhost:4000/graphql) тестируем подписку

```js
subscription {
  newUser {
    githubLogin
    name
    avatar
  }
}
```

- Кажый раз, как мы создаем нового пользователя, информация о нём появляется в Playground

```js
{
  "data": {
    "newUser": {
      "githubLogin": "redlion331",
      "name": "Pihla Kilpela",
      "avatar": "https://randomuser.me/api/portraits/thumb/women/43.jpg"
    }
  }
}
```

---

##### Управление подписками

Нужно настроить Apollo Client для обработки подписки. Чтобы задействовать вебсокеты на сервере, нужно установить несколько дополнительных пакетов:

```js
npm install apollo-link-ws apollo-utilities subscriptions-transport-ws
```

```js
// .photo-share-client/src/index.js
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  split,
} from 'apollo-boost'
import { WebSocketLink } from 'apollo-link-ws'
import { getMainDefinition } from 'apollo-utilities'
```

Мы импортировали split из apollo-boost. Мы будем использовать его для разделения операций GraphQL
между HTTP-запросами и веб-сокетами:

- Если операция является мутацией или запросом, Apollo Client отправит HTTP-запрос.
- Если операция является подпиской, клиент будет подключаться к вебсокету

За кадром Apollo Client сетевые запросы управляются с помощью объекта ApolloLink. В текущем приложении он отвечает за отправку HTTP-запросов сервису GraphQL.

Каждый раз, когда мы отправляем операцию с Apollo Client, эта операция передается в Apollo Link для обработки сетевого запроса. Мы также можем использовать Apollo Link для работы с сетью через веб-сокеты

Настроим два типа ссылок:

```js
// .photo-share-client/src/index.js
const wsLink = new WebSocketLink({
  uri: `ws://localhost:4000/graphql`,
  options: { reconnect: true },
})
...
const httpLink = HttpLink({ uri: 'http://localhost:4000/graphql' })
```

Ссылки являются составными. Это означает, что они могут быть объединены друг с другом для создания пользовательских конвейеров для наших операций GraphQL.

![](./img/link.jpg)

Помимо возможности отправить операцию в один ApolloLink, мы можем отправить ее через цепочку многоразовых ссылок, где каждая ссылка в цепочке может управлять операцией до того, как она достигнет последней ссылки в цепочке, которая обрабатывает запрос и возвращает результат.

Создадим цепочку ссылок с httpLink, добавив пользовательский Apollo Link, который отвечает за добавление заголовка авторизации к операции

```js
// .photo-share-client/src/index.js
const authLink = new ApolloLink((operation, forward) => {
  operation.setContext((context) => ({
    headers: {
      ...context.headers,
      authorization: localStorage.getItem('token'),
    },
  }))
  return forward(operation)
})
const httpAuthLink = authLink.concat(httpLink)
```

Объект httpLink конкатенируется с authLink для обработки авторизации пользователя для HTTP-запросов. Имейте в виду, что функция _.concat_ — это не та же функция из языка JavaScript, которая объединяет массивы. Это специальная функция, которая объединяет Apollo Links.

После конкатенации мы назвали ссылку httpAuthLink, чтобы более четко описать поведение. Когда операция отправляется по данной ссылке, она сначала передается в authLink, где заголовок авторизации добавляется в операцию до того, как она будет перенаправлена на объект httpLink для обработки сетевого запроса. Если вы знакомы с middleware для Express или Redux, процесс вам должен быть знаком.

Теперь нам нужно указать клиенту, какую ссылку использовать.

Здесь пригодится функция split. Она возвращает одну из двух Apollo Links на основе предиката. Первым аргументом функции split является предикат. Предикат — это функция, которая возвращает true или false. Второй аргумент функции split представляет ссылку, которую нужно вернуть, когда предикат возвращает true, а третий аргумент представляет ссылку для возврата, когда предикат возвращает false.

```js
// photo-share-client/src/index.js
const link = split(
  ({ query }) => {
    const { kind, operation } = getMainDefinition(query)
    return kind === 'OperationDefinition' && operation === 'subscription'
  },
  wsLink,
  httpAuthLink
)
```

Теперь нужно изменить конфигурацию Apollo Client:

```js
//  photo-share-client/src/index.js
const client = new ApolloClient({ cache, link })
```

Теперь наш клиент готов обрабатывать подписки

---

##### В ожидании новых пользователей

Внесем изменения в космонент App.js - переделыем его на класс, чтобы использовать жизненный цикл компонента React , а именно этапы componentDidMount() и componentWillUnmount(). Теперь при монтировании компонента можно поключить обработчик подписки LISTEN_FOR_USERS.

```js
//  .photo-share-client/src/App.js
import React, { Component, Fragment } from 'react'
import Users from './Users'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import AuthorizedUser from './AuthorizedUser'
import { gql } from 'apollo-boost'
import { withApollo } from 'react-apollo'

export const ROOT_QUERY = gql`
  query allUsers {
    totalUsers
    totalPhotos
    allUsers {
      ...userInfo
    }
    me {
      ...userInfo
    }
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
        console.log('App -newUser: ', newUser)
        const data = client.readQuery({ query: ROOT_QUERY })
        data.totalUsers += 1
        data.allUsers = [...data.allUsers, newUser]
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
          <Route
            exact
            path="/"
            component={() => (
              <Fragment>
                <AuthorizedUser />
                <Users />
              </Fragment>
            )}
          />
        </Switch>
      </BrowserRouter>
    )
  }
}

export default withApollo(App)
```

Когда мы экспортируем компонент <App />, мы используем функцию withApollo для передачи клиента в App посредством свойств.

Когда компонент примонтируется, клиент для отслеживания новых пользователей. При размонтировании компонента, мы прекращаем подписку, задействуя метод unsubscribe

Подписка создается с помощью client.subscribe().subscribe().

- Первой функцией subscribe является метод клиента Apollo, который
  используется для отправки операции подписки на наш сервис. Он возвращает объект НАБЛЮДАТЕЛЯ.
- Вторая функция subscribe — это метод объекта НАБЛЮДАТЕЛЯ. Он применяется для подписки обработчиков на наблюдателя.

Обработчики вызываются каждый раз, когда подписка передает данные клиенту.

В приведенном выше коде мы добавили обработчик, который захватывает информацию о каждом новом пользователе и добавляет ее непосредственно в Apollo Cache с помощью writeQuery.

Теперь, когда добавляются новые пользователи, они мгновенно попадают в наш локальный кэш, который немедленно обновляет пользовательский интерфейс. Поскольку подписка добавляет каждого нового пользователя в список в реальном времени, больше не нужно обновлять локальный кэш из файла src/Users.js. Внутри этого файла теперь можно удалить функцию updateUserCache, а также свойство update мутации.

---

##### Выгрузка файлов

Для загрузки файла с помощью GraphQL нам необходимо изменить API и клиента, чтобы они могли обрабатывать `multipart/form-data`, тип кодировки, который требуется для передачи файла с телом `POST` через Интернет

Соответственно, на клиенте и сервере нужно установить пакеты:

- `apollo-upload-client`, который будет отвечать за захват файла в браузере и передачу его на сервер.
- `apollo-upload-server`, который предназначен для обработки файлов, переданных на сервер от `apollo-upload-client`.

Пакет `apollo-upload-server` захватывает файл и сопоставляет его соответствующему аргументу запроса перед отправкой его в распознаватель в качестве аргумента.

##### Обработка выгрузок на сервере

Устанавливать `apollo-uploadserver` не нужно. Он входит в состав Apollo Server.

(1) _На сервере Apollo предоставляется пользовательский `скалярный тип Upload`. <br />
Его можно применять для захвата `stream` файла, `mimetype` и `encoding` загруженного файла._

```js
// photo-share-api/typeDefs.graphql
scalar Upload
...
input PostPhotoInput {
  name: String!
  category: PhotoCategory = PORTRAIT
  description: String
  file: Upload!
}
```

(2) Тип Upload содержит информацию о файле, включая stream загрузки, который мы можем использовать для сохранения файла. Применим этот stream `в мутации postPhoto`.

```js
// photo-share-api/resolvers/Mutation.js
...
const { uploadStream } = require('../lib')
const path = require('path')
...
 async postPhoto(root, args, { db, currentUser, pubsub }) {

    if (!currentUser) {
      throw new Error('only an authorized user can post a photo')
    }

    const newPhoto = {
      ...args.input,
      userID: currentUser.githubLogin,
      created: new Date()
    }

    const { ops } = await db.collection('photos').insertOne(newPhoto)
    newPhoto.id = ops[0]['_id']

    var toPath = path.join(__dirname, '..', 'assets', 'photos', `${newPhoto.id}.jpg`)

    const { createReadStream, filename } = await args.input.file
    const stream = await createReadStream(filename)

    // await uploadFile(filename, toPath)
    await uploadStream(stream, toPath)

    pubsub.publish('photo-added', { newPhoto })

    return newPhoto

  },
```

В этом примере функция `uploadStream` вернет промис, который будет разрешен по завершении загрузки. Аргумент `stream` содержит поток загрузки, который может быть отправлен в `writeStream` и сохранен локально в каталоге `assets/photos`:

```js
// photo-share-api/lib.js
const uploadStream = (stream, path) =>
  new Promise((resolve, reject) => {
    stream
      .on('error', (error) => {
        if (stream.truncated) {
          fs.unlinkSync(path)
        }
        reject(error)
      })
      .on('end', resolve)
      .pipe(fs.createWriteStream(path))
  })
```

(3) Если нам нужно обрабатывать файлы от одного и того же API, придется добавить специальное промежуточное программное обеспечение в приложение Express, которое позволит обрабатывать статичные изображения в формате JPEG:

```js
// photo-share-api/index.js
...
const path = require('path')
...
  app.use(
    '/img/photos',
    express.static(path.join(__dirname, 'assets', 'photos'))
  )
...
 const httpServer = createServer(app)
 ...
```

Теперь наш сервер готов и способен обрабатывать закачки фотографий.

---

##### Публикация новых фотографий с помощью Apollo Client

Изменим запрос ROOT_QUERY в файле photo-share-client/src/App.js

```js
//
export const ROOT_QUERY = gql`
  query allUsers {
    totalUsers
    totalPhotos
    allUsers {
      ...userInfo
    }
    me {
      ...userInfo
    }
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
```

Когда сайт загружается, мы получаем значения id, name и url каждой фотографии, сохраненной в базе данных.

Мы можем использовать эту информацию для отображения фотографий. <br />
Создади компонетн `Photos`

```js
// photo-share-client/src/Photos.js
import React from 'react'
import { Query } from 'react-apollo'
import { ROOT_QUERY } from './App'

const Photos = () => (
  <Query query={ROOT_QUERY}>
    {({ loading, data }) =>
      loading ? (
        <p>loading...</p>
      ) : (
        data.allPhotos.map((photo) => (
          <img
            key={photo.id}
            src={`http://localhost:4000${photo.url}`}
            alt={photo.name}
            width={350}
          />
        ))
      )
    }
  </Query>
)

export default Photos
```

Теперь зоздадим еще один компонент `PostPhoto`, который будет содержать форму:

```js
// photo-share-client/src/PostPhoto.js
import React, { Component } from 'react'
import { Mutation } from 'react-apollo'
import { gql } from 'apollo-boost'

const POST_PHOTO_MUTATION = gql`
  mutation postPhoto($input: PostPhotoInput!) {
    postPhoto(input: $input) {
      id
      name
      url
    }
  }
`
export default class PostPhoto extends Component {
  state = {
    name: '',
    description: '',
    category: 'PORTRAIT',
    file: '',
  }

  postPhoto = async (mutation) => {
    await mutation({
      variables: {
        input: this.state,
      },
    }).catch(console.error)
    this.props.history.replace('/')
  }

  render() {
    return (
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
        }}
      >
        <h1>Post a Photo</h1>

        <input
          type="text"
          style={{ margin: '10px' }}
          placeholder="photo name..."
          value={this.state.name}
          onChange={({ target }) => this.setState({ name: target.value })}
        />

        <textarea
          type="text"
          style={{ margin: '10px' }}
          placeholder="photo description..."
          value={this.state.description}
          onChange={({ target }) =>
            this.setState({ description: target.value })
          }
        />

        <select
          value={this.state.category}
          style={{ margin: '10px' }}
          onChange={({ target }) => this.setState({ category: target.value })}
        >
          <option value="PORTRAIT">PORTRAIT</option>
          <option value="LANDSCAPE">LANDSCAPE</option>
          <option value="ACTION">ACTION</option>
          <option value="GRAPHIC">GRAPHIC</option>
        </select>

        <input
          type="file"
          style={{ margin: '10px' }}
          accept="image/jpeg"
          onChange={({ target }) =>
            this.setState({
              file: target.files && target.files.length ? target.files[0] : '',
            })
          }
        />

        <div style={{ margin: '10px' }}>
          <Mutation mutation={POST_PHOTO_MUTATION}>
            {(mutation) => (
              <button onClick={() => this.postPhoto(mutation)}>
                Post Photo
              </button>
            )}
          </Mutation>
          <button onClick={() => this.props.history.goBack()}>Cancel</button>
        </div>
      </form>
    )
  }
}
```

Компонент `PostPhoto` — просто форма. В ней используются элементы формы для ввода `name, description, category` и самого `file`. Это - управляемая форма: в ней каждый элемент управления связан с состоянием (`state`).

Форма принимает файлы типа `image/jpeg` и осуществляет простую проверку этого поля.

Теперь нужно добавить маршрут, чтобы можно было попасть на страницу с формой:

```js
// photo-share-client/src/App.js
...
import Photos from './Photos'
import PostPhoto from './PostPhoto'
...
 render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/"
            component={() =>
              <Fragment>
                <AuthorizedUser />
                <Users />
                <Photos />
              </Fragment>
            } />
          <Route path="/newPhoto" component={PostPhoto} />
          <Route component={({ location }) => <h1>"{location.pathname}" not found</h1>} />
        </Switch>
      </BrowserRouter>
    )
  }
}
```

Компонент `Switch` позволяет отображать один маршрут за раз:

- по маршруту `/` мы отображаем компонент, включающий компоненты `AuthorizedUser,Users и Photos`
- по маршруту `/newPhoto`, мы отобразим форму для загрузки новой фотографии

Если пользователь авторизован то ему нужно дать возможность публиковать фото. <br />
Для этого в компоненте `AuthorizedUser` добавим сылку на маршрут `/newPhoto`:

```js
// photo-share-client/src/AuthorizedUser.js
...
import { withRouter, NavLink } from 'react-router-dom'
...
const CurrentUser = ({ name, avatar, logout }) =>
  <div>
    <img src={avatar} width={48} height={48} alt="" />
    <h1>{name}</h1>
    <button onClick={logout}>logout</button>
    <NavLink to="/newPhoto">Post Photo</NavLink>
  </div>
  ...
```

Пользователь может перемещаться между экранами, а при публикации фотографии мы должны увидеть необходимые входные данные, выведенные в оболочке командной строки.

---

##### Решение проблемы с ошибкой `ReadStream.prototype.open() is depricated`

`Суть проблемы:` <br />

- `ReadStream.prototype.open()` has been depricated in Node.js 13.0.1
- In `Apollo Server 3.0`, we will not ship `graphql-upload (or upload support)` by default

[Алгоритм решения](https://github.com/apollographql/apollo-server/issues/3508#issuecomment-662371289): <br />
Нужно подключать и настраивать `GraphQLUpload` из пакета `graphql-upload`

(1) Switch from using `apollo-server` to one of the Apollo Server integration packages, like `apollo-server-express`

(2) Disable the upload support provided by the older `graphql-upload` version included in Apollo Server 2.x by setting uploads: false

```js
// photo-share-api/index.js
const server = new ApolloServer({
    typeDefs,
    resolvers,
    uploads: false,
    ...
```

(3) Install the latest version of `graphql-upload`:

```js
npm install graphql-upload@latest
```

(4) Import the necessary primitives from `graphql-upload` into the module where `applyMiddleware` is called:

```js
// photo-share-api/index.js
const {
  graphqlUploadExpress, // The Express middleware.
} = require('graphql-upload')
```

(5) Add the Upload scalar to the schema by adding to the typeDefs SDL appropriately:

```js
// resolvers/Type.js
const {
  GraphQLUpload, // The GraphQL "Upload" Scalar
} = require('graphql-upload')
```

(6) Add a resolver for the `Upload scalar`:

```js
// resolvers/Type.js
Upload: GraphQLUpload
```

(7) Add the graphql-upload middleware:

```js
// photo-share-api/index.js
const app = express()
app.use(graphqlUploadExpress())
```

---

##### Безопасность

Необходимо принять некоторые меры предосторожности и контролировать производительность вашего сервера для защиты от больших или злонамеренных запросов.

##### `Тайм-ауты запроса`

Тайм-аут запроса позволяет обрабатывать каждый запрос только определенное количество времени.
Это означает, что запросы вашего сервиса должны быть завершены в течение конкретного промежутка времени.

```js
// photo-share-api/index.js
const httpServer = createServer(app)
server.installSubscriptionHandlers(httpServer)
httpServer.timeout = 5000
```

Можно установить тайм-ауты для общих запросов или отдельных распознавателей. <br />
Можновремя начала каждого запроса в контексте.

```js
const context = async ({ request }) => {
...
  return {
    ...
    timestamp: performance.now()
  }
}
```

Теперь каждый из распознавателей узнает, когда начался запрос, и может выдать ошибку, если запрос занимает слишком много времени.

##### `Ограничения данных`

Еще одна простая защита, которую вы можете противопоставить большим или злонамеренным запросам, заключается в ограничении объема данных, которые могут быть возвращены каждым запросом.

Вы можете вернуть определенное количество записей или страницу данных, разрешив вашим запросам указывать, сколько записей нужно вернуть

```js
query allPhotos {
  allPhotos(first=99999) {
    name
    url
    postedBy {
      name
      avatar
    }
}
```

или установить предел на количество передаваемых фотографий:

```js
allPhotos: (root, data, context) {
    if (data.first > 100) {
        throw new Error('Only 100 photos can be requested at a time')
    }
}
```

Всегда рекомендуется внедрять пагинацию или указвать количество данных, передаваемое запросом.

##### `Ограничение глубины запроса`

Слишком много данных для запроса. <br />
Это также предполагает немало работы для ваших распознавателей. Глубина запроса растет экспоненциально и может легко выйти из под контроля.

```js
query getPhoto($id: ID!) {
    Photo(id: $id) {
        name
        url
        postedBy {
            name
            avatar
            postedPhotos {
                name
                url
                taggedUsers {
                    name
                    avatar
                    postedPhotos {
                        name
                        url
                    }
                }
            }
        }
    }
}
```

Существуют npm-пакеты, такие как `graphql-depth-limit`, которые могут помочь в выполнении данной
задачи:

```js
npm install graphql-depth-limit
```

После установки пакета можно добавить правило проверки в конфигурацию сервера GraphQL с помощью функции dethLimit:

```js
const depthLimit = require('graphql-depth-limit')
...
const server = new ApolloServer({
    typeDefs,
    resolvers,
    validationRules: [depthLimit(5)],
    context: async ({ req, connection }) => {
    ...
    }
})

```

##### `Ограничение сложности запроса`

Встречаются клиентские запросы, которые могут не требовать слишком большой глубины, но
все равно быть нежелательными из-за количества запрашиваемых полей. Каждое поле отображается на функцию resolver, которая должна быть вызвана.

При реализации сложности запроса вы можете определить свои затратные распознаватели и дать этим полям более высокую степень сложности.

Доступно несколько пакетов npm, призванных помочь в реализации ограничений сложности запросов.

```js
npm install graphql-validation-complexity
```

Проверка сложности в GraphQL содержит набор стандартных правил для определения сложности запроса.

По умолчанию функция `graphql-validation-complexity` присваивает каждому полю значение. Она умножает это значение на 10 для любого списка.

Мы можем предотвратить выполнение этого конкретного запроса, установив общий предел сложности запросов, например, 1000:

```js
const { createComplexityLimitRule } = require('graphql-validation-complexity')
...
const options = {
    ...
    validationRules: [
        depthLimit(5),
        createComplexityLimitRule(1000, {
            onCost: cost => console.log('query cost: ', cost)
        })
    ]
}
```

В этом примере мы устанавливаем максимальный предел сложности 1000 .

Большинство пакетов сложности запросов позволяют вам устанавливать свои собственные правила.

##### `Движок Apollo`

юбая хорошая стратегия безопасности и производительности требует использования показателей. Соответственно, нужен способ мониторить ваш сервис GraphQL, чтобы определить свои популярные запросы и узнать, где находятся узкие места в производительности.

Можно использовать Apollo Engine для мониторинга нашего сервиса GraphQL, но это больше, чем просто инструмент мониторинга. `Apollo Engine` — надежный облачный сервис, который обеспечивает глубокое понимание вашего уровня GraphQL, чтобы можно было безопасно и с уверенностью управлять сервисом.

Он отслеживает операции GraphQL, отправленные вашим сервисам, и предоставляет детализированный актуальный отчет, доступный в Интернете на странице https://engine.apollographql.com.

Отчёт можно использовать для определения наиболее популярных запросов, мониторинга времени выполнения, мониторинга ошибок и поиска узких мест.

`Apollo Engine` уже включен в реализацию `Apollo Server 2.0`

- Включаем Engine

```js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  engine: true,
})
```

- Проверяем наличие переменной среды `ENGINE_API_KEY`

Для этого потребуется посетить сайт `engine.apollographql.com`, создать усетную запись и сгенерировать ключ.

- После установки вы можете использовать CLI-инструментарий для публикации своего приложения:

```js
apollo schema:publish
    --key=<ВАШ_API_КЛЮЧ>
    --endpoint=http://localhost:4000/graphql
```

Не забудьте также добавить свой API-ключ к переменным окружения.

Теперь, когда вы запустите API PhotoShare GraphQL, все операции, отправляемые сервису GraphQL, будут отслеживаться. Этот отчет может использоваться для поиска и устранения узких мест. Кроме того, `Apollo Engine` улучшит производительность и время отклика наших запросов, а также проверит производительность сервиса.

---

##### Инкрементная миграция

Все сразу не нужно одновременно переносить на GraphQL.

- Считывайте данные из REST в ваших распознавателях
- Используйте GraphQL-запрос. Для начала просто примените `graphql-request` и сделайте запрос в том же месте, где вы используете `fetch` для API REST.
- Включайте GraphQL в один или два компонента.
- Не создавайте больше конечных точек REST.
- Не поддерживайте текущие конечные точки REST.

##### В первую очередь — разработка схемы

`Схемы` — это соглашение между командами фронтенд- и бэкендразработки и определение всех отношений между данными в приложении. Обеспечивают ясность и коммуникацию

`Макеты` — важная часть разработки схемы как основного этапа. Вы можете приступить к разработке компонентов пользовательского интерфейса, которые отправляют операции запроса, мутации и подписки на сервис-макет (mock) GraphQL, в то время как команда бэкенд-разработки реализует реальный сервис

`Prisma` — это инструмент, который превращает вашу базу данных в API GraphQL, независимо от того, какую именно базу данных вы применяете. Prisma стоит между API GraphQL и базой данных.

Pisma - это проект с открытым исходным кодом.

`Prisma Cloud` — хостинговая платформа для сервисов Prisma.

---
