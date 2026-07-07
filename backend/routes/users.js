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

    // Flatten the nested student document into the simple shape the
    // student portal frontend expects. Any field that isn't available
    // is sent back as null so the UI can show a fallback ("--").
    const academic = student.studentDetails?.academic || {};
    const personal = student.studentDetails?.personal || {};
    const family = student.studentDetails?.family || {};
    const transport = student.studentDetails?.transport || {};
    const permanentAddress = student.address?.permanent || {};

    const displayName =
      student.name?.displayName ||
      [student.name?.firstName, student.name?.lastName].filter(Boolean).join(' ') ||
      null;

    const profile = {
      studentName: displayName,
      studentId: student.userId || null,
      enrollmentNo: academic.enrollmentNo || academic.admissionNumber || null,
      class: academic.currentClass || null,
      section: academic.currentSection || null,
      rollNumber: academic.rollNumber || null,
      academicYear: academic.academicYear || null,

      dob: personal.dateOfBirth || null,
      gender: personal.gender || null,
      bloodGroup: personal.bloodGroup || null,
      nationality: personal.nationality || null,

      email: student.email || null,
      mobile: student.contact?.primaryPhone || null,

      fatherName: family.father?.name || null,
      motherName: family.mother?.name || null,
      guardianName: family.guardian?.name || family.father?.name || null,
      parentMobile: family.father?.phone || family.mother?.phone || null,

      address: permanentAddress.street || null,
      city: permanentAddress.city || null,
      state: permanentAddress.state || null,
      pinCode: permanentAddress.pincode || null,

      admissionDate: academic.admissionDate || null,

      transport: transport.mode || null,
      busRoute: transport.busRoute || null,

      profileImage: student.profileImage || student.photo || null
    };

    res.json({
      success: true,
      data: profile
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

// Get all users (ADMIN ONLY) - prevents BOLA vulnerability
router.get('/', validateSchoolAccess(['admin', 'superadmin']), userController.getAllUsers);

// Get next available user ID for preview
router.get('/next-id/:role', validateSchoolAccess(['admin', 'superadmin']), userController.getNextUserId);

// Get users by role (accessible by admin and teachers for their school)
router.get('/role/:role', validateSchoolAccess(['admin', 'teacher']), userController.getUsersByRole);
router.get('/stats/student-counts', validateSchoolAccess(['admin', 'teacher']), userController.getStudentCountsByClass);
router.get('/:userId', validateSchoolAccess(['admin', 'teacher']), userController.getUserById);

// Update and manage users (admin only) - require explicit school context
router.put('/:userId', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.updateUser);
router.patch('/:userId/reset-password', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.resetUserPassword);
router.patch('/:userId/toggle-status', requireSchoolContext, validateSchoolAccess(['admin', 'superadmin']), userController.toggleUserStatus);

module.exports = router;