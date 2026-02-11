const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const timetableController = require('../controllers/timetableController');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication to all routes
router.use(authMiddleware.auth);

// Smart timetable creation with conflict detection - requires viewTimetable permission
router.post('/create-smart', 
  authMiddleware.authorize(['admin', 'teacher']),
  checkPermission('viewTimetable'),
  timetableController.createSmartTimetable
);

// Get timetable with efficiency analysis - requires viewTimetable permission
router.get('/:classSection/analysis', 
  checkPermission('viewTimetable'),
  timetableController.getTimetableWithAnalysis
);

// Create substitute teacher arrangement - requires viewTimetable permission
router.post('/substitute', 
  authMiddleware.authorize(['admin', 'teacher']),
  checkPermission('viewTimetable'),
  timetableController.createSubstituteArrangement
);

module.exports = router;
