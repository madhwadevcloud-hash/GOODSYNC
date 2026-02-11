const express = require('express');
const router = express.Router();
const adminClassController = require('../controllers/adminClassController');
const { auth } = require('../middleware/auth');
const { setMainDbContext } = require('../middleware/schoolContext');

// Middleware to verify admin access (for write operations only)
const requireAdminAccess = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Get all classes and sections for a school (READ - accessible to teachers too)
router.get('/:schoolCode/classes-sections', 
  auth, 
  setMainDbContext, 
  adminClassController.getSchoolClassesAndSections
);

// Get sections for a specific class (READ - accessible to teachers too)
router.get('/:schoolCode/classes/:className/sections', 
  auth, 
  setMainDbContext, 
  adminClassController.getSectionsForClass
);

// Get all tests/exams for a school (READ - accessible to teachers too)
router.get('/:schoolCode/tests', 
  auth, 
  setMainDbContext, 
  adminClassController.getSchoolTests
);

// Save test scoring configuration
router.post('/:schoolCode/test-scoring', 
  auth, 
  setMainDbContext, 
  requireAdminAccess, 
  adminClassController.saveTestScoring
);

module.exports = router;
