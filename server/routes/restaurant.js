import express from 'express'
const router = express.Router()
import { Restaraunt, validate } from "../models/restaurant";

// this route will be protected by an auth middleware
router.get('/:country', async (req, res) => {

    const restaraunts = await Restaraunt.find({
        // userId: req.params.id
        country: req.params.country
    })

    if (!restaraunts) {
        return res.status(400).send('No records found')
    }

    return res.send(restaraunts)
})