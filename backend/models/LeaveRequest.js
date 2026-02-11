const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  // Teacher Information
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teacherUserId: {
    type: String,
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  teacherEmail: {
    type: String,
    required: true
  },
  
  // School Information
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
  
  // Leave Request Details
  subjectLine: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  numberOfDays: {
    type: Number,
    default: 1
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  
  // Admin Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedByName: {
    type: String
  },
  reviewedAt: {
    type: Date
  },
  adminComments: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
leaveRequestSchema.index({ teacherId: 1, createdAt: -1 });
leaveRequestSchema.index({ schoolCode: 1, status: 1, createdAt: -1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook to calculate numberOfDays
leaveRequestSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    this.numberOfDays = diffDays;
  }
  next();
});

// Instance method to approve leave request
leaveRequestSchema.methods.approve = function(adminId, adminName, comments) {
  this.status = 'approved';
  this.reviewedBy = adminId;
  this.reviewedByName = adminName;
  this.reviewedAt = new Date();
  if (comments) {
    this.adminComments = comments;
  }
  return this.save();
};

// Instance method to reject leave request
leaveRequestSchema.methods.reject = function(adminId, adminName, comments) {
  this.status = 'rejected';
  this.reviewedBy = adminId;
  this.reviewedByName = adminName;
  this.reviewedAt = new Date();
  if (comments) {
    this.adminComments = comments;
  }
  return this.save();
};

// Static method to get pending requests for a school
leaveRequestSchema.statics.getPendingBySchool = function(schoolCode) {
  return this.find({ 
    schoolCode: schoolCode.toUpperCase(), 
    status: 'pending' 
  })
    .sort({ createdAt: -1 })
    .populate('teacherId', 'name email userId');
};

// Static method to get requests by status
leaveRequestSchema.statics.getByStatus = function(schoolCode, status) {
  return this.find({ schoolCode: schoolCode.toUpperCase(), status })
    .sort({ createdAt: -1 })
    .populate('teacherId', 'name email userId');
};

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;
module.exports.schema = leaveRequestSchema;
