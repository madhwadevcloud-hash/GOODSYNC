const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  schoolCode: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  subject: { type: String, required: true },
  class: { type: String, required: true },
  section: { type: String, required: true },
  teacher: { type: String, required: true }, // Store teacher userId
  teacherName: { type: String },
  
  // Assignment details
  startDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  instructions: String,
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    cloudinaryPublicId: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Status and tracking
  status: { 
    type: String, 
    enum: ['draft', 'active', 'completed', 'archived'], 
    default: 'draft' 
  },
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  
  // Student submissions tracking
  totalStudents: { type: Number, default: 0 },
  submittedCount: { type: Number, default: 0 },
  gradedCount: { type: Number, default: 0 },
  
  // Academic year and term
  academicYear: { type: String, required: true },
  term: { type: String, default: 'Term 1' },
  
  // Assignment ID (unique identifier)
  assignmentId: { type: String },
  
  // Created and updated by
  createdBy: { type: String, required: true },
  createdByName: { type: String },
  updatedBy: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  collection: 'assignments', // Explicitly set collection name
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for submission percentage
assignmentSchema.virtual('submissionPercentage').get(function() {
  if (this.totalStudents === 0) return 0;
  return Math.round((this.submittedCount / this.totalStudents) * 100);
});

// Virtual for days until due
assignmentSchema.virtual('daysUntilDue').get(function() {
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for assignment status
assignmentSchema.virtual('assignmentStatus').get(function() {
  if (this.status === 'completed') return 'completed';
  if (this.status === 'archived') return 'archived';
  
  const daysUntilDue = this.daysUntilDue;
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'due-soon';
  return 'active';
});

// Index for better query performance
assignmentSchema.index({ schoolId: 1, status: 1 });
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ class: 1, section: 1 });
assignmentSchema.index({ subject: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ academicYear: 1, term: 1 });

/**
 * Multi-tenant Assignment Model
 * Provides school-specific assignment models using different database connections
 */
class AssignmentMultiTenant {
  /**
   * Get or create an Assignment model for a specific school connection
   * @param {mongoose.Connection} connection - The school-specific database connection
   * @returns {mongoose.Model} - The Assignment model for this connection
   */
  static getModelForConnection(connection) {
    // Check if model already exists for this connection
    if (connection.models.Assignment) {
      return connection.models.Assignment;
    }
    
    // Create and return new model for this connection
    return connection.model('Assignment', assignmentSchema);
  }
  
  /**
   * Get the schema (useful for creating models in other places)
   * @returns {mongoose.Schema} - The assignment schema
   */
  static getSchema() {
    return assignmentSchema;
  }
}

module.exports = AssignmentMultiTenant;
