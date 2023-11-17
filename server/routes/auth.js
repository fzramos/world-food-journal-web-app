import { User } from '../models/user'
import express from 'express'
const router = express.Router()
import Joi from 'joi'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import winston from 'winston'

// check if login request nameOrEmail value is in the format of an email
const isEmail = (str) => {
    const result = str.match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
    return result;
};

router.post('/', async (req, res) => {
    try {
        await validate(req.body)
    } catch (err) {
        return res.status(400).send(err.details[0].message)
    }
    let user = await User.findOne({
        name: req.body.nameOrEmail
    })
    if (!user) {
        if (isEmail(req.body.nameOrEmail)) user = await User.findOne({ email: req.body.nameOrEmail })
    }

    if (!user) return res.status(400).send(`Username/email and/or password were invalid.`)

    // now we need to validate the given password matches the stored encrypted password
    const matchingPassword = await bcrypt.compare(
        req.body.password,
        user.password
    )

    if (!matchingPassword) return res.status(400).send(`Username/email and/or password were invalid.`)

    // valid credentials, send JWT
    res.send(user.generateAuthToken())
})

// if API parameters are missing or invalid in their format, don't bother
// making a MongoDB call, just tell them right away they made a malformed request
const validate = async (loginDetails) => {
    // I want to let users sign in with their email or username
    const schema = Joi.object({
        nameOrEmail: Joi.string().min(2).max(255).required(),
        password: Joi.string().max(200).required()
    })
    // no need for strong validation
    return schema.validateAsync(loginDetails)
}

export default router
// login req body validation