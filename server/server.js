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
const { Admin, Gallery } = require('./models.js');

// Safety: Handle unhandled promise rejections and exceptions
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

const app = express();

// --- DATABASE CONNECTION ---
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing in .env');
        console.log('>>> Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('>>> Successfully connected to MongoDB Atlas');
    } catch (err) {
        console.error('CRITICAL DATABASE ERROR:', err.message);
        process.exit(1);
    }
};
connectDB();

// --- MIDDLEWARE ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_not_for_prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Auth Middleware Helper
const auth = (req, res, next) => {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ message: 'Unauthorized: Admin access required' });
};

// Multer Storage Helper
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('File type not supported. Use jpg, png, or webp.'));
    }
});

// --- ADMIN API ---

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const envUser = process.env.ADMIN_USERNAME;
        const envPass = process.env.ADMIN_PASSWORD;

        if (!envUser || !envPass) {
            console.error('LOGIN BLOCKED: Credentials not set in .env');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        if (username === envUser && password === envPass) {
            req.session.isAdmin = true;
            return res.json({ success: true, message: 'Logged in successfully' });
        }
        res.status(401).json({ message: 'Invalid credentials' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
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
        if (count >= 30) return res.status(400).json({ message: 'Gallery limit reached (30 items max).' });

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
        const updateData = { title, category, description };
        const updated = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Server successfully started on port ${PORT}`);
    console.log(`>>> Binding to 0.0.0.0 for production access`);
    console.log(`>>> Environment: ${process.env.NODE_ENV || 'development'}`);
});

// SIGTERM handler for graceful shutdown (useful for PM2/K8s/Docker)
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});
