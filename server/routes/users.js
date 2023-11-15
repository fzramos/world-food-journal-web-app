import jwt from "jsonwebtoken";
import config from "config"
import bcrypt from "bcrypt"
import express from "express"
import _ from 'lodash'
const router = express.Router()
import mongoose from "mongoose";
import { User, validate } from '../models/user'

router.post('/register', async (req, res) => {
    try {
        await validate(req.body)
        // make sure new user details meet requirements
    } catch (err) {
        return res.status(400).send(err.details[0].message)
    }
    let user = await User.findOne({
        name: req.body.name
    })
    if (user) return res.status(400).send(`The username "${req.body.name}" is already registered to a different account`)
    // safety step to make sure user doesn't maliciously upload fields to MongoDB
    user = new User(_.pick(req.body, ['name', 'email', 'password']))
    // hasing password
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(req.body.password, salt)

    await user.save()
})

export default router