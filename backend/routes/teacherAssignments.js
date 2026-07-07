const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const teacherAssignmentController = require('../controllers/teacherAssignmentController');

// Apply authentication to all routes
router.use(authMiddleware.auth);

// =============================================
// TEACHER SELF-SERVICE ROUTES
// =============================================

// Get the current teacher's own assignments
router.get('/my-assignments',
  authMiddleware.authorize(['teacher']),
  teacherAssignmentController.getMyAssignments
);

// =============================================
// ADMIN READ ROUTES (admin + teacher can read)
// =============================================

// Get all assignments (admin view with filters)
router.get('/',
  authMiddleware.authorize(['admin', 'superadmin']),
  teacherAssignmentController.getAssignments
);

// Get assignments for a specific class-section
router.get('/class/:className/:section',
  authMiddleware.authorize(['admin', 'superadmin', 'teacher']),
  teacherAssignmentController.getClassSectionAssignments
);

// Get assignments for a specific teacher
router.get('/teacher/:teacherId',
  authMiddleware.authorize(['admin', 'superadmin', 'teacher']),
  teacherAssignmentController.getTeacherAssignmentsById
);

// =============================================
// ADMIN WRITE ROUTES (admin only)
// =============================================

// Create a single assignment
router.post('/',
  authMiddleware.authorize(['admin', 'superadmin']),
  teacherAssignmentController.createAssignment
);

// Bulk assign teachers to subjects for a class-section
router.post('/bulk',
  authMiddleware.authorize(['admin', 'superadmin']),
  teacherAssignmentController.bulkAssign
);

// Copy assignments from one academic year to another
router.post('/copy-year',
  authMiddleware.authorize(['admin', 'superadmin']),
  teacherAssignmentController.copyAssignments
);

// Update a specific assignment (reassign teacher)
router.put('/:id',
  authMiddleware.authorize(['admin', 'superadmin']),
  teacherAssignmentController.updateAssignment
);

// Soft-delete (deactivate) an assignment
router.delete('/:id',
  authMiddleware.authorize(['admin', 'superadmin']),
  teacherAssignmentController.deleteAssignment
);

module.exports = router;
