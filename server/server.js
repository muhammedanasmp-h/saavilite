const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
require('dotenv').config();

// Models
const { Gallery } = require('./models.js');

// Safety: Handle unhandled promise rejections and exceptions
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

const app = express();
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// --- DATABASE CONNECTION (non-blocking, like Antigravity) ---
const MONGO_URI = process.env.MONGO_URI && process.env.MONGO_URI.trim()
    ? process.env.MONGO_URI
    : '';

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ Connected to MongoDB Atlas'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
    console.error('❌ MONGO_URI is not set in .env — database features will not work');
}

// --- MIDDLEWARE ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'saavilitte_session_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Auth Middleware
const auth = (req, res, next) => {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ message: 'Unauthorized: Admin access required' });
};

// Multer Upload
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('File type not supported. Use jpg, png, or webp.'));
    }
});

// --- ADMIN CREDENTIALS (with safe fallback like Antigravity) ---
const ADMIN_USER = process.env.ADMIN_USERNAME && process.env.ADMIN_USERNAME.trim()
    ? process.env.ADMIN_USERNAME
    : 'admin';

const ADMIN_PASS = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()
    ? process.env.ADMIN_PASSWORD
    : 'saavilitte2024';

console.log(`>>> Admin login configured (username: ${ADMIN_USER})`);

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true, message: 'Logged in successfully' });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Session Status
app.get('/api/admin/status', (req, res) => {
    if (req.session && req.session.isAdmin) return res.json({ authenticated: true });
    res.status(401).json({ authenticated: false });
});

// Logout
app.get('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// --- GALLERY API ---

app.get('/api/gallery', async (req, res) => {
    try {
        const images = await Gallery.find().sort({ createdAt: -1 }).limit(30).lean();
        res.json(images);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/gallery/:id', async (req, res) => {
    try {
        const image = await Gallery.findById(req.params.id).lean();
        if (!image) return res.status(404).json({ message: 'Image not found' });
        res.json(image);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/gallery', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Please upload an image' });
        const count = await Gallery.countDocuments();
        if (count >= 30) return res.status(400).json({ message: 'Gallery limit reached (30 max).' });

        const newImage = new Gallery({
            title: req.body.title,
            category: req.body.category,
            imageUrl: 'https://placehold.co/600x400?text=' + encodeURIComponent(req.body.title),
            description: req.body.description
        });

        await newImage.save();
        res.status(201).json(newImage);
    } catch (err) {
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});

app.put('/api/gallery/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const { title, category, description } = req.body;
        const updated = await Gallery.findByIdAndUpdate(req.params.id, { title, category, description }, { new: true });
        if (!updated) return res.status(404).json({ message: 'Image not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
});

app.delete('/api/gallery/:id', auth, async (req, res) => {
    try {
        const deleted = await Gallery.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Image not found' });
        res.json({ message: 'Image deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
});

// --- PAGE ROUTES ---
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// Catch-all
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'API Endpoint Not Found' });
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Static files: ${PUBLIC_DIR}`);
});
