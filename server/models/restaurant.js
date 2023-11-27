import mongoose from 'mongoose';
import Joi from 'joi';

const restarauntSchema = new mongoose.Schema({
  name: {
    type: String,
    minLength: 1,
    maxLength: 200,
    trim: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  rating: {
    type: Number, // integer out of 5
    min: 0,
    max: 5,
    required: true,
  },
  date: {
    type: Date, // not necessarily the same as entry upload date
    default: () => new Date(Date.now()).setUTCHours(0, 0, 0, 0),
  },
  cntryCd: {
    type: String,
    min: 1,
    max: 5,
    required: true,
  },
  note: {
    type: String,
    max: 20000,
    // larger string
  },
  location: {
    type: String,
    min: 3,
    max: 200,
    // user can be as specific as they want
  },
  wishlist: {
    type: Boolean,
    default: false,
  },
});

const Restaraunt = mongoose.model('Restaraunt', restarauntSchema);

// userId will not be in API call, it will be taken from the JWT of the request
const validateRestaurant = (restr) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200).required(),
    rating: Joi.number().min(0).max(5).required(),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5).required(),
    note: Joi.string().max(20000), // long string
    location: Joi.string().min(3).max(200),
    wishlist: Joi.boolean(), // default false
  });

  return schema.validateAsync(restr);
};

// difference is nothing will be required since updating each property is optional
const validateRestaurantUpdate = (restr) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200),
    rating: Joi.number().min(0).max(5),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5),
    note: Joi.string().max(20000), // long string
    location: Joi.string().min(3).max(200),
    wishlist: Joi.boolean(), // default false
  });

  return schema.validateAsync(restr);
};

export {
  Restaraunt,
  validateRestaurant as validate,
  validateRestaurantUpdate as validateUpdate,
};
