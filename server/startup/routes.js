import express from 'express'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import winston from 'winston'
import restaurants from '../routes/restaurants'
import countryCounts from '../routes/countryCounts'
import users from '../routes/users'
import error from '../middleware/error'

export default function (app) {
    app.use(express.json())
    // for React HTTP ONly cookie parsing
    // app.use(cookieParser())

    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('tiny'))
        winston.info('Morgan activated')
    }

    app.use('/api/restaurants', restaurants)
    app.use('/api/country-counts', countryCounts)
    app.use('/api/users', users)

    app.use(error)
}