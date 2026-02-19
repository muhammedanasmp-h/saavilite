const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

// Safety: Handle unhandled promise rejections and exceptions to prevent silent crashes
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

const adminRoutes = require('./routes/admin');
const galleryRoutes = require('./routes/gallery');
const connectDB = require('./config/db');

const app = express();

// Session Middleware
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

// Critical Check: Ensure MONGO_URI is present
if (!process.env.MONGO_URI) {
    console.error('CRITICAL ERROR: MONGO_URI is not defined in .env');
    process.exit(1);
}

// Database Connection
connectDB();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/gallery', galleryRoutes);

// Page Routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`>>> Server successfully started on port ${PORT}`);
    console.log(`>>> Environment: ${process.env.NODE_ENV || 'development'}`);
});
