const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  attendanceId: { type: String, unique: true }, // "NPS_ATT_20240821_8A_001"
  
  // Basic Information
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  schoolCode: { type: String, required: true },
  studentId: { type: String, required: true }, // Changed from ObjectId to String to match userId format (e.g., "P-S-0997")
  studentName: { type: String, required: true },
  studentRollNumber: { type: String },
  class: { type: String, required: true },
  section: { type: String, required: true },
  academicYear: { type: String, required: true },
  
  // Date and Time Tracking
  date: { type: Date, required: true },
  dayOfWeek: { type: String }, // "Monday", "Tuesday", etc.
  academicWeek: { type: Number }, // Week number in academic year
  
  // Attendance Status
  status: { 
    type: String, 
    enum: ['present', 'absent', 'late', 'half_day', 'medical_leave', 'authorized_leave'], 
    required: true 
  },
  attendanceType: { type: String, enum: ['daily', 'period_wise'], default: 'daily' },
  
  // Enhanced Time Tracking
  timeTracking: {
    schoolStartTime: { type: String, default: '08:00' },
    schoolEndTime: { type: String, default: '15:30' },
    
    checkIn: {
      time: { type: String },
      timestamp: { type: Date },
      method: { type: String, enum: ['manual', 'rfid', 'biometric', 'app'], default: 'manual' },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      deviceId: { type: String },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
      }
    },
    
    checkOut: {
      time: { type: String },
      timestamp: { type: Date },
      method: { type: String, enum: ['manual', 'rfid', 'biometric', 'app'], default: 'manual' },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      deviceId: { type: String },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
      }
    },
    
    // Period-wise attendance tracking
    periods: [{
      periodNumber: { type: Number },
      subjectCode: { type: String },
      subjectName: { type: String },
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      teacherName: { type: String },
      startTime: { type: String },
      endTime: { type: String },
      status: { type: String, enum: ['present', 'absent', 'late'] },
      markedAt: { type: Date },
      markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      remarks: { type: String }
    }],
    
    totalHoursPresent: { type: Number, default: 0 },
    totalPeriodsPresent: { type: Number, default: 0 },
    totalPeriodsScheduled: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 }
  },
  
  // Leave Information (if absent)
  leaveDetails: {
    leaveType: { 
      type: String, 
      enum: ['sick', 'casual', 'medical', 'emergency', 'bereavement', 'family_function'] 
    },
    reason: { type: String },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Student/Parent who applied
    appliedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    leaveFrom: { type: Date },
    leaveTo: { type: Date },
    medicalCertificate: { type: String }, // Document URL
    supportingDocuments: [String]
  },
  
  // Late Information
  lateDetails: {
    lateBy: { type: Number }, // Minutes late
    reason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    penaltyApplied: { type: Boolean, default: false },
    penaltyDetails: { type: String }
  },
  
  // Weather and External Factors
  contextualInfo: {
    weather: { type: String, enum: ['clear', 'rainy', 'stormy', 'foggy'] },
    schoolEvent: { type: String }, // "sports_day", "exam", "holiday"
    transportIssue: { type: Boolean, default: false },
    emergencyDrill: { type: Boolean, default: false }
  },
  
  // Teacher Notes
  teacherNotes: [{
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teacherName: { type: String },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
    subject: { type: String }
  }],
  
  // Parent Communication
  parentNotification: {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    method: { type: String, enum: ['sms', 'email', 'app', 'phone'] },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    parentResponse: { type: String }
  },
  
  // Modifications and Audit
  modifications: [{
    field: { type: String },
    oldValue: { type: String },
    newValue: { type: String },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modifiedAt: { type: Date, default: Date.now },
    reason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Status
  isLocked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date },
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedAt: { type: Date },
  
  // Indexing helpers
  monthYear: { type: String }, // "2024-08" for quick monthly queries
  weekStartDate: { type: Date }, // For weekly reports
  isWorkingDay: { type: Boolean, default: true },
  isExamDay: { type: Boolean, default: false },
  isHoliday: { type: Boolean, default: false }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to generate attendanceId and monthYear
attendanceSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate attendanceId: "NPS_ATT_20240821_8A_001"
    const dateStr = this.date.toISOString().slice(0, 10).replace(/-/g, '');
    const classSection = `${this.class}${this.section}`;
    const timestamp = Date.now().toString().slice(-6);
    this.attendanceId = `${this.schoolCode}_ATT_${dateStr}_${classSection}_${timestamp}`;
    
    // Generate monthYear for indexing
    this.monthYear = `${this.date.getFullYear()}-${String(this.date.getMonth() + 1).padStart(2, '0')}`;
    
    // Set dayOfWeek
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.dayOfWeek = days[this.date.getDay()];
    
    // Calculate week start date
    const weekStart = new Date(this.date);
    weekStart.setDate(this.date.getDate() - this.date.getDay());
    this.weekStartDate = weekStart;
  }
  next();
});

// Calculate attendance percentage before save
attendanceSchema.pre('save', function(next) {
  if (this.timeTracking && this.timeTracking.totalPeriodsScheduled > 0) {
    this.timeTracking.attendancePercentage = 
      (this.timeTracking.totalPeriodsPresent / this.timeTracking.totalPeriodsScheduled) * 100;
  }
  next();
});

// Indexes for performance
attendanceSchema.index({ date: 1, class: 1, section: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ monthYear: 1 });
attendanceSchema.index({ schoolCode: 1, academicYear: 1 });
attendanceSchema.index({ 'timeTracking.periods.teacherId': 1, date: 1 });
attendanceSchema.index({ weekStartDate: 1 });

// Static method to generate attendance statistics
attendanceSchema.statics.getAttendanceStats = async function(filters) {
  return this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          class: '$class',
          section: '$section',
          month: '$monthYear'
        },
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
          }
        },
        absentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
          }
        },
        lateDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        class: '$_id.class',
        section: '$_id.section',
        month: '$_id.month',
        totalDays: 1,
        presentDays: 1,
        absentDays: 1,
        lateDays: 1,
        attendancePercentage: {
          $multiply: [
            { $divide: ['$presentDays', '$totalDays'] },
            100
          ]
        }
      }
    }
  ]);
};

// Method to send parent notification
attendanceSchema.methods.sendParentNotification = async function(method = 'sms') {
  // Implementation for sending notifications
  this.parentNotification.sent = true;
  this.parentNotification.sentAt = new Date();
  this.parentNotification.method = method;
  return this.save();
};

// Virtual for attendance percentage
attendanceSchema.virtual('attendancePercentage').get(function() {
  const present = this.presentCount + this.lateCount + (this.halfDayCount * 0.5);
  return Math.round((present / this.totalStudents) * 100);
});

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Compound index for unique attendance per student-date (one record per student per date)
attendanceSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ schoolId: 1, class: 1, section: 1, date: 1 }); // Non-unique index for queries
attendanceSchema.index({ schoolId: 1, academicYear: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ 'records.student': 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
