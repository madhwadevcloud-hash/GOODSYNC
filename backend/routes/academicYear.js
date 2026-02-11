const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware
router.use(authMiddleware.auth);

// Get academic year settings
router.get('/:schoolCode', academicYearController.getAcademicYear);

// Update academic year settings
router.put('/:schoolCode', academicYearController.updateAcademicYear);

module.exports = router;
