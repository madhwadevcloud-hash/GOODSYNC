const mongoose = require('mongoose');

const testTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  maxMarks: {
    type: Number,
    default: 100
  },
  weightage: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
});


const testDetailsSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  schoolCode: {
    type: String,
    required: true,
    uppercase: true
  },
  academicYear: {
    type: String,
    required: true,
    default: '2024-25'
  },
  // Map of class name to array of test types
  classTestTypes: {
    type: Map,
    of: [testTypeSchema],
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Pre-save middleware to update the updatedAt field
testDetailsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create empty test details structure for new schools
testDetailsSchema.statics.createDefaultTestTypes = function(schoolId, schoolCode, createdBy) {
  // Return empty test details structure instead of hardcoded defaults
  const classes = ['LKG', 'UKG', ...Array.from({length: 12}, (_, i) => (i+1).toString())];
  const classTestTypes = {};
  classes.forEach(cls => {
    classTestTypes[cls] = []; // Empty array for each class
  });

  return this.create({
    schoolId,
    schoolCode,
    classTestTypes,
    createdBy
  });
};

/**
 * Add a test type to a specific class
 * @param {String} schoolCode - The school code
 * @param {String} className - The class name (e.g., 'LKG', 'UKG', '1', '2', etc.)
 * @param {Object} testType - The test type object to add
 * @param {String} academicYear - The academic year
 * @param {ObjectId} userId - The user ID making the change
 * @returns {Promise} - The updated test details document
 */
testDetailsSchema.statics.addTestTypeToClass = async function(schoolCode, className, testType, academicYear, userId) {
  // Find the test details document
  let testDetails = await this.findOne({ schoolCode, academicYear });
  
  if (!testDetails) {
    // Get the school to create default test details
    const School = mongoose.model('School');
    const school = await School.findOne({ code: schoolCode });
    
    if (!school) {
      throw new Error('School not found');
    }
    
    // Create default test details
    testDetails = await this.createDefaultTestTypes(school._id, schoolCode, userId);
  }
  
  // Ensure classTestTypes exists
  if (!testDetails.classTestTypes) {
    testDetails.classTestTypes = new Map();
  }
  
  // Get current test types for the class or initialize with empty array
  const classTestTypes = testDetails.classTestTypes.get(className) || [];
  
  // Check if test type with same code already exists
  const existingIndex = classTestTypes.findIndex(t => t.code === testType.code);
  
  if (existingIndex >= 0) {
    // Update existing test type
    classTestTypes[existingIndex] = {
      ...classTestTypes[existingIndex],
      ...testType,
      updatedAt: new Date()
    };
  } else {
    // Add new test type
    classTestTypes.push({
      ...testType,
      createdAt: new Date()
    });
  }
  
  // Update the class test types
  testDetails.classTestTypes.set(className, classTestTypes);
  testDetails.updatedBy = userId;
  
  // Save and return the updated document
  return await testDetails.save();
};

/**
 * Remove a test type from a specific class
 * @param {String} schoolCode - The school code
 * @param {String} className - The class name
 * @param {String} testTypeCode - The test type code to remove
 * @param {String} academicYear - The academic year
 * @param {ObjectId} userId - The user ID making the change
 * @returns {Promise} - The updated test details document
 */
testDetailsSchema.statics.removeTestTypeFromClass = async function(schoolCode, className, testTypeCode, academicYear, userId) {
  // Find the test details document
  const testDetails = await this.findOne({ schoolCode, academicYear });
  
  if (!testDetails || !testDetails.classTestTypes) {
    throw new Error('Test details not found');
  }
  
  // Get current test types for the class
  const classTestTypes = testDetails.classTestTypes.get(className);
  
  if (!classTestTypes) {
    throw new Error(`No test types found for class ${className}`);
  }
  
  // Filter out the test type to remove
  const updatedTestTypes = classTestTypes.filter(t => t.code !== testTypeCode);
  
  // If nothing was removed, throw error
  if (updatedTestTypes.length === classTestTypes.length) {
    throw new Error(`Test type with code ${testTypeCode} not found`);
  }
  
  // Update the class test types
  testDetails.classTestTypes.set(className, updatedTestTypes);
  testDetails.updatedBy = userId;
  
  // Save and return the updated document
  return await testDetails.save();
};

module.exports = mongoose.model('TestDetails', testDetailsSchema);
