/**
 * SAAVI LITE - Production Backend (Hardened v3.0)
 * Optimized for Hostinger / Phusion Passenger
 */
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

// 1. CRITICAL DIAGNOSTICS (Visible in Passenger Logs)
console.log('--- SYSTEM BOOT ---');
console.log('MONGO_URI Present:', !!process.env.MONGO_URI);
console.log('PORT Variable:', process.env.PORT || '3000 (Local)');
console.log('Node Version:', process.version);

// Imports Models after config
const { Gallery } = require('./models.js');

const app = express();
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Ensure directories
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 2. PRODUCTION SETTINGS
app.set('trust proxy', 1);

// FIRST ROUTE - Health Check (Must be before all redirect/session logic for 503 debugging)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        database: mongoose.connection.readyState,
        timestamp: new Date().toISOString()
    });
});

// Domain Redirect (Conditional)
app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host === 'saavilite.in') {
        return res.redirect(301, `https://www.saavilite.in${req.url}`);
    }
    next();
});

// Session & Security
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

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// 3. DATABASE CONNECTION (Async)
const MONGO_URI = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB Connected'))
        .catch(err => console.error('❌ MongoDB Error:', err.message));
} else {
    console.error('⚠️ MONGO_URI is missing!');
}

// 4. API ROUTES
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'saavilitte2024';

const auth = (req, res, next) => {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E6) + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
});

app.get('/api/admin/status', (req, res) => res.json({ authenticated: !!(req.session && req.session.isAdmin) }));

app.get('/api/gallery', async (req, res) => {
    try {
        const images = await Gallery.find().sort({ createdAt: -1 }).limit(30).lean();
        res.json(images);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gallery', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image' });
        const count = await Gallery.countDocuments();
        if (count >= 30) return res.status(400).json({ message: 'Gallery limit (30) reached' });

        const newImage = new Gallery({
            title: req.body.title,
            category: req.body.category,
            imageUrl: '/uploads/' + req.file.filename,
            description: req.body.description
        });
        await newImage.save();
        res.status(201).json(newImage);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Other API routes logic...
app.put('/api/gallery/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const updateData = { title: req.body.title, category: req.body.category, description: req.body.description };
        if (req.file) {
            updateData.imageUrl = '/uploads/' + req.file.filename;
        }
        const updated = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/gallery/:id', auth, async (req, res) => {
    try {
        await Gallery.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. STATIC PAGE ROUTES
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Endpoint Not Found' });
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 6. SERVER START
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Master Server Ready on Port ${PORT}`);
});

// Passenger compatibility - Export the app instance
module.exports = app;

// Shutdown handler
process.on('SIGTERM', () => {
    server.close(() => {
        mongoose.connection.close(false, () => process.exit(0));
    });
});
