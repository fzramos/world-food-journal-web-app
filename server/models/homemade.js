import mongoose from 'mongoose';
import Joi from 'joi';

const HomecookSchema = new mongoose.Schema({
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
    type: Number,
    min: 0,
    max: 5,
    required: true,
  },
  link: {
    type: String,
    max: 1000,
  },
  date: {
    type: Date,
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
  },
  difficulty: {
    type: Number,
    min: 0,
    max: 5,
    default: 3,
  },
  wishlist: {
    type: Boolean,
    default: false,
  },
});

HomecookSchema.path('link').validate((val) => {
  urlRegex =
    /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
  return urlRegex.test(val);
}, 'Invalid URL.');

const Homecook = mongoose.model('Homecook', HomecookSchema);

// userId will not be in API call, it will be taken from the JWT of the request
const validateHomecook = (hm) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200).required(),
    rating: Joi.number().min(0).max(5).required(),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5).required(),
    note: Joi.string().max(20000),
    difficulty: Joi.number().min(0).max(5),
    wishlist: Joi.boolean(),
  });

  return schema.validateAsync(hm);
};

// difference is nothing will be required since updating each property is optional
const validateHomecookUpdate = (hm) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200),
    rating: Joi.number().min(0).max(5),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5),
    note: Joi.string().max(20000),
    difficulty: Joi.number().min(0).max(5),
    wishlist: Joi.boolean(),
  });

  return schema.validateAsync(hm);
};

export {
  Homecook,
  validateHomecook as validate,
  validateHomecookUpdate as validateUpdate,
};
