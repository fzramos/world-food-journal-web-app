import { User } from '../models/user'
import express from 'express'
const router = express.Router()
import Joi from 'joi'

router.post('/', async (req, res) => {
    res.status(400).send('Provided parameters failed log-in')
})

export default router
// login req body validation