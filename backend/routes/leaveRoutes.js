const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/permissionCheck');
const leaveRequestController = require('../controllers/leaveRequestController');

// Teacher Routes
router.post(
  '/teacher/create',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.createLeaveRequest
);

router.get(
  '/teacher/my-requests',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.getTeacherLeaveRequests
);

router.delete(
  '/teacher/:id',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.deleteLeaveRequest
);

// Admin Routes
router.get(
  '/admin/all',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.getSchoolLeaveRequests
);

router.get(
  '/admin/pending',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.getPendingLeaveRequests
);

router.put(
  '/admin/:id/status',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.updateLeaveRequestStatus
);

router.get(
  '/admin/stats',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.getLeaveRequestStats
);

// Shared Routes (Teacher & Admin)
router.get(
  '/:id',
  auth,
  checkPermission('viewLeaves'),
  leaveRequestController.getLeaveRequestById
);

module.exports = router;
