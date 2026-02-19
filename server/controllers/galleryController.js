const Gallery = require('../models/Gallery');

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Please upload an image' });

        const count = await Gallery.countDocuments();
        if (count >= 30) {
            return res.status(400).json({ message: 'Gallery limit reached (30 items max).' });
        }

        // For simplicity, using a placeholder or local path if we had local storage setup
        // Given the request to remove Cloudinary, we'll store a mock URL for now
        // A real production app would use local disk storage or another S3-like service
        const newImage = new Gallery({
            title: req.body.title,
            category: req.body.category,
            imageUrl: 'https://placehold.co/600x400?text=' + encodeURIComponent(req.body.title),
            description: req.body.description
        });

        await newImage.save();
        res.status(201).json(newImage);
    } catch (err) {
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
};

exports.getGallery = async (req, res) => {
    try {
        const images = await Gallery.find()
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        res.json(images);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getImageById = async (req, res) => {
    try {
        const image = await Gallery.findById(req.params.id).lean();
        if (!image) return res.status(404).json({ message: 'Image not found' });
        res.json(image);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateImage = async (req, res) => {
    try {
        const { title, category, description } = req.body;
        let updateData = { title, category, description };

        const image = await Gallery.findById(req.params.id);
        if (!image) return res.status(404).json({ message: 'Image not found' });

        const updated = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

exports.deleteImage = async (req, res) => {
    try {
        const image = await Gallery.findById(req.params.id);
        if (!image) return res.status(404).json({ message: 'Image not found' });

        await Gallery.findByIdAndDelete(req.params.id);
        res.json({ message: 'Image deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
};
