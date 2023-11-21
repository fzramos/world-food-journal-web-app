import request from "supertest"
import { Restaraunt } from "../../server/models/restaurant"
import mongoose from "mongoose"
import jwt from 'jsonwebtoken'
import config from 'config'
import { User } from "../../server/models/user"
import CountryCount from '../../server/models/countryCount'
import winston from "winston"
let server

describe('/api/restaurants', () => {
    const user = new User();
    let token;
    let cntryCd;
    let cntryCdObjectId;
    let userId;
    let restrId;
    let date7dAgo;
    let date6dAgo;
    let dateOnedAgo
    let currentDate

    beforeEach(async () => {
        const { default: myServer } = await import('../../server/server')
        server = myServer

        userId = user._id
        cntryCd = "AFG"
        token = user.generateAuthToken()
        cntryCdObjectId = new mongoose.Types.ObjectId()
        restrId = new mongoose.Types.ObjectId()
        currentDate = new Date()
        dateOnedAgo = new Date()
        date7dAgo = new Date()
        date6dAgo = new Date()
        dateOnedAgo.setUTCDate(currentDate.getDate()-1)
        dateOnedAgo.setUTCHours(0, 0, 0, 0)
        currentDate.setUTCHours(0, 0, 0, 0)
        date7dAgo.setUTCDate(currentDate.getDate()-7)
        date7dAgo.setUTCHours(0, 0, 0, 0)
        date6dAgo.setUTCDate(currentDate.getDate()-6)
        date6dAgo.setUTCHours(0, 0, 0, 0)
        // insert 1 into countryCount
        await CountryCount.create({
            _id: cntryCdObjectId,
            cntryCd: cntryCd,
            userId: userId,
            date: date7dAgo,
            restr: 2,
            hm: 1,
            misc: 1
        })

        await Restaraunt.insertMany([
            {
                _id: restrId,
                name: 'A',
                userId,
                rating: 3,
                cntryCd: cntryCd,
                note: "Decent",
                location: "New York City",
                wishlist: true
            },
            {
                name: 'B',
                userId,
                rating: 4,
                cntryCd: "USA",
                note: "Good",
                date: date7dAgo,
                location: "LA",
                wishlist: false
            },  
            {
                name: 'C',
                userId: new mongoose.Types.ObjectId(),
                rating: 4,
                cntryCd: cntryCd,
                note: "Good",
                wishlist: true
            }
        ])
    })
    afterEach(async () => {
        await server.close()
        await Restaraunt.deleteMany({})
    })
    afterAll(() => {
        mongoose.disconnect()
    })

    describe('GET /', () => {
        function exec() {
            return request(server).get('/api/restaurants').set('x-auth-token', token)
        }
        it("should return a 200 status if a valid API request is made", async () => {
            const res = await exec()

            expect(res.status).toBe(200)
        })

        it("should return the correct list of the restraurant documents if a valid API request is made", async () => {
            // const res = await request(server).get('/api/restaurants').set('x-auth-token', token)
            const res = await exec()

            expect(res.body).toHaveLength(2)
        })

        it("should return a 401 status if an unauthorized API request is made", async () => {
            token = ''
            const res = await exec()

            expect(res.status).toBe(401)
        })

        it("should return 0 documents if the requesting user doesn't have any documents in the Restaurant collection", async () => {
            token = new User().generateAuthToken()

            const res = await exec()

            expect(res.body).toHaveLength(0)
        })

        it("should return all documents for the user that match the wishlist query parameter if a valid API call is made", async () => {
            const res = await request(server).get(`/api/restaurants`)
                                            .query({ wishlist: true})
                                            .set('x-auth-token', token)
            expect(res.body).toHaveLength(1)
            expect(res.body[0].wishlist).toBe(true)
        })

        it("should return all documents for the user that have a rating greater or equal to the rating query parameter value if a valid API call is made", async () => {
            const res = await request(server).get(`/api/restaurants`)
                                            .query({ rating: 4})
                                            .set('x-auth-token', token)
            expect(res.body).toHaveLength(1)
            expect(res.body[0].rating).toBeGreaterThanOrEqual(4)
        })

        it("should return all documents for the user that have a coutry code matching the cntryCd query parameter value if a valid API call is made", async () => {
            const res = await request(server).get(`/api/restaurants`)
                                            .query({ cntryCd: cntryCd })
                                            .set('x-auth-token', token)
            expect(res.body).toHaveLength(1)
            expect(res.body[0].cntryCd).toBe(cntryCd)
        })

        it("should return all documents for the user that have a name containing the substring from the name query parameter value if a valid API call is made", async () => {
            const res = await request(server).get(`/api/restaurants`)
                                            .query({ name: 'a' })
                                            .set('x-auth-token', token)
            expect(res.body).toHaveLength(1)
            expect(res.body[0].name).toMatch(/a/i)
        })

        it("should return all documents for the user that a date later than the minDateUTC query parameter value if a valid API call is made", async () => {
            // setting query value to 6 days ago
            // which should exclude one of the user's records
            const date6dAgoString = date6dAgo.toISOString().replace("T"," ").substring(0, 10)

            const res = await request(server).get(`/api/restaurants`)
                                            .query({ minDateUTC:  date6dAgoString})
                                            .set('x-auth-token', token)

            expect(res.body).toHaveLength(1)
            expect(res.body[0]._id).toBe(restrId.toHexString())
        })

        it("should return all documents for the user that a date earlier than the maxDateUTC query parameter value if a valid API call is made", async () => {
            // setting query value to 6 days ago
            // which should exclude one of the user's records
            const dateOnedAgoString = dateOnedAgo.toISOString().replace("T"," ").substring(0, 10)

            const res = await request(server).get(`/api/restaurants`)
                                            .query({ maxDateUTC:  dateOnedAgoString})
                                            .set('x-auth-token', token)

            expect(res.body).toHaveLength(1)
            expect(res.body[0]._id).not.toBe(restrId.toHexString())
        })


        it('should return all documents between request query minDateUTC and maxDateUTC parameters if a valid call is made', async () => {
            let date3dAgo = new Date()
            date3dAgo.setUTCDate(new Date().getDate()-3)
            date3dAgo.setUTCHours(0, 0, 0, 0)
            
            // inserting a restr record with a date 3 days in the past
            await Restaraunt.create({
                name: 'D',
                userId,
                rating: 4,
                cntryCd: "USA",
                note: "Good",
                date: date3dAgo,
                location: "LA",
                wishlist: false
            })
            const date6dAgoString = date6dAgo.toISOString().replace("T"," ").substring(0, 10)
            const dateOnedAgoString = dateOnedAgo.toISOString().replace("T"," ").substring(0, 10)

            const res = await request(server).get(`/api/restaurants`)
                                            .query({ 
                                                minDateUTC: date6dAgoString,
                                                maxDateUTC:  dateOnedAgoString})
                                            .set('x-auth-token', token)
                                            
            expect(res.body).toHaveLength(1)
            expect(res.body[0].name).toBe("D")
        })

        
        // rating query
        // some ther query test
    })

    describe('GET /:cntryCd', () => {
        // token
        it("should return all current restaurant entries in the Restaurant collection", async () => {
            const country = 'AUS'
            const res = await request(server).get(`/api/restaurants/${country}`)

            expect(res.status).toBe(400)
        })
    })

    // wishlist fileter route??? yes... just like select all
    // 
})