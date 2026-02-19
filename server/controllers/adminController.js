exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const envUser = process.env.ADMIN_USERNAME;
        const envPass = process.env.ADMIN_PASSWORD;

        // Security: Block login if credentials are not configured in .env
        if (!envUser || !envPass) {
            console.error('LOGIN ATTEMPT BLOCKED: Admin credentials not configured in .env');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Validate both username and password
        if (username === envUser && password === envPass) {
            req.session.isAdmin = true;
            return res.json({ success: true, message: 'Logged in successfully' });
        }

        res.status(401).json({ message: 'Invalid credentials' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.checkStatus = (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.json({ authenticated: true });
    }
    res.status(401).json({ authenticated: false });
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
};
