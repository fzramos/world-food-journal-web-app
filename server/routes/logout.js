import express from 'express'
const router = express.Router()
import { serialize } from 'cookie'

router.post('/', (req, res) => {
    const { cookies } = req;
    const token = cookies.token
    if (!token) {
        return res.status(401).send('Error')
    }
    
    // modify HTTPS only cookie to expire right away
    const serialized = serialize('token', null, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1,
        path: '/'
    })
    res.setHeader('Set-Cookie', serialized)
    res.status(200).send('Logged out')
})

export default router;