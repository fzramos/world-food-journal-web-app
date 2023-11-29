import request from 'supertest';
import { google } from 'googleapis';
import path from 'path';
import https from 'https';
import { Restaurant } from '../../server/models/restaurant';
import mongoose from 'mongoose';
import { User } from '../../server/models/user';
import CountryCount from '../../server/models/countryCount';
import winston from 'winston';
import _ from 'lodash';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let server;

function checkURL(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // adding 303 since Google Drive typically redirects to diff url for image
        if (res.statusCode === 200 || res.statusCode === 303) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .on('error', (err) => {
        // Handle HTTPS-specific errors
        if (err.code === 'ECONNREFUSED') {
          reject(new Error('Connection refused'));
        } else if (err.code === 'EHOSTUNREACH') {
          reject(new Error('Host unreachable'));
        } else {
          reject(err);
        }
      });
  });
}

describe('/api/image', () => {
  const user = new User();
  let token;
  let cntryCd;
  let cntryCdObjectId;
  let userId;
  let docId;
  let docType;
  let restrId;
  let hmId;
  let otherId;
  const credentialsPath = path.resolve(
    __dirname,
    '..',
    '..',
    'credentials.json'
  );

  beforeEach(async () => {
    const { default: myServer } = await import('../../server/server');
    server = myServer;

    userId = user._id;
    cntryCd = 'AFG';
    token = user.generateAuthToken();
    cntryCdObjectId = new mongoose.Types.ObjectId();
    restrId = new mongoose.Types.ObjectId();
    docId = restrId;
    docType = 'restaurant';

    // insert 1 into countryCount
    await CountryCount.create({
      _id: cntryCdObjectId,
      cntryCd: cntryCd,
      userId: userId,
      restr: 2,
      hm: 1,
      misc: 1,
      wishlist: 1,
    });

    await Restaurant.insertMany([
      {
        _id: restrId,
        name: 'A',
        userId,
        rating: 3,
        cntryCd: cntryCd,
        note: 'Decent',
        location: 'New York City',
        wishlist: false,
      },
      {
        name: 'B',
        userId,
        rating: 4,
        cntryCd: 'USA',
        note: 'Good',
        location: 'LA',
        wishlist: true,
      },
    ]);
  });
  afterEach(async () => {
    await server.close();
    await Restaurant.deleteMany({});
    await CountryCount.deleteMany({});

    // delete all files in the given Google Drive folder
    // Authenticate with Google Drive
    const googleAuth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive'],
      keyFile: credentialsPath,
    });
    const drive = google.drive({ version: 'v3', auth: googleAuth });

    async function deleteFiles() {
      let pageToken = '';
      let files;

      do {
        const response = await drive.files.list({
          q: `'${process.env.WFJ_gDriveFolderId}' in parents`,
          fields: 'nextPageToken, files(id)',
          pageToken,
        });

        files = response.data.files;
        pageToken = response.data.nextPageToken;

        for (const file of files) {
          await drive.files.delete({
            fileId: file.id,
          });
        }
      } while (pageToken);
    }

    await deleteFiles();
  });
  afterAll((done) => {
    mongoose.disconnect();
    done();
  });

  describe('POST /:docType/:id', () => {
    let newRestr;

    beforeEach(() => {
      newRestr = {
        name: 'Ab',
        rating: 5,
        cntryCd: cntryCd,
        note: 'Great',
        location: 'New York City',
        wishlist: false,
      };
    });

    function exec() {
      return request(server)
        .post(`/api/image/${docType}/${docId.toHexString()}`)
        .set('x-auth-token', token)
        .attach('image', 'tests/assets/paella-pic.jpg');
    }

    it('should return a 401 status if an unauthorized API call is made', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return a 200 status if a call is made with a valid JWT and image file', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return a working URL if a call is made with a valid JWT and image file', async () => {
      const res = await exec();
      let isWorking;
      try {
        isWorking = await checkURL(res.body.imgLink);
      } catch (err) {
        isWorking = false;
      }

      expect(isWorking).toBeTruthy();
    });

    it('should update the relevant document with the new image URL', async () => {
      const res = await exec();

      const restr = await Restaurant.findById(restrId);

      expect(restr.imgLinks).toHaveLength(1);
      expect(restr.imgLinks[0]).toBe(res.body.imgLink);
    });

    it('should update the target document to include the new imgLink which should be returned via GET /api/restaurants/:id call', async () => {
      const res = await exec();

      const getRestr = await request(server)
        .get(`/api/restaurants/entities/${docId.toHexString()}`)
        .set('x-auth-token', token);

      const index = res.body.index;
      expect(getRestr.body.imgLinks[index]).toBe(res.body.imgLink);
    });
    it('should return status 200 if an API call is made attempting to attache another image link to a document with an image link', async () => {
      await exec();
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should append a new image link to a document of a valid API call is made to document with an existing image link', async () => {
      const res1 = await exec();
      const res2 = await exec();

      const restr = await Restaurant.findById(restrId);

      expect(restr.imgLinks).toHaveLength(2);
      expect(restr.imgLinks[res1.body.index]).toBe(res1.body.imgLink);
      expect(restr.imgLinks[res2.body.index]).toBe(res2.body.imgLink);
    });

    it('should return a 400 code and a descriptive error if a non-image file is attempted to be uploaded', async () => {
      const res = await request(server)
        .post(`/api/image/${docType}/${docId.toHexString()}`)
        .set('x-auth-token', token)
        .attach('image', 'tests/assets/sample.txt');

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/image/i);
    });
    // test that multiple imgLinks can be created for Restr doc
    // test that a non image file wont be uploaded, and will have a descriptive error
  });
  // DELETE route

  // test that its actually deleted in drive
  // test that in restaurant collection list is accurate with deleted image
  // test that GET /api/restaurant retruns accurate imgLink list
});
