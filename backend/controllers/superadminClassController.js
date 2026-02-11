const School = require('../models/School');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
const { ObjectId } = require('mongodb');

// Helper function to get school database connection with fallback creation
async function getSchoolConnectionWithFallback(schoolCode) {
  try {
    return await SchoolDatabaseManager.getSchoolConnection(schoolCode);
  } catch (error) {
    console.error(`Failed to connect to school database for ${schoolCode}:`, error);
    // Try to create the database if it doesn't exist
    try {
      await SchoolDatabaseManager.createSchoolDatabase(schoolCode);
      return await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    } catch (createError) {
      console.error(`Failed to create school database for ${schoolCode}:`, createError);
      throw new Error(`Error accessing school database: ${createError.message}`);
    }
  }
}

// Get all classes for a school
exports.getSchoolClasses = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(school.code);
    const classesCollection = schoolConnection.collection('classes');

    // Fetch all classes
    const classes = await classesCollection.find({
      schoolId: schoolId,
      isActive: true
    }).toArray();

    // Transform classes to new structure
    const transformedClasses = classes.map(cls => ({
      _id: cls._id,
      className: cls.className,
      sections: cls.sections || [], // Array of sections
      academicYear: cls.academicYear,
      createdAt: cls.createdAt,
      classTeacher: cls.classTeacher,
      studentCount: cls.students ? cls.students.length : 0
    }));

    res.json({
      success: true,
      data: {
        schoolId: schoolId,
        schoolName: school.name,
        schoolCode: school.code,
        classes: transformedClasses,
        totalClasses: classes.length
      }
    });

  } catch (error) {
    console.error('Error fetching school classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school classes',
      error: error.message
    });
  }
};

// Add a new class (with sections array)
exports.addClass = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { className, academicYear = '2024-25' } = req.body;

    // Validate input
    if (!className) {
      return res.status(400).json({
        success: false,
        message: 'Class name is required'
      });
    }

    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(school.code);
    const classesCollection = schoolConnection.collection('classes');

    // Check if class already exists
    const existingClass = await classesCollection.findOne({
      schoolId: schoolId,
      className: className,
      academicYear: academicYear,
      isActive: true
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: `Class ${className} already exists for academic year ${academicYear}`
      });
    }

    // Generate class ID
    const classId = `${school.code}_${className}_${academicYear.replace('-', '')}`;

    // Create new class document with empty sections array
    const newClass = {
      classId: classId,
      className: className,
      schoolId: schoolId,
      schoolCode: school.code,
      academicYear: academicYear,
      level: getLevelFromGrade(className),
      stream: ['11', '12'].includes(className) ? 'Science' : null,
      sections: [], // Array to store sections
      classTeacher: {
        teacherId: null,
        teacherName: null,
        employeeId: null,
        assignedDate: null
      },
      students: [],
      subjects: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert new class
    const result = await classesCollection.insertOne(newClass);

    // Update school's total classes count
    await School.findByIdAndUpdate(schoolId, {
      $inc: { 'stats.totalClasses': 1 }
    });

    res.status(201).json({
      success: true,
      message: `Class ${className} created successfully`,
      data: {
        _id: result.insertedId,
        classId: classId,
        className: className,
        academicYear: academicYear
      }
    });

  } catch (error) {
    console.error('Error adding class:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding class',
      error: error.message
    });
  }
};

// Add section to existing class
exports.addSectionToClass = async (req, res) => {
  try {
    const { schoolId, classId } = req.params;
    const { section } = req.body;

    // Validate input
    if (!section) {
      return res.status(400).json({
        success: false,
        message: 'Section is required'
      });
    }

    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(school.code);
    const classesCollection = schoolConnection.collection('classes');

    // Find the class
    const existingClass = await classesCollection.findOne({
      _id: new ObjectId(classId),
      schoolId: schoolId,
      isActive: true
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if section already exists
    if (existingClass.sections && existingClass.sections.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Section ${section} already exists in class ${existingClass.className}`
      });
    }

    // Add section to the class
    const result = await classesCollection.updateOne(
      { _id: new ObjectId(classId) },
      { 
        $push: { sections: section },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to add section'
      });
    }

    res.json({
      success: true,
      message: `Section ${section} added to class ${existingClass.className}`,
      data: {
        className: existingClass.className,
        section: section
      }
    });

  } catch (error) {
    console.error('Error adding section to class:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding section to class',
      error: error.message
    });
  }
};

// Remove section from class
exports.removeSectionFromClass = async (req, res) => {
  try {
    const { schoolId, classId } = req.params;
    const { section } = req.body;

    // Validate input
    if (!section) {
      return res.status(400).json({
        success: false,
        message: 'Section is required'
      });
    }

    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(school.code);
    const classesCollection = schoolConnection.collection('classes');

    // Find the class
    const existingClass = await classesCollection.findOne({
      _id: new ObjectId(classId),
      schoolId: schoolId,
      isActive: true
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Remove section from the class
    const result = await classesCollection.updateOne(
      { _id: new ObjectId(classId) },
      { 
        $pull: { sections: section },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to remove section'
      });
    }

    res.json({
      success: true,
      message: `Section ${section} removed from class ${existingClass.className}`,
      data: {
        className: existingClass.className,
        section: section
      }
    });

  } catch (error) {
    console.error('Error removing section from class:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing section from class',
      error: error.message
    });
  }
};

// Update class information
exports.updateClass = async (req, res) => {
  try {
    const { schoolId, classId } = req.params;
    const updateData = req.body;

    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(school.code);
    const classesCollection = schoolConnection.collection('classes');

    // Update class
    const result = await classesCollection.updateOne(
      { 
        _id: new ObjectId(classId),
        schoolId: schoolId,
        isActive: true 
      },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.json({
      success: true,
      message: 'Class updated successfully'
    });

  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class',
      error: error.message
    });
  }
};

// Delete class (soft delete)
exports.deleteClass = async (req, res) => {
  try {
    const { schoolId, classId } = req.params;

    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(school.code);
    const classesCollection = schoolConnection.collection('classes');

    // Soft delete class
    const result = await classesCollection.updateOne(
      { 
        _id: new ObjectId(classId),
        schoolId: schoolId,
        isActive: true 
      },
      { 
        $set: { 
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Update school's total classes count
    await School.findByIdAndUpdate(schoolId, {
      $inc: { 'stats.totalClasses': -1 }
    });

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class',
      error: error.message
    });
  }
};

// Get available classes for dropdown (used in test configuration)
exports.getAvailableClasses = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(school.code);
    const classesCollection = schoolConnection.collection('classes');

    // Fetch active classes
    const classes = await classesCollection.find({
      schoolId: schoolId,
      isActive: true
    }).sort({ className: 1 }).toArray();

    // Format for dropdown - create options for each class-section combination
    const classOptions = [];
    classes.forEach(cls => {
      if (cls.sections && cls.sections.length > 0) {
        // If class has sections, create options for each section
        cls.sections.forEach(section => {
          classOptions.push({
            value: `${cls.className}_${section}`,
            label: `Class ${cls.className} - Section ${section}`,
            className: cls.className,
            section: section,
            academicYear: cls.academicYear
          });
        });
      } else {
        // If class has no sections, create a single option
        classOptions.push({
          value: cls.className,
          label: `Class ${cls.className}`,
          className: cls.className,
          section: '',
          academicYear: cls.academicYear
        });
      }
    });

    res.json({
      success: true,
      data: {
        classes: classOptions,
        totalClasses: classOptions.length
      }
    });

  } catch (error) {
    console.error('Error fetching available classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available classes',
      error: error.message
    });
  }
};

// Helper function to determine level from grade
function getLevelFromGrade(grade) {
  if (['Nursery', 'LKG', 'UKG'].includes(grade)) {
    return 'elementary';
  } else if (['1', '2', '3', '4', '5'].includes(grade)) {
    return 'elementary';
  } else if (['6', '7', '8'].includes(grade)) {
    return 'middle';
  } else if (['9', '10'].includes(grade)) {
    return 'high';
  } else if (['11', '12'].includes(grade)) {
    return 'higherSecondary';
  }
  return 'elementary';
}
