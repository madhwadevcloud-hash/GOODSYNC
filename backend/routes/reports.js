const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Apply role check - only ADMIN and SUPER_ADMIN can access
router.use(roleCheck(['admin', 'superadmin']));

// Apply permission check - requires viewReports permission
router.use(checkPermission('viewReports'));

// Reports routes
router.get('/overview', reportsController.getSchoolOverview);
router.get('/summary', reportsController.getSchoolSummary);
router.get('/class-summary', reportsController.getClassSummary);
router.get('/class/:className/detail', reportsController.getClassDetail);
router.get('/student/:studentId/profile', reportsController.getStudentProfile);
router.get('/export', reportsController.exportData);
router.get('/dues', reportsController.getDuesList);
router.get('/class-wise', reportsController.getClassWiseAnalysis);
router.get('/payment-trends', reportsController.getPaymentTrends);
router.get('/students-by-class', reportsController.getStudentsByClassSection);

module.exports = router;
