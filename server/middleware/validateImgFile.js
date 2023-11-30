import winston from 'winston';
import fsPromises from 'fs/promises';

export default async function (req, res, next) {
  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (!allowedMimetypes.includes(req.file.mimetype)) {
    // Get the file path from the Multer upload object
    // Delete uploaded image file from temporary storage
    try {
      await fsPromises.unlink(req.file.path);
    } catch (err) {
      winston.error('Error deleting file from local storage:', err);
    }
    return res.status(400).send('Only image files are allowed.');
  }
  return next();
}
