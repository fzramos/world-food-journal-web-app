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

        it("should return a 400 error with a descriptive message if an invalid minDateUTC query param value is passed", async () => {
            const res = await request(server).get(`/api/restaurants`)
                                            .query({ minDateUTC:  'aaa'})
                                            .set('x-auth-token', token)
            expect(res.status).toBe(400)
            expect(res.text).toContain('date')
            expect(res.text).toContain('invalid')
        })

        it("should return a 400 error with a descriptive message if an invalid maxDateUTC query param value is passed", async () => {
            const res = await request(server).get(`/api/restaurants`)
                                            .query({ maxDateUTC:  'aaa'})
                                            .set('x-auth-token', token)

            expect(res.status).toBe(400)
            expect(res.text).toContain('date')
            expect(res.text).toContain('invalid')
        })

        it("should return all documents for the user that have a date later than the minDateUTC query parameter value if a valid API call is made", async () => {
            // setting query value to 6 days ago
            // which should exclude one of the user's records
            const date6dAgoString = date6dAgo.toISOString().replace("T"," ").substring(0, 10)

            const res = await request(server).get(`/api/restaurants`)
                                            .query({ minDateUTC:  date6dAgoString})
                                            .set('x-auth-token', token)

            expect(res.body).toHaveLength(1)
            expect(res.body[0]._id).toBe(restrId.toHexString())
            expect(new Date(res.body[0].date).getTime()).toBeGreaterThan(date7dAgo.getTime())
        })

        it("should return all documents for the user that a have date earlier than the maxDateUTC query parameter value if a valid API call is made", async () => {
            // setting query value to 6 days ago
            // which should exclude one of the user's records
            const dateOnedAgoString = dateOnedAgo.toISOString().replace("T"," ").substring(0, 10)

            const res = await request(server).get(`/api/restaurants`)
                                            .query({ maxDateUTC:  dateOnedAgoString})
                                            .set('x-auth-token', token)

            expect(res.body).toHaveLength(1)
            expect(res.body[0]._id).not.toBe(restrId.toHexString())
            expect(new Date(res.body[0].date).getTime()).toBeLessThan(dateOnedAgo.getTime())
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
    })

    describe('GET /:cntryCd', () => {
        let query;
        beforeEach(async () => {
            await Restaraunt.create({
                name: 'D',
                userId,
                rating: 5,
                date: date7dAgo,
                cntryCd: cntryCd,
                note: "Fine",
                location: "New York City",
                wishlist: false
            })
            query = {}
        })
        function exec() {
            return request(server).get(`/api/restaurants/${cntryCd}`).set('x-auth-token', token)
        }

        function execQuery() {
            return request(server).get(`/api/restaurants/${cntryCd}`)
                        .query(query)            
                        .set('x-auth-token', token)
        }

        it("should status 200 if a valid API call is made", async () => {
            const res = await exec()

            expect(res.status).toBe(200)
        })

        it("should status 401 if an API call is made without a valid auth token", async () => {
            token = ''
            const res = await exec()

            expect(res.status).toBe(401)
        })
        it("should return all documents in the Restaurant collection matching the cntryCd parameter and JWT userId", async () => {
            const res = await exec()

            expect(res.body).toHaveLength(2)
            expect(res.body[0].cntryCd).toBe(cntryCd)
            expect(res.body[1].cntryCd).toBe(cntryCd)
        })

        it("should return 0 documents if the requesting user doesn't have any documents with the given cntryCd in the Restaurant collection", async () => {            
            token = new User().generateAuthToken()

            const res = await exec()

            expect(res.body).toHaveLength(0)
        })

        it("should return all documents for the user and cntryCd that match the wishlist query parameter", async () => {
            query = { wishlist: true}
            const res = await execQuery()
            
            expect(res.body).toHaveLength(1)
            expect(res.body[0].wishlist).toBe(true)
        })

        it("should return all documents for the user and cntryCd that have a name containing the substring from the name query parameter value", async () => {
            query = { name: 'D'}
            const res = await execQuery()

            expect(res.body).toHaveLength(1)
            expect(res.body[0].name).toMatch(/d/i)
        })

        it("should return a 400 error with a descriptive message if an invalid minDateUTC query param value is passed", async () => {
            query = { minDateUTC: 'asdfa'}
            const res = await execQuery()

            expect(res.status).toBe(400)
            expect(res.text).toContain('date')
            expect(res.text).toContain('invalid')
        })

        it("should return a 400 error with a descriptive message if an invalid maxDateUTC query param value is passed", async () => {
            query = { maxDateUTC: 'asdfa'}
            const res = await execQuery()

            expect(res.status).toBe(400)
            expect(res.text).toContain('date')
            expect(res.text).toContain('invalid')
        })
        
        it("should return all documents for the user and cntryCd that have a date later than the minDateUTC query parameter value if a valid API call is made", async () => {
            const date6dAgoString = date6dAgo.toISOString().replace("T"," ").substring(0, 10)
            query = { minDateUTC: date6dAgoString}
            const res = await execQuery()

            expect(res.body).toHaveLength(1)
            expect(res.body[0]._id).toBe(restrId.toHexString())
            expect(new Date(res.body[0].date).getTime()).toBeGreaterThan(date7dAgo.getTime())
        })

        it("should return all documents for the user that a date earlier than the maxDateUTC query parameter value if a valid API call is made", async () => {
            const dateOnedAgoString = dateOnedAgo.toISOString().replace("T"," ").substring(0, 10)
            query = { maxDateUTC: dateOnedAgoString }
            const res = await execQuery()

            expect(res.body).toHaveLength(1)
            expect(res.body[0]._id).not.toBe(restrId.toHexString())
            expect(new Date(res.body[0].date).getTime()).toBeLessThan(dateOnedAgo.getTime())
        })

        it('should return all matching user and cntry documents between request query minDateUTC and maxDateUTC parameters', async () => {
            let date3dAgo = new Date()
            date3dAgo.setUTCDate(new Date().getDate()-3)
            date3dAgo.setUTCHours(0, 0, 0, 0)
            const newId = new mongoose.Types.ObjectId()
            // inserting a restr record with a date 3 days in the past
            await Restaraunt.create({
                _id: newId,
                name: 'D',
                userId,
                rating: 4,
                cntryCd,
                note: "Good",
                date: date3dAgo,
                location: "LA",
                wishlist: false
            })
            const date6dAgoString = date6dAgo.toISOString().replace("T"," ").substring(0, 10)
            const dateOnedAgoString = dateOnedAgo.toISOString().replace("T"," ").substring(0, 10)
            query = {
                minDateUTC: date6dAgoString,
                maxDateUTC:  dateOnedAgoString
            }
            const res = await execQuery()

            expect(res.body).toHaveLength(1)
            expect(res.body[0]._id).toBe(newId.toHexString())
        })
    })

    describe('DELETE /:restrId', () => {
        function exec() {
            return request(server).delete(`/api/restaurants/${restrId}`).set('x-auth-token', token)
        }

        it('should return a 401 status if an unauthorized API call is made', async () => {
            token = ''

            const res = await exec()

            expect(res.status).toBe(401)
        })

        it('should return a 200 status if a call is made with a valid JWT', async () => {
            const res = await exec()
            expect(res.status).toBe(200)
        })

        it('should return as 400 status and descriptive error message if an invalid ObjectId is passed', async () => {
            restrId = 'a'
            const res = await exec()

            expect(res.status).toBe(404)
            expect(res.text).toMatch(/id/i)
        })

        it('should return as 400 status if an valid but non-existent ObjectId is passed', async () => {
            restrId = new mongoose.Types.ObjectId()
            const res = await exec()

            expect(res.status).toBe(404)
            expect(res.text).toMatch(/id/i)
        })
        it('should delete the requested document from the Restaurant collection', async () => {
            await exec()

            const result = await Restaraunt.findById(restrId)

            expect(result).toBeNull()
        })

        it('should return the deleted document', async () => {
            const res = await exec()

            expect(res.body._id).toBe(restrId.toHexString())
        })
    })

    describe('PUT /:restrId', () => {
        let updatedRestr

        beforeEach(() => {
            updatedRestr = {
                name: 'Ab',
                rating: 5,
                cntryCd: cntryCd,
                note: "Great",
                location: "New York City",
                wishlist: false
            }
        })

        function exec() {
            return request(server)
                    .put(`/api/restaurants/${restrId}`)
                    .set('x-auth-token', token)
                    .send(updatedRestr)
        }

        it('should return a 401 status if an unauthorized API call is made', async () => {
            token = ''

            const res = await exec()

            expect(res.status).toBe(401)
        })

        it('should return a 200 status if a call is made with a valid JWT', async () => {
            const res = await exec()
            expect(res.status).toBe(200)
        })

        it('should return as 400 status and descriptive error message if an invalid ObjectId is passed', async () => {
            restrId = 'a'
            const res = await exec()

            expect(res.status).toBe(404)
            expect(res.text).toMatch(/id/i)
        })

        it('should return as 400 status if an valid but non-existent ObjectId is passed', async () => {
            restrId = new mongoose.Types.ObjectId()
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toMatch(/id/i)
        })
        
        it('should update the requested document from the Restaurant collection', async () => {
            await exec()

            const result = await Restaraunt.findById(restrId)

            expect(result).toMatchObject(updatedRestr)
        })

        it('should return the updated document\'s values', async () => {
            const res = await exec()
            
            expect(res.body).toMatchObject(updatedRestr)
            expect(res.body._id).toBe(restrId.toHexString())
        })

        it('should return a 400 error and descriptive message if the name req.body property value is less than 1 character', async () => {
            updatedRestr.name = ""
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("name")
        })
        
        it('should return a 400 error and descriptive message if the name req.body property value is greater than 200 characters', async () => {
            updatedRestr.name = '1'.repeat(201)
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("name")
            expect(res.text).toContain("200")
        })


        it('should return a 400 error and descriptive message if the rating req.body property value greater than 5', async () => {
            updatedRestr.rating = 6
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("rating")
            expect(res.text).toContain("5")
        })
        
        it('should return a 400 error and descriptive message if the rating req.body property value is less than 0', async () => {
            updatedRestr.rating = -1
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("rating")
            expect(res.text).toContain("0")
        })
      
        it('should return a 400 error and descriptive message if the cntryCd req.body property value length is less than 1', async () => {
            updatedRestr.cntryCd = "a" 
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("cntryCd")
            expect(res.text).toContain("1")
        })
  
        it('should return a 400 error and descriptive message if the note req.body property value length is less than 1', async () => {
            updatedRestr.note = ""
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("note")
            expect(res.text).toContain("1")
        })

        it('should return a 400 error and descriptive message if the cntryCd req.body property value length is greater than 5', async () => {
            updatedRestr.cntryCd = "1". repeat(6)
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("cntryCd")
            expect(res.text).toContain("5")
        })

        it('should return a 400 error and descriptive message if the note req.body property value length is greater than 3000', async () => {
            updatedRestr.note = "1". repeat(3001)
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("note")
            expect(res.text).toContain("3000")
        })



        it('should return a 400 error and descriptive message if the location req.body property value is less than 1 character', async () => {
            updatedRestr.location = ""
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("location")
        })
        
        it('should return a 400 error and descriptive message if the location req.body property value is greater than 200 characters', async () => {
            updatedRestr.location = '1'.repeat(201)
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("location")
            expect(res.text).toContain("200")
        })
        
        it('should return a 400 error and descriptive message if the wishlist req.body property value is not a boolean', async () => {
            updatedRestr.wishlist = '1'
            const res = await exec()

            expect(res.status).toBe(400)
            expect(res.text).toContain("wishlist")
            expect(res.text).toContain("boolean")
        })

        
        it('should return an successfully updated object if only wishlist req.body property object is passed', async () => {
            updatedRestr = { wishlist : false }
            const res = await exec()

            
            expect(res.body.wishlist).toBe(false)
        })

        // more req.body validation tests needed
    })
})


