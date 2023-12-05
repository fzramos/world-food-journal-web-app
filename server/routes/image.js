import { Router } from 'express';
const router = Router();
import multer from 'multer';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import winston from 'winston';
import { google } from 'googleapis';
import auth from '../middleware/auth.js';
import validateKind from '../middleware/validateKind.js';
import pickModel from '../middleware/pickModel.js';
import { env } from 'custom-env';
env();
import 'dotenv/config';
import { resolve as pathResolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import validateImgFile from '../middleware/validateImgFile.js';
import validateObjectId from '../middleware/validateObjectId.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configure multer middleware for file upload
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
  limits: {
    files: 1,
    fileSize: 1024 * 1024,
  },
});
const upload = multer({ storage: storage });
const credentialsPath = pathResolve(__dirname, '..', '..', 'credentials.json');

// Authenticate with Google Drive
const googleAuth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive'],
  keyFile: credentialsPath,
});
const drive = google.drive({ version: 'v3', auth: googleAuth });

// Define image upload endpoint
router.post(
  '/kind/:kind/:id',
  [validateKind, pickModel, auth, upload.single('image'), validateImgFile],
  async (req, res) => {
    // Get uploaded image file
    const file = req.file;

    // Create a read stream for the image file
    const readStream = createReadStream(file.path);

    // Upload image to Google Drive
    const uploadParams = {
      resource: {
        name: file.originalname,
        parents: [process.env.WFJ_gDriveFolderId],
      },
      media: {
        mimeType: file.mimetype,
        body: readStream,
      },
    };

    try {
      const response = await drive.files.create(uploadParams);
      const fileId = response.data.id;

      // Generate publicly accessible image URL
      const fileUrl = `https://drive.google.com/uc?id=${fileId}`;

      let doc = await req.MealKindModel.findOneAndUpdate(
        {
          _id: req.params.id,
          userId: req.user._id,
        },
        {
          $push: { imgLinks: fileUrl },
        },
        {
          new: true,
        }
      );

      if (!doc) {
        return res
          .status(404)
          .send(
            `Could not find document associated with given ObjectId ${req.params.id}. Either user doesn't have access to the document, incorrect document type was given, or the document doesn't exists.`
          );
      }
      // Send generated image URL to frontend
      res.json({
        index: doc.imgLinks.length - 1,
        imgLink: fileUrl,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error uploading image');
    } finally {
      // Delete uploaded image file from temporary storage
      try {
        await unlink(file.path);
      } catch (err) {
        winston.error('Error deleting file from local storage:', err);
      }
    }
  }
);

router.delete(
  '/kind/:kind/:id/:index',
  [validateKind, pickModel, validateObjectId, auth],
  async (req, res) => {
    const { id, index } = req.params;

    // Convert index to a number
    const indexNum = parseInt(index);

    let doc = await req.MealKindModel.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!doc) {
      return res
        .status(404)
        .send(
          `Could not find document associated with given ObjectId ${req.params.id}. Either user doesn't have access to the document, incorrect document type was given, or the document doesn't exists.`
        );
    }
    // check that given index is within length of imgLinks of doc
    // Check if the index is valid
    if (index < 0 || index >= doc.imgLinks.length) {
      return res.status(400).send('Invalid index');
    }

    const deletedImgLink = doc.imgLinks[index];
    // Remove the item from the array at the specified index
    doc.imgLinks.splice(indexNum, 1);

    // Save the updated document
    await doc.save();

    // delete the file from Google Drive
    // Authenticate with Google Drive
    if (deletedImgLink) {
      const urlParts = deletedImgLink.split('?');
      const queryParamsString = urlParts[1];
      const queryParams = new URLSearchParams(queryParamsString);
      const id = queryParams.get('id');

      try {
        await drive.files.delete({
          fileId: id,
        });
      } catch (err) {
        winston.error(
          `Underlying Google Drive image file not found for link ${deletedImgLink} despite the URL being stored in MongoDB.`
        );
        return res
          .status(209)
          .set(
            'Warning',
            "imgLink removed from requested document but couldn't delete image from Google Drive, likely because the image doesn't exist anymore."
          )
          .json({
            index: indexNum,
            imgLink: deletedImgLink,
          });
      }
    }

    res.status(200).json({
      index: indexNum,
      imgLink: deletedImgLink,
    });
  }
);

export default router;
