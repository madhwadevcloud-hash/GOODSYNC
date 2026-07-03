const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const studentPortalController = require('../controllers/studentPortalController');

// All routes here are student-only
router.use(auth);
router.use(authorize(['student']));

router.get('/attendance', studentPortalController.getMyAttendanceOverview);
router.get('/assignments', studentPortalController.getMyAssignmentsOverview);
router.get('/messages', studentPortalController.getMyMessagesOverview);
router.get('/profile', studentPortalController.getMyProfileOverview);
router.get('/fees', studentPortalController.getMyFeesOverview);


module.exports = router;