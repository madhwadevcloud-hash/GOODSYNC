const express = require('express');
const router = express.Router();
// --- HOSTING FIX: Remove multer, path, and fs. They are handled in server.js ---
const assignmentController = require('../controllers/assignmentController');
const { auth, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/permissionCheck');
const { setSchoolContext } = require('../middleware/schoolContext'); // <-- Make sure this is imported

// --- HOSTING FIX: Wrap in a function to accept 'upload' from server.js ---
module.exports = (upload) => {

  // Apply authentication middleware to all routes
  router.use(auth);
  router.use(setSchoolContext); // Apply school context to all assignment routes

  // Debug middleware to log user info
  router.use((req, res, next) => {
    console.log('[ASSIGNMENTS DEBUG] User role:', req.user?.role);
    console.log('[ASSIGNMENTS DEBUG] User permissions:', req.user?.adminInfo?.permissions || req.user?.teacherInfo?.permissions || []);
    next();
  });

  // Assignment management routes
  // Students can view their assignments without permission check (controller handles filtering)
  // Teachers/Admins need viewAssignments permission
  router.get('/',
    (req, res, next) => {
      // Allow students to bypass permission check - controller handles student-specific filtering
      if (req.user && req.user.role === 'student') {
        console.log('[ASSIGNMENTS] Student access granted - bypassing permission check');
        return next();
      }
      // For other roles, check permission
      return checkPermission('viewAssignments')(req, res, next);
    },
    assignmentController.getAssignments
  );

  // --- HOSTING FIX: Use the 'upload' variable passed from server.js ---
  router.post('/',
    upload.array('attachments', 5), // <-- This now uses the in-memory uploader
    authorize(['admin', 'teacher']),
    checkPermission('viewAssignments'),
    (req, res, next) => {
      // Log assignment creation attempt
      console.log('[ASSIGNMENT CREATE] Attempt by user:', {
        userId: req.user?.userId,
        role: req.user?.role,
        schoolCode: req.user?.schoolCode
      });
      console.log('[ASSIGNMENT CREATE] Request body:', {
        title: req.body?.title,
        subject: req.body?.subject,
        class: req.body?.class,
        section: req.body?.section
      });
      next();
    },
    assignmentController.createAssignment
  );

  // Assignment-specific routes - all require viewAssignments permission
  router.get('/:assignmentId', checkPermission('viewAssignments'), assignmentController.getAssignmentById);

  // --- HOSTING FIX: Use the 'upload' variable passed from server.js ---
  router.put('/:assignmentId',
    (req, res, next) => {
      console.log('[UPDATE ROUTE] User role:', req.user?.role);
      console.log('[UPDATE ROUTE] Assignment ID:', req.params.assignmentId);
      next();
    },
    upload.array('attachments', 5), // <-- This now uses the in-memory uploader
    authorize(['admin', 'teacher']),
    checkPermission('viewAssignments'),
    assignmentController.updateAssignment
  );
  router.patch('/:assignmentId/publish', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.publishAssignment);
  router.delete('/:assignmentId', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.deleteAssignment);

  // Submission routes - students can submit, teachers can view/grade
  // --- HOSTING FIX: Use the 'upload' variable passed from server.js ---
  router.post('/:assignmentId/submit',
    upload.array('attachments', 5), // <-- This now uses the in-memory uploader
    authorize(['student']),
    assignmentController.submitAssignment
  );
  router.get('/:assignmentId/submission',
    authorize(['student', 'admin', 'teacher']),
    assignmentController.getStudentSubmission
  );
  router.get('/:assignmentId/submissions', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.getAssignmentSubmissions);
  router.put('/submissions/:submissionId/grade', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.gradeSubmission);

  return router;
};

