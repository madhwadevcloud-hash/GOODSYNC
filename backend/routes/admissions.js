const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Admission management routes (Admin & Super Admin)
router.post('/', admissionController.createAdmission);
router.get('/', admissionController.getAdmissions);
router.get('/stats', admissionController.getAdmissionStats);
router.get('/search', admissionController.searchAdmissions);

// Admission-specific routes
router.get('/:admissionId', admissionController.getAdmissionById);
router.put('/:admissionId', admissionController.updateAdmission);
router.patch('/:admissionId/approve', admissionController.approveAdmission);
router.patch('/:admissionId/reject', admissionController.rejectAdmission);

module.exports = router;
