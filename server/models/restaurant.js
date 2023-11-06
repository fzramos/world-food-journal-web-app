import mongoose from "mongoose";
import Joi from 'joi'

// TODO: Add additional limits such as value minimums, defaults, and required fields
const restarauntSchema = new mongoose.Schema({
    name: {
        type: String
    },
    rating: {
        type: Number // integer out of 5
    },
    date: {
        type: Date // not necessarily the same as entry upload date
    },
    country: {
        type: String
    },
    note: {
        type: String,
        // larger string
    },
    location: {
        type: String
        // user can be as specific as they want
    },
    wishlist: {
        type: Boolean
        // default false
    }
})

const Restaraunt = mongoose.model('Restaraunt', restarauntSchema)

const validateRestaurant = () => {
    const schema = Joi.object({
        name: Joi.string().required(),
        rating: Joi.number().min(0).max(5),
        date: Joi.date(),
        country: Joi.string().required(),
        note: Joi.string(), // long string
        location: Joi.string(),
        wishlist: Joi.boolean() // default false

    })


    return schema.validateAsync()
}

export { Restaraunt, validateRestaurant as validate}