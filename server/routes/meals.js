import { Router } from 'express';
// import { setWith, merge, pick, omit } from 'lodash-es';
import { setWith, merge, pick, omit } from 'lodash';
const router = Router();
import {
  Meal,
  validateRestr,
  validateRestrUpdate,
  validateHm,
  validateHmUpdate,
} from '../models/meal.js';
import auth from '../middleware/auth.js';
import validateKind from '../middleware/validateKind.js';
import pickModel from '../middleware/pickModel.js';
import validateObjectId from '../middleware/validateObjectId.js';
import winston from 'winston';
import { Types, startSession } from 'mongoose';
import CountryCount from '../models/countryCount.js';
import { MongoCryptCreateEncryptedCollectionError } from 'mongodb';
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

  if (req.query.minDiff) {
    if (isNumeric(req.query.minDiff)) {
      setWith(query, ['difficulty', '$gte'], parseInt(req.query.minDiff));
    } else {
      return res
        .status(400)
        .send(
          `minDiff query parameter has an invalid format, please use an interger between 0 and 5`
        );
    }
  }

  if (req.query.maxDiff) {
    if (isNumeric(req.query.maxDiff)) {
      setWith(query, ['difficulty', '$lte'], parseInt(req.query.maxDiff));
    } else {
      return res
        .status(400)
        .send(
          `maxDiff query parameter has an invalid format, please use an interger between 0 and 5`
        );
    }
  }

  // Extract the "cntryCd" query parameter values into an array
  const cntryCds = req.query.cntryCd || [];

  if (cntryCds.length) {
    query.cntryCd = { $in: cntryCds };
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

  const meals = await Meal.find(query).select('-__v');

  res.send(meals);
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

  if (req.query.minDiff) {
    if (isNumeric(req.query.minDiff)) {
      setWith(query, ['difficulty', '$gte'], parseInt(req.query.minDiff));
    } else {
      return res
        .status(400)
        .send(
          `minDiff query parameter has an invalid format, please use an interger between 0 and 5`
        );
    }
  }

  if (req.query.maxDiff) {
    if (isNumeric(req.query.maxDiff)) {
      setWith(query, ['difficulty', '$lte'], parseInt(req.query.maxDiff));
    } else {
      return res
        .status(400)
        .send(
          `maxDiff query parameter has an invalid format, please use an interger between 0 and 5`
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

  const meals = await Meal.find(query).select('-__v');

  return res.send(meals);
});

router.get('/entities/:id', [validateObjectId, auth], async (req, res) => {
  const objId = new ObjectId(req.user._id);

  const meal = await Meal.findOne({
    _id: new ObjectId(req.params.id),
    userId: objId,
  }).select('-__v');

  if (!meal) {
    return res
      .status(404)
      .send('No record matching ID ${req.params.id} for ${req.user.name}');
  }

  res.json(meal);
});

router.get('/kind/:kind', [validateKind, auth], async (req, res) => {
  const objId = new ObjectId(req.user._id);
  const meals = await Meal.find({
    userId: objId,
    kind: req.params.kind,
  }).select('-__v');

  res.json(meals);
});

router.delete('/entities/:id', [auth, validateObjectId], async (req, res) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const meal = await Meal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    }).select('-__v');

    if (!meal)
      return res
        .status(404)
        .send(
          `Restaurant record with ID ${req.params.id} not found for user ${req.user.name}`
        );

    const userId = new ObjectId(req.user._id);
    let countryCount = await CountryCount.findOne({
      userId,
      cntryCd: meal.cntryCd,
    });

    if (!countryCount) {
      winston.error(
        `User id ${req.user._id} and cntryCd ${meal.cntryCd} combination have a Restaurant document but not a CountryCd collection value. Please review.`
      );
      throw new Error('Problem in deleting restaurant record');
    } else if (meal.wishlist) {
      countryCount.wishlist--;
      await countryCount.save();
    } else {
      countryCount[meal.kind]--;
      await countryCount.save();
    }

    res.send(meal);
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

router.put(
  '/kind/:kind/entities/:id',
  [validateKind, validateObjectId, pickModel, auth],
  async (req, res) => {
    const kind = req.params.kind;

    try {
      // if user is trying to update a meal doc to a different kind
      if (req.body.hasOwnProperty('kind')) {
        if (kind !== req.body.kind) {
          return res.status(400).send("Cannot update an item's kind");
        }
        // TODO: delete old and create with old's valid values
        // then update, if the kind is trying to be updated
      }

      let validateFn;

      switch (kind) {
        case 'restr':
          validateFn = validateRestrUpdate;
          break;
        case 'hm':
          validateFn = validateHmUpdate;
          break;
        default:
          return res.status(400).send('Invalid type');
      }

      await validateFn(req.body);
    } catch (err) {
      return res.status(400).send(err.details[0].message);
    }

    const session = await startSession();
    session.startTransaction();
    try {
      const userId = new ObjectId(req.user._id);
      const { MealKindModel } = req;

      // Old meal document
      let meal = await MealKindModel.findOne({
        _id: req.params.id,
        userId: userId,
      });

      if (!meal)
        return res
          .status(404)
          .send(
            `Restaurant record with ID ${req.params.id} not found or not associated with user ${req.user._id}`
          );
      let countryCount = await CountryCount.findOne({
        userId,
        cntryCd: meal.cntryCd,
      });
      // if update is changing wishlist boolean, need to change countryCount object appropriately
      if (meal.wishlist !== req.body.wishlist) {
        if (req.body.wishlist) {
          countryCount[kind]--;
          countryCount.wishlist++;
        } else {
          countryCount.wishlist--;
          countryCount[req.params.kind]++;
        }
      }
      countryCount.save();

      // can't use findByIdAndUpdate because users should only be able to modify
      // their own data
      meal = merge(
        meal,
        pick(req.body, [
          'name',
          'rating',
          'date',
          'cntryCd',
          'note',
          'location',
          'wishlist',
          'favorite',
        ])
      );

      await meal.save();

      res.send(omit(meal, ['__v']));
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      res
        .status(400)
        .send(`Error posting the meal record, Error ${err._message}`);
    } finally {
      session.endSession();
    }
  }
);

router.post(
  '/kind/:kind',
  [validateKind, pickModel, auth],
  async (req, res) => {
    const kind = req.params.kind;
    try {
      let validateFn;

      switch (kind) {
        case 'restr':
          validateFn = validateRestr;
          break;
        case 'hm':
          validateFn = validateHm;
          break;
        default:
          return res
            .status(400)
            .send('Invalid kind chosen. Please use "restr", "hm", or "other"');
      }

      await validateFn(req.body);
    } catch (err) {
      return res.status(400).send(err.details[0].message);
    }
    // need a session since when I post here, I need to update the countryCount collection as well
    // if Restaurant post fails, I don't want to update the countryCount
    const session = await startSession();
    session.startTransaction();
    try {
      const userId = new ObjectId(req.user._id);
      const { MealKindModel } = req;
      let countryCount = await CountryCount.findOne({
        userId,
        cntryCd: req.body.cntryCd,
      });

      if (!countryCount && !req.body.wishlist) {
        // this mean this is the first journal entry for this country
        countryCount = new CountryCount({
          cntryCd: req.body.cntryCd,
          userId,
          [kind]: 1,
        });
      } else if (!countryCount && req.body.wishlist) {
        countryCount = new CountryCount({
          cntryCd: req.body.cntryCd,
          userId,
          wishlist: 1,
        });
      } else if (countryCount && !req.body.wishlist) {
        countryCount[kind]++;
      } else {
        countryCount.wishlist++;
      }
      await countryCount.save();

      const mealProps = req.body;
      mealProps.userId = userId;

      const meal = new MealKindModel(mealProps);
      await meal.save();

      res.send(omit(meal, ['__v']));
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      res
        .status(400)
        .send(`Error posting the meal record, Error ${err._message}`);
    } finally {
      session.endSession();
    }
  }
);

export default router;
