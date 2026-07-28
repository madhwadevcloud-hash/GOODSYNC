const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const demoRequestController = require('../controllers/demoRequestController');

// Public — hit by the marketing site's Request Demo form (no login required)
router.post('/', demoRequestController.createDemoRequest);

// Super Admin only — list everyone who has requested a demo
router.get('/', auth, roleCheck(['superadmin']), demoRequestController.getAllDemoRequests);

module.exports = router;
