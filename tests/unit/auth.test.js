import { User } from '../../server/models/user'
import auth from '../../server/middleware/auth'
import mongoose from 'mongoose'

describe('AUTH Middleware', () =>{
    it('should populate req.user with the decoded JWT', () => {
        const user = {
            _id: new mongoose.Types.ObjectId().toHexString(),
            adminStatus: false
        }
        const token = new User(user).generateAuthToken()

        // testing this function is a little tricky since its an Express
        // middleware function that expects a realistic API request, response,
        // and next() function
        // REMEMBER: Middleware function's goal is to check/modify the req and possibly send a response
        const req = {
            header: jest.fn().mockReturnValue(token) // jest mock function to return a predefined value
            // as if it were a real function
        }
        const res = {}
        const next = jest.fn() // dummy function

        auth(req, res, next)

        // checking that the request was updated appropriately
        expect(req).toHaveProperty('user')
        expect(req.user).toMatchObject(user)
    })
})