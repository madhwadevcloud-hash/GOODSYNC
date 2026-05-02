const express = require('express');
const router = express.Router();
const { register, login, schoolLogin, getDemoCredentials } = require('../controllers/authController');

router.get('/demo-credentials', getDemoCredentials);

router.post('/register', register);
router.post('/login', login);
router.post('/school-login', schoolLogin);

module.exports = router;
