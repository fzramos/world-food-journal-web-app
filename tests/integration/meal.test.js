import request from 'supertest';
// import { Restaurant } from '../../server/models/restaurant';
import { Meal, Restaurant, Homemade } from '../../server/models/meal';
import mongoose from 'mongoose';
import { User } from '../../server/models/user';
import CountryCount from '../../server/models/countryCount';
import winston from 'winston';
import _ from 'lodash';
let server;

describe('/api/meals', () => {
  const user = new User();
  let token;
  let cntryCd;
  let cntryCdObjectId;
  let userId;
  let kind;
  let restrId;
  let mealId;
  let hmId;
  let difficulty;
  let link;
  // let date7dAgo;
  // let date6dAgo;
  // let dateOnedAgo;
  // let currentDate;
  let currentDate = new Date();
  let dateOnedAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  dateOnedAgo.setUTCHours(0, 0, 0, 0);
  let date7dAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  date7dAgo.setUTCHours(0, 0, 0, 0);
  let date6dAgo = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000);
  date6dAgo.setUTCHours(0, 0, 0, 0);
  let query;

  beforeEach(async () => {
    const { default: myServer } = await import('../../server/server');
    server = myServer;
    userId = user._id;
    cntryCd = 'AFG';
    kind = 'restr';
    token = user.generateAuthToken();
    cntryCdObjectId = new mongoose.Types.ObjectId();
    restrId = new mongoose.Types.ObjectId();
    mealId = restrId;
    hmId = new mongoose.Types.ObjectId();
    link = 'http://www.example.com/yes';
    difficulty = 3;

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

    // Homemade and Restaurant are schemas for the same collection, Meals
    // very similar schemas. In the same schema since most queries will be
    // across these schemas, not between
    await Restaurant.insertMany([
      {
        _id: restrId,
        name: 'A',
        userId,
        kind,
        rating: 3,
        cntryCd,
        note: 'Decent',
        location: 'New York City',
        wishlist: true,
      },
      {
        name: 'B',
        userId,
        kind,
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
        kind,
        rating: 4,
        cntryCd,
        note: 'Good',
        wishlist: true,
      },
    ]);

    await Homemade.create({
      _id: hmId,
      name: 'Z',
      userId,
      kind: 'hm',
      rating: 3,
      cntryCd,
      note: 'Decent',
      link,
      difficulty,
      wishlist: true,
    });
  });

  afterEach(async () => {
    await server.close();
    await Meal.deleteMany({});
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
        .get('/api/meals')
        .query(query)
        .set('x-auth-token', token);
    }
    it('should return a 200 status if a valid API request is made', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return the correct list of the meal documents if a valid API request is made', async () => {
      const res = await exec();

      expect(res.body).toHaveLength(3);
      expect(res.body[0].userId).toBe(userId.toHexString());
      expect(res.body[1].userId).toBe(userId.toHexString());
      expect(res.body[2].userId).toBe(userId.toHexString());
    });

    it('should return a 401 status if an unauthorized API request is made', async () => {
      token = '';

      const res = await exec();

      expect(res.status).toBe(401);
    });

    it("should return 0 documents if the requesting user doesn't have any documents in the Meal collection", async () => {
      token = new User().generateAuthToken();

      const res = await exec();

      expect(res.body).toHaveLength(0);
    });

    it('should return all documents for the user that match the wishlist query parameter if a valid API call is made', async () => {
      query = { wishlist: true };
      const res = await exec();

      expect(res.body).toHaveLength(2);
      expect(res.body[0].wishlist).toBe(true);
      expect(res.body[1].wishlist).toBe(true);
    });

    it('should return all documents for the user that have a rating equal to or larger than the value from the minRating query parameter value', async () => {
      query = { minRating: 4 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBeGreaterThanOrEqual(4);
    });

    it('should return all documents for the user that have a rating less than or equal to the value from the maxRating query parameter value', async () => {
      query = { maxRating: 3 };
      const res = await exec();

      expect(res.body).toHaveLength(2);
      expect(res.body[0].rating).toBeLessThanOrEqual(3);
      expect(res.body[1].rating).toBeLessThanOrEqual(3);
    });

    it('should return all documents for the user that have a rating within the range as specified by the minRating and maxRating query parameter value', async () => {
      query = { minRating: 4, maxRating: 5 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].rating).toBeGreaterThanOrEqual(4);
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

    it('should return all documents for the user that have a difficulty equal to or larger than the value from the minDiff query parameter value', async () => {
      query = { minDiff: 4 };
      const res = await exec();

      expect(res.body).toHaveLength(0);
    });

    it('should return all documents for the user that have a difficulty less than or equal to the value from the maxDiff query parameter value', async () => {
      query = { maxDiff: 3 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].difficulty).toBeLessThanOrEqual(3);
    });

    it('should return all documents for the user that have a difficulty within the range as specified by the minDiff and maxDiff query parameter value', async () => {
      query = { minDiff: 3, maxDiff: 3 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].difficulty).toBe(3);
    });

    it('should return a status 400 code if the maxDiff query parameter value is invalid', async () => {
      query = { maxDiff: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/maxDiff/i);
    });

    it('should return a status 400 code if the minDiff query parameter value is invalid', async () => {
      query = { minDiff: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/minDiff/i);
    });

    it('should return all documents for the user that have a coutry code matching the cntryCd query parameter value if a valid API call is made', async () => {
      query = { cntryCd: cntryCd };
      const res = await exec();

      expect(res.body).toHaveLength(2);
      expect(res.body[0].cntryCd).toBe(cntryCd);
      expect(res.body[1].cntryCd).toBe(cntryCd);
    });

    it('should return all documents for the user that have a coutry code matching the multiple values of cntryCd query parameter values passed if a valid API call is made', async () => {
      // inserting a meal record with a different country code
      await Homemade.create({
        name: 'F',
        userId,
        kind: 'hm',
        rating: 5,
        cntryCd: 'CAN',
        note: 'Nice',
        difficulty: 5,
        wishlist: false,
      });
      query = { cntryCd: [cntryCd, 'CAN'] };
      const res = await exec();

      expect(res.body).toHaveLength(3);
      expect(res.body[0].cntryCd).toBe(cntryCd);
      expect(res.body[1].cntryCd).toBe(cntryCd);
      expect(res.body[2].cntryCd).toBe('CAN');
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

      expect(res.body).toHaveLength(2);
      expect(res.body[0]._id).toBe(restrId.toHexString());
      expect(new Date(res.body[0].date).getTime()).toBeGreaterThanOrEqual(
        date6dAgo.getTime()
      );
      expect(new Date(res.body[1].date).getTime()).toBeGreaterThanOrEqual(
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

      // inserting a meal record with a date 3 days in the past
      await Restaurant.create({
        name: 'D',
        userId,
        kind: 'restr',
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
        kind: 'restr',
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
        .get(`/api/meals/countryCodes/${cntryCd}`)
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

    it('should return all documents in the Meal collection matching the cntryCd parameter and JWT userId', async () => {
      const res = await exec();

      expect(res.body).toHaveLength(3);
      expect(res.body[0].cntryCd).toBe(cntryCd);
      expect(res.body[1].cntryCd).toBe(cntryCd);
      expect(res.body[2].cntryCd).toBe(cntryCd);
    });

    it("should return 0 documents if the requesting user doesn't have any documents with the given cntryCd in the Meal collection", async () => {
      token = new User().generateAuthToken();

      const res = await exec();

      expect(res.body).toHaveLength(0);
    });

    it('should return all documents for the user and cntryCd that match the wishlist query parameter', async () => {
      query = { wishlist: true };
      const res = await exec();

      expect(res.body).toHaveLength(2);
      expect(res.body[0].wishlist).toBe(true);
      expect(res.body[1].wishlist).toBe(true);
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

      expect(res.body).toHaveLength(2);
      expect(res.body[0].rating).toBeLessThanOrEqual(3);
      expect(res.body[1].rating).toBeLessThanOrEqual(3);
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

    it('should return all documents for the user and cntryCd that have a difficulty equal to or larger than the value from the minDiff query parameter value', async () => {
      query = { minDiff: 4 };
      const res = await exec();

      expect(res.body).toHaveLength(0);
    });

    it('should return all documents for the user and cntryCd that have a difficulty less than or equal to the value from the maxDiff query parameter value', async () => {
      query = { maxDiff: 3 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].difficulty).toBeLessThanOrEqual(3);
    });

    it('should return all documents for the user and cntryCd that have a difficulty within the range as specified by the minDiff and maxDiff query parameter value', async () => {
      query = { minDiff: 3, maxDiff: 3 };
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].difficulty).toBe(3);
    });

    it('should return a status 400 code if the maxDiff query parameter value is invalid', async () => {
      query = { maxDiff: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/maxDiff/i);
    });

    it('should return a status 400 code if the minDiff query parameter value is invalid', async () => {
      query = { minDiff: 'a' };
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/minDiff/i);
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

      expect(res.body).toHaveLength(2);
      expect(res.body[0]._id).toBe(restrId.toHexString());
      expect(new Date(res.body[0].date).getTime()).toBeGreaterThanOrEqual(
        date6dAgo.getTime()
      );
      expect(new Date(res.body[1].date).getTime()).toBeGreaterThanOrEqual(
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
      await Meal.create({
        _id: newId,
        name: 'D',
        userId,
        kind: 'restr',
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

  describe('GET /entities/:mealId', () => {
    function exec() {
      return request(server)
        .get(`/api/meals/entities/${mealId}`)
        .set('x-auth-token', token);
    }

    it('should status 401 if an API call is made without a valid auth token', async () => {
      token = '';
      const res = await exec();

      expect(res.status).toBe(401);
    });

    it('should status 404 if a non-existent entity ID is passed', async () => {
      mealId = new mongoose.Types.ObjectId();
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
      mealId = 'a';

      const res = await exec();

      expect(res.status).toBe(400);
    });
  });

  describe('GET /kind/:kind', () => {
    function exec() {
      return request(server)
        .get(`/api/meals/kind/${kind}`)
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

    it('should status 400 if an API call is made with an invalid kind parameter', async () => {
      kind = 'a';

      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('kind');
    });

    it('should return all documents in the Meal collection matching the kind parameter and JWT userId', async () => {
      const res = await exec();

      expect(res.body).toHaveLength(2);
      expect(res.body[0].kind).toBe(kind);
      expect(res.body[1].kind).toBe(kind);
      // expect(res.body[2].cntryCd).toBe(cntryCd);
    });

    it('should return all documents in the Meal collection matching the another kind parameter and JWT userId', async () => {
      kind = 'hm';
      const res = await exec();

      expect(res.body).toHaveLength(1);
      expect(res.body[0].kind).toBe(kind);
    });

    it("should return 0 documents if the requesting user doesn't have any documents with the given cntryCd in the Meal collection", async () => {
      token = new User().generateAuthToken();

      const res = await exec();

      expect(res.body).toHaveLength(0);
    });
  });

  describe('DELETE /entities/:mealId', () => {
    function exec() {
      return request(server)
        .delete(`/api/meals/entities/${mealId}`)
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
      mealId = 'a';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/id/i);
    });

    it('should return as 400 status if an valid but non-existent ObjectId is passed', async () => {
      mealId = new mongoose.Types.ObjectId();
      const res = await exec();

      expect(res.status).toBe(404);
      expect(res.text).toMatch(/id/i);
    });

    it('should delete the requested document from the Meal collection', async () => {
      await exec();

      const result = await Meal.findById(restrId);

      expect(result).toBeNull();
    });

    it('should return the deleted document', async () => {
      const res = await exec();

      expect(res.body._id).toBe(restrId.toHexString());
    });

    it('should update the relevant CountryCount document to have its "restr" property value decremented by 1 if the kind is "restr" and the doc\'s wishlist property was false', async () => {
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

      expect(oldCountryCount.restr - 1).toBe(updatedCountryCount.restr);
      expect(oldCountryCount.hm).toBe(updatedCountryCount.hm);
    });

    it('should update the relevant CountryCount document to have its "hm" property value decremented by 1 if the kind is "hm" and the doc\'s wishlist property was false', async () => {
      // updating doc to be a wishlist=false
      await Homemade.findByIdAndUpdate(
        hmId,
        {
          $set: { wishlist: false },
        },
        {}
      );
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      mealId = hmId;
      await exec();
      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.hm - 1).toBe(updatedCountryCount.hm);
      expect(oldCountryCount.restr).toBe(updatedCountryCount.restr);
    });

    it('should update the relevant CountryCount document to have its "wishlist" property value decremented by 1 if the doc\'s wishlist property was true', async () => {
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

  describe('PUT kind/:kind/entities/:mealId', () => {
    let updatedRestr;
    let updatedHm;
    let updatedMeal;

    beforeEach(() => {
      updatedRestr = {
        name: 'Ab',
        rating: 5,
        cntryCd: cntryCd,
        kind: 'restr',
        note: 'Great',
        location: 'New York City',
        wishlist: false,
      };
      updatedMeal = updatedRestr;
      updatedHm = {
        name: 'Ab',
        rating: 5,
        kind: 'hm',
        cntryCd: cntryCd,
        note: 'Great',
        difficulty: 5,
        wishlist: false,
      };
    });

    function exec() {
      return request(server)
        .put(`/api/meals/kind/${kind}/entities/${mealId}`)
        .set('x-auth-token', token)
        .send(updatedMeal);
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

    it('should status 400 if an API call is made with an invalid kind parameter', async () => {
      kind = 'a';

      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('kind');
    });

    it('should return a 400 status if a call is made attempting to change the type of a meal document', async () => {
      updatedMeal = updatedHm;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/kind/i);
    });

    it('should return an object matching the request object', async () => {
      const res = await exec();

      expect(res.body).toMatchObject(updatedRestr);
    });

    it('should return as 400 status and descriptive error message if an invalid ObjectId is passed', async () => {
      mealId = 'a';
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
      mealId = new mongoose.Types.ObjectId();
      const res = await exec();

      expect(res.status).toBe(404);
      expect(res.text).toMatch(/id/i);
    });

    it('should update the requested document from the Meal collection', async () => {
      await exec();

      const result = await Meal.findById(mealId);

      expect(result).toMatchObject(updatedRestr);
    });

    it("should return the updated document's values", async () => {
      const res = await exec();

      expect(res.body).toMatchObject(updatedRestr);
      expect(res.body._id).toBe(mealId.toHexString());
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
      updatedMeal.cntryCd = '1'.repeat(6);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the note req.body property value length is greater than 3000', async () => {
      updatedMeal.note = '1'.repeat(200001);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('note');
      expect(res.text).toContain('20000');
    });

    it('should return a 400 error and descriptive message if the favorite req.body property value is not a boolean', async () => {
      updatedMeal.favorite = 'a';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('favorite');
    });

    it('should update the relevant MongoDB document if an object with only a favorite req.body property is passed', async () => {
      updatedMeal = { favorite: true };
      await exec();

      const result = await Meal.findById(mealId);

      expect(result.favorite).toBe(true);
    });

    it('should return a 200 status if the favorite req.body property value is a boolean', async () => {
      updatedRestr.favorite = true;
      const res = await exec();

      expect(res.status).toBe(200);
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

    it('should return a 400 error and descriptive message if the difficulty req.body property value is less than 0', async () => {
      updatedHm.difficulty = -1;
      updatedMeal = updatedHm;
      kind = 'hm';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('difficulty');
      expect(res.text).toContain('0');
    });

    it('should return a 400 error and descriptive message if the difficulty req.body property value is greater than 5', async () => {
      updatedHm.difficulty = 6;
      updatedMeal = updatedHm;
      kind = 'hm';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('difficulty');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the link req.body property value is greater than 10000 characters', async () => {
      updatedHm.link = '1'.repeat(1001);
      kind = 'hm';
      mealId = hmId;
      updatedMeal = updatedHm;

      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('link');
      expect(res.text).toContain('1000');
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

      const result = await Meal.findById(mealId);

      expect(result.wishlist).toBe(false);
    });

    it('should update the relevant CountryCount document to have a "restr" property value increment by 1 and "wishlist" property decrement by 1 if the req body changes the wishlist value to false from true for a kind restr doc', async () => {
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      updatedMeal = { wishlist: false };

      await exec();

      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.restr + 1).toBe(updatedCountryCount.restr);
      expect(oldCountryCount.wishlist - 1).toBe(updatedCountryCount.wishlist);
    });

    it('should update the relevant CountryCount document to have a "hm" property value increment by 1 and "wishlist" property decrement by 1 if the req body changes the wishlist value to false from true for a kind restr doc', async () => {
      kind = 'hm';
      mealId = hmId;
      updatedMeal = updatedHm;
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      updatedMeal = { wishlist: false };

      await exec();

      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.hm + 1).toBe(updatedCountryCount.hm);
      expect(oldCountryCount.wishlist - 1).toBe(updatedCountryCount.wishlist);
    });

    it('should update the relevant CountryCount document to have a "restr" property value decrement by 1 and "wishlist" property increment by 1 if the req body changes the wishlist value to true from false of a kind restr doc', async () => {
      // turning wishlist value to false
      await exec();
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      // turning wishlist value back to true
      updatedMeal = { wishlist: true };

      await exec();
      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.restr - 1).toBe(updatedCountryCount.restr);
      expect(oldCountryCount.wishlist + 1).toBe(updatedCountryCount.wishlist);
    });

    it('should return status 400 if user trying to change an HM to wishlist=false without also adding a rating value', async () => {
      kind = 'hm';
      mealId = hmId;
      updatedMeal = updatedHm;
      // turning wishlist value to false
      await exec();
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      // turning wishlist value back to true
      updatedMeal = { wishlist: true };

      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/rating/i);
      expect(res.text).toMatch(/required/i);
    });

    it('should update the relevant CountryCount document to have a "hm" property value decrement by 1 and "wishlist" property increment by 1 if the req body changes the wishlist value to true from false of a kind hm doc and a rating value is included in the req.body', async () => {
      kind = 'hm';
      mealId = hmId;
      updatedMeal = updatedHm;
      // turning wishlist value to false
      await exec();
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });
      // turning wishlist value back to true
      updatedMeal = {
        wishlist: true,
        rating: 4,
      };

      await exec();
      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.hm - 1).toBe(updatedCountryCount.hm);
      expect(oldCountryCount.wishlist + 1).toBe(updatedCountryCount.wishlist);
    });
  });

  describe('POST /kind/:kind', () => {
    let newRestr;
    let newHm;
    let newMeal;

    beforeEach(() => {
      newRestr = {
        name: 'Ab',
        rating: 5,
        cntryCd,
        date: date7dAgo,
        note: 'Great',
        location: 'New York City',
        wishlist: false,
      };
      newHm = {
        name: 'ABC',
        rating: 5,
        cntryCd,
        date: date7dAgo,
        note: 'Great',
        difficulty: 4,
        link: 'http://wow.com',
        wishlist: false,
      };
      newMeal = newRestr;
    });

    function exec() {
      return request(server)
        .post(`/api/meals/kind/${kind}`)
        .set('x-auth-token', token)
        .send(newMeal);
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

    it('should status 400 if an API call is made with an invalid kind parameter', async () => {
      kind = 'a';

      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('kind');
    });

    it('should return an object matching the request object', async () => {
      const res = await exec();

      expect(res.body).toMatchObject(_.omit(newMeal, ['date']));
    });

    it('should return a 400 status and descriptive message if a call is made with the userId req.body prop', async () => {
      newMeal.userId = userId;
      // this will be set by looking at req JWT userId
      // so a user can only upload journal entries associated with their Id
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/userId/i);
      delete newMeal.userId;
    });

    it('should create a document Meal collection with matching parameters', async () => {
      const res = await exec();

      const id = new mongoose.Types.ObjectId(res.body._id);
      const result = await Meal.findById(id);

      expect(result).not.toBeNull();
      expect(result).toMatchObject(_.omit(newMeal, ['date']));
    });

    it('should return the created document from the Meal collection', async () => {
      newMeal = newHm;
      kind = 'hm';
      const res = await exec();

      expect(res.body).toHaveProperty('_id');
      expect(res.body).toMatchObject(
        _.pick(newHm, [
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
      delete newMeal.name;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
    });

    it('should return a 400 error and descriptive message if the name req.body property value is less than 1 character', async () => {
      newMeal.name = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
    });

    it('should return a 400 error and descriptive message if the name req.body property value is greater than 200 characters', async () => {
      newMeal.name = '1'.repeat(201);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('name');
      expect(res.text).toContain('200');
    });

    it('should return a 400 error and descriptive message if the rating req.body property is not present when wishlist=false', async () => {
      delete newMeal.rating;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
    });

    it('should return a 200 status if the rating req.body property is not present when wishlist=true', async () => {
      delete newMeal.rating;
      newMeal.wishlist = true;
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return a 400 error and descriptive message if the rating req.body property value greater than 5', async () => {
      newMeal.rating = 6;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the rating req.body property value is less than 0', async () => {
      newMeal.rating = -1;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('rating');
      expect(res.text).toContain('0');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property is not present', async () => {
      newMeal.cntryCd = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property value length is less than 1', async () => {
      newMeal.cntryCd = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
    });

    it('should return a 400 error and descriptive message if the note req.body property value length is less than 1', async () => {
      newMeal.note = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('note');
    });

    it('should return a 400 error and descriptive message if the cntryCd req.body property value length is greater than 5', async () => {
      newMeal.cntryCd = '1'.repeat(6);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('cntryCd');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the note req.body property value length is greater than 3000', async () => {
      newMeal.note = '1'.repeat(200001);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('note');
      expect(res.text).toContain('20000');
    });

    it('should return a 400 error and descriptive message if the favorite req.body property value is not a boolean', async () => {
      newMeal.favorite = 'a';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('favorite');
    });

    it('should create a relevant MongoDB document if an object with a favorite req.body property is passed', async () => {
      newMeal.favorite = true;
      const res = await exec();

      const result = await Meal.findById(res.body._id);
      expect(result.favorite).toBe(true);
    });

    it('should return a 200 status if the favorite req.body property value is a boolean', async () => {
      newRestr.favorite = true;
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return a 400 error and descriptive message if the location req.body property value is less than 1 character', async () => {
      newMeal.location = '';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('location');
    });

    it('should return a 400 error and descriptive message if the location req.body property value is greater than 200 characters', async () => {
      newMeal.location = '1'.repeat(201);
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('location');
      expect(res.text).toContain('200');
    });

    it('should return a 400 error and descriptive message if the difficulty req.body property value is less than 0', async () => {
      newHm.difficulty = -1;
      newMeal = newHm;
      kind = 'hm';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('difficulty');
      expect(res.text).toContain('0');
    });

    it('should return a 400 error and descriptive message if the difficulty req.body property value is greater than 5', async () => {
      newHm.difficulty = 6;
      newMeal = newHm;
      kind = 'hm';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('difficulty');
      expect(res.text).toContain('5');
    });

    it('should return a 400 error and descriptive message if the link req.body property value is greater than 10000 characters', async () => {
      newHm.link = '1'.repeat(1001);
      kind = 'hm';
      mealId = hmId;
      newMeal = newHm;

      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('link');
      expect(res.text).toContain('1000');
    });

    it('should return a 400 error and descriptive message if the wishlist req.body property value is not a boolean', async () => {
      newMeal.wishlist = '1';
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toContain('wishlist');
      expect(res.text).toContain('boolean');
    });

    it('should update the relevant CountryCount document to have a "restr" property value incremented by 1 if the req body has wishlist: false and kind: restr', async () => {
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

    it('should update the relevant CountryCount document to have an "hm" property value incremented by 1 if the req body has wishlist: false and kind: hm', async () => {
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      kind = 'hm';
      mealId = hmId;
      newMeal = newHm;
      await exec();

      const updatedCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(oldCountryCount.hm + 1).toBe(updatedCountryCount.hm);
    });

    it('should return a 400 status if req.body contains wishlist: true and a rating property ', async () => {
      // rating only valid for non-wishlist docs
      newMeal.wishlist = true;
      const res = await exec();

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/rating/i);
    });

    it('should update the relevant CountryCount document to have a "wishlist" property value incremented by 1 if the req body has wishlist: true', async () => {
      const oldCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      newMeal.wishlist = true;
      delete newMeal.rating;
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

      newMeal.wishlist = true;
      delete newMeal.rating;
      const res = await exec();
      expect(res.status).toBe(200);

      const createdCountryCount = await CountryCount.findOne({
        userId,
        cntryCd,
      });

      expect(createdCountryCount).not.toBeNull();
      expect(createdCountryCount.restr).toBe(0);
      expect(createdCountryCount.wishlist).toBe(1);
    });

    it('should return a 200 status if there is no relevant CountryCount document for the given userId and cntryCd', async () => {
      await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should create a new CountryCount document with a restr value of 1 if no relevant CountryCount document exists for the given userId and cntryCd and the req body has wishlist: false and kind: restr', async () => {
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

    it('should create a new CountryCount document with a hm value of 1 if no relevant CountryCount document exists for the given userId and cntryCd and the req body has wishlist: false and kind: hm', async () => {
      await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });

      kind = 'hm';
      mealId = hmId;
      newMeal = newHm;
      const res = await exec();

      const createdCountryCount = await CountryCount.findOneAndDelete({
        userId,
        cntryCd,
      });

      expect(createdCountryCount).toBeDefined();
      expect(createdCountryCount.hm).toBe(1);
      expect(createdCountryCount.wishlist).toBe(0);
    });
  });
});
