import mongoose from "mongoose";
import Joi from 'joi'
import { joiPasswordExtendCore } from 'joi-password'
const joiPassword = Joi.extend(joiPasswordExtendCore);
import jwt from 'jsonwebtoken'
import config from 'config'
import winston from "winston";
import 'dotenv/config'

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        minLength: 2,
        maxLength: 100,
        trim: true,
        unique: true,
        required: true
    },
    email: {
        type: String,
        minLength: 4,
        maxLength: 255,
        // unique: true,
    },
    password: {
        type: String,
        minLength: 4,
        maxLength: 1024,
        required: true
    },
    adminStatus: {
        type: Boolean,
        default: false
    }
})

userSchema.methods.generateAuthToken = function () {
    return jwt.sign({
        _id: this._id,
        adminStatus: this.adminStatus
    }, process.env.WFJ_jwtPrivateKey)
}

const User = mongoose.model('User', userSchema)

// Joi purpose is to make sure API users get a clear error message if they 
// try to post faulty data, similar but not identical to the Mongoose schema
const validateUserAsync = async (user) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().min(4).max(255).email(),
        password: joiPassword.string()
            .noWhiteSpaces()
            .minOfSpecialCharacters(1)
            .minOfLowercase(1)
            .minOfUppercase(1)
            .max(200)
            .required(),
        repeat_password: joiPassword.string()
            .noWhiteSpaces()
            .minOfSpecialCharacters(1)
            .minOfLowercase(1)
            .minOfUppercase(1)
            .max(200)
            .required()
    })
    // returning a promise
    return schema.validateAsync(user)
}

module.exports = {
    User,
    validate: validateUserAsync
}