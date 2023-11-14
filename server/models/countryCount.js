import mongoose from 'mongoose'
import Joi from 'joi'

// BAD, remove nesting and coutnry Name, add USERID


// {
//     "code": "ZAF",
//         "restr": 0,
//         "hm": 0,
//         "misc": 0
//     }
// }

const countryCountSchema = new mongoose.Schema({
    cntryCd: {
        type: String,
        required: true
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