const mongoose = require('mongoose');
const { gradeSystem, gradeUtils } = require('../utils/gradeSystem');

// Enhanced Subject Model with Teacher Assignment and Grade Integration
const subjectSchema = new mongoose.Schema({
  // Basic Information
  subjectId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Subject Details
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  
  subjectCode: {
    type: String,
    required: true,
    uppercase: true,
    unique: true
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
  
  // Grade and Level Information
  applicableGrades: [{
    grade: {
      type: String,
      required: true,
      enum: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    },
    level: {
      type: String,
      enum: ['elementary', 'middle', 'high', 'higherSecondary']
    },
    isCore: {
      type: Boolean,
      default: true
    },
    isOptional: {
      type: Boolean,
      default: false
    },
    streams: [{
      type: String,
      enum: ['Science', 'Commerce', 'Arts', 'Vocational']
    }] // For grades 11-12
  }],
  
  // Subject Classification
  subjectType: {
    type: String,
    enum: ['academic', 'activity', 'language', 'science', 'mathematics', 'social_studies', 'arts', 'physical_education', 'moral_science'],
    required: true
  },
  
  category: {
    type: String,
    enum: ['core', 'elective', 'additional', 'co_curricular'],
    default: 'core'
  },
  
  // Academic Configuration
  academicDetails: {
    totalMarks: {
      type: Number,
      default: 100
    },
    passingMarks: {
      type: Number,
      default: 33
    },
    theoryMarks: {
      type: Number,
      default: 70
    },
    practicalMarks: {
      type: Number,
      default: 30
    },
    hasPractical: {
      type: Boolean,
      default: false
    },
    hasProject: {
      type: Boolean,
      default: false
    },
    projectMarks: {
      type: Number,
      default: 0
    }
  },
  
  // Teacher Assignments
  teacherAssignments: [{
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    teacherName: {
      type: String,
      required: true
    },
    employeeId: {
      type: String,
      required: true
    },
    
    // Assignment Details
    assignedGrades: [{
      type: String,
      enum: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    }],
    
    assignedClasses: [{
      classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
      },
      className: String, // "8A", "9B"
      grade: String,
      section: String,
      stream: String, // For higher grades
      periodsPerWeek: {
        type: Number,
        min: 1,
        max: 10,
        default: 4
      }
    }],
    
    // Role in Subject
    role: {
      type: String,
      enum: ['primary_teacher', 'secondary_teacher', 'substitute_teacher', 'lab_assistant'],
      default: 'primary_teacher'
    },
    
    isPrimaryTeacher: {
      type: Boolean,
      default: false
    },
    
    // Workload
    totalPeriodsPerWeek: {
      type: Number,
      default: 0
    },
    
    maxWorkload: {
      type: Number,
      default: 25 // Maximum periods per week
    },
    
    // Assignment History
    assignmentHistory: {
      assignedDate: {
        type: Date,
        default: Date.now
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      academicYear: {
        type: String,
        required: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      endDate: Date,
      reason: String // Reason for ending assignment
    },
    
    // Performance Metrics
    performance: {
      averageClassPerformance: Number,
      averageAttendance: Number,
      studentFeedbackRating: Number,
      parentFeedbackRating: Number,
      lastReviewDate: Date
    }
  }],
  
  // Curriculum Information
  curriculum: {
    description: {
      type: String,
      maxlength: 1000
    },
    objectives: [String],
    learningOutcomes: [String],
    
    // Curriculum by Grade
    gradeWiseCurriculum: [{
      grade: String,
      syllabus: {
        chapters: [{
          chapterNumber: Number,
          chapterName: String,
          topics: [String],
          estimatedHours: Number,
          difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium'
          }
        }],
        totalChapters: Number,
        totalHours: Number
      },
      assessmentPattern: {
        periodicTests: Number,
        assignments: Number,
        projects: Number,
        practicals: Number
      }
    }],
    
    // Resources
    textbooks: [{
      title: String,
      author: String,
      publisher: String,
      isbn: String,
      edition: String,
      applicableGrades: [String]
    }],
    
    referenceBooks: [{
      title: String,
      author: String,
      publisher: String,
      applicableGrades: [String]
    }],
    
    onlineResources: [{
      title: String,
      url: String,
      type: String, // 'video', 'article', 'interactive'
      applicableGrades: [String]
    }]
  },
  
  // Prerequisites and Dependencies
  prerequisites: {
    requiredSubjects: [{
      subjectId: mongoose.Schema.Types.ObjectId,
      subjectName: String,
      minimumGrade: String
    }],
    recommendedSubjects: [{
      subjectId: mongoose.Schema.Types.ObjectId,
      subjectName: String
    }]
  },
  
  // Equipment and Resources Required
  resources: {
    classroom: {
      type: String,
      enum: ['regular', 'laboratory', 'computer_lab', 'art_room', 'music_room', 'gymnasium'],
      default: 'regular'
    },
    
    equipment: [{
      itemName: String,
      quantity: Number,
      isEssential: Boolean,
      alternativeOptions: [String]
    }],
    
    software: [{
      name: String,
      version: String,
      license: String,
      applicableGrades: [String]
    }],
    
    consumables: [{
      itemName: String,
      quantityPerStudent: Number,
      unit: String,
      costPerUnit: Number
    }]
  },
  
  // Assessment Configuration
  assessmentConfig: {
    assessmentTypes: [{
      type: String, // 'written', 'oral', 'practical', 'project', 'assignment'
      weightage: Number,
      frequency: String, // 'weekly', 'monthly', 'quarterly'
      maxMarks: Number
    }],
    
    gradingScheme: {
      type: String,
      enum: ['percentage', 'letter_grade', 'gpa', 'descriptive'],
      default: 'percentage'
    },
    
    passingCriteria: {
      overallPassing: Number,
      theoryPassing: Number,
      practicalPassing: Number,
      attendanceRequirement: Number // Minimum attendance percentage
    }
  },
  
  // Status and Settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  isElective: {
    type: Boolean,
    default: false
  },
  
  maxStudentsPerClass: {
    type: Number,
    default: 40
  },
  
  minStudentsToRun: {
    type: Number,
    default: 5 // Minimum students required to run elective
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
  },
  
  academicYear: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
subjectSchema.index({ schoolCode: 1, subjectCode: 1, academicYear: 1 }, { unique: true });
subjectSchema.index({ schoolCode: 1, isActive: 1 });
subjectSchema.index({ 'applicableGrades.grade': 1, 'applicableGrades.level': 1 });
subjectSchema.index({ 'teacherAssignments.teacherId': 1 });
subjectSchema.index({ subjectType: 1, category: 1 });

// Virtual for total teachers assigned
subjectSchema.virtual('totalTeachersAssigned').get(function() {
  return this.teacherAssignments.filter(assignment => 
    assignment.assignmentHistory.isActive
  ).length;
});

// Virtual for total classes covered
subjectSchema.virtual('totalClassesCovered').get(function() {
  let totalClasses = 0;
  this.teacherAssignments.forEach(assignment => {
    if (assignment.assignmentHistory.isActive) {
      totalClasses += assignment.assignedClasses.length;
    }
  });
  return totalClasses;
});

// Pre-save middleware
subjectSchema.pre('save', async function(next) {
  // Auto-generate subject ID if not provided
  if (!this.subjectId) {
    this.subjectId = `${this.schoolCode}_SUB_${this.subjectCode}_${Date.now()}`;
  }
  
  // Auto-populate level for applicable grades
  this.applicableGrades.forEach(gradeInfo => {
    gradeInfo.level = gradeUtils.getGradeLevel(gradeInfo.grade);
  });
  
  // Calculate total periods for each teacher
  this.teacherAssignments.forEach(assignment => {
    assignment.totalPeriodsPerWeek = assignment.assignedClasses.reduce(
      (total, classInfo) => total + classInfo.periodsPerWeek, 0
    );
  });
  
  next();
});

// Instance Methods
subjectSchema.methods.assignTeacher = function(teacherData, classAssignments, assignedBy) {
  // Check if teacher is already assigned
  const existingAssignment = this.teacherAssignments.find(assignment => 
    assignment.teacherId.toString() === teacherData.teacherId.toString() &&
    assignment.assignmentHistory.isActive
  );
  
  if (existingAssignment) {
    throw new Error('Teacher is already assigned to this subject');
  }
  
  // Create new assignment
  const newAssignment = {
    teacherId: teacherData.teacherId,
    teacherName: teacherData.teacherName,
    employeeId: teacherData.employeeId,
    assignedGrades: [...new Set(classAssignments.map(c => c.grade))],
    assignedClasses: classAssignments,
    role: teacherData.role || 'primary_teacher',
    isPrimaryTeacher: teacherData.isPrimaryTeacher || false,
    assignmentHistory: {
      assignedBy: assignedBy,
      academicYear: this.academicYear,
      isActive: true
    }
  };
  
  this.teacherAssignments.push(newAssignment);
  return this.save();
};

subjectSchema.methods.removeTeacher = function(teacherId, reason = 'resigned') {
  const assignment = this.teacherAssignments.find(assignment => 
    assignment.teacherId.toString() === teacherId.toString() &&
    assignment.assignmentHistory.isActive
  );
  
  if (!assignment) {
    throw new Error('Teacher assignment not found');
  }
  
  assignment.assignmentHistory.isActive = false;
  assignment.assignmentHistory.endDate = new Date();
  assignment.assignmentHistory.reason = reason;
  
  return this.save();
};

subjectSchema.methods.updateTeacherWorkload = function(teacherId, newClassAssignments) {
  const assignment = this.teacherAssignments.find(assignment => 
    assignment.teacherId.toString() === teacherId.toString() &&
    assignment.assignmentHistory.isActive
  );
  
  if (!assignment) {
    throw new Error('Teacher assignment not found');
  }
  
  assignment.assignedClasses = newClassAssignments;
  assignment.assignedGrades = [...new Set(newClassAssignments.map(c => c.grade))];
  
  return this.save();
};

subjectSchema.methods.getTeachersByGrade = function(grade) {
  return this.teacherAssignments.filter(assignment => 
    assignment.assignmentHistory.isActive &&
    assignment.assignedGrades.includes(grade)
  );
};

subjectSchema.methods.getClassesByTeacher = function(teacherId) {
  const assignment = this.teacherAssignments.find(assignment => 
    assignment.teacherId.toString() === teacherId.toString() &&
    assignment.assignmentHistory.isActive
  );
  
  return assignment ? assignment.assignedClasses : [];
};

// Static Methods
subjectSchema.statics.createSubjectForGrades = async function(subjectData) {
  // Validate grades
  const invalidGrades = subjectData.applicableGrades.filter(gradeInfo => 
    !gradeSystem.gradeStructure[gradeInfo.grade]
  );
  
  if (invalidGrades.length > 0) {
    throw new Error(`Invalid grades: ${invalidGrades.map(g => g.grade).join(', ')}`);
  }
  
  // Auto-populate academic details based on grade level
  const levels = [...new Set(subjectData.applicableGrades.map(g => 
    gradeUtils.getGradeLevel(g.grade)
  ))];
  
  if (!subjectData.academicDetails) {
    subjectData.academicDetails = {};
  }
  
  // Set default academic details based on highest level
  if (levels.includes('higherSecondary')) {
    subjectData.academicDetails.totalMarks = subjectData.academicDetails.totalMarks || 100;
    subjectData.academicDetails.passingMarks = subjectData.academicDetails.passingMarks || 33;
  } else if (levels.includes('high')) {
    subjectData.academicDetails.totalMarks = subjectData.academicDetails.totalMarks || 100;
    subjectData.academicDetails.passingMarks = subjectData.academicDetails.passingMarks || 33;
  } else if (levels.includes('middle')) {
    subjectData.academicDetails.totalMarks = subjectData.academicDetails.totalMarks || 80;
    subjectData.academicDetails.passingMarks = subjectData.academicDetails.passingMarks || 35;
  } else {
    subjectData.academicDetails.totalMarks = subjectData.academicDetails.totalMarks || 50;
    subjectData.academicDetails.passingMarks = subjectData.academicDetails.passingMarks || 35;
  }
  
  const newSubject = new this(subjectData);
  return newSubject.save();
};

subjectSchema.statics.getSubjectsByTeacher = function(schoolCode, teacherId, academicYear) {
  return this.find({
    schoolCode,
    academicYear,
    'teacherAssignments.teacherId': teacherId,
    'teacherAssignments.assignmentHistory.isActive': true,
    isActive: true
  }).populate('teacherAssignments.assignedClasses.classId');
};

subjectSchema.statics.getSubjectsByGrade = function(schoolCode, grade, academicYear) {
  return this.find({
    schoolCode,
    academicYear,
    'applicableGrades.grade': grade,
    isActive: true
  }).populate('teacherAssignments.teacherId', 'name email');
};

subjectSchema.statics.getTeacherWorkloadSummary = async function(schoolCode, academicYear) {
  return this.aggregate([
    {
      $match: {
        schoolCode,
        academicYear,
        isActive: true
      }
    },
    {
      $unwind: '$teacherAssignments'
    },
    {
      $match: {
        'teacherAssignments.assignmentHistory.isActive': true
      }
    },
    {
      $group: {
        _id: '$teacherAssignments.teacherId',
        teacherName: { $first: '$teacherAssignments.teacherName' },
        employeeId: { $first: '$teacherAssignments.employeeId' },
        totalSubjects: { $sum: 1 },
        totalPeriods: { $sum: '$teacherAssignments.totalPeriodsPerWeek' },
        subjects: { 
          $push: {
            subjectName: '$subjectName',
            subjectCode: '$subjectCode',
            periods: '$teacherAssignments.totalPeriodsPerWeek',
            classes: '$teacherAssignments.assignedClasses'
          }
        }
      }
    },
    {
      $sort: { totalPeriods: -1 }
    }
  ]);
};

module.exports = mongoose.model('Subject', subjectSchema);
