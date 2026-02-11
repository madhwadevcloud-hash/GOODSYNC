const express = require('express');
const router = express.Router();
const superadminSubjectController = require('../controllers/superadminSubjectController');
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Apply authentication and role check to all routes
router.use(auth);
router.use(roleCheck(['superadmin']));

/**
 * Subject Management Routes for SuperAdmin
 * Base path: /api/superadmin/subjects
 */

// Get all subjects for a specific school organized by class
router.get(
  '/schools/:schoolId/subjects',
  superadminSubjectController.getSchoolSubjects
);

// Get subjects for a specific class
router.get(
  '/schools/:schoolId/subjects/class/:className',
  superadminSubjectController.getClassSubjects
);

// Add a new subject to a specific class
router.post(
  '/schools/:schoolId/subjects/class/:className',
  superadminSubjectController.addSubjectToClass
);

// Update a subject for a specific class
router.put(
  '/schools/:schoolId/subjects/class/:className/subject/:subjectId',
  superadminSubjectController.updateClassSubject
);

// Remove a subject from a specific class
router.delete(
  '/schools/:schoolId/subjects/class/:className/subject/:subjectId',
  superadminSubjectController.removeSubjectFromClass
);

module.exports = router;
