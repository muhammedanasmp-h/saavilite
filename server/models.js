const mongoose = require('mongoose');

// --- Admin Schema ---
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { versionKey: false });

const Admin = mongoose.model('Admin', adminSchema);

// --- Gallery Schema ---
const gallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'CCTV Installation',
            'CCTV Maintenance',
            'LED Board Installation',
            'Completed Projects'
        ],
        index: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: false // Optional if using placeholder URLs or other services
    },
    description: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    versionKey: false
});

gallerySchema.index({ createdAt: -1 });
gallerySchema.index({ category: 1, createdAt: -1 });

const Gallery = mongoose.model('Gallery', gallerySchema);

module.exports = { Admin, Gallery };
