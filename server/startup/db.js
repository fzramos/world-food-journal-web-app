import { connect } from 'mongoose';
import 'dotenv/config';
import winston from 'winston';
import config from 'config';

export default function () {
  const mongoUri = process.env.WFJ_mongoUri;
  connect(mongoUri, { useUnifiedTopology: true, dbName: config.get('db') })
    .then(() => winston.info('Connected to MongoDB instance'))
    .catch((err) => winston.error(err));
}
