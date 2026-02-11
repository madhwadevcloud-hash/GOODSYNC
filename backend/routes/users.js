const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { setSchoolContext, requireSchoolContext, validateSchoolAccess } = require('../middleware/schoolContext');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Student-specific route - must come before role checks
router.get('/my-profile', authMiddleware.auth, async (req, res) => {
  try {
    // Only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ 
        success: false,
        message: 'This endpoint is only for students' 
      });
    }

    const studentId = req.user.userId || req.user._id;
    const schoolCode = req.user.schoolCode;
    
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }

    // Get connection to the school's database
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    
    if (!schoolConnection) {
      return res.status(404).json({
        success: false,
        message: 'School database not found'
      });
    }

    const db = schoolConnection.db;
    const { ObjectId } = require('mongodb');
    
    // Find the student in the students collection
    const query = ObjectId.isValid(studentId)
      ? { $or: [{ userId: studentId }, { _id: new ObjectId(studentId) }] }
      : { userId: studentId };
    
    const student = await db.collection('students').findOne(query);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        data: null
      });
    }

    // Remove sensitive data
    const { password, temporaryPassword, passwordHistory, ...studentWithoutSensitiveData } = student;

    res.json({
      success: true,
      data: studentWithoutSensitiveData
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student profile',
      error: error.message
    });
  }
});

// User creation routes - require explicit school context for super admin operations
router.post('/', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.createUserSimple);
router.post('/teachers', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.addTeacher);
router.post('/students', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.addStudent);
router.post('/parents', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.addParent);

// Query routes - use flexible school context
router.use(setSchoolContext);

// Get next available user ID for preview
router.get('/next-id/:role', validateSchoolAccess(['admin', 'superadmin']), userController.getNextUserId);

// Get users by role (accessible by admin and teachers for their school)
router.get('/role/:role', validateSchoolAccess(['admin', 'teacher']), userController.getUsersByRole);
router.get('/:userId', validateSchoolAccess(['admin', 'teacher']), userController.getUserById);

// Update and manage users (admin only) - require explicit school context
router.put('/:userId', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.updateUser);
router.patch('/:userId/reset-password', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.resetUserPassword);
router.patch('/:userId/toggle-status', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.toggleUserStatus);

module.exports = router;
