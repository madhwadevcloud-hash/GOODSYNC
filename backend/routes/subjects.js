const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middleware/auth');
const { setSchoolContext, requireSchoolContext, validateSchoolAccess } = require('../middleware/schoolContext');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Apply school context middleware
router.use(setSchoolContext);

// Create a new subject
router.post(
  '/create',
  authMiddleware.auth,
  subjectController.createSubject
);

// Get subjects by grade
router.get(
  '/grade/:grade',
  authMiddleware.auth,
  subjectController.getSubjectsByGrade
);

// Get subjects assigned to a teacher
router.get(
  '/teacher/:teacherId',
  authMiddleware.auth,
  subjectController.getSubjectsByTeacher
);

// Get teacher workload summary
router.get(
  '/workload-summary',
  authMiddleware.auth,
  subjectController.getTeacherWorkloadSummary
);

// Teacher Assignment Routes

// Assign teacher to subject
router.post(
  '/:subjectId/assign-teacher',
  authMiddleware.auth,
  subjectController.assignTeacherToSubject
);

// Remove teacher from subject
router.delete(
  '/:subjectId/teacher/:teacherId',
  authMiddleware.auth,
  subjectController.removeTeacherFromSubject
);

// Update teacher's class assignments for a subject
router.put(
  '/:subjectId/teacher/:teacherId/assignments',
  authMiddleware.auth,
  subjectController.updateTeacherSubjectAssignment
);

// Academic Details Management Routes

// Get all subjects for academic details management
router.get(
  '/all',
  validateSchoolAccess(['admin', 'teacher']),
  subjectController.getAllSubjects
);

// Bulk save subjects for academic details management
router.post(
  '/bulk-save',
  validateSchoolAccess(['admin', 'superadmin']),
  subjectController.bulkSaveSubjects
);

module.exports = router;
