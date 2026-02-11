const express = require('express');
const router = express.Router();
const adminClassController = require('../controllers/adminClassController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Apply role check - only ADMIN and SUPER_ADMIN can access
router.use(roleCheck(['admin', 'superadmin']));

// Routes for fetching classes and sections
router.get('/school/:schoolCode/classes', adminClassController.getSchoolClassesAndSections);
router.get('/school/:schoolCode/classes/:className/sections', adminClassController.getSectionsForClass);

module.exports = router;
