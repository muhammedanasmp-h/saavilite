const express = require('express');
const multer = require('multer');
const GalleryImage = require('../models/GalleryImage');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Multer config (Memory Storage) ──
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ── GET /api/gallery — returns metadata with image links ──
router.get('/', async (req, res) => {
    try {
        // Only fetch fields EXCEPT 'data' for the list to keep response size down
        const images = await GalleryImage.find().select('-data').sort({ createdAt: -1 });

        // Map to include a functional URL
        const results = images.map(img => ({
            _id: img._id,
            caption: img.caption,
            createdAt: img.createdAt,
            url: `/api/gallery/image/${img._id}`
        }));

        res.json(results);
    } catch (err) {
        console.error('Gallery fetch error:', err.message);
        res.status(500).json({ error: 'Failed to load gallery.' });
    }
});

// ── GET /api/gallery/image/:id — serves the actual image ──
router.get('/image/:id', async (req, res) => {
    try {
        const image = await GalleryImage.findById(req.params.id);
        if (!image) return res.status(404).send('Not found');

        res.set('Content-Type', image.contentType);
        res.send(image.data);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// ── POST /api/gallery — auth required — stores in MongoDB ──
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const count = await GalleryImage.countDocuments();
        if (count >= 30) {
            return res.status(400).json({ error: 'Gallery limit reached (max 30 images).' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided.' });
        }

        const newImage = await GalleryImage.create({
            data: req.file.buffer,
            contentType: req.file.mimetype,
            caption: req.body.caption || ''
        });

        res.status(201).json({
            _id: newImage._id,
            url: `/api/gallery/image/${newImage._id}`,
            caption: newImage.caption
        });
    } catch (err) {
        console.error('Upload error:', err.message);
        res.status(500).json({ error: 'Failed to upload image.' });
    }
});

// ── DELETE /api/gallery/:id — auth required ──
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const image = await GalleryImage.findByIdAndDelete(req.params.id);
        if (!image) {
            return res.status(404).json({ error: 'Image not found.' });
        }
        res.json({ message: 'Image deleted successfully.' });
    } catch (err) {
        console.error('Delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete image.' });
    }
});

module.exports = router;
