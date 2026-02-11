const express = require('express');
const router = express.Router();
const classSubjectsController = require('../controllers/classSubjectsController');
const authMiddleware = require('../middleware/auth');
const { setSchoolContext } = require('../middleware/schoolContext');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Debug logging for class-subjects routes
router.use((req, res, next) => {
  console.log('🎯 [CLASS-SUBJECTS] Route hit:', req.method, req.originalUrl);
  console.log('🎯 [CLASS-SUBJECTS] Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    schoolCode: req.headers['x-school-code']
  });
  next();
});

// Apply school context middleware
router.use(setSchoolContext);

// Class-based Subject Management Routes

// Test endpoint to verify router is working
router.get('/test', (req, res) => {
  console.log('🎯 [CLASS-SUBJECTS] Test endpoint hit');
  res.json({
    success: true,
    message: 'Class subjects router is working',
    user: req.user ? { userId: req.user.userId, schoolCode: req.user.schoolCode } : 'No user',
    timestamp: new Date().toISOString()
  });
});

/**
 * Add Subject to Class
 * POST /api/class-subjects/add-subject
 * Body: { className, grade, section?, subjectName, subjectType?, teacherId?, teacherName? }
 */
router.post(
  '/add-subject',
  classSubjectsController.addSubjectToClass
);

/**
 * Remove Subject from Class
 * DELETE /api/class-subjects/remove-subject
 * Body: { className, subjectName }
 */
router.delete(
  '/remove-subject',
  classSubjectsController.removeSubjectFromClass
);

/**
 * Get All Classes with Subjects
 * GET /api/class-subjects/classes
 * Query: academicYear?
 */
router.get(
  '/classes',
  classSubjectsController.getAllClassesWithSubjects
);

/**
 * Get Subjects for a Specific Class
 * GET /api/class-subjects/class/:className
 * Query: academicYear?
 */
router.get(
  '/class/:className',
  (req, res, next) => {
    console.log('🎯 [GET CLASS SUBJECTS] Route handler called for class:', req.params.className);
    console.log('🎯 [GET CLASS SUBJECTS] User:', req.user ? { userId: req.user.userId, schoolCode: req.user.schoolCode } : 'No user');
    next();
  },
  classSubjectsController.getSubjectsForClass
);

/**
 * Get Subjects by Grade and Section
 * GET /api/class-subjects/grade/:grade/section/:section
 * Query: academicYear?
 */
router.get(
  '/grade/:grade/section/:section',
  classSubjectsController.getSubjectsByGradeSection
);

/**
 * Update Subject in Class
 * PUT /api/class-subjects/update-subject
 * Body: { className, subjectName, teacherId?, teacherName?, subjectType? }
 */
router.put(
  '/update-subject',
  classSubjectsController.updateSubjectInClass
);

/**
 * Bulk Add Subjects to Class
 * POST /api/class-subjects/bulk-add
 * Body: { className, grade, section?, subjects: [{ name }] }
 */
router.post(
  '/bulk-add',
  classSubjectsController.bulkAddSubjectsToClass
);

/**
 * Initialize Basic Subjects for a Class
 * POST /api/class-subjects/initialize
 * Body: { className, grade, section? }
 */
router.post(
  '/initialize',
  classSubjectsController.initializeBasicSubjects
);

module.exports = router;
