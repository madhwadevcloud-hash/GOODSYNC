const mongoose = require('mongoose');

/**
 * TeacherSubjectAssignment Model
 * 
 * SINGLE SOURCE OF TRUTH for teacher-subject ownership across the entire ERP.
 * 
 * This collection stores all teacher-to-subject assignments, scoped by:
 *   - School (schoolId)
 *   - Academic Year (academicYear)
 *   - Class (className / classId)
 *   - Section
 *   - Subject (subjectName)
 * 
 * Designed to be consumed by: Results, Timetable, Attendance, Homework,
 * Lesson Plans, Exam Scheduling, Report Cards, and any future module
 * that needs to know "which teacher owns which subject for which class."
 * 
 * Key constraints:
 *   - Unique per (schoolId + academicYear + className + section + subjectName)
 *   - One teacher per class-section-subject per academic year
 *   - A teacher CAN handle multiple subjects, classes, and sections
 *   - Historical data preserved across academic years (no overwrites)
 */
const teacherSubjectAssignmentSchema = new mongoose.Schema({
  // Unique identifier
  assignmentId: {
    type: String,
    required: true,
    unique: true
  },

  // School reference
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },

  schoolCode: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },

  // Academic Year (e.g., "2025-26" or "2025-2026")
  academicYear: {
    type: String,
    required: true,
    index: true
  },

  // Class identification
  classId: {
    type: String,
    default: null
    // Optional ObjectId or string reference to the Class/ClassSubjects document
  },

  className: {
    type: String,
    required: true
    // e.g., "1", "2", "8", "10", "LKG", etc.
  },

  // Section
  section: {
    type: String,
    required: true,
    uppercase: true
    // e.g., "A", "B", "C"
  },

  // Subject identification
  subjectName: {
    type: String,
    required: true,
    trim: true
    // e.g., "Mathematics", "English", "Science"
  },

  subjectId: {
    type: String,
    default: null
    // Optional reference to Subject collection
  },

  // Teacher reference
  teacherId: {
    type: String,
    required: true,
    index: true
    // The userId or _id of the teacher in the school's users collection
  },

  teacherObjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
    // Optional ObjectId reference for population
  },

  teacherName: {
    type: String,
    required: true
    // Denormalized for display convenience
  },

  teacherEmployeeId: {
    type: String,
    default: null
    // e.g., "NPS_TEA001"
  },

  // Assignment status
  status: {
    type: String,
    enum: ['active', 'inactive', 'transferred', 'revoked'],
    default: 'active',
    index: true
  },

  // Audit fields
  createdBy: {
    type: String,
    required: true
    // userId of the admin who created this assignment
  },

  updatedBy: {
    type: String,
    default: null
    // userId of the admin who last updated this assignment
  },

  // Reason for last status change
  statusChangeReason: {
    type: String,
    default: null
  },

  // Notes
  notes: {
    type: String,
    default: null,
    maxlength: 500
  }
}, {
  timestamps: true, // createdAt, updatedAt
  collection: 'teachersubjectassignments',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// =============================================
// INDEXES
// =============================================

// PRIMARY UNIQUENESS CONSTRAINT:
// Only one active assignment per (school + academicYear + class + section + subject)
teacherSubjectAssignmentSchema.index(
  {
    schoolId: 1,
    academicYear: 1,
    className: 1,
    section: 1,
    subjectName: 1
  },
  {
    unique: true,
    name: 'unique_class_section_subject_per_year'
  }
);

// Query by teacher - "What does this teacher teach?"
teacherSubjectAssignmentSchema.index(
  { schoolId: 1, teacherId: 1, academicYear: 1, status: 1 },
  { name: 'teacher_assignments_lookup' }
);

// Query by school and academic year - "All assignments this year"
teacherSubjectAssignmentSchema.index(
  { schoolCode: 1, academicYear: 1, status: 1 },
  { name: 'school_year_assignments' }
);

// Query by class-section - "Who teaches what in this class?"
teacherSubjectAssignmentSchema.index(
  { schoolId: 1, className: 1, section: 1, academicYear: 1, status: 1 },
  { name: 'class_section_assignments' }
);

// =============================================
// PRE-SAVE MIDDLEWARE
// =============================================
teacherSubjectAssignmentSchema.pre('save', function (next) {
  // Auto-generate assignmentId if not set
  if (!this.assignmentId) {
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.assignmentId = `TSA_${this.schoolCode}_${this.className}_${this.section}_${rand}_${ts}`;
  }

  // Normalize section to uppercase
  if (this.section) {
    this.section = this.section.toUpperCase();
  }

  next();
});

// =============================================
// STATIC METHODS
// =============================================

/**
 * Get all active assignments for a specific teacher in the current academic year
 */
teacherSubjectAssignmentSchema.statics.getTeacherAssignments = function (schoolId, teacherId, academicYear) {
  return this.find({
    schoolId,
    teacherId,
    academicYear,
    status: 'active'
  }).sort({ className: 1, section: 1, subjectName: 1 });
};

/**
 * Get all active assignments for a class-section in the current academic year
 */
teacherSubjectAssignmentSchema.statics.getClassAssignments = function (schoolId, className, section, academicYear) {
  return this.find({
    schoolId,
    className,
    section,
    academicYear,
    status: 'active'
  }).sort({ subjectName: 1 });
};

/**
 * Check if a teacher is assigned to a specific subject in a class-section
 * Returns the assignment document if found, null otherwise
 */
teacherSubjectAssignmentSchema.statics.verifyTeacherAssignment = async function (
  schoolId,
  teacherId,
  className,
  section,
  subjectName,
  academicYear
) {
  return this.findOne({
    schoolId,
    teacherId,
    className,
    section,
    subjectName,
    academicYear,
    status: 'active'
  });
};

/**
 * Get all subjects a teacher is assigned to for a specific class-section
 */
teacherSubjectAssignmentSchema.statics.getTeacherSubjectsForClass = function (
  schoolId,
  teacherId,
  className,
  section,
  academicYear
) {
  return this.find({
    schoolId,
    teacherId,
    className,
    section,
    academicYear,
    status: 'active'
  }).select('subjectName subjectId');
};

/**
 * Bulk check: given a list of subject names, return which ones the teacher owns
 */
teacherSubjectAssignmentSchema.statics.getTeacherOwnedSubjects = async function (
  schoolId,
  teacherId,
  className,
  section,
  academicYear,
  subjectNames
) {
  const assignments = await this.find({
    schoolId,
    teacherId,
    className,
    section,
    academicYear,
    status: 'active',
    subjectName: { $in: subjectNames }
  }).select('subjectName');

  return assignments.map(a => a.subjectName);
};

// =============================================
// INSTANCE METHODS
// =============================================

/**
 * Deactivate this assignment (soft delete)
 */
teacherSubjectAssignmentSchema.methods.deactivate = function (updatedBy, reason) {
  this.status = 'inactive';
  this.updatedBy = updatedBy;
  this.statusChangeReason = reason || 'Deactivated by admin';
  return this.save();
};

/**
 * Reassign to a different teacher
 */
teacherSubjectAssignmentSchema.methods.reassign = function (newTeacherId, newTeacherName, newTeacherEmployeeId, updatedBy) {
  this.teacherId = newTeacherId;
  this.teacherName = newTeacherName;
  this.teacherEmployeeId = newTeacherEmployeeId || null;
  this.updatedBy = updatedBy;
  this.statusChangeReason = `Reassigned from previous teacher`;
  return this.save();
};

const TeacherSubjectAssignment = mongoose.model('TeacherSubjectAssignment', teacherSubjectAssignmentSchema);

module.exports = TeacherSubjectAssignment;
