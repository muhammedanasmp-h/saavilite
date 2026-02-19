/**
 * SAAVI LITE — Production-Ready Server
 * Optimized for: Local, Render, Hostinger
 */

// 1. Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// ── 2. Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend from the consolidated 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ── 3. API Routes ──
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/gallery', require('./routes/gallery'));
  app.use('/api/contact', require('./routes/contact'));
} catch (routeErr) {
  console.error('❌ Failed to load one or more routes:', routeErr.message);
}

// ── 4. SPA Fallbacks ──
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── 5. Production-Ready Error Handler ──
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[${new Date().toISOString()}] ❌ Server error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });

  res.status(statusCode).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// ── 6. Startup Logic ──
// Use process.env.PORT provided by host, or fallback to 3000 for local
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saavilite';

// Start server immediately (required by Hostinger/Render to avoid 503/timeout)
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 SAAVI LITE Server is LIVE`);
  console.log(`📡 Port:   ${PORT}`);
  console.log(`🌍 Mode:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Time:   ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════');
});

// ── 7. Database Resilience ──
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connection established successfully.'))
  .catch(err => {
    console.error('❌ MongoDB Connection Failure:');
    console.error(`   ${err.message}`);
    console.log('⚠️  The server will remain active, but database features will be unavailable.');
    console.log('👉 Check your MONGODB_URI in the environment variables.');
  });
