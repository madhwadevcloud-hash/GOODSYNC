const mongoose = require('mongoose');

// Simplified Class-based Subject Model
const classSubjectsSchema = new mongoose.Schema({
  // Basic Information
  classSubjectId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `CS_${this.schoolCode}_${this.className}_${Date.now()}`;
    }
  },
  
  // Class Information
  className: {
    type: String,
    required: true,
    // e.g., "Class 1", "Class 2A", "Grade 8B", etc.
  },
  
  grade: {
    type: String,
    required: true,
    // e.g., "1", "2", "8", "10", etc.
  },
  
  section: {
    type: String,
    default: 'A',
    // e.g., "A", "B", "C", etc.
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
  
  // Academic Year
  academicYear: {
    type: String,
    required: true,
    default: '2024-25',
    match: /^\d{4}-\d{2}$/
  },
  
  // Subjects Array - Simplified structure
  subjects: [{
    name: {
      type: String,
      required: true,
      trim: true
      // e.g., "Mathematics", "English", "Science", etc.
    },
    code: {
      type: String,
      uppercase: true,
      default: function() {
        return this.name ? this.name.replace(/\s+/g, '').toUpperCase().substring(0, 5) : '';
      }
      // e.g., "MATH", "ENG", "SCI", etc. - Auto-generated but not displayed
    },
    isActive: {
      type: Boolean,
      default: true
    },
    addedDate: {
      type: Date,
      default: Date.now
    },
    teacherId: {
      type: String,
      default: null
      // Optional: Can assign teacher later
    },
    teacherName: {
      type: String,
      default: null
      // Optional: Can assign teacher later
    }
  }],
  
  // Metadata
  totalSubjects: {
    type: Number,
    default: 0
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: String,
    required: true
  },
  
  lastModifiedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'classsubjects'
});

// Indexes for better performance
classSubjectsSchema.index({ schoolCode: 1, className: 1, section: 1, academicYear: 1 });
classSubjectsSchema.index({ schoolCode: 1, grade: 1, section: 1 });
classSubjectsSchema.index({ 'subjects.name': 1 });
classSubjectsSchema.index({ 'subjects.code': 1 });

// Middleware to update totalSubjects count
classSubjectsSchema.pre('save', function() {
  this.totalSubjects = this.subjects.filter(subject => subject.isActive).length;
});

// Methods

// Add a subject to the class
classSubjectsSchema.methods.addSubject = function(subjectData) {
  const { name, teacherId = null, teacherName = null } = subjectData;
  
  // Check if subject already exists
  const existingSubject = this.subjects.find(subject => 
    subject.name.toLowerCase() === name.toLowerCase() && subject.isActive
  );
  
  if (existingSubject) {
    throw new Error(`Subject "${name}" already exists in this class`);
  }
  
  // Generate subject code (for internal use, not displayed)
  const code = name.replace(/\s+/g, '').toUpperCase().substring(0, 5);
  
  // Add new subject
  this.subjects.push({
    name: name.trim(),
    code,
    teacherId,
    teacherName,
    isActive: true,
    addedDate: new Date()
  });
  
  return this;
};

// Remove a subject from the class
classSubjectsSchema.methods.removeSubject = function(subjectName) {
  const subjectIndex = this.subjects.findIndex(subject => 
    subject.name.toLowerCase() === subjectName.toLowerCase() && subject.isActive
  );
  
  if (subjectIndex === -1) {
    throw new Error(`Subject "${subjectName}" not found in this class`);
  }
  
  // Mark as inactive instead of removing
  this.subjects[subjectIndex].isActive = false;
  
  return this;
};

// Get active subjects
classSubjectsSchema.methods.getActiveSubjects = function() {
  return this.subjects.filter(subject => subject.isActive);
};

// Static methods

// Find or create class subjects
classSubjectsSchema.statics.findOrCreateClass = async function(classData) {
  const { className, grade, section = 'A', schoolCode, schoolId, academicYear = '2024-25', createdBy } = classData;
  
  let classSubjects = await this.findOne({
    schoolCode,
    className,
    section,
    academicYear,
    isActive: true
  });
  
  if (!classSubjects) {
    classSubjects = new this({
      className,
      grade,
      section,
      schoolCode,
      schoolId,
      academicYear,
      subjects: [],
      createdBy,
      lastModifiedBy: createdBy
    });
    await classSubjects.save();
  }
  
  return classSubjects;
};

// Find class by grade and section
classSubjectsSchema.statics.findByGradeSection = async function(schoolCode, grade, section, academicYear = '2024-25') {
  return await this.findOne({
    schoolCode,
    grade,
    section,
    academicYear,
    isActive: true
  });
};

// Get all classes for a school
classSubjectsSchema.statics.getAllClasses = async function(schoolCode, academicYear = '2024-25') {
  return await this.find({
    schoolCode,
    academicYear,
    isActive: true
  }).sort({ grade: 1, section: 1 });
};

const DefaultModel = mongoose.model('ClassSubjectsSimple', classSubjectsSchema);

/**
 * Return a ClassSubjects model bound to a specific mongoose connection.
 * When bound to a school connection, we store documents in the 'subjects'
 * collection (so they appear as e.g. school_p.subjects).
 */
module.exports = DefaultModel;

module.exports.getModelForConnection = function(connection) {
  if (!connection) throw new Error('Connection is required to get model for school DB');

  // If already registered on this connection, return it
  if (connection.models && connection.models.ClassSubjectsSimple) {
    return connection.models.ClassSubjectsSimple;
  }

  // Bind model to the provided connection and use 'classsubjects' collection name
  // This avoids conflicts with any existing 'subjects' collection that may
  // contain different schema or unique indexes (like subjectId unique)
  const model = connection.model('ClassSubjectsSimple', classSubjectsSchema, 'classsubjects');
  return model;
};
