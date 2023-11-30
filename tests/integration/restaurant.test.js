import request from 'supertest';
import { Restaurant } from '../../server/models/restaurant';
import mongoose from 'mongoose';
import { User } from '../../server/models/user';
import CountryCount from '../../server/models/countryCount';
import winston from 'winston';
import _ from 'lodash';
let server;

describe('/api/restaurants', () => {
  const user = new User();
  let token;
  let cntryCd;
  let cntryCdObjectId;
  let userId;
  let restrId;
  let date7dAgo;
  let date6dAgo;
  let dateOnedAgo;
  let currentDate;
  let query;

  beforeEach(async () => {
    const { default: myServer } = await import('../../server/server');
    server = myServer;

    userId = user._id;
    cntryCd = 'AFG';
    token = user.generateAuthToken();
    cntryCdObjectId = new mongoose.Types.ObjectId();
    restrId = new mongoose.Types.ObjectId();
    currentDate = new Date();
    dateOnedAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    dateOnedAgo.setUTCHours(0, 0, 0, 0);
    date7dAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    date7dAgo.setUTCHours(0, 0, 0, 0);
    date6dAgo = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000);
    date6dAgo.setUTCHours(0, 0, 0, 0);
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
        wishlist: true,
      },
      {
        name: 'B',
        userId,
        rating: 4,
        cntryCd: 'USA',
        note: 'Good',
        date: date7dAgo,
        location: 'LA',
        wishlist: false,
      },
      {
        name: 'C',
        userId: new mongoose.Types.ObjectId(),
        rating: 4,
        cntryCd: cntryCd,
        note: 'Good',
        wishlist: true,
      },
    ]);
  });
  afterEach(async () => {
    await server.close();
    await Restaurant.deleteMany({});
    await CountryCount.deleteMany({});
  });
  afterAll(() => {
    mongoose.disconnect();
  });

  describe('GET /', () => {
    beforeEach(() => {
      query = {};
    });

    function exec() {
      return request(server)
        .get('/api/restaurants')
        .query(query)
        .set('x-auth-token', token);
    }

    it('should return a 200 status if a valid API request is made', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return the correct list of the restraurant documents if a valid API request is made', async () => {
      // const res = await request(server).get('/api/restaurants').set('x-auth-token', token)
      const res = await exec();

      expect(res.body).toHaveLength(2);
    });

    it('should return a 401 status if an unauthorized API request is made', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it("should return 0 documents if the requesting user doesn't have any documents in the Restaurant collection", async () => {
      token = new User().generateAuthToken();

      const res = await exec();

      expect(res.body).toHaveLength(0);
    });

    it('should return all documents for the user that match the wishlist query parameter if a valid API call is made', async () => {
      query = { wishlist: true };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].wishlist).toBe(true);
    });

    it('should return all documents for the user and cntryCd that have a rating equal to or larger than the value from the minRating query parameter value', async () => {
      query = { minRating: 4 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBeGreaterThanOrEqual(4);
    });

    it('should return all documents for the user and cntryCd that have a rating less than or equal to the value from the maxRating query parameter value', async () => {
      query = { maxRating: 3 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBeLessThanOrEqual(3);
    });

    it('should return all documents for the user and cntryCd that have a rating within the range as specified by the minRating and maxRating query parameter value', async () => {
      query = { minRating: 4, maxRating: 5 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBe(4);
    });

    it('should return a status 400 code if the maxRating query parameter value is invalid', async () => {
      query = { maxRating: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/maxRating/i);
    });

    it('should return a status 400 code if the minRating query parameter value is invalid', async () => {
      query = { minRating: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/minRating/i);
    });

    it('should return all documents for the user that have a coutry code matching the cntryCd query parameter value if a valid API call is made', async () => {
      query = { cntryCd: cntryCd };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].cntryCd).toBe(cntryCd);
    });

    it('should return all documents for the user that have a name containing the substring from the name query parameter value if a valid API call is made', async () => {
      query = { name: 'a' };

      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toMatch(/a/i);
    });

    it('should return a 400 error with a descriptive message if an invalid minDateUTC query param value is passed', async () => {
      query = { minDateUTC: 'aaa' };
      const res = await exec();
      // request(server)
      //   .get(`/api/restaurants`)
      //   .query({ minDateUTC: 'aaa' })
      //   .set('x-auth-token', token);
      expect(res.status).toBe(400);
      expect(res.text).toContain('date');
      expect(res.text).toContain('invalid');
    });

    it('should return a 400 error with a descriptive message if an invalid maxDateUTC query param value is passed', async () => {
      query = { maxDateUTC: 'aaa' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('date');
      expect(res.text).toContain('invalid');
    });

    it('should return all documents for the user that have a date later than the minDateUTC query parameter value if a valid API call is made', async () => {
      // setting query value to 6 days ago
      // which should exclude one of the user's records
      const date6dAgoString = date6dAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      query = { minDateUTC: date6dAgoString };

      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(restrId.toHexString());
      expect(new Date(res.body[0].date).getTime()).toBeGreaterThanOrEqual(
        date6dAgo.getTime()
      );
    });

    it('should return all documents for the user that a have date earlier than the maxDateUTC query parameter value if a valid API call is made', async () => {
      // setting query value to 6 days ago
      // which should exclude one of the user's records
      const dateOnedAgoString = dateOnedAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      query = { maxDateUTC: dateOnedAgoString };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).not.toBe(restrId.toHexString());
      expect(new Date(res.body[0].date).getTime()).toBeLessThan(
        dateOnedAgo.getTime()
      );
    });

    it('should return all documents between request query minDateUTC and maxDateUTC parameters if a valid call is made', async () => {
      let date3dAgo = new Date();
      date3dAgo.setUTCDate(new Date().getDate() - 3);
      date3dAgo.setUTCHours(0, 0, 0, 0);

      // inserting a restr record with a date 3 days in the past
      await Restaurant.create({
        name: 'D',
        userId,
        rating: 4,
        cntryCd: 'USA',
        note: 'Good',
        date: date3dAgo,
        location: 'LA',
        wishlist: false,
      });
      const date6dAgoString = date6dAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      const dateOnedAgoString = dateOnedAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      query = {
        minDateUTC: date6dAgoString,
        maxDateUTC: dateOnedAgoString,
      };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('D');
    });
  });

  describe('GET /countryCodes/:cntryCd', () => {
    beforeEach(async () => {
      await Restaurant.create({
        name: 'D',
        userId,
        rating: 5,
        date: date7dAgo,
        cntryCd: cntryCd,
        note: 'Fine',
        location: 'New York City',
        wishlist: false,
      });
      query = {};
    });
    function exec() {
      return request(server)
        .get(`/api/restaurants/countryCodes/${cntryCd}`)
        .query(query)
        .set('x-auth-token', token);
    }

    it('should status 200 if a valid API call is made', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should status 401 if an API call is made without a valid auth token', async () => {
      token = '';
      const res = await exec();

      expect(res.status).toBe(401);
    });
    it('should return all documents in the Restaurant collection matching the cntryCd parameter and JWT userId', async () => {
      const res = await exec();

      expect(res.body).toHaveLength(2);
      expect(res.body[0].cntryCd).toBe(cntryCd);
      expect(res.body[1].cntryCd).toBe(cntryCd);
    });

    it("should return 0 documents if the requesting user doesn't have any documents with the given cntryCd in the Restaurant collection", async () => {
      token = new User().generateAuthToken();

      const res = await exec();

      expect(res.body).toHaveLength(0);
    });

    it('should return all documents for the user and cntryCd that match the wishlist query parameter', async () => {
      query = { wishlist: true };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].wishlist).toBe(true);
    });

    it('should return all documents for the user and cntryCd that have a name containing the substring from the name query parameter value', async () => {
      query = { name: 'D' };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toMatch(/d/i);
    });

    it('should return all documents for the user and cntryCd that have a rating equal to or larger than the value from the minRating query parameter value', async () => {
      query = { minRating: 5 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBeGreaterThanOrEqual(5);
    });

    it('should return all documents for the user and cntryCd that have a rating less than or equal to the value from the maxRating query parameter value', async () => {
      query = { maxRating: 3 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBeLessThanOrEqual(3);
    });

    it('should return all documents for the user and cntryCd that have a rating within the range as specified by the minRating and maxRating query parameter value', async () => {
      query = { minRating: 4, maxRating: 5 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBe(5);
    });

    it('should return a status 400 code if the maxRating query parameter value is invalid', async () => {
      query = { maxRating: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/maxRating/i);
    });

    it('should return a status 400 code if the minRating query parameter value is invalid', async () => {
      query = { minRating: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/minRating/i);
    });

    it('should return a 400 error with a descriptive message if an invalid minDateUTC query param value is passed', async () => {
      query = { minDateUTC: 'asdfa' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('date');
      expect(res.text).toContain('invalid');
    });

    it('should return a 400 error with a descriptive message if an invalid maxDateUTC query param value is passed', async () => {
      query = { maxDateUTC: 'asdfa' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('date');
      expect(res.text).toContain('invalid');
    });

    it('should return all documents for the user and cntryCd that have a date later than the minDateUTC query parameter value if a valid API call is made', async () => {
      const date6dAgoString = date6dAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      query = { minDateUTC: date6dAgoString };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(restrId.toHexString());
      expect(new Date(res.body[0].date).getTime()).toBeGreaterThanOrEqual(
        date6dAgo.getTime()
      );
    });

    it('should return all documents for the user that a date earlier than the maxDateUTC query parameter value if a valid API call is made', async () => {
      const dateOnedAgoString = dateOnedAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      query = { maxDateUTC: dateOnedAgoString };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).not.toBe(restrId.toHexString());
      expect(new Date(res.body[0].date).getTime()).toBeLessThan(
        dateOnedAgo.getTime()
      );
    });

    it('should return all matching user and cntry documents between request query minDateUTC and maxDateUTC parameters', async () => {
      let date3dAgo = new Date();
      date3dAgo.setUTCDate(new Date().getDate() - 3);
      date3dAgo.setUTCHours(0, 0, 0, 0);
      const newId = new mongoose.Types.ObjectId();
      // inserting a restr record with a date 3 days in the past
      await Restaurant.create({
        _id: newId,
        name: 'D',
        userId,
        rating: 4,
        cntryCd,
        note: 'Good',
        date: date3dAgo,
        location: 'LA',
        wishlist: false,
      });
      const date6dAgoString = date6dAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      const dateOnedAgoString = dateOnedAgo
        .toISOString()
        .replace('T', ' ')
        .substring(0, 10);
      query = {
        minDateUTC: date6dAgoString,
        maxDateUTC: dateOnedAgoString,
      };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(newId.toHexString());
    });
  });

  describe('GET /entities/:restrId', () => {
    function exec() {
      return request(server)
        .get(`/api/restaurants/entities/${restrId.toHexString()}`)
        .set('x-auth-token', token);
    }

    it('should status 401 if an API call is made without a valid auth token', async () => {
      token = '';
      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should status 404 if a non-existent entity ID is passed', async () => {
      restrId = new mongoose.Types.ObjectId();
      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return a 200 status if a valid API call is made', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return the correct document details if a valid API call is made', async () => {
      const res = await exec();
      expect(res.body._id).toBe(restrId.toHexString());
      expect(res.body).toMatchObject({
        name: 'A',
        userId: userId.toHexString(),
        rating: 3,
        cntryCd: cntryCd,
        note: 'Decent',
        location: 'New York City',
        wishlist: true,
      });
    });

    it('should return a 400 status if an invalid ObjectId is passed as an "id" query parameter value', async () => {
      const res = await request(server)
        .get(`/api/restaurants/entities/a`)
        .set('x-auth-token', token);

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /entities/:restrId', () => {
    function exec() {
      return request(server)
        .delete(`/api/restaurants/entities/${restrId}`)
        .set('x-auth-token', token);
    }

    it('should return a 401 status if an unauthorized API call is made', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should return a 404 status if a call is made to a document with a different userId then that within the JWT', async () => {
      token = new User().generateAuthToken();

      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return a 200 status if a call is made with a valid JWT', async () => {
      const res = await exec();
      expect(res.status).toBe(200);
    });

    it('should return as 400 status and descriptive error message if an invalid ObjectId is passed', async () => {
      restrId = 'a';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/id/i);
    });

    it('should return as 400 status if an valid but non-existent ObjectId is passed', async () => {
      restrId = new mongoose.Types.ObjectId();
      const res = await exec();

      expect(res.status).toBe(404);
      expect(res.text).toMatch(/id/i);
    });

    it('should delete the requested document from the Restaurant collection', async () => {
      await exec();

      const result = await Restaurant.findById(restrId);

      expect(result).toBeNull();
    });

    it('should return the deleted document', async () => {
      const res = await exec();

      expect(res.body._id).toBe(restrId.toHexString());
    });

    it('should update the relevant CountryCount document to have its "restr" property value decremented by 1 the restr doc\'s wishlist property was false if a call is made with a valid JWT', async () => {
      // updating doc to be a wishlist=false
      await Restaurant.findByIdAndUpdate(
        restrId,
        {
          $set: { wishlist: false },
        },
        {}
      );
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      await exec();
      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.restr - 1).toBe(updatedCountryCount.wishlist);
    });

    it('should update the relevant CountryCount document to have its "wishlist" property value decremented by 1 the restr doc\'s wishlist property was true if a call is made with a valid JWT', async () => {
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      await exec();
      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.wishlist - 1).toBe(updatedCountryCount.wishlist);
    });

    it('should return a 400 status if there is no relevant CountryCount document for the given userId and cntryCd', async () => {
      await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });
      const res = await exec();

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /entities/:restrId', () => {
    let updatedRestr;

    beforeEach(() => {
      updatedRestr = {
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
        .put(`/api/restaurants/entities/${restrId}`)
        .set('x-auth-token', token)
        .send(updatedRestr);
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

    it('should return an object matching the request object', async () => {
      const res = await exec();

      expect(res.body).toMatchObject(updatedRestr);
    });

    it('should return as 400 status and descriptive error message if an invalid ObjectId is passed', async () => {
      restrId = 'a';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/id/i);
    });

    it('should return a 404 status if a call is made to a document with a different userId then that within the JWT', async () => {
      token = new User().generateAuthToken();
      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return as 404 status if an valid but non-existent ObjectId is passed', async () => {
      restrId = new mongoose.Types.ObjectId();
      const res = await exec();

      expect(res.status).toBe(404);
      expect(res.text).toMatch(/id/i);
    });

    it('should update the requested document from the Restaurant collection', async () => {
      await exec();

      const result = await Restaurant.findById(restrId);

      expect(result).toMatchObject(updatedRestr);
    });

    it("should return the updated document's values", async () => {
      const res = await exec();

      expect(res.body).toMatchObject(updatedRestr);
      expect(res.body._id).toBe(restrId.toHexString());
    });

    it('should return a 400 error and descriptive message if the name req.body property value is less than 1 character', async () => {
      updatedRestr.name = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
    });

    it('should return a 400 error and descriptive message if the name req.body property value is greater than 200 characters', async () => {
      updatedRestr.name = '1'.repeat(201);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
      expect(res.text).toContain('200');
    });

    it('should return a 400 error and descriptive message if the rating req.body property value greater than 5', async () => {
      updatedRestr.rating = 6;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the rating req.body property value is less than 0', async () => {
      updatedRestr.rating = -1;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
      expect(res.text).toContain('0');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property value length is less than 1', async () => {
      updatedRestr.cntryCd = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
    });

    it('should return a 400 error and descriptive message if the note req.body property value length is less than 1', async () => {
      updatedRestr.note = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('note');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property value length is greater than 5', async () => {
      updatedRestr.cntryCd = '1'.repeat(6);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the note req.body property value length is greater than 3000', async () => {
      updatedRestr.note = '1'.repeat(200001);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('note');
      expect(res.text).toContain('20000');
    });

    it('should return a 400 error and descriptive message if the location req.body property value is less than 1 character', async () => {
      updatedRestr.location = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('location');
    });

    it('should return a 400 error and descriptive message if the location req.body property value is greater than 200 characters', async () => {
      updatedRestr.location = '1'.repeat(201);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('location');
      expect(res.text).toContain('200');
    });

    it('should return a 400 error and descriptive message if the wishlist req.body property value is not a boolean', async () => {
      updatedRestr.wishlist = '1';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('wishlist');
      expect(res.text).toContain('boolean');
    });

    it('should return an successfully updated object if only wishlist req.body property object is passed', async () => {
      updatedRestr = { wishlist: false };
      const res = await exec();

      expect(res.body.wishlist).toBe(false);
    });

    it('should update the relevant MongoDB document if an object with only a wishlist req.body property is passed', async () => {
      updatedRestr = { wishlist: false };
      await exec();

      const result = await Restaurant.findById(restrId);

      expect(result.wishlist).toBe(false);
    });

    it('should update the relevant CountryCount document to have a "restr" property value decrement by 1 and "wishlist" property increment by 1 if the req body changes the wishlist value to true from false', async () => {
      // turning wishlist value to false
      await exec();
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      // turning wishlist value back to true
      updatedRestr = { wishlist: true };

      await exec();
      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.restr - 1).toBe(updatedCountryCount.restr);
      expect(oldCountryCount.wishlist + 1).toBe(updatedCountryCount.wishlist);
    });

    it('should update the relevant CountryCount document to have a "restr" property value increment by 1 and "wishlist" property decrement by 1 if the req body changes the wishlist value to false from true', async () => {
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      updatedRestr = { wishlist: false };

      await exec();

      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.restr + 1).toBe(updatedCountryCount.restr);
      expect(oldCountryCount.wishlist - 1).toBe(updatedCountryCount.wishlist);
    });
  });

  describe('POST /', () => {
    let newRestr;

    beforeEach(() => {
      newRestr = {
        name: 'Ab',
        rating: 5,
        cntryCd: cntryCd,
        date: date7dAgo,
        note: 'Great',
        location: 'New York City',
        wishlist: false,
      };
    });

    function exec() {
      return request(server)
        .post(`/api/restaurants`)
        .set('x-auth-token', token)
        .send(newRestr);
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

    it('should return an object matching the request object', async () => {
      const res = await exec();

      expect(res.body).toMatchObject({
        name: 'Ab',
        rating: 5,
        cntryCd: cntryCd,
        note: 'Great',
        location: 'New York City',
        wishlist: false,
      });
    });

    it('should return a 400 status and descriptive message if a call is made userId req.body prop', async () => {
      newRestr.userId = userId;
      // this will be set by looking at req JWT userId
      // so a user can only upload journal entries associated with their Id
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/userId/i);
    });

    it('should create a document Restaurant collection with matching parameters', async () => {
      await exec();

      const result = await Restaurant.findOne(newRestr);

      expect(result).toBeDefined();
      expect(result).toMatchObject({
        name: 'Ab',
        rating: 5,
        cntryCd: cntryCd,
        note: 'Great',
        location: 'New York City',
        wishlist: false,
      });
    });

    it('should return the created document from the Restaurant collection', async () => {
      const res = await exec();

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toMatchObject(
        _.pick(newRestr, [
          'cntryCd',
          'location',
          'name',
          'note',
          'rating',
          'wishlist',
        ])
      );
    });

    it('should return a 400 error and descriptive message if the name req.body property is not present', async () => {
      delete newRestr.name;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
    });

    it('should return a 400 error and descriptive message if the name req.body property value is less than 1 character', async () => {
      newRestr.name = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
    });

    it('should return a 400 error and descriptive message if the name req.body property value is greater than 200 characters', async () => {
      newRestr.name = '1'.repeat(201);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
      expect(res.text).toContain('200');
    });

    it('should return a 400 error and descriptive message if the rating req.body property is not present', async () => {
      delete newRestr.rating;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
    });

    it('should return a 400 error and descriptive message if the rating req.body property value greater than 5', async () => {
      newRestr.rating = 6;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the rating req.body property value is less than 0', async () => {
      newRestr.rating = -1;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
      expect(res.text).toContain('0');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property is not present', async () => {
      newRestr.cntryCd = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property value length is less than 1', async () => {
      newRestr.cntryCd = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
    });

    it('should return a 400 error and descriptive message if the note req.body property value length is less than 1', async () => {
      newRestr.note = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('note');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property value length is greater than 5', async () => {
      newRestr.cntryCd = '1'.repeat(6);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the note req.body property value length is greater than 3000', async () => {
      newRestr.note = '1'.repeat(200001);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('note');
      expect(res.text).toContain('20000');
    });

    it('should return a 400 error and descriptive message if the location req.body property value is less than 1 character', async () => {
      newRestr.location = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('location');
    });

    it('should return a 400 error and descriptive message if the location req.body property value is greater than 200 characters', async () => {
      newRestr.location = '1'.repeat(201);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('location');
      expect(res.text).toContain('200');
    });

    it('should return a 400 error and descriptive message if the wishlist req.body property value is not a boolean', async () => {
      newRestr.wishlist = '1';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('wishlist');
      expect(res.text).toContain('boolean');
    });

    it('should update the relevant CountryCount document to have a "restr" property value incremented by 1 if the req body has wishlist: true', async () => {
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      await exec();
      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.restr + 1).toBe(updatedCountryCount.restr);
    });

    it('should update the relevant CountryCount document to have a "wishlist" property value incremented by 1 if the req body has wishlist: true', async () => {
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      newRestr.wishlist = true;
      await exec();

      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.wishlist + 1).toBe(updatedCountryCount.wishlist);
    });

    it('should return a 200 status if there is no relevant CountryCount document for the given userId and cntryCd', async () => {
      await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should create a new CountryCount document with a restr value of 1 if no relevant CountryCount document exists for the given userId and cntryCd and the req body has wishlist: false', async () => {
      await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });
      const res = await exec();
      const createdCountryCount = await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });

      expect(createdCountryCount).toBeDefined();
      expect(createdCountryCount.restr).toBe(1);
      expect(createdCountryCount.wishlist).toBe(0);
    });

    it('should create CountryCount document with a wishlist value of 1 if no relevant CountryCount document exists for the given userId and cntryCd and the req body has wishlist: true', async () => {
      await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });
      newRestr.wishlist = true;

      const res = await exec();
      const createdCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(createdCountryCount).not.toBeNull();
      expect(createdCountryCount.restr).toBe(0);
      expect(createdCountryCount.wishlist).toBe(1);
    });
  });
});
