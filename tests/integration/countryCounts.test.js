import request from 'supertest';
import mongoose from 'mongoose';
import CountryCount from '../../server/models/countryCount';
import { User } from '../../server/models/user.js';
import winston from 'winston';
import _ from 'lodash';
let server;

describe('/api/country-counts', () => {
  beforeEach(async () => {
    const { default: myServer } = await import('../../server/server');
    server = myServer;
  });
  afterEach(async () => {
    await server.close();
    await CountryCount.deleteMany({});
  });
  afterAll(() => {
    mongoose.disconnect();
  });

  describe('GET /', () => {
    const user = new User();
    let userId;
    let token;
    let countryCountObjects;

    beforeEach(async () => {
      userId = user._id;
      token = user.generateAuthToken();
      countryCountObjects = [
        {
          cntryCd: 'AFG',
          userId,
          restr: 0,
          hm: 1,
          misc: 1,
        },
        {
          cntryCd: 'BLZ',
          userId,
          restr: 10,
          hm: 0,
          misc: 5,
        },
        {
          cntryCd: 'AFG',
          userId: new mongoose.Types.ObjectId(),
          // simulating a different user's data
          restr: 0,
          hm: 1,
          misc: 1,
        },
      ];
      // create 2 weight entries for diff countries with the same user id

      await CountryCount.create(countryCountObjects);
    });

    function exec() {
      return request(server)
        .get('/api/country-counts')
        .set('x-auth-token', token);
    }

    it('should return 200 status when called', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return all country_count documents related to the requesting user', async () => {
      const res = await exec();
      // response should include all uploaded countryCounts
      // with the given userId
      expect(res.body).toHaveLength(2);
    });

    it('should return 401 status if an unauthorized API call is made', async () => {
      token = '';
      const res = await exec();

      expect(res.status).toBe(401);
    });
  });

  describe('GET /:cntryCd', () => {
    const user = new User();
    let userId;
    let token;
    let cntryCd;
    let cntryCdObjectId;

    beforeEach(async () => {
      userId = user._id;
      cntryCd = 'AFG';
      token = user.generateAuthToken();
      cntryCdObjectId = new mongoose.Types.ObjectId();

      await CountryCount.collection.insertOne({
        _id: cntryCdObjectId,
        cntryCd: cntryCd,
        userId: userId,
        restr: 0,
        hm: 1,
        misc: 1,
      });
    });

    function exec() {
      return request(server)
        .get(`/api/country-counts/${cntryCd}`)
        .set('x-auth-token', token);
    }

    it('should return status 200 if a request with a valid JWT is made', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should return the correct countryCount object if a valid request is made', async () => {
      const res = await exec();

      expect(res.body).toMatchObject({
        _id: cntryCdObjectId.toHexString(),
        cntryCd: cntryCd,
        userId: userId.toHexString(),
        restr: 0,
        hm: 1,
        misc: 1,
      });
    });

    it('should return a 404 code if an non-existent cntryCd parameter is given', async () => {
      cntryCd = '_';
      const res = await exec();

      expect(res.status).toBe(404);
    });

    it('should return a 401 code if an unauthorized request is made', async () => {
      token = '';
      const res = await exec();

      expect(res.status).toBe(401);
    });
  });
});
