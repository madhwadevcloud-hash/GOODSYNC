// backend/routes/schoolUsers.js
const express = require('express');
const router = express.Router();
const schoolUserController = require('../controllers/schoolUserController');
const authMiddleware = require('../middleware/auth');

// --- HOSTING FIX: Remove local multer. Import controllers. ---
const exportImportController = require('../controllers/exportImportController');
const { setSchoolContext } = require('../middleware/schoolContext');
const { enforceJwtTenancy } = require('../middleware/tenancy');
const { uploadToS3 } = require('../utils/s3Uploader'); // <-- Import S3 uploader
// --- END FIX ---

/**
 * ADAPTER MIDDLEWARE: Handles a single file upload in memory (via Multer),
 * uploads it to Amazon S3, and adapts the req.file object for downstream controllers.
 */
const handleSingleS3Upload = (folderName) => async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    console.log(`📡 Uploading single file (${req.file.originalname}) to S3 folder: "${folderName}"`);
    
    // Upload to S3
    const s3Result = await uploadToS3(req.file, folderName);

    // Overwrite req.file properties so controllers read S3 metadata seamlessly
    req.file = {
      ...req.file,
      path: s3Result.url,       // Overwrite local disk path with the S3 URL
      filename: s3Result.key,   // Overwrite filename with S3 unique Key
      location: s3Result.url    // Fallback property
    };

    console.log('✅ S3 single upload complete. req.file adapted.');
    next();
  } catch (error) {
    console.error('❌ S3 Single Upload Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to upload file to storage: ${error.message}` 
    });
  }
};

// --- HOSTING FIX: Wrap in a function to accept 'upload' from server.js ---
module.exports = (upload) => {
    // Apply authentication middleware to all routes
    router.use(authMiddleware.auth);
    router.use(enforceJwtTenancy); // Enforce tenancy based on JWT
    router.use(setSchoolContext); // Add context middleware

    // User management routes for specific schools
    // Route format: /api/school-users/:schoolCode/...

    // Add user to school
    router.post('/:schoolCode/users', schoolUserController.addUserToSchool);

    // Get all users in a school
    router.get('/:schoolCode/users', schoolUserController.getAllSchoolUsers);

    // Get users by role
    router.get('/:schoolCode/users/role/:role', schoolUserController.getUsersByRole);

    router.get('/:schoolCode/users/:userId', schoolUserController.getUserById);

    // Update user
    // --- HOSTING FIX: Use memory upload + S3 adapter middleware ---
    router.put(
        '/:schoolCode/users/:userId',
        upload.single('profileImage'),           // 1. Parse image buffer in memory
        handleSingleS3Upload('profile-images'),  // 2. Upload to S3 & mock req.file
        schoolUserController.updateUser         // 3. Controller runs completely unmodified!
    );

    // Reset user password
    router.post('/:schoolCode/users/:userId/reset-password', schoolUserController.resetUserPassword);

    // Change user password (admin sets new password)
    router.post('/:schoolCode/users/:userId/change-password', schoolUserController.changeUserPassword);

    // Verify admin password and get teacher passwords
    router.post('/:schoolCode/verify-admin-password', schoolUserController.verifyAdminAndGetPasswords);

    // Toggle user status
    router.patch('/:schoolCode/users/:userId/status', schoolUserController.toggleUserStatus);

    // Delete user
    router.delete('/:schoolCode/users/:userId', schoolUserController.deleteUser);
    router.get('/:schoolCode/access-matrix', schoolUserController.getAccessMatrix);
    router.put('/:schoolCode/access-matrix', schoolUserController.updateAccessMatrix);

    // Timetable management routes
    router.get('/:schoolCode/timetables', schoolUserController.getAllTimetables);
    router.get('/:schoolCode/timetables/:className/:section', schoolUserController.getTimetableByClass);
    router.post('/:schoolCode/timetables', schoolUserController.createTimetable);
    router.put('/:schoolCode/timetables/:className/:section', schoolUserController.updateTimetable);
    router.delete('/:schoolCode/timetables/:className/:section', schoolUserController.deleteTimetable);


    // --- IMPORT/EXPORT ROUTES ---
    // --- HOSTING FIX: Use memory upload + S3 adapter middleware ---
    router.post(
        '/:schoolCode/import/users',
        upload.single('file'),                  // 1. Parse CSV/Excel in memory
        handleSingleS3Upload('imports'),        // 2. Upload template securely to S3
        exportImportController.importUsers      // 3. Controller reads S3 URL from req.file.path
    );

    router.get(
        '/:schoolCode/export/users',
        exportImportController.exportUsers
    );

    router.get(
        '/:schoolCode/import/template',
        exportImportController.generateTemplate
    );
    // --------------------------------------------

    return router;
};