import express from 'express';
const router = express.Router();
import multer from 'multer';
import fs from 'fs';
import fsPromises from 'fs/promises';
import winston from 'winston';
import { google } from 'googleapis';
import { Restaurant } from '../models/restaurant.js';
import auth from '../middleware/auth.js';
import { Homemade } from '../models/homemade.js';
// import { Other } from '../models/other.js'
import { env } from 'custom-env';
env();
import 'dotenv/config';
import path from 'path';
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
const credentialsPath = path.resolve(__dirname, '..', '..', 'credentials.json');

// Authenticate with Google Drive
const googleAuth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive'],
  keyFile: credentialsPath,
});
const drive = google.drive({ version: 'v3', auth: googleAuth });

// Define image upload endpoint
router.post(
  '/:docType/:id',
  [auth, upload.single('image'), validateImgFile],
  async (req, res) => {
    // Get uploaded image file
    const file = req.file;

    // Create a read stream for the image file
    const readStream = fs.createReadStream(file.path);

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

      let doc;
      if (req.params.docType.toLowerCase() === 'restaurant') {
        doc = await Restaurant.findOneAndUpdate(
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
      } else if (req.params.docType.toLowerCase() === 'homemade') {
        doc = await Homemade.findOneAndUpdate(
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
      } else if (req.params.docType.toLowerCase() === 'other') {
        doc = await Other.findOneAndUpdate(
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
      } else {
        return res
          .status(400)
          .send(
            'docType request parameter is invalid, please use 1 of "restaurant", "homemade", or "other"'
          );
      }
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
        await fsPromises.unlink(file.path);
      } catch (err) {
        winston.error('Error deleting file from local storage:', err);
      }
    }
  }
);

router.delete(
  '/:docType/:id/:index',
  [validateObjectId, auth],
  async (req, res) => {
    const { id, index } = req.params;

    // Convert index to a number
    const indexNum = parseInt(index);

    let doc;
    // user should only be able to update a document if its associated with their account
    // (ie the userId in the request's JWT)
    if (req.params.docType.toLowerCase() === 'restaurant') {
      doc = await Restaurant.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });
    } else if (req.params.docType.toLowerCase() === 'homemade') {
      doc = await Homemade.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });
    } else if (req.params.docType.toLowerCase() === 'other') {
      doc = await Other.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });
    } else {
      return res
        .status(400)
        .send(
          'docType request parameter is invalid, please use 1 of "restaurant", "homemade", or "other"'
        );
    }
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
