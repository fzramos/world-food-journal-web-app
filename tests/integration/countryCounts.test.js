import request from 'supertest';
import mongoose from "mongoose";
import CountryCount from "../../server/models/countryCount";
import { User } from '../../server/models/user'
import winston from 'winston';
import _ from 'lodash'
let server

describe('/api/country-counts', () => {
    beforeEach(async () => {
        const { default: myServer } = await import('../../server/server');
        server = myServer;
    })
    afterEach(async () => {
        await server.close()
        await CountryCount.deleteMany({})
    })
    afterAll(() => {
        mongoose.disconnect()
    })

    describe("GET /", () => {
        const user = new User()
        let userId;
        let token;
        let countryCountObjects

        beforeEach(async () => {
            userId = user._id
            token = user.generateAuthToken()
            countryCountObjects = [
                {
                    cntryCd: "AFG",
                    userId,
                    restr: 0,
                    hm: 1,
                    misc: 1
                },
                {
                    cntryCd: "BLZ",
                    userId,
                    restr: 10,
                    hm: 0,
                    misc: 5
                },
                {
                    cntryCd: "AFG",
                    userId: new mongoose.Types.ObjectId().toHexString(), 
                    // simulating a different user's data
                    restr: 0,
                    hm: 1,
                    misc: 1
                }
            ]
            // create 2 weight entries for diff countries with the same user id

            await CountryCount.collection.insertMany(countryCountObjects)
        })

        // function exec()
        // const res = await request(server)
        // .get('/api/country-counts')
        // .set('x-auth-token', token)

        it('should return 200 status when called', async () => {
            winston.info('Req _id' + userId)
            const res = await request(server)
                            .get('/api/country-counts')
                            .set('x-auth-token', token)

            expect(res.status).toBe(200)
        })

        it('should return all country_count documents related to the requesting user', async () => {
            const res = await request(server)
                            .get('/api/country-counts')
                            .set('x-auth-token', token)
            // response should include all uploaded countryCounts
            // with the given userId
            expect(res.body).toHaveLength(2)
        })

        it("should return 401 status if an unauthorized API call is made", async () => {
            const res = await request(server).get('/api/country-counts')

            expect(res.status).toBe(401)
        })
    })
})