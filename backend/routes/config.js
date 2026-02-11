const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Configuration routes
router.get('/school', configController.getSchoolConfig);
router.get('/dashboard/stats', configController.getAssignmentDashboardStats);

module.exports = router;
