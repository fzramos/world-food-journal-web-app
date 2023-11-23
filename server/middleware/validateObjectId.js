import mongoose from 'mongoose';

// many routes need to check if a MongoDb objectId is valid, making it a middleware
// so we don't have repetitive code
export default function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send('Invalid id');
  return next();
}