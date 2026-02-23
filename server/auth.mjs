// Authentication middleware implementation

const jwt = require('jsonwebtoken');
const secret = 'your_jwt_secret'; // Change this to your secret key

const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(403).json({ message: 'No token provided!' });
    }

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized!' });
        }
        req.user = decoded;
        next();
    });
};

module.exports = { authenticate };