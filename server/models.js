const mongoose = require('mongoose');

/**
 * Gallery Schema
 * Optimized with indexing for performance
 */
const gallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: 100
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
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
        required: [true, 'Image URL is required']
    },
    description: {
        type: String,
        trim: true,
        maxlength: 300
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Create Indexes
gallerySchema.index({ createdAt: -1 });

const Gallery = mongoose.model('Gallery', gallerySchema);

module.exports = { Gallery };
