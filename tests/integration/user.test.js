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

        it('should return 400 status if a duplicate username is attempted to be uploaded', async () => {
            await exec()
            // repeating Post
            const res = await exec()
            
            expect(res.status).toBe(400)
        })

        it('should return 400 status if request body does not include a "name" parameter', async () => {
            delete userProps.name

            const res = await exec()
            
            expect(res.status).toBe(400)
        })

        it('should respond with a descriptive message if request body does not include a "name" parameter', async () => {
            delete userProps.name
            
            const res = await exec()
            
            expect(res.text).toContain('name');
            expect(res.text).toContain('required');
            
        })

        it('should return 400 status if a duplicate username is attempted to be uploaded', async () => {
            await exec()
            // repeating Post
            const res = await exec()
            
            expect(res.status).toBe(400)
        })

        it('should respond with 400 status if "name" value is less than 2 characters', async () => {
            userProps.name = '1'
            
            const res = await exec()
            
            expect(res.status).toBe(400)
            // expect(res.text).toContain("name")
        })

        it('should return a descriptive message if "name" value is less than 2 characters', async () => {
            userProps.name = '1'
            
            const res = await exec()
            
            expect(res.text).toContain('name');
            expect(res.text).toContain('2');
        })

        it('should respond with 400 status if "name" value is greater than 100 characters', async () => {
            userProps.name = '1'.repeat(101);
            
            const res = await exec()
            
            expect(res.status).toBe(400)
            // expect(res.text).toContain("name")
        })

        it('should return a descriptive message if "name" value is greater than 100 characters', async () => {
            userProps.name = '1'.repeat(101);
            
            const res = await exec()
            
            expect(res.text).toContain('name');
            expect(res.text).toContain('100');
        })

        it('should respond with 200 status if no "email" parameter is passed', async () => {
            delete userProps.email
            
            const res = await exec()
            
            expect(res.status).toBe(200)
        })

        it('should respond with 400 status if the "email" value does not have a valid email format', async () => {
            userProps.email = "abcd"
            
            const res = await exec()
            
            expect(res.status).toBe(400)
        })
        //

        it('should return a 400 message if "email" value is less than 4 characters', async () => {
            userProps.email = '1'
            
            const res = await exec()
            
            expect(res.status).toBe(400)
        })

        it('should return a descriptive message if "email" value is less than 4 characters', async () => {
            userProps.email = '1'
            
            const res = await exec()
            
            expect(res.text).toContain('email');
            expect(res.text).toContain('4');
        })

        it('should respond with 400 status if "email" value is greater than 100 characters', async () => {
            userProps.email = '1'.repeat(101) + "@b.com";
            
            const res = await exec()
            
            expect(res.status).toBe(400)
            // expect(res.text).toContain("name")
        })

        it('should respond with 400 status if no "password" parameter is passed', async () => {
            delete userProps.password
            
            const res = await exec()
            
            expect(res.status).toBe(400)
        })

        it('should respond with 400 status if no "repeat_password" parameter is passed', async () => {
            delete userProps.repeat_password
            
            const res = await exec()
            
            expect(res.status).toBe(400)
        })

        it('should return a descriptive message if no "repeat_password" parameter is passed', async () => {
            delete userProps.repeat_password
            
            const res = await exec()
            
            expect(res.text).toContain("repeat_password")
            expect(res.text).toContain("required")
        })
        



        it('should return 200 status if a valid request is made', async () => {
            const res = await exec()
            
            expect(res.status).toBe(200)
        })
    })
})