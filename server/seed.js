/**
 * Seed script — creates the initial admin user.
 * Run once: npm run seed
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const DB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/saavilite';

async function seed() {
    try {
        await mongoose.connect(DB_URI);
        console.log('Connected to MongoDB');

        const existing = await User.findOne({ username: 'admin' });
        if (existing) {
            console.log('Admin user already exists. Skipping seed.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('admin123', 12);
        await User.create({ username: 'admin', password: hashedPassword });

        console.log('✅ Admin user created successfully');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   ⚠️  Change the password after first login!');
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    }
}

seed();
