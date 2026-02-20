/**
 * SAAVI LITE — Bulletproof Hostinger Server
 * Optimized for: Hostinger Shared Node.js Hosting
 */

// 1. GLOBAL SAFETY HANDLERS (Must be first)
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] 🔥 CRITICAL: Uncaught Exception!`);
  console.error(err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] 🔥 CRITICAL: Unhandled Rejection!`);
  console.error('Reason:', reason);
});

console.log(`[${new Date().toISOString()}] 🛠️ Startup: initializing...`);

// 2. Load environment variables Safely
try {
  require('dotenv').config();
  console.log('✅ Dotenv loaded.');
} catch (e) {
  console.log('ℹ️ Dotenv skipped (production mode).');
}

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// ── 3. Health Check ──
// Returns 200 OK instantly for host proxy health checks
app.get('/ping', (req, res) => res.status(200).send('pong'));

// ── 4. Standard Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── 5. API Routes ──
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/gallery', require('./routes/gallery'));
  console.log('✅ Routes mounted.');
} catch (routeErr) {
  console.error('❌ Route mount error:', routeErr.message);
}

// ── 6. SPA Fallbacks ──
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── 7. Global Error Middleware ──
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ❌ Request Error:`, err.message);
  res.status(err.status || 500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// ── 8. Production Settings ──
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// ── 9. Non-Blocking Database Connection ──
// We connect in the background so app.listen() can execute instantly.
if (DB_URI) {
  console.log('🔌 Connecting to MongoDB...');
  mongoose.connect(DB_URI, {
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000
  })
    .then(() => console.log('✅ MongoDB Connected.'))
    .catch(err => {
      console.error('❌ MongoDB Connection Failed:');
      console.error(`   ${err.message}`);
      console.log('⚠️  The app is alive, but database features are down.');
    });
} else {
  console.warn('⚠️  WARNING: NO MONGO_URI FOUND IN ENVIRONMENT!');
}

// ── 10. FINAL STARTUP (THE HEARTBEAT) ──
// We listen on '0.0.0.0' to ensure compatibility with all hosting proxies.
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 SAAVI LITE IS LIVE`);
  console.log(`📡 Port:   ${PORT}`);
  console.log(`🏠 Host:   0.0.0.0`);
  console.log(`🌍 Mode:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Time:   ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════');
});
