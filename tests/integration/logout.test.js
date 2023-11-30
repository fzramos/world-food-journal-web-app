import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../../server/models/user.js';
import _ from 'lodash';
import { serialize } from 'cookie';
let server;

describe('/api/logout', () => {
  let token;
  let serialized;

  beforeEach(async () => {
    const { default: myServer } = await import('../../server/server');
    server = myServer;
  });
  afterEach(async () => {
    await server.close();
  });
  afterAll(() => {
    mongoose.disconnect();
  });

  describe('POST /', () => {
    beforeEach(async () => {
      token = new User().generateAuthToken();
      serialized = serialize('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    });

    function exec() {
      return request(server).post('/api/logout').set('Cookie', serialized);
    }

    it('should return a 401 status if an unauthorized API call is made', async () => {
      const res = await request(server).post('/api/logout');

      expect(res.status).toBe(401);
    });

    it('should return a 401 status if an API call is made without HTTPS only cookie authorization', async () => {
      const res = await request(server)
        .post('/api/logout')
        .set('x-auth-token', token);

      expect(res.status).toBe(401);
    });

    it('should return a 200 status if an authorized API call is made', async () => {
      const res = await exec();

      expect(res.status).toBe(200);
    });

    it('should update cookie property to have a null token value', async () => {
      const res = await exec();

      expect(res.header['set-cookie'][0]).toMatch(/token=null/i);
    });

    it('should update cookie property to have a max age of -1', async () => {
      const res = await exec();

      expect(res.header['set-cookie'][0]).toMatch(/Max-Age=-1/i);
    });
  });
});
