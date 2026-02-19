/**
 * SAAVI LITE - Production Server (Crash-Proof v5.0)
 * Built specifically for Hostinger/Passenger
 */

// GLOBAL CRASH PROTECTION — must be FIRST
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message);
    console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
});

// CORE REQUIRES
let path, express, mongoose, cors, helmet, rateLimit, session, multer, fs;
try {
    path = require('path');
    express = require('express');
    mongoose = require('mongoose');
    cors = require('cors');
    helmet = require('helmet');
    rateLimit = require('express-rate-limit');
    session = require('express-session');
    multer = require('multer');
    fs = require('fs');
} catch (err) {
    console.error('FATAL: Missing dependency:', err.message);
    console.error('Run: npm install');
}

// DOTENV — load from same directory as this file
try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
    console.error('dotenv not critical, continuing...');
}

// BOOT LOG
console.log('========== SAAVI LITE BOOT ==========');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'MISSING');
console.log('PORT:', process.env.PORT || '3000 (default)');
console.log('NODE:', process.version);
console.log('CWD:', process.cwd());
console.log('DIR:', __dirname);
console.log('=====================================');

// APP SETUP
const app = express();
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Safe directory creation
try {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
} catch (e) {
    console.error('Could not create uploads dir:', e.message);
}

// PRODUCTION SETTINGS
app.set('trust proxy', 1);

// HEALTH CHECK — absolute first route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'alive',
        uptime: process.uptime(),
        db: mongoose.connection.readyState,
        time: new Date().toISOString()
    });
});

// DOMAIN REDIRECT
app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host === 'saavilite.in') {
        return res.redirect(301, 'https://www.saavilite.in' + req.url);
    }
    next();
});

// MIDDLEWARE
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
    secret: process.env.SESSION_SECRET || 'saavilitte_session_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// DATABASE — safe connection, never crashes
const MONGO_URI = (process.env.MONGO_URI || '').trim();
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('DB: Connected'))
        .catch(err => console.error('DB Error:', err.message));
} else {
    console.error('WARNING: No MONGO_URI set. DB features disabled.');
}

// MODELS — safe require
let Gallery;
try {
    Gallery = require('./models.js').Gallery;
} catch (e) {
    console.error('Models load error:', e.message);
}

// AUTH
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'saavilitte2024';

const auth = (req, res, next) => {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

// MULTER
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
        const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        cb(null, ok.includes(file.mimetype));
    }
});

// ===== API ROUTES =====

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/api/admin/status', (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/gallery', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image' });
        const count = await Gallery.countDocuments();
        if (count >= 30) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
            return res.status(400).json({ message: 'Gallery full (30 max)' });
        }
        const item = new Gallery({
            title: req.body.title,
            category: req.body.category,
            imageUrl: '/uploads/' + req.file.filename,
            description: req.body.description
        });
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/gallery/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const data = {
            title: req.body.title,
            category: req.body.category,
            description: req.body.description
        };
        if (req.file) {
            data.imageUrl = '/uploads/' + req.file.filename;
        }
        const updated = await Gallery.findByIdAndUpdate(req.params.id, data, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/gallery/:id', auth, async (req, res) => {
    try {
        const item = await Gallery.findByIdAndDelete(req.params.id);
        if (item && item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
            const fp = path.join(PUBLIC_DIR, item.imageUrl);
            try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (e) { }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PAGE ROUTES
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// START — Passenger compatible
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});

// Passenger export
module.exports = app;
