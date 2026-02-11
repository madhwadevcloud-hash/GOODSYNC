const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const superadminClassController = require('../controllers/superadminClassController');

// Apply authentication and role check to all routes
router.use(auth);
router.use(roleCheck(['superadmin']));

// Get all classes for a school
router.get('/schools/:schoolId/classes', 
  superadminClassController.getSchoolClasses
);

// Add a new class
router.post('/schools/:schoolId/classes', 
  superadminClassController.addClass
);

// Add section to existing class
router.post('/schools/:schoolId/classes/:classId/sections', 
  superadminClassController.addSectionToClass
);

// Remove section from class
router.delete('/schools/:schoolId/classes/:classId/sections', 
  superadminClassController.removeSectionFromClass
);

// Update class information
router.put('/schools/:schoolId/classes/:classId', 
  superadminClassController.updateClass
);

// Delete class (soft delete)
router.delete('/schools/:schoolId/classes/:classId', 
  superadminClassController.deleteClass
);

// Get available classes for dropdown (used in test configuration)
router.get('/schools/:schoolId/classes/available', 
  superadminClassController.getAvailableClasses
);

module.exports = router;
