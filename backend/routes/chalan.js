const express = require('express');
const router = express.Router();
const chalanController = require('../controllers/chalanController');
const { auth, authorize } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Apply role check - only ADMIN, SUPER_ADMIN, and ACCOUNTANT can access
router.use(authorize('admin', 'superadmin', 'accountant'));

// Generate chalans for students
router.post('/generate', chalanController.generateChalans);

// Get all chalans with optional filters
router.get('/', chalanController.getChalans);

// Get chalan by ID
router.get('/:id', chalanController.getChalanById);

// Get chalans by student ID
router.get('/student/:studentId', chalanController.getChalansByStudent);

// Mark chalan as paid
router.post('/:id/mark-paid', chalanController.markAsPaid);

module.exports = router;
