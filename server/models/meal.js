import { Schema, model } from 'mongoose';
import Joi from 'joi';

const options = { discriminatorKey: 'kind' };

const MealSchema = new Schema(
  {
    name: {
      type: String,
      minLength: 1,
      maxLength: 200,
      trim: true,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    kind: {
      type: String,
      required: true,
      enum: ['hm', 'restr', 'other'],
    },
    wishlist: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number, // integer out of 5
      min: 0,
      max: 5,
    },
    date: {
      type: Date, // not necessarily the same as entry upload date
      default: () => new Date().setUTCHours(0, 0, 0, 0),
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
    favorite: {
      type: Boolean,
      default: false,
    },
    imgLinks: [
      {
        type: String,
        max: 10000,
      },
    ],
  },
  options
);

// runs after the save
MealSchema.post('validate', async function (doc, next) {
  if (!doc.wishlist && !('rating' in doc)) {
    return next(
      new Error('The "rating" property is required for non-wishlist products')
    );
  }
  next();
});

// fix these names of collections
export const Meal = model('Meal', MealSchema);

export const Restaurant = Meal.discriminator(
  'restr',
  new Schema(
    {
      location: {
        type: String,
        min: 2,
        max: 200,
      },
    },
    options
  )
);

export const Homemade = Meal.discriminator(
  'hm',
  new Schema(
    {
      link: {
        type: String,
        max: 1000,
      },
      difficulty: {
        type: Number,
        min: 0,
        max: 5,
        default: 3,
      },
    },
    options
  )
);

// same schema as Meal
export const Other = Meal.discriminator('other', new Schema({}, options));

export const validateRestr = (restr) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200).required(),
    rating: Joi.number().min(0).max(5).when('wishlist', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    // kind will be take from API params
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5).required(),
    note: Joi.string().max(20000),
    location: Joi.string().min(3).max(200),
    wishlist: Joi.boolean().default(false),
    favorite: Joi.boolean().default(false),
  });

  return schema.validateAsync(restr);
};

// difference is nothing will be required since updating each property is optional
export const validateRestrUpdate = (restr) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200),
    kind: Joi.string().valid('restr'),
    rating: Joi.number().min(0).max(5),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5),
    note: Joi.string().max(20000),
    location: Joi.string().min(3).max(200),
    wishlist: Joi.boolean(),
    favorite: Joi.boolean().default(false),
  });

  return schema.validateAsync(restr);
};

export const validateHm = (hm) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200).required(),
    rating: Joi.number().min(0).max(5).when('wishlist', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    link: Joi.string().max(1000).uri(),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5).required(),
    note: Joi.string().max(20000),
    difficulty: Joi.number().min(0).max(5).default(3),
    wishlist: Joi.boolean().default(false),
    favorite: Joi.boolean().default(false),
  });

  return schema.validateAsync(hm);
};

export const validateHmUpdate = (hm) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200),
    rating: Joi.number().min(0).max(5).when('wishlist', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    kind: Joi.string().valid('hm'),
    link: Joi.string().max(1000).uri(),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5),
    note: Joi.string().max(20000),
    difficulty: Joi.number().min(0).max(5),
    wishlist: Joi.boolean(),
    favorite: Joi.boolean(),
  });

  return schema.validateAsync(hm);
};

export const validateOther = (other) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200).required(),
    rating: Joi.number().min(0).max(5).when('wishlist', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5).required(),
    note: Joi.string().max(20000),
    wishlist: Joi.boolean().default(false),
    favorite: Joi.boolean().default(false),
  });

  return schema.validateAsync(other);
};

export const validateOtherUpdate = (other) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(200),
    rating: Joi.number().min(0).max(5).when('wishlist', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    kind: Joi.string().valid('other'),
    date: Joi.date(),
    cntryCd: Joi.string().min(1).max(5),
    note: Joi.string().max(20000),
    wishlist: Joi.boolean(),
    favorite: Joi.boolean(),
  });

  return schema.validateAsync(other);
};
