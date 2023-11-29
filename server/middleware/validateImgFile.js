import winston from 'winston';
// Middleware to check file mimetype
// const isImageFile = (req, file, cb) => {
//   const allowedMimetypes = ['image/jpeg', 'image/png', 'image/gif'];

//   if (!allowedMimetypes.includes(file.mimetype)) {
//     return cb(new Error('Only image files are allowed'));
//   }

//   cb(null, true);
// };

export default function (req, res, next) {
  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (!allowedMimetypes.includes(req.file.mimetype)) {
    return res.status(400).send('Only image files are allowed.');
  }
  return next();
}
