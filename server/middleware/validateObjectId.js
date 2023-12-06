import { Types } from 'mongoose';

// many routes need to check if a MongoDb objectId is valid, making it a middleware
// so we don't have repetitive code
export default function (req, res, next) {
  if (!Types.ObjectId.isValid(req.params.id))
    return res.status(400).send('Invalid id');
  return next();
}
