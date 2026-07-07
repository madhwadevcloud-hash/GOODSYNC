/**
 * teacherAssignmentController.js
 * 
 * Controller for the Teacher Subject Assignment admin module.
 * Handles CRUD operations for teacher-subject assignments.
 */

const TeacherAssignmentService = require('../services/teacherAssignmentService');
const ModelFactory = require('../utils/modelFactory');
const { getDynamicAcademicYear } = require('../utils/academicYearHelper');

/**
 * Helper to get Model dynamically in controller
 */
const getModel = async (schoolCode) => {
  return ModelFactory.getTeacherSubjectAssignmentModel(schoolCode);
};

/**
 * GET /api/teacher-assignments
 * Get all assignments for a school, optionally filtered by class, section, teacher, etc.
 */
exports.getAssignments = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;
    const {
      academicYear,
      className,
      section,
      teacherId,
      subjectName,
      status
    } = req.query;

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School context is required'
      });
    }

    const year = academicYear || getDynamicAcademicYear();

    const assignments = await TeacherAssignmentService.getAllAssignments(
      schoolCode,
      year,
      { className, section, teacherId, subjectName, status }
    );

    res.json({
      success: true,
      message: `Found ${assignments.length} assignments`,
      data: assignments,
      filters: { academicYear: year, className, section, teacherId, subjectName, status }
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message
    });
  }
};

/**
 * GET /api/teacher-assignments/class/:className/:section
 * Get all assignments for a specific class-section.
 */
exports.getClassSectionAssignments = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;
    const { className, section } = req.params;
    const academicYear = req.query.academicYear || getDynamicAcademicYear();

    if (!schoolCode || !className || !section) {
      return res.status(400).json({
        success: false,
        message: 'School, class, and section are required'
      });
    }

    const assignments = await TeacherAssignmentService.getClassSectionAssignments(
      schoolCode, className, section, academicYear
    );

    res.json({
      success: true,
      message: `Found ${assignments.length} assignments for ${className}-${section}`,
      data: assignments
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error fetching class-section assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class-section assignments',
      error: error.message
    });
  }
};

/**
 * GET /api/teacher-assignments/teacher/:teacherId
 * Get all assignments for a specific teacher (used by teacher dashboard).
 */
exports.getTeacherAssignmentsById = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;
    const { teacherId } = req.params;
    const academicYear = req.query.academicYear || getDynamicAcademicYear();

    if (!schoolCode || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'School and teacher ID are required'
      });
    }

    // Teachers can only view their own assignments
    if (req.user.role === 'teacher') {
      const requestedTeacherId = teacherId;
      const currentTeacherId = req.user.userId || req.user._id?.toString();
      if (requestedTeacherId !== currentTeacherId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own assignments'
        });
      }
    }

    const summary = await TeacherAssignmentService.getTeacherSummary(
      schoolCode, teacherId, academicYear
    );

    res.json({
      success: true,
      message: `Found ${summary.totalAssignments} assignments`,
      data: summary
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error fetching teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher assignments',
      error: error.message
    });
  }
};

/**
 * GET /api/teacher-assignments/my-assignments
 * Get the current teacher's own assignments.
 */
exports.getMyAssignments = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;
    const teacherId = req.user.userId || req.user._id?.toString();
    const academicYear = req.query.academicYear || getDynamicAcademicYear();

    if (!schoolCode || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'School context or teacher identity not available'
      });
    }

    const summary = await TeacherAssignmentService.getTeacherSummary(
      schoolCode, teacherId, academicYear
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error fetching my assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your assignments',
      error: error.message
    });
  }
};

/**
 * POST /api/teacher-assignments
 * Create or update a single assignment (admin only).
 */
exports.createAssignment = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const schoolCode = req.user.schoolCode;
    const createdBy = req.user.userId || req.user._id?.toString();

    const {
      academicYear,
      className,
      section,
      subjectName,
      teacherId,
      teacherName,
      teacherEmployeeId,
      classId,
      subjectId,
      notes
    } = req.body;

    if (!className || !section || !subjectName || !teacherId || !teacherName) {
      return res.status(400).json({
        success: false,
        message: 'className, section, subjectName, teacherId, and teacherName are required'
      });
    }

    const year = academicYear || getDynamicAcademicYear();

    const { assignment, action } = await TeacherAssignmentService.createOrUpdateAssignment({
      schoolId,
      schoolCode,
      academicYear: year,
      className,
      section,
      subjectName,
      teacherId,
      teacherName,
      teacherEmployeeId,
      classId,
      subjectId,
      createdBy,
      notes
    });

    const statusCode = action === 'created' ? 201 : 200;
    const message = action === 'created'
      ? `${teacherName} assigned to ${subjectName} in ${className}-${section}`
      : action === 'reassigned'
        ? `${subjectName} in ${className}-${section} reassigned to ${teacherName}`
        : `No change - ${teacherName} already assigned to ${subjectName} in ${className}-${section}`;

    res.status(statusCode).json({
      success: true,
      message,
      action,
      data: assignment
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error creating assignment:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An assignment already exists for this class-section-subject combination',
        error: 'Duplicate assignment'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create assignment',
      error: error.message
    });
  }
};

/**
 * POST /api/teacher-assignments/bulk
 * Bulk assign teachers to subjects for a class-section (admin only).
 */
exports.bulkAssign = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const schoolCode = req.user.schoolCode;
    const createdBy = req.user.userId || req.user._id?.toString();

    const {
      academicYear,
      className,
      section,
      assignments // Array of { subjectName, teacherId, teacherName, teacherEmployeeId? }
    } = req.body;

    if (!className || !section || !assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'className, section, and assignments array are required'
      });
    }

    const year = academicYear || getDynamicAcademicYear();

    const results = await TeacherAssignmentService.bulkAssign(
      schoolId, schoolCode, year, className, section, assignments, createdBy
    );

    res.json({
      success: true,
      message: `Bulk assignment complete: ${results.created} created, ${results.reassigned} reassigned, ${results.unchanged} unchanged`,
      data: results
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error in bulk assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk assignments',
      error: error.message
    });
  }
};

/**
 * PUT /api/teacher-assignments/:id
 * Update (reassign) a specific assignment (admin only).
 */
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolCode = req.user.schoolCode;
    const updatedBy = req.user.userId || req.user._id?.toString();

    const {
      teacherId,
      teacherName,
      teacherEmployeeId,
      status,
      notes
    } = req.body;

    const TeacherSubjectAssignment = await getModel(schoolCode);
    const assignment = await TeacherSubjectAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Update fields
    if (teacherId) assignment.teacherId = teacherId;
    if (teacherName) assignment.teacherName = teacherName;
    if (teacherEmployeeId !== undefined) assignment.teacherEmployeeId = teacherEmployeeId;
    if (status) assignment.status = status;
    if (notes !== undefined) assignment.notes = notes;
    assignment.updatedBy = updatedBy;

    await assignment.save();

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment',
      error: error.message
    });
  }
};

/**
 * DELETE /api/teacher-assignments/:id
 * Soft-delete (deactivate) an assignment (admin only).
 */
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolCode = req.user.schoolCode;
    const updatedBy = req.user.userId || req.user._id?.toString();
    const reason = req.body?.reason || 'Removed by admin';

    const assignment = await TeacherAssignmentService.removeAssignment(schoolCode, id, updatedBy, reason);

    res.json({
      success: true,
      message: 'Assignment deactivated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error deleting assignment:', error);

    if (error.message === 'Assignment not found') {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to deactivate assignment',
      error: error.message
    });
  }
};

/**
 * POST /api/teacher-assignments/copy-year
 * Copy all assignments from one academic year to another (admin only).
 */
exports.copyAssignments = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;
    const createdBy = req.user.userId || req.user._id?.toString();

    const { fromYear, toYear } = req.body;

    if (!fromYear || !toYear) {
      return res.status(400).json({
        success: false,
        message: 'fromYear and toYear are required'
      });
    }

    if (fromYear === toYear) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination year cannot be the same'
      });
    }

    const results = await TeacherAssignmentService.copyAssignmentsToNewYear(
      schoolCode, fromYear, toYear, createdBy
    );

    res.json({
      success: true,
      message: `Copied ${results.copied} assignments from ${fromYear} to ${toYear}`,
      data: results
    });
  } catch (error) {
    console.error('[TSA_CTRL] Error copying assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy assignments',
      error: error.message
    });
  }
};

module.exports = {
  getAssignments: exports.getAssignments,
  getClassSectionAssignments: exports.getClassSectionAssignments,
  getTeacherAssignmentsById: exports.getTeacherAssignmentsById,
  getMyAssignments: exports.getMyAssignments,
  createAssignment: exports.createAssignment,
  bulkAssign: exports.bulkAssign,
  updateAssignment: exports.updateAssignment,
  deleteAssignment: exports.deleteAssignment,
  copyAssignments: exports.copyAssignments
};
