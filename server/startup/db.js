import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
dotenv.config()
import winston from 'winston'
import config from 'config'

export default function () {
    const mongoUri = process.env.WFJ_mongoUri;
    mongoose.connect(mongoUri, { useUnifiedTopology: true, dbName: config.get('db')})
    .then(() => winston.info('Connected to MongoDB instance'))
}