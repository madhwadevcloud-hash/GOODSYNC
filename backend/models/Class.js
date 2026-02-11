const mongoose = require('mongoose');
const { gradeSystem, gradeUtils } = require('../utils/gradeSystem');

// Enhanced Class Model with Grade System Integration
const classSchema = new mongoose.Schema({
  // Basic Information
  classId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Grade Information
  grade: {
    type: String,
    required: true,
    enum: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  },
  
  section: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  },
  
  className: {
    type: String,
    required: true,
    // Auto-generated as grade + section (e.g., "8A", "10B")
  },
  
  // School Information
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true 
  },
  schoolCode: {
    type: String,
    required: true
  },
  
  academicYear: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/
  },
  
  // Level Information (auto-populated from grade)
  level: {
    type: String,
    enum: ['elementary', 'middle', 'high', 'higherSecondary']
  },
  
  // Stream Information (for grades 11-12)
  stream: {
    type: String,
    enum: ['Science', 'Commerce', 'Arts', 'Vocational'],
    required: function() {
      return ['11', '12'].includes(this.grade);
    }
  },
  
  // Class Teacher
  classTeacher: {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    teacherName: String,
    employeeId: String,
    assignedDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Student Management
  students: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentName: String,
    rollNumber: {
      type: String,
      required: true
    },
    admissionNumber: String,
    joinedDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Grade-specific information
    electives: [String], // For higher grades
    previousGrade: String,
    promotionStatus: {
      type: String,
      enum: ['promoted', 'detained', 'transferred', 'pending'],
      default: 'promoted'
    }
  }],
  
  // Subject Management
  subjects: [{
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    subjectName: {
      type: String,
      required: true
    },
    subjectCode: String,
    teacher: {
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      teacherName: String,
      employeeId: String
    },
    // Teaching schedule
    periodsPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    isCore: {
      type: Boolean,
      default: true
    },
    isOptional: {
      type: Boolean,
      default: false
    },
    // Assessment information
    maxMarks: {
      type: Number,
      default: 100
    },
    passingMarks: {
      type: Number,
      default: 33
    }
  }],
  
  // Classroom Information
  classroom: {
    roomNumber: String,
    building: String,
    floor: String,
    capacity: Number,
    facilities: [String], // ['Smart Board', 'Projector', 'Air Conditioner']
  },
  
  // Capacity Management
  capacity: {
    maxStudents: {
      type: Number,
      required: true
    },
    currentStrength: {
      type: Number,
      default: 0
    }
  },
  
  // Schedule Information
  schedule: [{
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    periods: [{
      period: Number,
      subject: String,
      teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      startTime: String,
      endTime: String,
      room: String
    }]
  }],
  
  // Performance Tracking
  performance: {
    averageAttendance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    academicPerformance: {
      averageMarks: Number,
      passPercentage: Number,
      topPerformers: [{
        studentId: mongoose.Schema.Types.ObjectId,
        studentName: String,
        percentage: Number,
        rank: Number
      }]
    }
  },
  
  // Special Features based on Grade Level
  levelSpecificFeatures: {
    // Elementary features
    playTime: {
      type: Boolean,
      default: function() {
        return gradeUtils.getGradeLevel(this.grade) === 'elementary';
      }
    },
    
    // Middle school features
    subjectRotation: {
      type: Boolean,
      default: function() {
        return gradeUtils.getGradeLevel(this.grade) === 'middle';
      }
    },
    
    // High school features
    boardPreparation: {
      type: Boolean,
      default: function() {
        return ['9', '10'].includes(this.grade);
      }
    },
    
    // Higher secondary features
    streamSpecialization: {
      type: Boolean,
      default: function() {
        return ['11', '12'].includes(this.grade);
      }
    }
  },
  
  // Class settings
  settings: {
    isActive: { type: Boolean, default: true },
    allowAdmissions: { type: Boolean, default: true },
    maxStudents: { type: Number, default: 40 }
  },
  
  // Administrative Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full class name
classSchema.virtual('fullClassName').get(function() {
  return `${this.grade}-${this.section}`;
});

// Indexes for better performance
classSchema.index({ schoolCode: 1, grade: 1, section: 1, academicYear: 1 }, { unique: true });
classSchema.index({ schoolId: 1, 'settings.isActive': 1 });
classSchema.index({ 'classTeacher.teacherId': 1 });
classSchema.index({ 'students.studentId': 1 });
classSchema.index({ grade: 1, level: 1 });

// Pre-save middleware
classSchema.pre('save', async function(next) {
  // Auto-generate className
  this.className = this.grade + this.section;
  
  // Auto-populate level from grade
  this.level = gradeUtils.getGradeLevel(this.grade);
  
  // Update current strength
  this.capacity.currentStrength = this.students.filter(s => s.isActive).length;
  
  // Set max students based on grade
  if (!this.capacity.maxStudents) {
    const gradeInfo = gradeSystem.gradeStructure[this.grade];
    this.capacity.maxStudents = gradeInfo?.maxStudentsPerSection || 35;
  }
  
  next();
});

// Instance methods
classSchema.methods.addStudent = function(studentData) {
  if (this.capacity.currentStrength >= this.capacity.maxStudents) {
    throw new Error('Class is at full capacity');
  }
  
  // Check if student already exists
  const existingStudent = this.students.find(s => 
    s.studentId.toString() === studentData.studentId.toString()
  );
  
  if (existingStudent) {
    throw new Error('Student already exists in this class');
  }
  
  this.students.push({
    ...studentData,
    joinedDate: new Date(),
    isActive: true
  });
  
  return this.save();
};

classSchema.methods.getGradeInfo = function() {
  return gradeSystem.gradeStructure[this.grade];
};

classSchema.methods.getGradingSystem = function() {
  return gradeUtils.getGradingSystem(this.grade);
};

classSchema.methods.getSubjectsForGrade = function() {
  return gradeUtils.getSubjectsForGrade(this.grade, this.stream);
};

// Static methods
classSchema.statics.createClassWithGradeInfo = async function(classData) {
  const gradeInfo = gradeSystem.gradeStructure[classData.grade];
  
  if (!gradeInfo) {
    throw new Error('Invalid grade specified');
  }
  
  // Get subjects for the grade
  const subjects = gradeUtils.getSubjectsForGrade(classData.grade, classData.stream);
  
  const newClass = new this({
    ...classData,
    level: gradeUtils.getGradeLevel(classData.grade),
    capacity: {
      maxStudents: gradeInfo.maxStudentsPerSection || 35,
      currentStrength: 0
    },
    subjects: subjects.map(subject => ({
      subjectName: subject,
      periodsPerWeek: 4, // Default
      isCore: true
    }))
  });
  
  return newClass.save();
};

classSchema.statics.getClassesByLevel = function(schoolCode, level, academicYear) {
  return this.find({
    schoolCode,
    level,
    academicYear,
    'settings.isActive': true
  }).sort({ grade: 1, section: 1 });
};

module.exports = mongoose.model('Class', classSchema);
