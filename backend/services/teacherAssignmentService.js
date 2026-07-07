/**
 * teacherAssignmentService.js
 * 
 * Service layer for the TeacherSubjectAssignment system.
 * Provides business logic for creating, updating, querying, and validating
 * teacher-subject assignments.
 * 
 * Multi-tenant safe: Dynamically loads the model for the school's specific database connection.
 */

const ModelFactory = require('../utils/modelFactory');
const School = require('../models/School');

class TeacherAssignmentService {

  /**
   * Helper to get TeacherSubjectAssignment model for a school connection
   */
  static async getModel(schoolCode) {
    if (!schoolCode) throw new Error('School code is required');
    return ModelFactory.getTeacherSubjectAssignmentModel(schoolCode);
  }

  /**
   * Create or update an assignment.
   * If an active assignment already exists for the same (school, year, class, section, subject),
   * it will be reassigned to the new teacher.
   */
  static async createOrUpdateAssignment(data) {
    const {
      schoolId,
      schoolCode,
      academicYear,
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
    } = data;

    // Validate required fields
    console.log('[TSA SERVICE] Validating fields:', {
      schoolId: !!schoolId,
      schoolCode: !!schoolCode,
      academicYear: !!academicYear,
      className: !!className,
      section: !!section,
      subjectName: !!subjectName,
      teacherId: !!teacherId,
      teacherName: !!teacherName,
      createdBy: !!createdBy,
      values: { schoolId, schoolCode, academicYear, className, section, subjectName, teacherId, teacherName, createdBy }
    });

    if (!schoolId || !schoolCode || !academicYear || !className || !section || !subjectName || !teacherId || !teacherName || !createdBy) {
      throw new Error('Missing required fields for teacher assignment');
    }

    const TeacherSubjectAssignment = await this.getModel(schoolCode);

    // Check if an assignment already exists for this combination
    const existing = await TeacherSubjectAssignment.findOne({
      schoolId,
      academicYear,
      className,
      section: section.toUpperCase(),
      subjectName
    });

    if (existing) {
      // If the same teacher is already assigned and active, no change needed
      if (existing.teacherId === teacherId && existing.status === 'active') {
        console.log(`ℹ️ [TSA] Teacher ${teacherName} already assigned to ${subjectName} in ${className}-${section} (${academicYear})`);
        return { assignment: existing, action: 'no_change' };
      }

      // Reassign to new teacher
      const previousTeacher = existing.teacherName;
      existing.teacherId = teacherId;
      existing.teacherName = teacherName;
      existing.teacherEmployeeId = teacherEmployeeId || null;
      existing.status = 'active';
      existing.updatedBy = createdBy;
      existing.statusChangeReason = `Reassigned from ${previousTeacher} to ${teacherName}`;
      if (notes) existing.notes = notes;

      await existing.save();
      console.log(`🔄 [TSA] Reassigned ${subjectName} in ${className}-${section} from ${previousTeacher} to ${teacherName}`);
      return { assignment: existing, action: 'reassigned' };
    }

    // Create new assignment
    const assignment = new TeacherSubjectAssignment({
      schoolId,
      schoolCode: schoolCode.toUpperCase(),
      academicYear,
      className,
      section: section.toUpperCase(),
      subjectName,
      teacherId,
      teacherName,
      teacherEmployeeId: teacherEmployeeId || null,
      classId: classId || null,
      subjectId: subjectId || null,
      status: 'active',
      createdBy,
      notes: notes || null
    });

    await assignment.save();
    console.log(`✅ [TSA] Created assignment: ${teacherName} → ${subjectName} in ${className}-${section} (${academicYear})`);
    return { assignment, action: 'created' };
  }

  /**
   * Bulk assign subjects to teachers for a class-section.
   */
  static async bulkAssign(schoolId, schoolCode, academicYear, className, section, assignments, createdBy) {
    const results = { created: 0, reassigned: 0, unchanged: 0, errors: [] };

    for (const item of assignments) {
      try {
        const { assignment, action } = await this.createOrUpdateAssignment({
          schoolId,
          schoolCode,
          academicYear,
          className,
          section,
          subjectName: item.subjectName,
          teacherId: item.teacherId,
          teacherName: item.teacherName,
          teacherEmployeeId: item.teacherEmployeeId,
          createdBy
        });

        if (action === 'created') results.created++;
        else if (action === 'reassigned') results.reassigned++;
        else results.unchanged++;
      } catch (err) {
        console.error(`❌ [TSA] Error assigning ${item.subjectName}:`, err.message);
        results.errors.push({
          subjectName: item.subjectName,
          teacherId: item.teacherId,
          error: err.message
        });
      }
    }

    console.log(`📊 [TSA] Bulk assign complete: ${results.created} created, ${results.reassigned} reassigned, ${results.unchanged} unchanged, ${results.errors.length} errors`);
    return results;
  }

  /**
   * Remove (deactivate) an assignment.
   */
  static async removeAssignment(schoolCode, assignmentId, updatedBy, reason) {
    const TeacherSubjectAssignment = await this.getModel(schoolCode);
    const assignment = await TeacherSubjectAssignment.findOne({
      $or: [
        { assignmentId },
        { _id: assignmentId }
      ]
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    assignment.status = 'inactive';
    assignment.updatedBy = updatedBy;
    assignment.statusChangeReason = reason || 'Removed by admin';
    await assignment.save();

    console.log(`🗑️ [TSA] Deactivated assignment ${assignmentId}`);
    return assignment;
  }

  /**
   * Get all active assignments for a teacher in a given academic year.
   */
  static async getTeacherAssignments(schoolCode, teacherId, academicYear) {
    const TeacherSubjectAssignment = await this.getModel(schoolCode);
    return TeacherSubjectAssignment.find({
      teacherId,
      academicYear,
      status: 'active'
    }).sort({ className: 1, section: 1, subjectName: 1 }).lean();
  }

  /**
   * Get all active assignments for a class-section in a given academic year.
   */
  static async getClassSectionAssignments(schoolCode, className, section, academicYear) {
    const TeacherSubjectAssignment = await this.getModel(schoolCode);
    return TeacherSubjectAssignment.find({
      className,
      section: section.toUpperCase(),
      academicYear,
      status: 'active'
    }).sort({ subjectName: 1 }).lean();
  }

  /**
   * Get all assignments for a school in a given academic year (for admin view).
   */
  static async getAllAssignments(schoolCode, academicYear, filters = {}) {
    const TeacherSubjectAssignment = await this.getModel(schoolCode);
    const query = {
      academicYear
    };

    // Only filter by status if explicitly provided
    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = 'active';
    }

    if (filters.className) query.className = filters.className;
    if (filters.section) query.section = filters.section.toUpperCase();
    if (filters.teacherId) query.teacherId = filters.teacherId;
    if (filters.subjectName) query.subjectName = filters.subjectName;

    return TeacherSubjectAssignment.find(query)
      .sort({ className: 1, section: 1, subjectName: 1 })
      .lean();
  }

  /**
   * AUTHORIZATION CHECK:
   * Verify that a teacher is assigned to a specific subject in a class-section.
   * Returns true if the assignment exists, false otherwise.
   */
  static async isTeacherAuthorized(schoolCode, teacherId, className, section, subjectName, academicYear) {
    const TeacherSubjectAssignment = await this.getModel(schoolCode);
    const count = await TeacherSubjectAssignment.countDocuments({
      teacherId,
      className,
      section: section.toUpperCase(),
      subjectName,
      academicYear,
      status: 'active'
    });
    return count > 0;
  }

  /**
   * AUTHORIZATION CHECK (bulk):
   * Given a list of subject names, return only those the teacher is assigned to.
   */
  static async getAuthorizedSubjects(schoolCode, teacherId, className, section, academicYear, subjectNames) {
    const TeacherSubjectAssignment = await this.getModel(schoolCode);
    const assignments = await TeacherSubjectAssignment.find({
      teacherId,
      className,
      section: section.toUpperCase(),
      academicYear,
      status: 'active',
      subjectName: { $in: subjectNames }
    }).select('subjectName').lean();

    return assignments.map(a => a.subjectName);
  }

  /**
   * Get a teacher summary: all classes, sections, and subjects they teach.
   * Useful for teacher dashboard / login response.
   */
  static async getTeacherSummary(schoolCode, teacherId, academicYear) {
    const assignments = await this.getTeacherAssignments(schoolCode, teacherId, academicYear);

    // Group by class-section
    const classSectionMap = {};
    assignments.forEach(a => {
      const key = `${a.className}-${a.section}`;
      if (!classSectionMap[key]) {
        classSectionMap[key] = {
          className: a.className,
          section: a.section,
          subjects: []
        };
      }
      classSectionMap[key].subjects.push(a.subjectName);
    });

    return {
      totalAssignments: assignments.length,
      classSections: Object.values(classSectionMap),
      rawAssignments: assignments
    };
  }

  /**
   * Copy assignments from one academic year to another.
   * Useful when starting a new academic year.
   */
  static async copyAssignmentsToNewYear(schoolCode, fromYear, toYear, createdBy) {
    const TeacherSubjectAssignment = await this.getModel(schoolCode);
    const school = await School.findOne({ code: schoolCode });
    if (!school) throw new Error('School not found');

    const existingAssignments = await TeacherSubjectAssignment.find({
      academicYear: fromYear,
      status: 'active'
    }).lean();

    let copied = 0;
    let skipped = 0;
    const errors = [];

    for (const assignment of existingAssignments) {
      try {
        // Check if already exists in target year
        const exists = await TeacherSubjectAssignment.findOne({
          academicYear: toYear,
          className: assignment.className,
          section: assignment.section,
          subjectName: assignment.subjectName
        });

        if (exists) {
          skipped++;
          continue;
        }

        await this.createOrUpdateAssignment({
          schoolId: school._id,
          schoolCode,
          academicYear: toYear,
          className: assignment.className,
          section: assignment.section,
          subjectName: assignment.subjectName,
          teacherId: assignment.teacherId,
          teacherName: assignment.teacherName,
          teacherEmployeeId: assignment.teacherEmployeeId,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          createdBy,
          notes: `Copied from ${fromYear}`
        });
        copied++;
      } catch (err) {
        errors.push({ subject: assignment.subjectName, error: err.message });
      }
    }

    console.log(`📋 [TSA] Copied ${copied} assignments from ${fromYear} to ${toYear} (${skipped} skipped, ${errors.length} errors)`);
    return { copied, skipped, errors };
  }
}

module.exports = TeacherAssignmentService;
