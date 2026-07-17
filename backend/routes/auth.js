const express = require('express');
const router = express.Router();
const { register, login, schoolLogin, logout, superAdminLogin, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginLimiter, passwordResetLimiter, superAdminLoginLimiter } = require('../middleware/rateLimiter');

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/school-login', loginLimiter, schoolLogin);
// Dedicated Super Admin login endpoint — only reachable via the hidden
// frontend URL, protected by its own strict rate limiter.
router.post('/superadmin-login', superAdminLoginLimiter, superAdminLogin);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/reset-password/:token', passwordResetLimiter, resetPassword);
router.post('/logout', logout);

module.exports = router;
