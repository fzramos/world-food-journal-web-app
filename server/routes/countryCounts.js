import express from 'express';
const router = express.Router();
import _ from "lodash";
import mongoose from "mongoose";
import CountryCount from "../models/countryCount";

router.get('/', async (req, res) => {
    // Placeholder for Test driven development
    return res.status(400).send('Something went wrong')
})

router.get('/:countryCd', async (req, res) => {
    // Placeholder for Test driven development
    return res.status(400).send('Something went wrong')
})

export default router