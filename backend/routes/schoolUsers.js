const express = require('express');
const router = express.Router();
const schoolUserController = require('../controllers/schoolUserController');
const authMiddleware = require('../middleware/auth');

// --- HOSTING FIX: Remove local multer. Import controllers. ---
const exportImportController = require('../controllers/exportImportController');
const { setSchoolContext } = require('../middleware/schoolContext');
// --- END FIX ---

// --- HOSTING FIX: Wrap in a function to accept 'upload' from server.js ---
module.exports = (upload) => {
    // Apply authentication middleware to all routes
    router.use(authMiddleware.auth);
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
    // --- HOSTING FIX: Add 'upload.single' for profile picture uploads ---
    router.put(
        '/:schoolCode/users/:userId',
        upload.single('profileImage'), // <-- Use injected upload
        schoolUserController.updateUser
    );

    // Profile update route removed - function not implemented

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
    // --- HOSTING FIX: Use the injected 'upload' variable ---
    router.post(
        '/:schoolCode/import/users',
        upload.single('file'), // 'file' must match the FormData key
        exportImportController.importUsers
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

