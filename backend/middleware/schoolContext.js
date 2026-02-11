const School = require('../models/School');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');

/**
 * Middleware to set school context from various sources
 * Tries to extract school information from:
 * 1. Request body (schoolCode)
 * 2. Request params (schoolCode, schoolId)
 * 3. Request query (schoolCode)
 * 4. User object (schoolCode)
 */
const setSchoolContext = async (req, res, next) => {
  try {
    console.log('🏫 Setting school context...');
    
    // Try to get school code from various sources
    let schoolCode = req.body?.schoolCode || 
                     req.params?.schoolCode || 
                     req.params?.schoolId ||
                     req.query?.schoolCode ||
                     req.user?.schoolCode;
    
    if (!schoolCode) {
      console.log('⚠️ No school code found in request, continuing without school context');
      return next();
    }
    
    console.log(`🔍 Found school identifier: ${schoolCode}`);
    
    // Resolve school identifier to school object
    let school = await School.findOne({ code: schoolCode.toUpperCase() });
    
    if (!school) {
      // Try finding by name
      school = await School.findOne({ name: { $regex: new RegExp(`^${schoolCode}$`, 'i') } });
    }
    
    if (!school) {
      // Try finding by _id if it looks like an ObjectId
      if (schoolCode.match(/^[0-9a-fA-F]{24}$/)) {
        school = await School.findById(schoolCode);
      }
    }
    
    if (school) {
      req.schoolCode = school.code.toLowerCase();
      req.schoolId = school._id;
      req.school = school;
      console.log(`✅ School context set: ${school.name} (${school.code})`);
    } else {
      console.log(`⚠️ School not found for identifier: ${schoolCode}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error setting school context:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Middleware to require school context
 * Returns 400 if school context is not set
 */
const requireSchoolContext = async (req, res, next) => {
  try {
    console.log('🔒 Requiring school context...');
    
    // Try to set school context if not already set
    if (!req.schoolCode) {
      await setSchoolContext(req, res, () => {});
    }
    
    if (!req.schoolCode) {
      console.error('❌ School context required but not found');
      return res.status(400).json({
        success: false,
        message: 'School context is required. Please provide schoolCode in request.'
      });
    }
    
    console.log(`✅ School context verified: ${req.schoolCode}`);
    next();
  } catch (error) {
    console.error('❌ Error requiring school context:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating school context',
      error: error.message
    });
  }
};

/**
 * Middleware to validate school access based on user roles
 * @param {Array<string>} allowedRoles - Array of roles allowed to access
 */
const validateSchoolAccess = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      console.log('🔐 Validating school access...');
      console.log('User role:', req.user?.role);
      console.log('Allowed roles:', allowedRoles);
      
      if (!req.user) {
        console.error('❌ No user found in request');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Superadmin has access to everything
      if (req.user.role === 'superadmin') {
        console.log('✅ Superadmin access granted');
        return next();
      }
      
      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        console.error(`❌ Access denied. User role "${req.user.role}" not in allowed roles:`, allowedRoles);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
      }
      
      // For school-specific roles, verify school context matches
      if (req.schoolCode && req.user.schoolCode) {
        if (req.schoolCode.toLowerCase() !== req.user.schoolCode.toLowerCase()) {
          console.error(`❌ School mismatch. User school: ${req.user.schoolCode}, Request school: ${req.schoolCode}`);
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not have access to this school.'
          });
        }
      }
      
      console.log(`✅ Access granted for role: ${req.user.role}`);
      next();
    } catch (error) {
      console.error('❌ Error validating school access:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating access',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to set main database context
 * Used for operations that need to work with the main database
 */
const setMainDbContext = (req, res, next) => {
  try {
    console.log('🗄️ Setting main database context...');
    const mongoose = require('mongoose');
    req.mainDb = mongoose.connection;
    console.log('✅ Main database context set');
    next();
  } catch (error) {
    console.error('❌ Error setting main database context:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting database context',
      error: error.message
    });
  }
};

/**
 * Middleware to require superadmin role
 */
const requireSuperAdmin = (req, res, next) => {
  try {
    console.log('👑 Requiring superadmin access...');
    
    if (!req.user) {
      console.error('❌ No user found in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'superadmin') {
      console.error(`❌ Access denied. User role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Superadmin role required.'
      });
    }
    
    console.log('✅ Superadmin access granted');
    next();
  } catch (error) {
    console.error('❌ Error requiring superadmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating superadmin access',
      error: error.message
    });
  }
};

module.exports = {
  setSchoolContext,
  requireSchoolContext,
  validateSchoolAccess,
  setMainDbContext,
  requireSuperAdmin
};
