const express = require('express');
const router = express.Router();
const { register, login, schoolLogin, logout, getDemoCredentials, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

router.get('/demo-credentials', getDemoCredentials);

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/school-login', loginLimiter, schoolLogin);
router.post('/logout', logout);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
