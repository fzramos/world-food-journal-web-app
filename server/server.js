import express from 'express'
import winston from 'winston'

const app = express()

app.get('/', (req, res) => {
    res.send('Hello world')
})

let port = process.env.PORT || 8080
if (process.env.NODE_ENV === 'test') port = 0;

const server = app.listen(port, () => winston.info(`Server listening on port ${port}...`))
export default server;