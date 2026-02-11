const express = require('express');
const router = express.Router();
const { register, login, schoolLogin } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/school-login', schoolLogin);

module.exports = router;
