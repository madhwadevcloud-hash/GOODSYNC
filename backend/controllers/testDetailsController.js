const TestDetails = require('../models/TestDetails');

// Helper function to convert Map to object for JSON serialization
const convertMapToObject = (testDetails) => {
  const responseData = testDetails.toObject();
  if (responseData.classTestTypes instanceof Map) {
    responseData.classTestTypes = Object.fromEntries(responseData.classTestTypes);
  }
  return responseData;
};

// Get test details for a school (supports both old and new structure)
exports.getTestDetails = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;
    const academicYear = req.query.academicYear || '2024-25';

    console.log('[DEBUG] getTestDetails called with:');
    console.log('- schoolCode (from user):', schoolCode);
    console.log('- academicYear (from query):', req.query.academicYear);
    console.log('- academicYear (final):', academicYear);
    console.log('- Full query params:', req.query);

    const testDetails = await TestDetails.findOne({
      schoolCode: schoolCode.toUpperCase(),
      academicYear
    });

    if (!testDetails) {
      // Return 404 instead of auto-creating test details
      return res.status(404).json({
        success: false,
        message: 'Test details not found for this school'
      });
    }

    // Convert Map to plain object for JSON serialization
    const responseData = convertMapToObject(testDetails);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test details',
      error: error.message
    });
  }
};

// Get test details for a specific class
exports.getClassTestTypes = async (req, res) => {
  try {
    const { className } = req.params;
    const schoolCode = req.user.schoolCode;
    const academicYear = req.query.academicYear || '2024-25';

    const testDetails = await TestDetails.findOne({
      schoolCode,
      academicYear
    });

    if (!testDetails) {
      return res.status(404).json({
        success: false,
        message: 'Test details not found'
      });
    }

    const classTestTypes = testDetails.classTestTypes?.get(className) || [];

    res.json({
      success: true,
      data: {
        className,
        testTypes: classTestTypes,
        academicYear
      }
    });
  } catch (error) {
    console.error('Error fetching class test types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class test types',
      error: error.message
    });
  }
};

// Update test types for a specific class
exports.updateClassTestTypes = async (req, res) => {
  try {
    const { className } = req.params;
    const { testTypes } = req.body;
    const schoolCode = req.user.schoolCode;
    const academicYear = req.body.academicYear || '2024-25';

    if (!testTypes || !Array.isArray(testTypes)) {
      return res.status(400).json({
        success: false,
        message: 'Test types must be an array'
      });
    }

    const testDetails = await TestDetails.findOne({
      schoolCode,
      academicYear
    });

    if (!testDetails) {
      return res.status(404).json({
        success: false,
        message: 'Test details not found'
      });
    }

    // Update the test types for the specific class
    if (!testDetails.classTestTypes) {
      testDetails.classTestTypes = new Map();
    }
    testDetails.classTestTypes.set(className, testTypes);
    testDetails.updatedBy = req.user._id;

    await testDetails.save();

    res.json({
      success: true,
      data: {
        className,
        testTypes: testTypes,
        academicYear
      },
      message: `Test types updated successfully for class ${className}`
    });
  } catch (error) {
    console.error('Error updating class test types:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class test types',
      error: error.message
    });
  }
};

// Update test details for a school
exports.updateTestDetails = async (req, res) => {
  try {
    const { testTypes } = req.body;
    const schoolCode = req.user.schoolCode;
    const academicYear = req.body.academicYear || '2024-25';

    if (!testTypes || !Array.isArray(testTypes)) {
      return res.status(400).json({
        success: false,
        message: 'Test types array is required'
      });
    }

    // Validate test types
    for (const testType of testTypes) {
      if (!testType.name || !testType.code) {
        return res.status(400).json({
          success: false,
          message: 'Each test type must have a name and code'
        });
      }
    }

    let testDetails = await TestDetails.findOne({
      schoolCode,
      academicYear
    });

    if (!testDetails) {
      // Create new test details
      testDetails = new TestDetails({
        schoolId: req.user.schoolId,
        schoolCode,
        academicYear,
        testTypes,
        createdBy: req.user._id
      });
    } else {
      // Update existing test details
      testDetails.testTypes = testTypes;
      testDetails.updatedBy = req.user._id;
    }

    await testDetails.save();

    // Convert Map to plain object for JSON serialization
    const responseData = convertMapToObject(testDetails);

    res.json({
      success: true,
      data: responseData,
      message: 'Test details updated successfully'
    });
  } catch (error) {
    console.error('Error updating test details:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating test details',
      error: error.message
    });
  }
};

// Get test details for superadmin (by school)
exports.getSchoolTestDetails = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const academicYear = req.query.academicYear || '2024-25';

    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const testDetails = await TestDetails.findOne({
      schoolCode: schoolCode.toUpperCase(),
      academicYear
    }).populate('schoolId', 'name code');

    if (!testDetails) {
      return res.status(404).json({
        success: false,
        message: 'Test details not found for this school'
      });
    }

    // Convert Map to plain object for JSON serialization
    const responseData = convertMapToObject(testDetails);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching school test details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school test details',
      error: error.message
    });
  }
};

// Update test details for a school (superadmin)
exports.updateSchoolTestDetails = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { classTestTypes, academicYear = '2024-25' } = req.body;

    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!classTestTypes) {
      return res.status(400).json({
        success: false,
        message: 'classTestTypes is required'
      });
    }

    // Find school by school code to get schoolId
    const School = require('../models/School');
    const school = await School.findOne({ code: schoolCode.toUpperCase() });
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    const testDetails = await TestDetails.findOneAndUpdate(
      {
        schoolCode: schoolCode.toUpperCase(),
        academicYear
      },
      {
        schoolId: school._id,
        schoolCode: schoolCode.toUpperCase(),
        classTestTypes,
        academicYear,
        updatedBy: req.user._id
      },
      {
        new: true,
        upsert: true, // Create if doesn't exist
        runValidators: true
      }
    );

    // Convert Map to plain object for JSON serialization
    const responseData = convertMapToObject(testDetails);

    res.json({
      success: true,
      data: responseData,
      message: 'School test details updated successfully'
    });
  } catch (error) {
    console.error('Error updating school test details:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating school test details',
      error: error.message
    });
  }
};

// Get test details by school ID (for superadmin)
exports.getTestDetailsBySchoolId = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const academicYear = req.query.academicYear || '2024-25';

    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Superadmin access required.'
      });
    }

    // Find all test details for this school
    const testDetails = await TestDetails.find({
      schoolId,
      ...(academicYear ? { academicYear } : {})
    }).sort({ academicYear: -1 });

    res.json({
      success: true,
      testDetails: testDetails
    });
  } catch (error) {
    console.error('Error fetching test details by school ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test details',
      error: error.message
    });
  }
};

// Add test type to a specific class for a school (superadmin)
exports.addTestTypeToClass = async (req, res) => {
  try {
    const { schoolCode, className } = req.params;
    const { testType, academicYear = '2024-25' } = req.body;

    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!testType || !testType.name || !testType.code) {
      return res.status(400).json({
        success: false,
        message: 'Test type with name and code is required'
      });
    }

    // Find school by school code to get schoolId
    const School = require('../models/School');
    const school = await School.findOne({ code: schoolCode.toUpperCase() });
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Find or create test details document
    let testDetails = await TestDetails.findOne({
      schoolCode: schoolCode.toUpperCase(),
      academicYear
    });

    if (!testDetails) {
      // Create new test details document
      testDetails = new TestDetails({
        schoolId: school._id,
        schoolCode: schoolCode.toUpperCase(),
        classTestTypes: new Map(),
        academicYear,
        createdBy: req.user._id
      });
    }

    // Get current test types for the class
    let classTestTypes = testDetails.classTestTypes.get(className) || [];
    
    // Check if test type with same code already exists
    const existingTestType = classTestTypes.find(t => t.code === testType.code.toUpperCase());
    if (existingTestType) {
      return res.status(400).json({
        success: false,
        message: 'Test type with this code already exists for this class'
      });
    }

    // Add the new test type
    const newTestType = {
      name: testType.name.trim(),
      code: testType.code.toUpperCase(),
      description: testType.description || '',
      maxMarks: testType.maxMarks || 100,
      weightage: testType.weightage || 0.1,
      isActive: testType.isActive !== undefined ? testType.isActive : true
    };

    classTestTypes.push(newTestType);
    testDetails.classTestTypes.set(className, classTestTypes);
    testDetails.updatedBy = req.user._id;

    await testDetails.save();

    res.json({
      success: true,
      data: {
        className,
        testType: newTestType,
        totalTestTypes: classTestTypes.length
      },
      message: 'Test type added successfully'
    });
  } catch (error) {
    console.error('Error adding test type to class:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding test type',
      error: error.message
    });
  }
};

// Remove test type from a specific class for a school (superadmin)
exports.removeTestTypeFromClass = async (req, res) => {
  try {
    const { schoolCode, className, testCode } = req.params;
    const { academicYear = '2024-25' } = req.query;

    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find test details document
    const testDetails = await TestDetails.findOne({
      schoolCode: schoolCode.toUpperCase(),
      academicYear
    });

    if (!testDetails) {
      return res.status(404).json({
        success: false,
        message: 'Test details not found for this school'
      });
    }

    // Get current test types for the class
    let classTestTypes = testDetails.classTestTypes.get(className) || [];
    
    // Find and remove the test type
    const initialLength = classTestTypes.length;
    classTestTypes = classTestTypes.filter(t => t.code !== testCode.toUpperCase());
    
    if (classTestTypes.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Test type not found in this class'
      });
    }

    // Update the test details
    testDetails.classTestTypes.set(className, classTestTypes);
    testDetails.updatedBy = req.user._id;

    await testDetails.save();

    res.json({
      success: true,
      data: {
        className,
        removedTestCode: testCode.toUpperCase(),
        remainingTestTypes: classTestTypes.length
      },
      message: 'Test type removed successfully'
    });
  } catch (error) {
    console.error('Error removing test type from class:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing test type',
      error: error.message
    });
  }
};

// Get test details for a school using school code (superadmin)
exports.getSchoolTestDetails = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const academicYear = req.query.academicYear || '2024-25';

    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Superadmin access required.'
      });
    }

    // Find test details for this school
    const testDetails = await TestDetails.findOne({
      schoolCode: schoolCode.toUpperCase(),
      academicYear
    });

    if (!testDetails) {
      return res.status(404).json({
        success: false,
        message: 'No test details found for this school',
        data: {
          classTestTypes: {}
        }
      });
    }

    // Convert Map to Object for JSON response
    const classTestTypesObj = {};
    if (testDetails.classTestTypes) {
      testDetails.classTestTypes.forEach((value, key) => {
        classTestTypesObj[key] = value;
      });
    }

    res.json({
      success: true,
      data: {
        schoolCode: testDetails.schoolCode,
        academicYear: testDetails.academicYear,
        classTestTypes: classTestTypesObj,
        createdAt: testDetails.createdAt,
        updatedAt: testDetails.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching school test details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test details',
      error: error.message
    });
  }
};
