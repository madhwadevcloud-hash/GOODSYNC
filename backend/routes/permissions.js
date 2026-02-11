const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const School = require('../models/School');
const DatabaseManager = require('../utils/databaseManager');

/**
 * Get user permissions based on access matrix
 * This endpoint provides the same permission checking logic as the backend middleware
 * but returns the permissions object for frontend use
 */
router.get('/my-permissions', auth, async (req, res) => {
  try {
    console.log('[PERMISSIONS API] Getting permissions for user:', req.user.role, req.user.userId);

    // Superadmin always has all permissions
    if (req.user && req.user.role === 'superadmin') {
      const superadminPermissions = {
        manageUsers: true,
        manageSchoolSettings: true,
        createTimetable: true,
        viewTimetable: true,
        markAttendance: true,
        viewAttendance: true,
        addAssignments: true,
        submitAssignments: false,
        viewAssignments: true,
        viewResults: true,
        updateResults: true,
        viewLeaves: true,
        message: true
      };

      return res.json({
        success: true,
        permissions: superadminPermissions,
        role: req.user.role,
        source: 'superadmin_default'
      });
    }

    // Check if user exists and has required properties
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User not authenticated or role not defined.'
      });
    }

    // Get school's access matrix
    let accessMatrix = null;
    let source = 'default';
    
    // Try to get access matrix from school database if schoolCode is available
    if (req.user.schoolCode) {
      try {
        const schoolConn = await DatabaseManager.getSchoolConnection(req.user.schoolCode);
        
        // Try to get access matrix from the access_matrices collection
        const accessMatrixCollection = schoolConn.collection('access_matrices');
        const matrixDoc = await accessMatrixCollection.findOne({ schoolCode: req.user.schoolCode });
        
        console.log(`[PERMISSIONS API] School DB lookup for ${req.user.schoolCode}:`, matrixDoc ? 'Found' : 'Not found');
        
        if (matrixDoc && matrixDoc.accessMatrix) {
          accessMatrix = matrixDoc.accessMatrix;
          source = 'school_database';
        } else if (matrixDoc && matrixDoc.matrix) {
          // Alternative structure: matrix instead of accessMatrix
          accessMatrix = matrixDoc.matrix;
          source = 'school_database';
        }
      } catch (error) {
        console.log('[PERMISSIONS API] Could not fetch from school database:', error.message);
      }
    }

    // Fallback to main database if not found in school database
    if (!accessMatrix && req.user.schoolId) {
      try {
        const school = await School.findById(req.user.schoolId);
        console.log(`[PERMISSIONS API] Main DB lookup for school ${req.user.schoolId}:`, school ? 'Found' : 'Not found');
        if (school && school.accessMatrix) {
          accessMatrix = school.accessMatrix;
          source = 'main_database';
        }
      } catch (error) {
        console.log('[PERMISSIONS API] Could not fetch from main database:', error.message);
      }
    }

    // If no access matrix found, use default permissions based on role
    if (!accessMatrix) {
      console.log(`[PERMISSIONS API] No access matrix found for ${req.user.role}, using default permissions`);
      const defaultPermissions = getDefaultPermissions(req.user.role);
      
      return res.json({
        success: true,
        permissions: defaultPermissions,
        role: req.user.role,
        source: 'default_permissions'
      });
    }

    // Get user's role permissions from access matrix
    const rolePermissions = accessMatrix[req.user.role];
    
    console.log(`[PERMISSIONS API] Found access matrix permissions for role '${req.user.role}'`);
    console.log(`[PERMISSIONS API] Role permissions:`, rolePermissions ? Object.keys(rolePermissions).filter(k => rolePermissions[k]) : 'None');
    
    // Special case: If student role has no permissions or all false in access matrix,
    // fall back to default permissions
    if (req.user.role === 'student' && (!rolePermissions || Object.keys(rolePermissions).length === 0 || !Object.values(rolePermissions).some(v => v === true))) {
      console.log('[PERMISSIONS API] Student has no/false permissions in access matrix, using default permissions');
      const defaultPermissions = getDefaultPermissions('student');
      
      return res.json({
        success: true,
        permissions: defaultPermissions,
        role: req.user.role,
        source: 'student_default_fallback'
      });
    }

    // Return the role permissions from access matrix
    const permissions = rolePermissions || {};

    res.json({
      success: true,
      permissions,
      role: req.user.role,
      source
    });

  } catch (error) {
    console.error('[PERMISSIONS API ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching permissions',
      error: error.message
    });
  }
});

/**
 * Get default permissions for a role when no access matrix is configured
 * This matches the backend middleware default permissions exactly
 */
function getDefaultPermissions(role) {
  const defaultPermissions = {
    superadmin: {
      manageUsers: true,
      manageSchoolSettings: true,
      createTimetable: true,
      viewTimetable: true,
      markAttendance: true,
      viewAttendance: true,
      addAssignments: true,
      submitAssignments: false,
      viewAssignments: true,
      viewResults: true,
      updateResults: true,
      viewLeaves: true,
      message: true
    },
    admin: {
      manageUsers: true,
      manageSchoolSettings: true,
      createTimetable: true,
      viewTimetable: true,
      markAttendance: true,
      viewAttendance: true,
      addAssignments: true,
      submitAssignments: false,
      viewAssignments: true,
      viewResults: true,
      updateResults: true,
      viewLeaves: true,
      message: true
    },
    teacher: {
      manageUsers: false,
      manageSchoolSettings: false,
      createTimetable: true,
      viewTimetable: true,
      markAttendance: true,
      viewAttendance: true,
      addAssignments: true,
      submitAssignments: false,
      viewAssignments: true,
      viewResults: true,
      updateResults: true,
      viewLeaves: true,
      message: true
    },
    student: {
      manageUsers: false,
      manageSchoolSettings: false,
      createTimetable: false,
      viewTimetable: true,
      markAttendance: false,
      viewAttendance: true,
      viewAssignments: true,
      addAssignments: false,
      submitAssignments: true,
      viewResults: true,
      updateResults: false,
      viewLeaves: false,
      message: false
    },
    parent: {
      manageUsers: false,
      manageSchoolSettings: false,
      createTimetable: false,
      viewTimetable: false,
      markAttendance: false,
      viewAttendance: false,
      addAssignments: false,
      submitAssignments: false,
      viewAssignments: false,
      viewResults: false,
      updateResults: false,
      viewLeaves: false,
      message: false
    }
  };

  return defaultPermissions[role] || {};
}

module.exports = router;
