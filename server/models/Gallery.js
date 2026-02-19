const mongoose = require('mongoose');

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
        required: true
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

module.exports = mongoose.model('Gallery', gallerySchema);
