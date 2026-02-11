const express = require('express');
const router = express.Router();
const migrationController = require('../controllers/migrationController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware
router.use(authMiddleware.auth);

// Migrate students to add academic year
router.post('/:schoolCode/students/academic-year', migrationController.migrateStudentAcademicYear);

// Check students' academic year status (diagnostic)
router.get('/:schoolCode/students/check-academic-year', migrationController.checkStudentsAcademicYear);

module.exports = router;
