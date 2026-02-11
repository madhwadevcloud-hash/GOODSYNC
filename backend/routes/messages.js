const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Debug middleware to log user info
router.use((req, res, next) => {
  console.log('[MESSAGES ROUTE] User:', {
    userId: req.user?.userId,
    role: req.user?.role,
    schoolCode: req.user?.schoolCode,
    path: req.path,
    method: req.method
  });
  next();
});

// Student-accessible routes - students can view messages for their class/section
router.get('/student/messages',
  roleCheck(['student']),
  messagesController.getMessages
);

// Teacher-accessible routes (read-only, no permission check)
router.get('/teacher/messages',
  roleCheck(['teacher']),
  messagesController.getTeacherMessages
);

// Student-accessible routes - students and teachers can view messages sent to students
router.get('/student',
  roleCheck(['student', 'teacher']),
  messagesController.getStudentMessages
);

// Main messages route - handle different roles
router.get('/', (req, res, next) => {
  // If user is a student, redirect to student messages
  if (req.user && req.user.role === 'student') {
    return messagesController.getStudentMessages(req, res);
  }
  // Otherwise, continue with admin/superadmin flow
  next();
}, roleCheck(['admin', 'superadmin']), checkPermission('messageStudentsParents'), messagesController.getMessages);

// Apply role check - only ADMIN and SUPER_ADMIN can access below routes
router.use(roleCheck(['admin', 'superadmin']));

// Admin Routes - permission check is applied per route
// Superadmin and admin with messageStudentsParents permission can access
router.post('/send',
  checkPermission('messageStudentsParents'),
  messagesController.sendMessage
);

router.post('/preview',
  checkPermission('messageStudentsParents'),
  messagesController.previewMessage
);

router.get('/stats',
  checkPermission('messageStudentsParents'),
  messagesController.getMessageStats
);

router.get('/:messageId',
  checkPermission('messageStudentsParents'),
  messagesController.getMessageDetails
);

router.delete('/:messageId',
  checkPermission('messageStudentsParents'),
  messagesController.deleteMessage
);

// Utility route to update all messages with current academic year
router.post('/migrate/academic-year',
  checkPermission('messageStudentsParents'),
  messagesController.updateMessagesWithAcademicYear
);

module.exports = router;
