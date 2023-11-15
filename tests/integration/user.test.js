import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import config from 'config'
import _ from 'lodash'
import { User } from '../../server/models/user.js'
let server

describe('/api/user', () => {
    let userProps

    beforeEach(async () => {
        // example user register POST request body
        // reset values after each test
        userProps = {
            name: "aaa",
            email: "abc@d.com",
            password: "Password9!",
            repeat_password: "Password9!"
        }
        const { default: myServer } = await import('../../server/server.js')
        server = myServer
    })

    afterEach(async () => {
        await server.close()
        await User.deleteMany({})
    })

    afterAll(() => {
        mongoose.disconnect()
    })



    describe('POST /register', () => {
        // API call we are testing
        function exec() {
            return request(server).post('/api/user/register').send(userProps)
        }

        it('should return 200 status if a valid request is made', async () => {
            const res = await exec()

            expect(res.status).toBe(200)
        })
    })
})