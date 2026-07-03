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

// Get the logged-in student's own results (self-service, no query params needed)
router.get('/my-results',
  authMiddleware.authorize(['student']),
  resultController.getMyResults
);

// Get existing results for a class and section
// Students/Parents can view results without general permission check (controller handles ownership/child checks and secure publication filtering)
router.get('/',
  (req, res, next) => {
    if (req.user && (req.user.role === 'student' || req.user.role === 'parent')) {
      console.log(`[RESULTS] ${req.user.role.toUpperCase()} access granted - bypassing viewResults permission check`);
      return next();
    }
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

// Freeze results for a class/section/subject/test - requires freezeResults permission (Admin only)
router.post('/freeze',
  authMiddleware.authorize(['admin']),
  checkPermission('freezeResults'),
  resultController.freezeResults
);

// Get student result history
// Get student result history
// Students/Parents can view history without general permission check (controller handles ownership/child checks and secure publication filtering)
router.get('/student/:studentId/history',
  (req, res, next) => {
    if (req.user && (req.user.role === 'student' || req.user.role === 'parent')) {
      console.log(`[RESULTS] ${req.user.role.toUpperCase()} history access granted - bypassing viewResults permission check`);
      return next();
    }
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