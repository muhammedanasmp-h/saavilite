const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
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

// ================================
// 1. DATABASE CONNECTION
// ================================
const MONGO_URI = process.env.MONGO_URI && process.env.MONGO_URI.trim()
    ? process.env.MONGO_URI.trim()
    : '';

console.log(`>>> ENV loaded: MONGO_URI=${MONGO_URI ? 'SET (' + MONGO_URI.substring(0, 25) + '...)' : 'NOT SET'}`);
console.log(`>>> ENV loaded: PORT=${process.env.PORT || '3000 (default)'}`);

let dbConnected = false;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => {
            dbConnected = true;
            console.log('✅ Connected to MongoDB Atlas');
        })
        .catch(err => {
            dbConnected = false;
            console.error('❌ MongoDB Initial Connection Error:', err.message);
        });

    // Connection monitoring
    mongoose.connection.on('connected', () => {
        dbConnected = true;
        console.log('>>> Mongoose: Connected');
    });
    mongoose.connection.on('error', (err) => {
        dbConnected = false;
        console.error('>>> Mongoose: Connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
        dbConnected = false;
        console.warn('>>> Mongoose: Disconnected');
    });
} else {
    console.error('❌ MONGO_URI is not set in .env — database features will not work');
}

// ================================
// 2. MIDDLEWARE
// ================================

// FIRST: Domain redirect — saavilite.in → www.saavilite.in
app.use((req, res, next) => {
    const host = req.headers.host || '';
    // Redirect bare domain to www (fixes 503 on bare domain)
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
        secure: false,       // Set to true ONLY if Hostinger forces HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'      // Prevents CSRF, allows normal navigation
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

// ================================
// 3. MULTER UPLOAD — save to public/uploads/
// ================================
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
try {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log('✅ Created uploads directory:', UPLOADS_DIR);
    } else {
        console.log('✅ Uploads directory exists:', UPLOADS_DIR);
    }
    // Test write permission
    const testFile = path.join(UPLOADS_DIR, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Uploads directory is writable');
} catch (err) {
    console.error('❌ Uploads directory error:', err.message);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E6) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('File type not supported. Use jpg, png, or webp.'));
    }
});

// ================================
// 4. ADMIN CREDENTIALS
// ================================
const ADMIN_USER = process.env.ADMIN_USERNAME && process.env.ADMIN_USERNAME.trim()
    ? process.env.ADMIN_USERNAME.trim()
    : 'admin';

const ADMIN_PASS = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()
    ? process.env.ADMIN_PASSWORD.trim()
    : 'saavilitte2024';

console.log(`>>> Admin login configured (username: ${ADMIN_USER})`);

// ================================
// 5. DEBUG & HEALTH ROUTES
// ================================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        db: dbConnected ? 'connected' : 'disconnected',
        mongoState: mongoose.connection.readyState,
        uploadsDir: UPLOADS_DIR,
        uploadsDirExists: fs.existsSync(UPLOADS_DIR),
        env: {
            MONGO_URI: MONGO_URI ? 'SET' : 'NOT SET',
            PORT: process.env.PORT || '3000',
            NODE_ENV: process.env.NODE_ENV || 'not set'
        }
    });
});

// Debug route — check everything at once (visit /api/debug in browser)
app.get('/api/debug', (req, res) => {
    const uploadFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
    res.json({
        server: 'running',
        database: {
            connected: dbConnected,
            state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
            uri_set: !!MONGO_URI,
            db_name: mongoose.connection.db ? mongoose.connection.db.databaseName : 'not connected'
        },
        uploads: {
            directory: UPLOADS_DIR,
            exists: fs.existsSync(UPLOADS_DIR),
            file_count: uploadFiles.length,
            files: uploadFiles.slice(0, 10) // Show first 10
        },
        env: {
            MONGO_URI: MONGO_URI ? 'SET (' + MONGO_URI.substring(0, 25) + '...)' : 'NOT SET',
            ADMIN_USERNAME: ADMIN_USER,
            PORT: process.env.PORT || '3000'
        },
        public_dir: PUBLIC_DIR,
        public_exists: fs.existsSync(PUBLIC_DIR)
    });
});

// ================================
// 6. ADMIN AUTH ROUTES
// ================================

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`>>> Login attempt: user="${username}"`);

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        console.log('>>> Login SUCCESS');
        return res.json({ success: true, message: 'Logged in successfully' });
    }
    console.log(`>>> Login FAILED — expected user="${ADMIN_USER}"`);
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/api/admin/status', (req, res) => {
    if (req.session && req.session.isAdmin) return res.json({ authenticated: true });
    res.status(401).json({ authenticated: false });
});

app.get('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// ================================
// 7. GALLERY API
// ================================

app.get('/api/gallery', async (req, res) => {
    try {
        const images = await Gallery.find().sort({ createdAt: -1 }).limit(30).lean();
        res.json(images);
    } catch (err) {
        console.error('Gallery fetch error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
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

// POST — Upload new gallery image
app.post('/api/gallery', auth, upload.single('image'), async (req, res) => {
    try {
        console.log('>>> Upload request received');
        console.log('>>> File:', req.file ? req.file.filename : 'NONE');
        console.log('>>> Body:', JSON.stringify(req.body));

        if (!req.file) return res.status(400).json({ message: 'Please upload an image' });

        // Check DB connection
        if (mongoose.connection.readyState !== 1) {
            console.error('>>> Upload failed: Database not connected (state:', mongoose.connection.readyState, ')');
            return res.status(503).json({ message: 'Database is not connected. Check MONGO_URI in .env' });
        }

        const count = await Gallery.countDocuments();
        if (count >= 30) return res.status(400).json({ message: 'Gallery limit reached (30 max).' });

        const imageUrl = '/uploads/' + req.file.filename;
        console.log('>>> Image saved to:', imageUrl);

        const newImage = new Gallery({
            title: req.body.title,
            category: req.body.category,
            imageUrl: imageUrl,
            description: req.body.description
        });

        await newImage.save();
        console.log('>>> Saved to MongoDB:', newImage._id);
        res.status(201).json(newImage);
    } catch (err) {
        console.error('>>> Upload error:', err.message);
        console.error('>>> Full error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});

// PUT — Update gallery item
app.put('/api/gallery/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const { title, category, description } = req.body;
        const updateData = { title, category, description };

        if (req.file) {
            updateData.imageUrl = '/uploads/' + req.file.filename;
            // Delete old image file
            const oldItem = await Gallery.findById(req.params.id);
            if (oldItem && oldItem.imageUrl && oldItem.imageUrl.startsWith('/uploads/')) {
                const oldPath = path.join(PUBLIC_DIR, oldItem.imageUrl);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        const updated = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ message: 'Image not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
});

// DELETE — Remove gallery item
app.delete('/api/gallery/:id', auth, async (req, res) => {
    try {
        const deleted = await Gallery.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Image not found' });
        if (deleted.imageUrl && deleted.imageUrl.startsWith('/uploads/')) {
            const filePath = path.join(PUBLIC_DIR, deleted.imageUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.json({ message: 'Image deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
});

// ================================
// 8. MULTER ERROR HANDLER (catches file size, type errors)
// ================================
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('>>> Multer error:', err.code, err.message);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Max 5MB allowed.' });
        }
        return res.status(400).json({ message: 'Upload error: ' + err.message });
    }
    if (err) {
        console.error('>>> Server error:', err.message);
        return res.status(500).json({ message: err.message });
    }
    next();
});

// ================================
// 9. PAGE ROUTES
// ================================
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// Catch-all
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: 'API Endpoint Not Found' });
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ================================
// 10. START SERVER
// ================================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Binding: 0.0.0.0 (production)`);
    console.log(`📁 Static files: ${PUBLIC_DIR}`);
    console.log(`📂 Uploads dir: ${UPLOADS_DIR}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Debug:  http://localhost:${PORT}/api/debug`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received: closing server');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('Server + DB closed');
            process.exit(0);
        });
    });
});
