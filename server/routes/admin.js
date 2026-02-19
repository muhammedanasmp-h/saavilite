const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/login', adminController.login);
router.get('/status', adminController.checkStatus);
router.get('/logout', adminController.logout);

module.exports = router;
