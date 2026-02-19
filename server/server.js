const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const adminRoutes = require('./routes/admin');
const galleryRoutes = require('./routes/gallery');
const connectDB = require('./config/db');

const app = express();

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

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

// Admin Page Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Explicit root route (optional but good for clarity)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
