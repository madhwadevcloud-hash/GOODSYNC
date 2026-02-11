const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: String, required: true },
  section: { type: String, required: true },
  academicYear: { type: String, required: true },
  term: { type: String, required: true }, // Term 1, Term 2, Final
  
  // Subject-wise results
  subjects: [{
    name: { type: String, required: true },
    theoryMarks: { type: Number, default: 0 },
    practicalMarks: { type: Number, default: 0 },
    projectMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    remarks: String
  }],
  
  // Overall results
  totalMarks: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, required: true },
  rank: Number,
  totalStudents: Number,
  
  // Attendance and other factors
  attendancePercentage: { type: Number, default: 0 },
  conductGrade: { type: String, default: 'A' },
  remarks: String,
  
  // Result status
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Created and updated by
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for result status
resultSchema.virtual('resultStatus').get(function() {
  if (this.percentage >= 90) return 'Outstanding';
  if (this.percentage >= 80) return 'Excellent';
  if (this.percentage >= 70) return 'Very Good';
  if (this.percentage >= 60) return 'Good';
  if (this.percentage >= 50) return 'Satisfactory';
  if (this.percentage >= 40) return 'Pass';
  return 'Fail';
});

// Virtual for grade point average
resultSchema.virtual('gradePointAverage').get(function() {
  const gradePoints = {
    'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0
  };
  
  let totalPoints = 0;
  let totalSubjects = 0;
  
  this.subjects.forEach(subject => {
    if (gradePoints[subject.grade] !== undefined) {
      totalPoints += gradePoints[subject.grade];
      totalSubjects++;
    }
  });
  
  return totalSubjects > 0 ? (totalPoints / totalSubjects).toFixed(2) : 0;
});

// Compound index for unique result per student-term
resultSchema.index({ schoolId: 1, student: 1, academicYear: 1, term: 1 }, { unique: true });
resultSchema.index({ schoolId: 1, class: 1, section: 1 });
resultSchema.index({ academicYear: 1, term: 1 });
resultSchema.index({ status: 1 });

// Explicitly set the collection name to 'results'
const Result = mongoose.model('Result', resultSchema, 'results');

module.exports = Result;
