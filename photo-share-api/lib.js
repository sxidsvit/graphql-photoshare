const fetch = require('node-fetch')
const fs = require('fs')
require('dotenv').config()

const findBy = (value, array, field = 'id') =>
    array[array.map(item => item[field]).indexOf(value)]

const generateFakeUsers = count =>
    fetch(`https://randomuser.me/api/?results=${count}`)
        .then(res => res.json())

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

const saveFile = (stream, path) =>
    new Promise((resolve, reject) => {
        stream.on('error', error => {
            if (stream.truncated) {
                fs.unlinkSync(path)
            }
            reject(error)
        }).on('end', resolve)
            .pipe(fs.createWriteStream(path))
    })

const uploadFile = async (file, path) => {
    console.log('lib.js - file: ', file);
    const { stream } = await file
    return saveFile(stream, path)
}

const uploadStream = (stream, path) =>
    new Promise((resolve, reject) => {
        stream.on('error', error => {
            if (stream.truncated) {
                fs.unlinkSync(path)
            }
            reject(error)
        }).on('end', resolve)
            .pipe(fs.createWriteStream(path))
    })

module.exports = { findBy, authorizeWithGithub, generateFakeUsers, uploadFile, uploadStream }
