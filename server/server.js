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

// Requirement 5 & 3: Connection Diagnostics
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("Mongo Initial Ready State:", mongoose.connection.readyState);

// Models
const { Gallery } = require('./models.js');

// 1. Connection Handling
const MONGO_URI = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch(err => console.log("❌ Mongo Error:", err.message));
}

const app = express();
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ==========================================
// 2. PRODUCTION HARDENING (Fixes 503)
// ==========================================
app.set('trust proxy', 1); // Crucial for reverse proxies like Hostinger/Passenger

app.use((req, res, next) => {
    const host = req.headers.host || '';
    // Redirect saavilite.in -> www.saavilite.in
    if (host === 'saavilite.in') {
        return res.redirect(301, `https://www.saavilite.in${req.url}`);
    }
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'saavilitte_session_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS strictly
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// 3. API ROUTES
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
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid type'));
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState }));

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
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
        if (!req.file) return res.status(400).json({ message: 'No image' });
        const count = await Gallery.countDocuments();
        if (count >= 30) return res.status(400).json({ message: 'Full' });

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
        const updateData = { title: req.body.title, category: req.body.category, description: req.body.description };
        if (req.file) {
            updateData.imageUrl = '/uploads/' + req.file.filename;
            const item = await Gallery.findById(req.params.id);
            if (item && item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
                const p = path.join(PUBLIC_DIR, item.imageUrl);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
        }
        const updated = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/gallery/:id', auth, async (req, res) => {
    try {
        const item = await Gallery.findByIdAndDelete(req.params.id);
        if (item && item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
            const p = path.join(PUBLIC_DIR, item.imageUrl);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. PAGE ROUTES
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Not Found' });
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 5. START SERVER
const PORT = process.env.PORT || 3000;
// Note: We are NOT binding to 0.0.0.0 specifically. 
// Passenger manages the binding to a socket or local port automatically.
const server = app.listen(PORT, () => {
    console.log(`🚀 Production Server Ready on Port ${PORT}`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        mongoose.connection.close(false, () => process.exit(0));
    });
});
