const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Validate against environment variables
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            req.session.isAdmin = true;
            return res.json({ success: true, message: 'Logged in successfully' });
        }

        res.status(401).json({ message: 'Invalid credentials' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
