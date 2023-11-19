import express from 'express';
const router = express.Router();
import _ from "lodash";
import mongoose from "mongoose";
import CountryCount from "../models/countryCount";
import auth from '../middleware/auth'
import winston from 'winston';
// import { ObjectId } from 'mongodb'
const ObjectId = mongoose.Types.ObjectId;

// only validated users should be able to use this route
// and they will get all of their country count values (no other users)
// return will be max an array of <300 items
router.get('/', auth, async (req, res) => {
    const objId = new ObjectId(req.user._id)
    const countryCounts = await CountryCount.find({userId: objId}).select('-__v')

    if (!countryCounts) return res.status(401).send('abc')
    res.send(countryCounts)
})

router.get('/:countryCd', auth, async (req, res) => {
    const objId = new ObjectId(req.user._id)
    const countryCount = await CountryCount.findOne({ "userId": objId, "cntryCd": req.params.countryCd }).select('-__v')

    if (!countryCount) return res.status(400).send(`Country count for username ${req.user.name} and country code ${req.params.countryCd} not found.`)

    res.send(countryCount)
})

export default router



