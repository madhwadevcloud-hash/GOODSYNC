const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const resultController = require('../controllers/resultController');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication to all routes
router.use(authMiddleware.auth);

// Create or update student result - requires viewResults permission
router.post('/create',
  authMiddleware.authorize(['admin', 'teacher']),
  checkPermission('viewResults'),
  resultController.createOrUpdateResult
);

// Save results (simple endpoint for Results page) - requires viewResults permission
router.post('/save',
  authMiddleware.authorize(['admin', 'teacher']),
  checkPermission('viewResults'),
  resultController.saveResults
);

// Get existing results for a class and section
// Students can view their results without permission check (controller handles filtering)
// Teachers/Admins need viewResults permission
router.get('/',
  (req, res, next) => {
    // Allow students to bypass permission check - controller handles student-specific filtering
    if (req.user && req.user.role === 'student') {
      console.log('[RESULTS] Student access granted - bypassing permission check');
      return next();
    }
    // For other roles, check permission
    return checkPermission('viewResults')(req, res, next);
  },
  resultController.getResults
);

// Update a single student result - requires viewResults permission
router.put('/:resultId',
  authMiddleware.authorize(['admin', 'teacher']),
  checkPermission('viewResults'),
  resultController.updateResult
);

// Freeze results for a class/section/subject/test - requires viewResults permission
router.post('/freeze',
  authMiddleware.authorize(['admin', 'teacher']),
  checkPermission('viewResults'),
  resultController.freezeResults
);

// Get student result history
// Students can view their own history without permission check
// Teachers/Admins need viewResults permission
router.get('/student/:studentId/history',
  (req, res, next) => {
    // Allow students to bypass permission check - controller handles student-specific filtering
    if (req.user && req.user.role === 'student') {
      console.log('[RESULTS] Student access granted for history - bypassing permission check');
      return next();
    }
    // For other roles, check permission
    return checkPermission('viewResults')(req, res, next);
  },
  resultController.getStudentResultHistory
);

// Generate class performance report - requires viewResults permission
router.get('/class/:grade/:section/report',
  checkPermission('viewResults'),
  resultController.generateClassPerformanceReport
);

// Teacher-specific endpoint to view results
router.get('/teacher/view',
  authMiddleware.auth,
  resultController.getResultsForTeacher
);


// Get class performance statistics for dashboard - requires viewResults permission
router.get('/class-performance-stats',
  checkPermission('viewResults'),
  resultController.getClassPerformanceStats
);

// Get results statistics for Reports page - requires viewResults permission
router.get('/stats',
  (req, res, next) => {
    console.log('🎯 [RESULTS STATS ROUTE] Hit /stats endpoint');
    console.log('🎯 [RESULTS STATS ROUTE] Query params:', req.query);
    console.log('🎯 [RESULTS STATS ROUTE] User:', req.user ? { userId: req.user.userId, schoolCode: req.user.schoolCode } : 'No user');
    next();
  },
  checkPermission('viewResults'),
  resultController.getResultsStats
);

module.exports = router;
