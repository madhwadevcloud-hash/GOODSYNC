const express = require('express');
const router = express.Router();

const {
  register,
  login,
  schoolLogin,
  logout,
  getDemoCredentials,
  forgotPassword: adminForgotPassword,
  resetPassword: adminResetPassword,
} = require('../controllers/authController');

const {
  forgotPassword: teacherForgotPassword,
  resetPassword: teacherResetPassword,
} = require('../controllers/teacherPasswordResetController');

const {
  loginLimiter,
  passwordResetLimiter,
} = require('../middleware/rateLimiter');

router.get('/demo-credentials', getDemoCredentials);

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/school-login', loginLimiter, schoolLogin);
router.post('/logout', logout);

// Admin Portal - Forgot / Reset Password
router.post('/forgot-password', passwordResetLimiter, adminForgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, adminResetPassword);

// Teacher Portal - Forgot / Reset Password
router.post('/teacher/forgot-password', passwordResetLimiter, teacherForgotPassword);
router.post('/teacher/reset-password', passwordResetLimiter, teacherResetPassword);

module.exports = router;