import express from 'express'
import winston from 'winston'
const app = express()
import logging from './startup/logging'
logging()
import db from './startup/db'
db()
import routes from './startup/routes'
routes(app)
import validation from './startup/validation'
validation()


app.get('/', (req, res) => {
    res.send('Hello world')
})

let port = process.env.PORT || 8080
if (process.env.NODE_ENV === 'test') port = 0;

const server = app.listen(port, () => winston.info(`Server listening on port ${port}...`))
export default server;