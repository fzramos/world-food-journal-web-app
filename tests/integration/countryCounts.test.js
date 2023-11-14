import request from 'supertest';
import mongoose from "mongoose";
import CountryCount from "../../server/models/countryCount";
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
        it('should return 200 status when called', async () => {
            const res = await request(server).get('/api/country-counts')

            expect(res.status).toBe(200)
        })

        it('should return all country_count documents related to the requesting user', async () => {
            const res = await request(server).get('/api/country-counts')

            expect(res.status).toBe(200)
        })

        it("should return 401 status if an unauthorized API call is made", async () => {
            const res = await request(server).get('/api/country-counts')

            expect(res.status).toBe(401)
        })
    })
})