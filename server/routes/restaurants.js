import express from 'express'
import _ from 'lodash'
const router = express.Router()
import { Restaraunt, validate } from "../models/restaurant";
import auth from '../middleware/auth';
import winston from 'winston';
import mongoose from 'mongoose';
const ObjectId = mongoose.Types.ObjectId;

function parseDateQuery(dateStr, isEndDt) {
    const dateObj = new Date(dateStr)
    // Check if dateObject is valid
    if (dateObj instanceof Date && !isNaN(dateObj)) {
        if (isEndDt) {
            dateObj.setUTCHours(23,59,59,59)
        } else {
            dateObj.setUTCHours(0,0,0,0)               
        }
        return dateObj  
    } else {
        throw new Error('Min/max date query parameter has an invalid date format, please use YYY-MM-DD')
}}

router.get('/', auth, async (req, res) => {
    const objId = new ObjectId(req.user._id)
    const query = { userId: objId }

    if (req.query.wishlist) {
        query.wishlist = req.query.wishlist === 'true';
    }

    if (req.query.rating) {
        query.rating = { $gte: parseInt(req.query.rating)}
    }

    if (req.query.cntryCd) {
        query.cntryCd = req.query.cntryCd
    }

    if (req.query.name) {
        query.name = new RegExp(`.*${req.query.name}.*`, "i")
    }

    if (req.query.minDateUTC) {
        try {
            _.setWith(query, ["date", "$gte"], parseDateQuery(req.query.minDateUTC, false))
        } catch (err) {
            return res.status(400).send(`Min date query parameter has an invalid date format, please use YYYY-MM-DD`)
        }
    }

    if (req.query.maxDateUTC) {
        try {
            _.setWith(query, ["date" , "$lte"], parseDateQuery(req.query.maxDateUTC, true))
        } catch (err) {
            return res.status(400).send(`Max date query parameter has an invalid date format, please use YYYY-MM-DD`)
        }
    }

    const restrs = await Restaraunt.find(query).select('-__v')

    if (!restrs) return res.status(400).send(`No restaurant documents associated with username ${req.user.name}`)

    res.send(restrs)
})

// the function of this route can be done by the above GET / route with the cntryCd query param
// just wanted a route that clearly denotes filtering by cntryCd since that is what the web app
// will mostly require
router.get('/:cntryCd', auth, async (req, res) => {
    const objId = new ObjectId(req.user._id)

    const query = { 
        userId: objId,
        cntryCd: req.params.cntryCd
    }

    if (req.query.wishlist) {
        query.wishlist = req.query.wishlist === 'true';
    }

    if (req.query.rating) {
        query.rating = { $gte: parseInt(req.query.rating)}
    }

    if (req.query.name) {
        query.name = new RegExp(`.*${req.query.name}.*`, "i")
    }

    if (req.query.minDateUTC) {
        try {
            _.setWith(query, ["date", "$gte"], parseDateQuery(req.query.minDateUTC, false))
        } catch (err) {
            return res.status(400).send(`Min date query parameter has an invalid date format, please use YYYY-MM-DD`)
        }
    }

    if (req.query.maxDateUTC) {
        try {
            _.setWith(query, ["date" , "$lte"], parseDateQuery(req.query.maxDateUTC, true))
        } catch (err) {
            return res.status(400).send(`Max date query parameter has an invalid date format, please use YYYY-MM-DD`)
        }
    }

    const restaraunts = await Restaraunt.find(query).select('-__v')

    if (!restaraunts) {
        return res.status(400).send('No records found')
    }

    return res.send(restaraunts)
})

router.delete('/:cntryCd', async () => {
    res.status(400).send('Placeholder')
})

// will need to update CountryCounts for this country/user combo
// will need to create CoutnryCoutns object if it doesn't exists
// this route will be protected by an auth middleware
// will need to create validate Object ID validation for this for the put route

// ANY POST to countryCollection MUST BE userID as full ObjectId object, not hexstring
// !!!
// post will need a mongoose session
export default router;