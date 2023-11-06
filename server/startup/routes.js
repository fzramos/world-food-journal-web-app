import express from 'express'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import winston from 'winston'
import restaurant from '../routes/restaurant'
import error from '../middleware/error'

export default function (app) {
    app.use(express.json())
    // for React HTTP ONly cookie parsing
    // app.use(cookieParser())

    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('tiny'))
        winston.info('Morgan activated')
    }

    app.use('/api/restaurant', restaurant)

    app.use(error)
}