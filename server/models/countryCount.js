import mongoose from 'mongoose'
import Joi from 'joi'

const countryCountSchema = new mongoose.Schema({
    cntryCd: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    restr: {
        type: Number,
        default: 0
    },
    hm: {
        type: Number,
        default: 0
    },
    misc: {
        type: Number,
        default: 0
    }
})

const CountryCount = mongoose.model('country_count', countryCountSchema)

export default CountryCount