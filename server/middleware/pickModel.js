import { Restaurant, Homemade } from '../models/meal.js';

export default async function (req, res, next) {
  const kind = req.params.kind;
  let modelObj;

  // winston.info('middleware kind');
  // winston.info();
  switch (kind) {
    case 'restr':
      modelObj = Restaurant;
      break;
    case 'hm':
      modelObj = Homemade;
      break;
  }
  // don't need default since we have another middleware
  // to validate kind param

  req.MealKindModel = modelObj;
  next();
}
