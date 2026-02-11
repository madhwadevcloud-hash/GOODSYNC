const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Submission content
  submissionText: String,
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Submission details
  submittedAt: { type: Date, default: Date.now },
  isLateSubmission: { type: Boolean, default: false },
  
  // Grading
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned'],
    default: 'submitted'
  },
  grade: Number,
  maxMarks: Number,
  feedback: String,
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: Date,
  
  // Version control for resubmissions
  version: { type: Number, default: 1 },
  previousVersions: [{
    submissionText: String,
    attachments: Array,
    submittedAt: Date,
    version: Number
  }]
}, {
  timestamps: true
});

// Compound index for efficient queries
submissionSchema.index({ assignmentId: 1, studentId: 1 });
submissionSchema.index({ schoolId: 1, assignmentId: 1 });
submissionSchema.index({ studentId: 1, submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
