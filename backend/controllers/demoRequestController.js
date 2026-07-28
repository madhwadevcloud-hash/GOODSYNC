const DemoRequest = require('../models/DemoRequest');

const PHONE_REGEX = /^[+]?[\d\s-]{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @route   POST /api/demo-requests
// @desc    Public endpoint used by the marketing site's "Request Demo" form
// @access  Public
exports.createDemoRequest = async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    const phone = (req.body?.phone || '').trim();
    const email = (req.body?.email || '').trim();

    const errors = {};
    if (!name) errors.name = 'Name is required';
    if (!phone) {
      errors.phone = 'Phone number is required';
    } else if (!PHONE_REGEX.test(phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    if (!email) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please fix the highlighted fields',
        errors
      });
    }

    const demoRequest = await DemoRequest.create({ name, phone, email });

    return res.status(201).json({
      success: true,
      message: 'Demo request received. Our team will contact you within 24 hours.',
      data: demoRequest
    });
  } catch (error) {
    console.error('[demoRequestController] createDemoRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
};

// @route   GET /api/demo-requests
// @desc    List all demo requests, newest first (Super Admin only)
// @access  Private (superadmin)
exports.getAllDemoRequests = async (req, res) => {
  try {
    const demoRequests = await DemoRequest.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: demoRequests.length,
      data: demoRequests
    });
  } catch (error) {
    console.error('[demoRequestController] getAllDemoRequests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
};
