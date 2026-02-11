// backend/routes/superadmin.js - Add these routes

// Add school academic settings routes
router.put('/schools/:schoolId/academic-settings', authenticate, roleCheck(['superadmin']), schoolController.updateSchoolAcademicSettings);

// Test details routes
router.get('/schools/:schoolId/test-details', authenticate, roleCheck(['superadmin', 'admin']), testDetailsController.getTestDetails);
router.put('/schools/:schoolId/test-details', authenticate, roleCheck(['superadmin', 'admin']), testDetailsController.updateTestDetails);
router.get('/schools/:schoolId/test-details/class/:className', authenticate, roleCheck(['superadmin', 'admin']), testDetailsController.getClassTestTypes);
router.put('/schools/:schoolId/test-details/class/:className', authenticate, roleCheck(['superadmin', 'admin']), testDetailsController.updateClassTestTypes);
