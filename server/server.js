/**
 * SAAVI LITE - Production Backend (Final Master v4.0)
 * Rebuilt for Absolute Stability & Hostinger/Passenger Compatibility
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

// Models
const { Gallery } = require('./models.js');

// 1. BOOTSTRAP DIAGNOSTICS
console.log('='.repeat(50));
console.log('>>> SAAVI LITE SYSTEM BOOT');
console.log('>>> MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('>>> NODE_VERSION:', process.version);
console.log('>>> WORKING_DIR:', process.cwd());
console.log('='.repeat(50));

const app = express();
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 2. PRODUCTION HARDENING
app.set('trust proxy', 1);

// EARLY HEALTH CHECK (Highest priority for Hostinger 503 debugging)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        uptime: process.uptime(),
        dbState: mongoose.connection.readyState,
        timestamp: new Date().toISOString()
    });
});

// Domain Redirect Middleware
app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host === 'saavilite.in') {
        return res.redirect(301, `https://www.saavilite.in${req.url}`);
    }
    next();
});

// Security & Core Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
    secret: process.env.SESSION_SECRET || 'saavilitte_session_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// 3. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ Connected to MongoDB Atlas'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err.message));
}

// 4. API AUTH & MULTER
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type. Use JPG, PNG, or WebP.'));
    }
});

// 5. API ROUTES
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true, message: 'Welcome Admin' });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/api/admin/status', (req, res) => res.json({ authenticated: !!(req.session && req.session.isAdmin) }));

app.get('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/gallery', async (req, res) => {
    try {
        const images = await Gallery.find().sort({ createdAt: -1 }).limit(30).lean();
        res.json(images);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gallery', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
        const count = await Gallery.countDocuments();
        if (count >= 30) {
            // Cleanup uploaded file if limit reached
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Gallery limit (30) reached' });
        }

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

app.put('/api/gallery/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const updateData = {
            title: req.body.title,
            category: req.body.category,
            description: req.body.description
        };
        if (req.file) {
            updateData.imageUrl = '/uploads/' + req.file.filename;
            // Async delete old image
            Gallery.findById(req.params.id).then(item => {
                if (item && item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
                    const oldPath = path.join(PUBLIC_DIR, item.imageUrl);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            });
        }
        const updated = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/gallery/:id', auth, async (req, res) => {
    try {
        const item = await Gallery.findByIdAndDelete(req.params.id);
        if (item && item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
            const filePath = path.join(PUBLIC_DIR, item.imageUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. FRONTEND PAGE ROUTES
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Endpoint Not Found' });
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 7. START SERVER
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Saavi Lite Master Server Active on Port ${PORT}`);
});

// Passenger compatibility
module.exports = app;

// Shutdown handler
process.on('SIGTERM', () => {
    server.close(() => {
        mongoose.connection.close(false, () => process.exit(0));
    });
});
