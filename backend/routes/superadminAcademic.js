const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const superadminTestController = require('../controllers/superadminTestController');
const testDetailsController = require('../controllers/testDetailsController');

// Apply authentication and role check to all routes
router.use(auth);
router.use(roleCheck(['superadmin']));

// Get all test details for a school
router.get('/schools/:schoolId/tests', 
  superadminTestController.getSchoolTests
);

// Get test types for a specific class in a school
router.get('/schools/:schoolId/tests/class/:className', 
  superadminTestController.getTestsByClass
);

// Add test type to a specific class
router.post('/schools/:schoolId/tests/class/:className', 
  testDetailsController.addTestTypeToClass
);

// Remove test type from a specific class
router.delete('/schools/:schoolId/tests/class/:className/test/:testTypeCode', 
  testDetailsController.removeTestTypeFromClass
);

// Update school academic settings (includes classes which affects test details)
// TODO: Implement this function in the appropriate controller
// router.put('/schools/:schoolId/settings', 
//   superadminTestController.updateSchoolAcademicSettings
// );

module.exports = router;
