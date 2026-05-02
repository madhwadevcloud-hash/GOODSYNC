const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const authMiddleware = require('../middleware/auth');
const { enforceJwtTenancy } = require('../middleware/tenancy');

// Apply authentication middleware to all routes
router.use(authMiddleware.auth);
router.use(enforceJwtTenancy);

// Bulk school-wide promotion
router.post('/:schoolCode/bulk', promotionController.bulkPromotion);

// Manual section promotion with exceptions
router.post('/:schoolCode/section', promotionController.sectionPromotion);

module.exports = router;
