const jwt = require('jsonwebtoken');

//verify jwt token
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.send({ error: true, status: 401, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.send({ error: true, status: 401, message: 'unauthorized request detected' })
        }
        else {
            req.decoded = decoded;
            next();
        }
    })
}

module.exports = {
    verifyJWT
}