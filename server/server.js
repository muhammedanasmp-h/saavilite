require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

// Models
const { Gallery } = require('./models.js');

// 1. Diagnostics & DB Connection
console.log('='.repeat(50));
console.log('>>> SYSTEM BOOT STRAP');
console.log('>>> MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('>>> Mongo Initial Ready State:', mongoose.connection.readyState);

const MONGO_URI = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB Connected Successfully'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

    // Monitor Connection State Changes
    mongoose.connection.on('connected', () => console.log('>>> Connection: ACTIVE (1)'));
    mongoose.connection.on('error', (err) => console.error('>>> Connection: ERROR:', err.message));
    mongoose.connection.on('disconnected', () => console.warn('>>> Connection: DISCONNECTED (0)'));
} else {
    console.warn('⚠️ MONGO_URI is missing from .env');
}

// 2. Middleware & App Config
const app = express();
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Ensure uploads directory
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Domain redirect
app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host === 'saavilite.in') {
        return res.redirect(301, `https://www.saavilite.in${req.url}`);
    }
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'saavilitte_session_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Auth
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'saavilitte2024';
const auth = (req, res, next) => {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E6) + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type'));
    }
});

// 3. API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        dbState: mongoose.connection.readyState,
        uptime: process.uptime()
    });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
});

app.get('/api/gallery', async (req, res) => {
    try {
        const images = await Gallery.find().sort({ createdAt: -1 }).limit(30).lean();
        res.json(images);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/gallery', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image provided' });

        // Note: Manual readyState check removed as per instruction. 
        // Mongoose will naturally queue this operation if it's still connecting.

        const count = await Gallery.countDocuments();
        if (count >= 30) return res.status(400).json({ message: 'Gallery full' });

        const newImage = new Gallery({
            title: req.body.title,
            category: req.body.category,
            imageUrl: '/uploads/' + req.file.filename,
            description: req.body.description
        });

        await newImage.save();
        res.status(201).json(newImage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Other routes (DELETE/PUT) would go here...

// 4. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${PORT}`);
    console.log('='.repeat(50));
});
