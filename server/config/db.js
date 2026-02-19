const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing in .env file');
        }

        console.log('>>> Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        console.log('>>> Successfully connected to MongoDB Atlas');
    } catch (err) {
        console.error('CRITICAL DATABASE ERROR:', err.message);
        process.exit(1); // Exit with failure code to alert deployment system (e.g. PM2/Hostinger)
    }
};

module.exports = connectDB;
