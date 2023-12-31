import { Router } from 'express';
const router = Router();
import { Types } from 'mongoose';
import CountryCount from '../models/countryCount.js';
import auth from '../middleware/auth.js';
const ObjectId = Types.ObjectId;

// only validated users should be able to use this route
// and they will get all of their country count values (no other users)
// return will be max an array of <300 items
router.get('/', auth, async (req, res) => {
  const objId = new ObjectId(req.user._id);
  const countryCounts = await CountryCount.find({ userId: objId }).select(
    '-__v'
  );

  res.send(countryCounts);
});

router.get('/:cntryCd', auth, async (req, res) => {
  const objId = new ObjectId(req.user._id);
  const countryCount = await CountryCount.findOne({
    userId: objId,
    cntryCd: req.params.cntryCd,
  }).select('-__v');

  if (!countryCount)
    return res
      .status(404)
      .send(
        `Country count for username ${req.user.name} and country code ${req.params.cntryCd} not found.`
      );

  res.send(countryCount);
});

export default router;
