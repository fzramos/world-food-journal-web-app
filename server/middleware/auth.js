import jwt from 'jsonwebtoken'
import config from 'config'

export default function(req, res, next) {
    const token = req.header('x-auth-token')
    // React client will not use x-auth-token since storing that in local storage would be a security risk
    // React client will use HTTPS only cookie for authentication
    // if no x-auth-token is in header, then we'll check if request has HTTPS only cookie
    if (!token) token = req.cookies.token
    if (!token) return res.status(401).send('Access denied. No token provided.')

    try {
        const decoded = jwt.verify(token, process.env.WFJ_jwtPrivateKey)
        // adding decoded user details to the request, which will be used
        // by auth protected routes
        req.user = decoded

        next()
    } catch (err) {
        res.status(400).send('Invalid token provided')
    }
}