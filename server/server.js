/**
 * SAAVI LITE — Universal Production Server
 * Optimized for: Local, Render, Hostinger
 */

// 1. Load environment variables Safely
try {
  require('dotenv').config();
} catch (e) {
  // Ignore error if dotenv is missing in production
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

// ── 5. Standardized Error Handling ──
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[${new Date().toISOString()}] ❌ Server error:`, err.message);

  res.status(statusCode).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// ── 6. Environment Configuration ──
// Support both MONGO_URI and MONGODB_URI to ensure Hostinger compatibility
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// ── 7. Startup Logic ──
// Start server immediately (Essential for Hostinger/Render health checks)
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 SAAVI LITE Server is LIVE`);
  console.log(`📡 Port:   ${PORT}`);
  console.log(`🌍 Mode:   ${process.env.NODE_ENV || 'development'}`);

  // Debug Logging for Database URI
  if (!DB_URI) {
    console.error('⚠️  CRITICAL: MONGO_URI is missing in environment variables!');
    console.log('👉 Please add MONGO_URI to your hosting control panel.');
  } else {
    // Mask password for safe logging
    const maskedURI = DB_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`🔗 DB URI: ${maskedURI}`);
  }

  console.log(`⏰ Time:   ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════');
});

// ── 8. Database Resilience ──
if (DB_URI) {
  mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB connection successful.'))
    .catch(err => {
      console.error('❌ MongoDB Connection ERROR:');
      console.error(`   ${err.message}`);
      console.log('⚠️  Application is running but database-dependent features will fail.');
    });
} else {
  console.log('⚠️  Starting without MongoDB connection (URI missing).');
}
