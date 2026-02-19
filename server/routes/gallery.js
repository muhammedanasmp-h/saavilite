const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', galleryController.getGallery);
router.get('/:id', galleryController.getImageById);

router.post('/', auth, upload.single('image'), galleryController.uploadImage);
router.put('/:id', auth, upload.single('image'), galleryController.updateImage);
router.delete('/:id', auth, galleryController.deleteImage);

module.exports = router;
