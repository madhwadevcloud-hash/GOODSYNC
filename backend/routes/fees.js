const express = require('express');
const router = express.Router();
const feesController = require('../controllers/feesController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const checkPermission = require('../middleware/permissionCheck');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// Student-specific route - must come before role checks
router.get('/my-fees', authMiddleware.auth, async (req, res) => {
  try {
    const studentId = req.user.userId || req.user._id;
    const schoolCode = req.user.schoolCode;
    
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }

    // Get connection to the school's database
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    
    if (!schoolConnection) {
      return res.status(404).json({
        success: false,
        message: 'School database not found'
      });
    }

    const StudentFeeRecord = schoolConnection.model('StudentFeeRecord');
    
    // Find the student's fee record
    const feeRecord = await StudentFeeRecord.findOne({ studentId })
      .populate('studentId', 'name email class section rollNumber')
      .lean();

    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: 'No fee record found',
        data: null
      });
    }

    res.json({
      success: true,
      data: feeRecord
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fee record',
      error: error.message
    });
  }
});

// Apply role check - only ADMIN and SUPER_ADMIN can access routes below
router.use(roleCheck(['admin', 'superadmin']));

// Apply permission check - requires viewFees permission
router.use(checkPermission('viewFees'));

// Fee Structure routes
router.post('/structures', feesController.createFeeStructure);
router.get('/structures', feesController.getFeeStructures);
router.delete('/structures/:id', feesController.deleteFeeStructure);

// Student Fee Records routes
router.get('/records', feesController.getStudentFeeRecords);
router.get('/records/:studentId', feesController.getStudentFeeRecord);
router.get('/stats', feesController.getFeeStats);

// Payment routes
router.post('/records/:studentId/offline-payment', feesController.recordOfflinePayment);
router.get('/receipts/:receiptNumber', feesController.downloadReceiptPdf);

// Export routes
router.get('/export', 
  authMiddleware.auth, // Ensure user is authenticated
  roleCheck(['admin', 'accountant', 'superadmin']), // Only allow admin, accountant, and superadmin
  async (req, res, next) => {
    console.log('🔵 Export route hit by user:', req.user._id);
    console.log('🔍 Request query:', JSON.stringify(req.query));
    console.log('🏫 School code:', req.user.schoolCode);
    
    try {
      // Call the controller and wait for it to complete
      await feesController.exportStudentFeeRecords(req, res);
    } catch (error) {
      console.error('❌ Error in export route:', {
        message: error.message,
        stack: error.stack,
        user: req.user ? {
          _id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          schoolCode: req.user.schoolCode
        } : 'No user in request',
        query: req.query
      });
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate export. Please try again.'
        });
      }
    }
  }
);

module.exports = router;
