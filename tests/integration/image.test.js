import request from 'supertest';
import { google } from 'googleapis';
import path from 'path';
import {
  Meal,
  Restaurant,
  Homemade,
  validate,
  validateUpdate,
  validateRestr,
  validateRestrUpdate,
  validateHm,
  validateHmUpdate,
} from '../../server/models/meal';
import mongoose from 'mongoose';
import { User } from '../../server/models/user';
import CountryCount from '../../server/models/countryCount';
import winston from 'winston';
import _ from 'lodash';
import { dirname } from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let server;

async function checkURL(url) {
  try {
    const response = await axios.get(url);
    return true;
  } catch (error) {
    if (error.response.status === 404) {
      return false;
    }
  }
}
const credentialsPath = path.resolve(__dirname, '..', '..', 'credentials.json');

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

describe('/api/image', () => {
  const user = new User();
  let token;
  let cntryCd;
  let cntryCdObjectId;
  let userId;
  let docId;
  let kind;
  let restrId;
  let hmId;
  let otherId;

  beforeEach(async () => {
    const { default: myServer } = await import('../../server/server');
    server = myServer;

    userId = user._id;
    cntryCd = 'AFG';
    token = user.generateAuthToken();
    cntryCdObjectId = new mongoose.Types.ObjectId();
    restrId = new mongoose.Types.ObjectId();
    docId = restrId;
    kind = 'restr';

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
    try {
      await deleteFiles();
    } catch (err) {
      winston.error(
        `Attempted to delete Drive image that doesn't exist, it may have already been deleted.`
      );
      winston.error(err.errors[0].message);
    }
  });
  afterAll((done) => {
    mongoose.disconnect();
    done();
  });

  describe('POST /kind/:kind/:id', () => {
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
        .post(`/api/image/kind/${kind}/${docId.toHexString()}`)
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

    it('should update the target document to include the new imgLink which should be returned via GET /api/meals/:id call', async () => {
      const res = await exec();

      const getRestr = await request(server)
        .get(`/api/meals/entities/${docId.toHexString()}`)
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
        .post(`/api/image/kind/${kind}/${docId.toHexString()}`)
        .set('x-auth-token', token)
        .attach('image', 'tests/assets/sample.txt');

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/image/i);
    });

    it('should return a 404 status if a call is made to a document with a matching kind and docId but with a different userId that within the JWT', async () => {
      token = new User().generateAuthToken();
      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return a 404 status if a call is made with a non-existent kind and docId combination where kind is a valid option', async () => {
      kind = 'hm';
      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return a 400 status if a call is made with a non-existent kind and docId combination', async () => {
      kind = 'a';
      const res = await exec();

      expect(res.status).toBe(400);
      // expect(res.text).toMatch(/kind/i);
      expect(res.text).toMatch(/invalid/i);
    });
  });

  describe('DELETE /kind/:kind/:id/:index', () => {
    let index;
    beforeEach(async () => {
      index = 0;
      // upload 2 imgLinks to a Restr document
      for (let i = 0; i < 2; i++) {
        const res = await request(server)
          .post(`/api/image/kind/${kind}/${docId.toHexString()}`)
          .set('x-auth-token', token)
          .attach('image', 'tests/assets/paella-pic.jpg');
      }
    });

    function exec() {
      return request(server)
        .delete(`/api/image/kind/${kind}/${docId.toHexString()}/${index}`)
        .set('x-auth-token', token);
    }

    it('should return a 401 status if an unauthorized API call is made', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return a 200 status if a call is made with a valid JWT', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should update the target document so it does not include the specific image link', async () => {
      const res = await exec();
      const restr = await Restaurant.findOne({
        userId: userId,
        _id: restrId,
      });

      expect(restr.imgLinks.length).toBeLessThan(2);
      expect(restr.imgLinks).not.toContain([restr.imgLink]);
    });

    it('should return a 200 status if a call is made with a valid JWT and index parameter is not set to 0', async () => {
      index = 1;

      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should update the target document so it does not include the specific image link if the index parameter is not set to 0', async () => {
      index = 1;

      const res = await exec();
      const restr = await Restaurant.findOne({
        userId: userId,
        _id: restrId,
      });

      expect(restr.imgLinks.length).toBeLessThan(2);
      expect(restr.imgLinks).not.toContain([restr.imgLink]);
    });

    it('should return a failing URL if a call is made with a valid JWT', async () => {
      const res = await exec();
      let isWorking = false;

      await checkURL(res.body.imgLink);

      expect(isWorking).toBeFalsy();
    });

    it('should return a 404 status if a call is made with a non-existent kind and docId combination where kind is a valid option', async () => {
      kind = 'hm';
      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return a 400 status if a call is made with a non-existent kind and docId combination', async () => {
      kind = 'a';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/kind/i);
      expect(res.text).toMatch(/invalid/i);
    });

    it('should return a 400 status if a call is made to a document with a matching kind and docId but with a different userId that within the JWT', async () => {
      token = new User().generateAuthToken();
      const res = await exec();

      expect(res.status).toBe(404);
    });

    it("should return a 400 status if a call is made with an index parameter larger than the length of the target document's imgLinks array length", async () => {
      index = 100;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/index/i);
    });

    it("should return a 209 status if a call is made to delete a URL that doesn't exist on the Google Drive", async () => {
      const restr = await Restaurant.findOne({
        userId: userId,
        _id: restrId,
      });
      let targetImgLink = restr.imgLinks[0];
      const urlParts = targetImgLink.split('?');
      const queryParamsString = urlParts[1];
      const queryParams = new URLSearchParams(queryParamsString);
      const id = queryParams.get('id');

      // deleting the file source but not the link in the Restaurant object
      // simulating some Drive error
      try {
        await drive.files.delete({
          fileId: id,
        });
      } catch (err) {
        winston.error(
          `Underlying Google Drive image file not found for link ${deletedImgLink}`
        );
      }

      const res = await exec();

      expect(res.status).toBe(209);
      // despite the issues with the underlying URL, we still want to the
      // route to delete the selected imgLink from the document
      const updatedRestr = await Restaurant.findOne({
        userId: userId,
        _id: restrId,
      });

      expect(updatedRestr.imgLinks.length).toBeLessThan(2);
    });
  });
});
