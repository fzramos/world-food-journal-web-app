import express from 'express';
import _ from 'lodash';
const router = express.Router();
import { Restaraunt, validate, validateUpdate } from '../models/restaurant.js';
import auth from '../middleware/auth.js';
import validateObjectId from '../middleware/validateObjectId.js';
import winston from 'winston';
import mongoose from 'mongoose';
import CountryCount from '../models/countryCount.js';
const ObjectId = mongoose.Types.ObjectId;

function parseDateQuery(dateStr, isEndDt) {
  const dateObj = new Date(dateStr);
  // Check if dateObject is valid
  if (dateObj instanceof Date && !isNaN(dateObj)) {
    if (isEndDt) {
      dateObj.setUTCHours(23, 59, 59, 59);
    } else {
      dateObj.setUTCHours(0, 0, 0, 0);
    }
    return dateObj;
  } else {
    throw new Error(
      'Min/max date query parameter has an invalid date format, please use YYY-MM-DD'
    );
  }
}

router.get('/', auth, async (req, res) => {
  const objId = new ObjectId(req.user._id);
  const query = { userId: objId };

  if (req.query.wishlist) {
    query.wishlist = req.query.wishlist === 'true';
  }

  if (req.query.rating) {
    query.rating = { $gte: parseInt(req.query.rating) };
  }

  if (req.query.cntryCd) {
    query.cntryCd = req.query.cntryCd;
  }

  if (req.query.name) {
    query.name = new RegExp(`.*${req.query.name}.*`, 'i');
  }

  if (req.query.minDateUTC) {
    try {
      _.setWith(
        query,
        ['date', '$gte'],
        parseDateQuery(req.query.minDateUTC, false)
      );
    } catch (err) {
      return res
        .status(400)
        .send(
          `Min date query parameter has an invalid date format, please use YYYY-MM-DD`
        );
    }
  }

  if (req.query.maxDateUTC) {
    try {
      _.setWith(
        query,
        ['date', '$lte'],
        parseDateQuery(req.query.maxDateUTC, true)
      );
    } catch (err) {
      return res
        .status(400)
        .send(
          `Max date query parameter has an invalid date format, please use YYYY-MM-DD`
        );
    }
  }

  const restrs = await Restaraunt.find(query).select('-__v');

  if (!restrs)
    return res
      .status(400)
      .send(
        `No restaurant documents associated with username ${req.user.name}`
      );

  res.send(restrs);
});

// the function of this route can be done by the above GET / route with the cntryCd query param
// just wanted a route that clearly denotes filtering by cntryCd since that is what the web app
// will mostly require
router.get('/:cntryCd', auth, async (req, res) => {
  const objId = new ObjectId(req.user._id);

  const query = {
    userId: objId,
    cntryCd: req.params.cntryCd,
  };

  if (req.query.wishlist) {
    query.wishlist = req.query.wishlist === 'true';
  }

  if (req.query.rating) {
    query.rating = { $gte: parseInt(req.query.rating) };
  }

  if (req.query.name) {
    query.name = new RegExp(`.*${req.query.name}.*`, 'i');
  }

  if (req.query.minDateUTC) {
    try {
      _.setWith(
        query,
        ['date', '$gte'],
        parseDateQuery(req.query.minDateUTC, false)
      );
    } catch (err) {
      return res
        .status(400)
        .send(
          `Min date query parameter has an invalid date format, please use YYYY-MM-DD`
        );
    }
  }

  if (req.query.maxDateUTC) {
    try {
      _.setWith(
        query,
        ['date', '$lte'],
        parseDateQuery(req.query.maxDateUTC, true)
      );
    } catch (err) {
      return res
        .status(400)
        .send(
          `Max date query parameter has an invalid date format, please use YYYY-MM-DD`
        );
    }
  }

  const restaraunts = await Restaraunt.find(query).select('-__v');

  if (!restaraunts) {
    return res.status(400).send('No records found');
  }

  return res.send(restaraunts);
});

router.delete('/:id', [auth, validateObjectId], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const restr = await Restaraunt.findByIdAndDelete(req.params.id).select(
      '-__v'
    );

    if (!restr)
      return res
        .status(400)
        .send(`Restaurant record with ID ${req.params.id} not found`);

    const userId = new ObjectId(req.user._id);
    let countryCount = await CountryCount.findOne({
      userId,
      cntryCd: restr.cntryCd,
    });

    if (!countryCount) {
      winston.error(
        `User id ${req.user._id} and cntryCd ${req.body.cntryCd} combination have Restaurant document but not a CountryCd collection value. Please review.`
      );
      return res.status(400).send(`Problem in deleting restaurant record`);
    } else if (restr.wishlist) {
      countryCount.wishlist--;
      await countryCount.save();
    } else {
      countryCount.restr--;
      await countryCount.save();
    }

    res.send(restr);
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    res
      .status(400)
      .send(`Error posting the restaurant record, Error ${err._message}`);
  } finally {
    session.endSession();
  }
});

router.put('/:id', [auth, validateObjectId], async (req, res) => {
  try {
    await validateUpdate(req.body);
  } catch (err) {
    return res.status(400).send(err.details[0].message);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = new ObjectId(req.user._id);

    // Old restr document
    let restr = await Restaraunt.findOne({
      _id: req.params.id,
      userId: userId,
    });

    if (!restr)
      return res
        .status(400)
        .send(
          `Restaurant record with ID ${req.params.id} not found or not associated with user ${req.user._id}`
        );
    let countryCount = await CountryCount.findOne({
      userId,
      cntryCd: restr.cntryCd,
    });
    // if update is changing wishlist boolean, need to change countryCount object appropriately
    if (restr.wishlist !== req.body.wishlist) {
      if (req.body.wishlist) {
        countryCount.restr--;
        countryCount.wishlist++;
      } else {
        countryCount.wishlist--;
        countryCount.restr++;
      }
    }
    countryCount.save();

    // can't use findByIdAndUpdate because users should only be able to modify
    // their own data
    restr = await Restaraunt.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        $set: _.pick(req.body, [
          'name',
          'rating',
          'date',
          'cntryCd',
          'note',
          'location',
          'wishlist',
        ]),
      },
      {
        new: true,
      }
    );

    res.send(restr);
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    res
      .status(400)
      .send(`Error posting the restaurant record, Error ${err._message}`);
  } finally {
    session.endSession();
  }
});

router.post('/', auth, async (req, res) => {
  try {
    await validate(req.body);
  } catch (err) {
    return res.status(400).send(err.details[0].message);
  }

  // need a session since when I post here, I need to update the countryCount collection as well
  // if Restaurant post fails, I don't want to update the countryCount
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = new ObjectId(req.user._id);
    let countryCount = await CountryCount.findOne({
      userId,
      cntryCd: req.body.cntryCd,
    });

    if (!countryCount && !req.body.wishlist) {
      // this mean this is the first journal entry for this country
      countryCount = new CountryCount({
        cntryCd: req.body.cntryCd,
        userId,
        restr: 1,
      });
    } else if (!countryCount && req.body.wishlist) {
      countryCount = new CountryCount({
        cntryCd: req.body.cntryCd,
        userId,
        wishlist: 1,
      });
    } else if (countryCount && !req.body.wishlist) {
      countryCount.restr++;
    } else {
      countryCount.wishlist++;
    }
    await countryCount.save();

    const restrProps = _.pick(req.body, [
      'name',
      'rating',
      'date',
      'cntryCd',
      'note',
      'location',
      'wishlist',
    ]);
    restrProps.userId = userId;

    const restr = new Restaraunt(restrProps);
    restr.save();

    res.send(
      _.pick(restr, [
        '_id',
        'name',
        'rating',
        'userId',
        'date',
        'cntryCd',
        'note',
        'location',
        'wishlist',
      ])
    );
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    res
      .status(400)
      .send(`Error posting the restaurant record, Error ${err._message}`);
  } finally {
    session.endSession();
  }
});

export default router;
