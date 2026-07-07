const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { enforceJwtTenancy } = require('../middleware/tenancy');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);

// System-wide notification routes (before tenancy check since superadmin is global)
router.get('/notifications', promotionController.getNotifications);
router.post('/notifications/:id/read', promotionController.markNotificationAsRead);

// SuperAdmin endpoints (SuperAdmin role required)
router.get('/requests', roleCheck(['superadmin']), promotionController.getPromotionRequests);
router.post('/request/:id/approve', roleCheck(['superadmin']), promotionController.approvePromotionRequest);
router.post('/request/:id/reject', roleCheck(['superadmin']), promotionController.rejectPromotionRequest);

// Tenant-specific route check
router.use(enforceJwtTenancy);

// Submit promotion request (Admin only)
router.post('/:schoolCode/request', roleCheck(['admin']), promotionController.submitPromotionRequest);

// Get active request for school (Admin / Super Admin)
router.get('/:schoolCode/request/active', roleCheck(['admin', 'superadmin']), promotionController.getActivePromotionRequest);

// Bulk school-wide promotion (Admin only)
router.post('/:schoolCode/bulk', roleCheck(['admin']), promotionController.bulkPromotion);

// Manual section promotion with exceptions (Admin only)
router.post('/:schoolCode/section', roleCheck(['admin']), promotionController.sectionPromotion);

module.exports = router;
