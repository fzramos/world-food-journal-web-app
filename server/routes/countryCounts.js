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
    winston.info('Query results' + JSON.stringify(countryCounts))
    res.send(countryCounts)
})

router.get('/:countryCd', async (req, res) => {
    // Placeholder for Test driven development
    return res.status(400).send('Something went wrong')
})

export default router



