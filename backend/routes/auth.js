
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  schoolLogin,
  logout,
  getDemoCredentials,
} = require('../controllers/authController');

const {
  forgotPassword,
  resetPassword,
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

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Teacher Portal - Forgot / Reset Password
router.post('/teacher/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/teacher/reset-password', passwordResetLimiter, resetPassword);

module.exports = router;
