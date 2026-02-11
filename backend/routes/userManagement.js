const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userManagementController = require('../controllers/userManagementController');
const { auth } = require('../middleware/auth');
const { setMainDbContext } = require('../middleware/schoolContext');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (before compression)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Middleware to verify admin access
const requireAdminAccess = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Get all users for a school
router.get('/:schoolCode/users',
  auth,
  setMainDbContext,
  requireAdminAccess,
  userManagementController.getAllUsers
);

// Get user by ID
router.get('/:schoolCode/users/:userId',
  auth,
  setMainDbContext,
  requireAdminAccess,
  userManagementController.getUserById
);

// Create new user
router.post('/:schoolCode/users',
  auth,
  setMainDbContext,
  requireAdminAccess,
  userManagementController.createUser
);

// Update user (with optional profile image upload)
router.put('/:schoolCode/users/:userId',
  auth,
  setMainDbContext,
  requireAdminAccess,
  upload.single('profileImage'), // Handle single file upload with field name 'profileImage'
  userManagementController.updateUser
);

// Delete user
router.delete('/:schoolCode/users/:userId',
  auth,
  setMainDbContext,
  requireAdminAccess,
  userManagementController.deleteUser
);

// Reset user password (admin/teacher only)
router.post('/:schoolCode/users/:userId/reset-password',
  auth,
  setMainDbContext,
  requireAdminAccess,
  userManagementController.resetPassword
);

module.exports = router;
