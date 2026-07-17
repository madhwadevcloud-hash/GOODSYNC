// backend/routes/assignments.js
const express = require('express');
const router = express.Router();
// --- HOSTING FIX: Remove multer, path, and fs. They are handled in server.js ---
const assignmentController = require('../controllers/assignmentController');
const { auth, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/permissionCheck');
const { setSchoolContext } = require('../middleware/schoolContext'); 
const { uploadToS3 } = require('../utils/s3Uploader'); // <-- Import S3 uploader

/**
 * ADAPTER MIDDLEWARE:
 * Uploads files to S3, then intercepts and overwrites `req.files` with mock local properties.
 * This trick completely prevents you from having to touch your 1,500-line controller.
 */
const handleS3UploadsAndAdapt = (folderName) => async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    console.log(`📡 Uploading ${req.files.length} file(s) to S3 folder: "${folderName}"`);
    
    // 1. Upload all files to S3 in parallel
    const uploadPromises = req.files.map(file => uploadToS3(file, folderName));
    const s3Results = await Promise.all(uploadPromises);

    // 2. Overwrite req.files in-place with the shapes your legacy controller expects
    req.files = req.files.map((originalFile, index) => {
      const s3File = s3Results[index];
      
      return {
        ...originalFile,
        // Overwrite the file's path with the absolute S3 URL.
        // If your controller used req.file.path or file.path, it will now automatically save the S3 link!
        path: s3File.url, 
        
        // Overwrite the filename with the unique S3 Key (useful if your app stores keys to delete files later)
        filename: s3File.key, 
        
        // Fallback property in case your legacy controller used it
        location: s3File.url,
        
        // Retain original metadata
        originalname: originalFile.originalname,
        mimetype: originalFile.mimetype,
        size: originalFile.size
      };
    });

    console.log('✅ S3 uploads complete. req.files successfully adapted for the controller.');
    next();
  } catch (error) {
    console.error('❌ S3 Batch Upload Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to upload files to storage: ${error.message}` 
    });
  }
};

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

  // CREATE ASSIGNMENT
  router.post('/',
    upload.array('attachments', 5),         // 1. Parse files in memory
    handleS3UploadsAndAdapt('assignments'), // 2. Upload to S3 & mock legacy req.files properties
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
    assignmentController.createAssignment // 3. Run controller completely unmodified!
  );

  // Assignment-specific routes - all require viewAssignments permission
  router.get('/:assignmentId', checkPermission('viewAssignments'), assignmentController.getAssignmentById);

  // UPDATE ASSIGNMENT
  router.put('/:assignmentId',
    (req, res, next) => {
      console.log('[UPDATE ROUTE] User role:', req.user?.role);
      console.log('[UPDATE ROUTE] Assignment ID:', req.params.assignmentId);
      next();
    },
    upload.array('attachments', 5),         // 1. Parse files in memory
    handleS3UploadsAndAdapt('assignments'), // 2. Upload to S3 & mock legacy req.files properties
    authorize(['admin', 'teacher']),
    checkPermission('viewAssignments'),
    assignmentController.updateAssignment // 3. Run controller completely unmodified!
  );
  
  router.patch('/:assignmentId/publish', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.publishAssignment);
  router.delete('/:assignmentId', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.deleteAssignment);

  // SUBMIT ASSIGNMENT (Student)
  router.post('/:assignmentId/submit',
    upload.array('attachments', 5),         // 1. Parse files in memory
    handleS3UploadsAndAdapt('submissions'), // 2. Upload to S3 & mock legacy req.files properties
    authorize(['student']),
    assignmentController.submitAssignment // 3. Run controller completely unmodified!
  );
  
  router.get('/:assignmentId/submission',
    authorize(['student', 'admin', 'teacher']),
    assignmentController.getStudentSubmission
  );
  router.get('/:assignmentId/submissions', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.getAssignmentSubmissions);
  router.put('/submissions/:submissionId/grade', authorize(['admin', 'teacher']), checkPermission('viewAssignments'), assignmentController.gradeSubmission);

  return router;
};