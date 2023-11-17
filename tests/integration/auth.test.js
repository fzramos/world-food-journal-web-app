import request from 'supertest'
import { User } from '../../server/models/user'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
let server

describe('/api/auth', () => {
    let uploadedUser;
    let name;
    let email;
    let salt;
    let password;
    let hashedPassword;

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
            password = 'SecurePass1!'
            hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
            // password = 'SecurePass1!'; // actual password in MongoDB collection will be encrypted
            uploadedUser = new User({
                name,
                email,
                password: hashedPassword,
                adminStatus: false
            })
            await uploadedUser.save()
        })

        it('should return a 200 status if valid name and password parameters are passed', async () => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: name, password
            })

            expect(res.status).toBe(200)
        })

        it('should return a 200 status if valid email and password parameters are passed', async () => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: email, password
            })

            expect(res.status).toBe(200)
        })

        it('should return a valid JWT if valid parameters are given', async () => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: name, password
            })

            expect(res.text).toBe(uploadedUser.generateAuthToken())
        })

        it('should return a 400 status if an non-existent email value is passed', async () => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: 'wrong@email.com', password
            })

            expect(res.status).toBe(400)
        })

        it('should return a 400 status if an non-existent name value is passed', async () => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: 'fake', password
            })

            expect(res.status).toBe(400)
        })

        it('should return a 400 status if an incorrect password value is passed', async () => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: name, password: 'wrong_password'
            })

            expect(res.status).toBe(400)
        })

        it('should return a 400 status if the request is missing the nameOrEmail parameter', async () => {
            const res = await request(server).post('/api/auth').send({
                password: 'wrong_password'
            })

            expect(res.status).toBe(400)
        })

        it('should return a descriptive message if the request is missing the nameOrEmail parameter', async () => {
            const res = await request(server).post('/api/auth').send({
                password: 'wrong_password'
            })

            expect(res.text).toContain('nameOrEmail')
            expect(res.text).toContain('required')
        })

        it('should return a 400 status if the request is missing the password parameter', async () => {
            const res = await request(server).post('/api/auth').send({
                password: 'wrong_password'
            })

            expect(res.status).toBe(400)
        })
        
        it('should return a descriptive message if the request is missing the password parameter', async () => {
            const res = await request(server).post('/api/auth').send({
                password: 'wrong_password'
            })

            expect(res.text).toContain('nameOrEmail')
            expect(res.text).toContain('required')
        })

        it('should return a 400 status if the given nameOrEmail value is greater than 255 characters', async() => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: '1'.repeat(256),
                password
            })

            expect(res.status).toBe(400)        
        })

        it('should return a descriptive message if the given nameOrEmail value is greater than 255 characters', async() => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: '1'.repeat(256),
                password
            })

            expect(res.text).toContain('nameOrEmail') 
            expect(res.text).toContain('255')        
        })

        it('should return a 400 status if the given password value is greater than 200 characters', async() => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: name,
                password: '1'.repeat(201)
            })

            expect(res.status).toBe(400)        
        })

        it('should return a descriptive message if the given password value is greater than 200 characters', async() => {
            const res = await request(server).post('/api/auth').send({
                nameOrEmail: name,
                password: '1'.repeat(201)
            })

            expect(res.text).toContain('password') 
            expect(res.text).toContain('200')        
        })
    })
})