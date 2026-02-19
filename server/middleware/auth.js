const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: Admin access required' });
};
