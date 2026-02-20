/**
 * SAAVI LITE — Super-Robust Production Server
 * Optimized for: Local, Render, Hostinger
 */

// 1. Diagnostic Heartbeat (Immediate)
console.log(`[${new Date().toISOString()}] 🛠️ SAAVI LITE: Initializing Startup Sequence...`);

// 2. Load environment variables Safely
try {
  require('dotenv').config();
  console.log('✅ Dotenv config loaded.');
} catch (e) {
  console.log('ℹ️ Dotenv not found (using production environment variables).');
}

// 3. Early Crash Protection
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION — App preventing crash:');
  console.error(err.stack || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION — App preventing crash:');
  console.error('Reason:', reason);
});

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// ── 4. Essential Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 5. Health Check / Heartbeat ──
// Helps prevent 503 errors on hosting proxies like Hostinger
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── 6. API Routes ──
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/gallery', require('./routes/gallery'));
  console.log('✅ API Routes mounted.');
} catch (routeErr) {
  console.error('❌ Route Loading Error:', routeErr.message);
}

// ── 7. SPA Fallbacks ──
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── 8. Global Error Middleware ──
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ❌ Middleware Error:`, err.message);
  res.status(err.status || 500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// ── 9. Super-Robust Startup ──
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// CRITICAL: Listen immediately so Hostinger/Render detect a live process
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 SAAVI LITE IS LIVE`);
  console.log(`📡 Port:   ${PORT}`);
  console.log(`🌍 Mode:   ${process.env.NODE_ENV || 'development'}`);

  if (!DB_URI) {
    console.error('⚠️  CRITICAL ALERT: No Database URI found!');
    console.log('👉 Add MONGO_URI to your Hostinger/Render panel.');
  } else {
    const masked = DB_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`🔗 DB URI: ${masked}`);
  }
  console.log('═══════════════════════════════════════');
});

// ── 10. Background Database Connection ──
// We do this AFTER app.listen to avoid startup timeouts (503)
if (DB_URI) {
  console.log('🔌 Connecting to MongoDB in background...');
  mongoose.connect(DB_URI, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000
  })
    .then(() => console.log('✅ MongoDB connection successful.'))
    .catch(err => {
      console.error('❌ MongoDB Connection Failed:');
      console.error(`   ${err.message}`);
      console.log('⚠️  The app is running, but database features will stay disabled.');
    });
}
