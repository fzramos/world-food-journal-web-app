import { env } from 'custom-env';
env();
import express from 'express';
import winston from 'winston';
const app = express();
import logging from './startup/logging.js';
logging();
import startupConfig from './startup/config.js';
startupConfig();
import db from './startup/db.js';
db();
import routes from './startup/routes.js';
routes(app);
import validation from './startup/validation.js';
validation();

app.get('/', (req, res) => {
  res.send('Hello world');
});

let port = process.env.PORT || 8080;
if (process.env.NODE_ENV === 'test') port = 0;

const server = app.listen(port, () =>
  winston.info(`Server listening on port ${port}...`)
);
export default server;
