import { Router } from 'express';
import { setWith, merge, pick } from 'lodash';
const router = Router();
import { Restaurant, validate, validateUpdate } from '../models/restaurant.js';
import auth from '../middleware/auth.js';
import validateObjectId from '../middleware/validateObjectId.js';
import winston from 'winston';
import { Types, startSession } from 'mongoose';
import CountryCount from '../models/countryCount.js';
const ObjectId = Types.ObjectId;

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

function isNumeric(str) {
  return !isNaN(str) && !isNaN(parseFloat(str));
}

router.get('/', auth, async (req, res) => {
  const objId = new ObjectId(req.user._id);
  const query = { userId: objId };

  if (req.query.wishlist) {
    query.wishlist = req.query.wishlist === 'true';
  }

  if (req.query.minRating) {
    if (isNumeric(req.query.minRating)) {
      setWith(query, ['rating', '$gte'], parseInt(req.query.minRating));
    } else {
      return res
        .status(400)
        .send(
          `minRating query parameter has an invalid format, please use an interger between 0 and 5`
        );
    }
  }

  if (req.query.maxRating) {
    if (isNumeric(req.query.maxRating)) {
      setWith(query, ['rating', '$lte'], parseInt(req.query.maxRating));
    } else {
      return res
        .status(400)
        .send(
          `maxRating query parameter has an invalid format, please use an interger between 0 and 5`
        );
    }
  }

  if (req.query.cntryCd) {
    query.cntryCd = req.query.cntryCd;
  }

  if (req.query.name) {
    query.name = new RegExp(`.*${req.query.name}.*`, 'i');
  }

  if (req.query.minDateUTC) {
    try {
      setWith(
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
      setWith(
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

  const restrs = await Restaurant.find(query).select('-__v');

  res.send(restrs);
});

router.get('/entities/:id', [validateObjectId, auth], async (req, res) => {
  const objId = new ObjectId(req.user._id);

  const restr = await Restaurant.findOne({
    _id: new ObjectId(req.params.id),
    userId: objId,
  }).select('-__v');

  if (!restr) {
    return res
      .status(404)
      .send('No record matching ID ${req.params.id} for ${req.user.name}');
  }

  res.json(restr);
});

// the function of this route can be done by the above GET / route with the cntryCd query param
// just wanted a route that clearly denotes filtering by cntryCd since that is what the web app
// will mostly require
router.get('/countryCodes/:cntryCd', auth, async (req, res) => {
  const objId = new ObjectId(req.user._id);

  const query = {
    userId: objId,
    cntryCd: req.params.cntryCd,
  };

  if (req.query.wishlist) {
    query.wishlist = req.query.wishlist === 'true';
  }

  if (req.query.minRating) {
    if (isNumeric(req.query.minRating)) {
      setWith(query, ['rating', '$gte'], parseInt(req.query.minRating));
    } else {
      return res
        .status(400)
        .send(
          `minRating query parameter has an invalid format, please use an interger between 0 and 5`
        );
    }
  }

  if (req.query.maxRating) {
    if (isNumeric(req.query.maxRating)) {
      setWith(query, ['rating', '$lte'], parseInt(req.query.maxRating));
    } else {
      return res
        .status(400)
        .send(
          `maxRating query parameter has an invalid format, please use an interger between 0 and 5`
        );
    }
  }

  if (req.query.name) {
    query.name = new RegExp(`.*${req.query.name}.*`, 'i');
  }

  if (req.query.minDateUTC) {
    try {
      setWith(
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
      setWith(
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

  const restrs = await Restaurant.find(query).select('-__v');

  return res.send(restrs);
});

router.delete('/entities/:id', [auth, validateObjectId], async (req, res) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const restr = await Restaurant.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    }).select('-__v');

    if (!restr)
      return res
        .status(404)
        .send(
          `Restaurant record with ID ${req.params.id} not found for user ${req.user.name}`
        );

    const userId = new ObjectId(req.user._id);
    let countryCount = await CountryCount.findOne({
      userId,
      cntryCd: restr.cntryCd,
    });

    if (!countryCount) {
      winston.error(
        `User id ${req.user._id} and cntryCd ${restr.cntryCd} combination have a Restaurant document but not a CountryCd collection value. Please review.`
      );
      throw new Error('Problem in deleting restaurant record');
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
    winston.info('Error deleting the restaurant record');
    winston.error(err);
    res.status(400).send(`Error deleting the restaurant record, Error ${err}`);
  } finally {
    session.endSession();
  }
});

router.put('/entities/:id', [auth, validateObjectId], async (req, res) => {
  try {
    await validateUpdate(req.body);
  } catch (err) {
    return res.status(400).send(err.details[0].message);
  }

  const session = await startSession();
  session.startTransaction();
  try {
    const userId = new ObjectId(req.user._id);

    // Old restr document
    let restr = await Restaurant.findOne({
      _id: req.params.id,
      userId: userId,
    });

    if (!restr)
      return res
        .status(404)
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
    restr = merge(
      restr,
      pick(req.body, [
        'name',
        'rating',
        'date',
        'cntryCd',
        'note',
        'location',
        'wishlist',
      ])
    );
    await restr.save();

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
  const session = await startSession();
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

    const restrProps = pick(req.body, [
      'name',
      'rating',
      'date',
      'cntryCd',
      'note',
      'location',
      'wishlist',
    ]);
    restrProps.userId = userId;

    const restr = new Restaurant(restrProps);
    restr.save();

    res.send(
      pick(restr, [
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
