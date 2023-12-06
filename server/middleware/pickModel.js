import { Restaurant, Homemade, Other } from '../models/meal.js';

export default async function (req, res, next) {
  const kind = req.params.kind;
  let modelObj;

  switch (kind) {
    case 'restr':
      modelObj = Restaurant;
      break;
    case 'hm':
      modelObj = Homemade;
      break;
    case 'other':
      modelObj = Other;
      break;
  }
  // don't need default since we have another middleware
  // to validate kind param

  req.MealKindModel = modelObj;
  next();
}
