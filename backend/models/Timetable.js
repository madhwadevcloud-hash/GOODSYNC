const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  timetableId: { type: String, unique: true }, // "NPS_TT_2024_8A_001"
  
  // Basic Information
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  schoolCode: { type: String, required: true },
  academicYear: { type: String, required: true }, // "2024-25"
  class: { type: String, required: true }, // "8"
  section: { type: String, required: true }, // "A"
  classSection: { type: String }, // "8A" - for easy querying
  
  // Effective Period
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date },
  status: { type: String, enum: ['active', 'draft', 'archived', 'suspended'], default: 'draft' },
  
  // Enhanced Weekly Schedule
  weeklySchedule: [{
    dayOfWeek: { type: String, required: true }, // "Monday", "Tuesday", etc.
    dayNumber: { type: Number }, // 1=Monday, 2=Tuesday, etc.
    isWorkingDay: { type: Boolean, default: true },
    
    periods: [{
      periodId: { type: String }, // "NPS_8A_MON_P1"
      periodNumber: { type: Number, required: true },
      
      // Time Information with tracking
      startTime: { type: String, required: true }, // "09:00"
      endTime: { type: String, required: true }, // "09:40"
      duration: { type: Number }, // 40 minutes
      
      // Subject Information
      subjectCode: { type: String },
      subjectName: { type: String },
      subjectType: { type: String, enum: ['core', 'elective', 'activity', 'study'], default: 'core' },
      
      // Teacher Information
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      teacherName: { type: String },
      teacherCode: { type: String },
      
      // Classroom Information
      classroom: {
        roomNumber: { type: String },
        roomType: { type: String, enum: ['classroom', 'laboratory', 'library', 'auditorium', 'playground'] },
        building: { type: String },
        floor: { type: Number },
        capacity: { type: Number },
        hasProjector: { type: Boolean, default: false },
        hasComputers: { type: Boolean, default: false },
        equipment: [String]
      },
      
      // Period Type
      periodType: { type: String, enum: ['regular', 'break', 'lunch', 'assembly', 'study', 'activity'], default: 'regular' },
      isBreak: { type: Boolean, default: false },
      
      // Special Instructions
      specialInstructions: { type: String },
      homework: { type: Boolean, default: false },
      assessment: { type: Boolean, default: false },
      
      // Real-time Status Tracking
      actualStartTime: { type: String },
      actualEndTime: { type: String },
      actualDuration: { type: Number },
      teacherPresent: { type: Boolean },
      studentsPresent: { type: Number },
      isCompleted: { type: Boolean, default: false },
      
      // Substitution Tracking
      substitution: {
        isSubstituted: { type: Boolean, default: false },
        originalTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        substituteTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        substituteTeacherName: { type: String },
        reason: { type: String },
        arrangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        arrangedAt: { type: Date }
      },
      
      // Period Notes
      periodNotes: [{
        note: { type: String },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
        type: { type: String, enum: ['general', 'absence', 'delay', 'cancellation'], default: 'general' }
      }]
    }],
    
    // Day Summary
    totalPeriods: { type: Number },
    totalWorkingHours: { type: Number },
    breaks: [{
      breakType: { type: String, enum: ['short_break', 'recess', 'lunch'] },
      startTime: { type: String },
      endTime: { type: String },
      duration: { type: Number }
    }]
  }],
  
  // Special Days Configuration
  specialDays: [{
    date: { type: Date },
    dayType: { type: String, enum: ['holiday', 'exam', 'event', 'half_day'] },
    description: { type: String },
    modifiedSchedule: {
      hasModification: { type: Boolean, default: false },
      periods: [mongoose.Schema.Types.Mixed] // Same structure as regular periods
    }
  }],
  
  // Exam Schedule Integration
  examSchedule: [{
    examDate: { type: Date },
    examType: { type: String, enum: ['unit_test', 'mid_term', 'final', 'practical'] },
    subjectCode: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    roomNumber: { type: String },
    invigilatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Statistics and Analytics
  analytics: {
    totalWorkingDays: { type: Number },
    totalHolidays: { type: Number },
    subjectWiseHours: [{
      subjectCode: { type: String },
      subjectName: { type: String },
      totalHours: { type: Number },
      completedHours: { type: Number, default: 0 },
      remainingHours: { type: Number },
      percentage: { type: Number }
    }],
    teacherWorkload: [{
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      teacherName: { type: String },
      totalPeriods: { type: Number },
      subjectsCount: { type: Number },
      averagePeriodsPerDay: { type: Number }
    }]
  },
  
  // Approval Workflow
  approval: {
    status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    comments: { type: String },
    rejectionReason: { type: String }
  },
  
  // Version Control
  version: { type: Number, default: 1 },
  previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' },
  changes: [{
    changeType: { type: String, enum: ['period_added', 'teacher_changed', 'time_modified', 'room_changed'] },
    description: { type: String },
    madeBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    madeAt: { type: Date, default: Date.now },
    affectedPeriods: [String] // Period IDs
  }],
  
  // Notifications
  notifications: {
    teachersNotified: { type: Boolean, default: false },
    parentsNotified: { type: Boolean, default: false },
    studentsNotified: { type: Boolean, default: false },
    notificationSentAt: { type: Date }
  },
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedAt: { type: Date },
  
  // Quick Access Fields
  totalSubjects: { type: Number },
  totalTeachers: { type: Number },
  workingDaysPerWeek: { type: Number },
  periodsPerDay: { type: Number },
  
  // Custom Fields
  customFields: { type: mongoose.Schema.Types.Mixed },
  tags: [String] // For categorization
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to generate timetableId and classSection
timetableSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate timetableId: "NPS_TT_2024_8A_001"
    const year = this.academicYear.split('-')[0];
    const classSection = `${this.class}${this.section}`;
    const timestamp = Date.now().toString().slice(-6);
    this.timetableId = `${this.schoolCode}_TT_${year}_${classSection}_${timestamp}`;
    
    // Set classSection for easy querying
    this.classSection = `${this.class}${this.section}`;
    
    // Generate period IDs
    this.weeklySchedule.forEach(day => {
      day.dayNumber = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        .indexOf(day.dayOfWeek.toLowerCase());
      
      day.periods.forEach(period => {
        if (!period.periodId) {
          period.periodId = `${this.schoolCode}_${this.classSection}_${day.dayOfWeek.substring(0, 3).toUpperCase()}_P${period.periodNumber}`;
        }
        
        // Calculate duration if not provided
        if (!period.duration && period.startTime && period.endTime) {
          const start = new Date(`2000-01-01 ${period.startTime}`);
          const end = new Date(`2000-01-01 ${period.endTime}`);
          period.duration = (end - start) / (1000 * 60); // Duration in minutes
        }
      });
    });
  }
  next();
});

// Calculate analytics before save
timetableSchema.pre('save', function(next) {
  this.totalSubjects = new Set(
    this.weeklySchedule.flatMap(day => 
      day.periods
        .filter(period => period.subjectCode) // Filter out null/undefined/empty subjectCode
        .map(period => period.subjectCode)
    )
  ).size;
  
  this.totalTeachers = new Set(
    this.weeklySchedule.flatMap(day => 
      day.periods
        .filter(period => period.teacherId) // Filter out null/undefined teacherId
        .map(period => period.teacherId.toString())
    )
  ).size;
  
  this.workingDaysPerWeek = this.weeklySchedule.filter(day => day.isWorkingDay).length;
  
  if (this.weeklySchedule.length > 0) {
    this.periodsPerDay = Math.max(...this.weeklySchedule.map(day => day.periods.length));
  }
  
  next();
});

// Indexes for performance
timetableSchema.index({ class: 1, section: 1, status: 1 });
timetableSchema.index({ schoolCode: 1, academicYear: 1 });
timetableSchema.index({ 'weeklySchedule.periods.teacherId': 1 });
timetableSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
timetableSchema.index({ classSection: 1, status: 1 });

// Static method to detect conflicts
timetableSchema.statics.detectConflicts = async function(schoolCode, academicYear, period) {
  const conflicts = await this.find({
    schoolCode,
    academicYear,
    status: 'active',
    'weeklySchedule.periods': {
      $elemMatch: {
        teacherId: period.teacherId,
        startTime: { $lt: period.endTime },
        endTime: { $gt: period.startTime }
      }
    }
  });
  
  return conflicts;
};

// Method to create substitute entry
timetableSchema.methods.createSubstitution = function(periodId, substituteTeacherId, reason, arrangedBy) {
  const period = this.weeklySchedule
    .flatMap(day => day.periods)
    .find(p => p.periodId === periodId);
    
  if (period) {
    period.substitution = {
      isSubstituted: true,
      originalTeacherId: period.teacherId,
      substituteTeacherId,
      reason,
      arrangedBy,
      arrangedAt: new Date()
    };
    
    return this.save();
  }
  
  throw new Error('Period not found');
};

module.exports = mongoose.model('Timetable', timetableSchema);
