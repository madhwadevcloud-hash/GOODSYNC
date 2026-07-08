const express = require('express');
const router = express.Router();
const { register, login, schoolLogin, logout, getDemoCredentials, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.get('/demo-credentials', getDemoCredentials);

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/school-login', loginLimiter, schoolLogin);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post("/reset-password",passwordResetLimiter,resetPassword);
router.post('/logout', logout);
module.exports = router;
