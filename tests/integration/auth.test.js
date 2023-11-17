import request from 'supertest'
import { User } from '../../server/models/user'
import mongoose from 'mongoose'
let server

describe('/api/auth', () => {
    let uploadedUser;
    let name;
    let email;
    let password;


    beforeEach(async () => {
        const { default: myServer } = await import('../../server/server')
        server = myServer
    })
    afterEach(async () => {
        await server.close()
        await User.deleteMany({})
    })
    afterAll(() => {
        mongoose.disconnect()
    })

    describe('POST /', () => {
        beforeEach(async () => {
            name = 'username'
            email = 'abc@c.com'
            password = 'SecurePass1'; //actuall password in MongoDB collection will be encrypted
            uploadedUser = new User({
                name,
                email,
                password
            })
        })

        it('should return a 200 status if valid name and password parameters are passed', async () => {
            const res = await request(server).post('/api/auth').send({
                name, password
            })

            expect(res.status).toBe(200)
        })
    })
})