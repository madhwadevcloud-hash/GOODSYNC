// Add these routes to the superadmin.js or relevant routes file

// Add and remove test types for specific classes
router.post('/schools/:schoolId/test-details/class/:className/test-type', authenticate, roleCheck(['superadmin', 'admin']), testDetailsController.addTestTypeToClass);
router.delete('/schools/:schoolId/test-details/class/:className/test-type/:testTypeCode', authenticate, roleCheck(['superadmin', 'admin']), testDetailsController.removeTestTypeFromClass);
