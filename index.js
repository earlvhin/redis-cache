const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');
const PORT = process.env.PORT || 3000;
const RPORT = process.env.PORT || 6379;

const client = redis.createClient(RPORT);

const app = express();

function setResponse(username, repos) {
    return `<h2>${username} has ${repos} Github repos.</h2>`
}

async function getRepos(req, res, next) {
    try {
        console.log('Fetching Data');
        const {username} = req.params;
        const response = await fetch(`https://api.github.com/users/${username}`);
        const data = await response.json();
        const repos = data.public_repos;
    
        // Set data to redis
        client.setex(username, 3600, repos);

        res.status(200).send(setResponse(username, repos))
    } catch (err) {
        console.log(err);
        res.status(500);
    }
}

// Cache Middleware
function cache(req, res, next) {
    const { username } = req.params;
    client.get(username, (err, data) => {
        if (err) {
            throw err;
        }

        if(data !== null) {
            res.send(setResponse(username, data))
        } else {
            next();
        }
    })
}

app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
    console.log(`Server listening in port ${PORT}`);
})