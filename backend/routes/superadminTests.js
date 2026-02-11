const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const superadminTestController = require('../controllers/superadminTestController');

// Apply authentication and role check to all routes
router.use(auth);
router.use(roleCheck(['superadmin']));

// Get all tests for a school
router.get('/schools/:schoolId/tests', 
  superadminTestController.getSchoolTests
);

// Add a new test
router.post('/schools/:schoolId/tests', 
  superadminTestController.addTest
);

// Update test information
router.put('/schools/:schoolId/tests/:testId', 
  superadminTestController.updateTest
);

// Delete test (soft delete)
router.delete('/schools/:schoolId/tests/:testId', 
  superadminTestController.deleteTest
);

// Get tests for a specific class
router.get('/schools/:schoolId/tests/class/:className', 
  superadminTestController.getTestsByClass
);

module.exports = router;
