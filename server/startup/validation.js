import Joi from 'joi';
import joiObjectid from 'joi-objectid';

// add an ObjectId validator to Joi
// Since some of our routes will take Objectid as a param
export default function () {
  Joi.objectId = joiObjectid(Joi);
}
