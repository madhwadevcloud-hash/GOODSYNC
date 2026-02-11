const School = require('../models/School');
const { ObjectId } = require('mongodb');
const DatabaseManager = require('../utils/databaseManager');

// Get school database connection
async function getSchoolConnectionWithFallback(schoolCode) {
  try {
    return await DatabaseManager.getSchoolConnection(schoolCode);
  } catch (error) {
    console.error(`Error connecting to school database ${schoolCode}:`, error);
    throw error;
  }
}

// Get classes and sections for a school (for admin users)
exports.getSchoolClassesAndSections = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    
    console.log(`🔍 Fetching classes and sections for school: ${schoolCode}`);
    
    // Get school information
    const school = await School.findOne({ code: schoolCode.toUpperCase() });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    console.log(`📋 School found: ${school.name}, ID: ${school._id}`);

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(schoolCode);
    const classesCollection = schoolConnection.collection('classes');

    // Try multiple query formats to handle different data structures
    let classes = [];
    
    // First, try with schoolCode field (most common)
    classes = await classesCollection.find({
      schoolCode: schoolCode.toUpperCase(),
      isActive: true
    }).sort({ className: 1 }).toArray();

    console.log(`📊 Query 1 (schoolCode): Found ${classes.length} classes`);

    // If no results, try with schoolId as string
    if (classes.length === 0) {
      classes = await classesCollection.find({
        schoolId: school._id.toString(),
        isActive: true
      }).sort({ className: 1 }).toArray();
      console.log(`📊 Query 2 (schoolId string): Found ${classes.length} classes`);
    }

    // If still no results, try with schoolId as ObjectId
    if (classes.length === 0) {
      classes = await classesCollection.find({
        schoolId: school._id,
        isActive: true
      }).sort({ className: 1 }).toArray();
      console.log(`📊 Query 3 (schoolId ObjectId): Found ${classes.length} classes`);
    }

    // If still no results, get all active classes (fallback)
    if (classes.length === 0) {
      classes = await classesCollection.find({
        isActive: true
      }).sort({ className: 1 }).toArray();
      console.log(`📊 Query 4 (all active): Found ${classes.length} classes`);
    }

    console.log(`📚 Final result: ${classes.length} classes for school ${schoolCode}`);

    // Transform classes for frontend use
    const formattedClasses = classes.map(cls => ({
      _id: cls._id,
      className: cls.className,
      sections: cls.sections || [],
      academicYear: cls.academicYear || '2024-25',
      displayName: `Class ${cls.className}`,
      hasMultipleSections: cls.sections && cls.sections.length > 1
    }));

    // Create separate arrays for dropdowns
    const classOptions = formattedClasses.map(cls => ({
      value: cls.className,
      label: cls.displayName,
      className: cls.className
    }));

    // Create section options grouped by class
    const sectionsByClass = {};
    formattedClasses.forEach(cls => {
      if (cls.sections && cls.sections.length > 0) {
        sectionsByClass[cls.className] = cls.sections.map(section => ({
          value: section,
          label: `Section ${section}`,
          section: section
        }));
      } else {
        sectionsByClass[cls.className] = [];
        // If no sections defined, provide default sections
        // sectionsByClass[cls.className] = [
        //   { value: 'A', label: 'Section A', section: 'A' }
        // ];
      }
    });

    // Also create a flat list of all available sections
    const allSections = [...new Set(
      formattedClasses.flatMap(cls => cls.sections || [])
    )].sort().map(section => ({
      value: section,
      label: `Section ${section}`,
      section: section
    }));

    res.json({
      success: true,
      data: {
        schoolId: school._id,
        schoolName: school.name,
        schoolCode: school.code,
        classes: formattedClasses,
        classOptions: classOptions,
        sectionsByClass: sectionsByClass,
        allSections: allSections,
        totalClasses: formattedClasses.length
      }
    });

  } catch (error) {
    console.error('Error fetching school classes and sections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school classes and sections',
      error: error.message
    });
  }
};

// Get sections for a specific class
exports.getSectionsForClass = async (req, res) => {
  try {
    const { schoolCode, className } = req.params;
    
    console.log(`🔍 Fetching sections for class ${className} in school: ${schoolCode}`);
    
    // Get school information
    const school = await School.findOne({ code: schoolCode.toUpperCase() });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(schoolCode);
    const classesCollection = schoolConnection.collection('classes');

    // Find the specific class
    const classData = await classesCollection.findOne({
      schoolId: school._id.toString(),
      className: className,
      isActive: true
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: `Class ${className} not found`
      });
    }

    // Get sections for this class
    const sections = (classData.sections || ['A']).map(section => ({
      value: section,
      label: `Section ${section}`,
      section: section
    }));

    console.log(`📝 Found ${sections.length} sections for class ${className}`);

    res.json({
      success: true,
      data: {
        className: className,
        sections: sections,
        totalSections: sections.length
      }
    });

  } catch (error) {
    console.error('Error fetching sections for class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sections for class',
      error: error.message
    });
  }
};

// Get all tests/exams for a school (for admin users)
exports.getSchoolTests = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    
    console.log(`🔍 Fetching tests for school: ${schoolCode}`);
    
    // Get school information
    const school = await School.findOne({ code: schoolCode.toUpperCase() });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(schoolCode);
    const testsCollection = schoolConnection.collection('testdetails');

    // Fetch all active tests
    const tests = await testsCollection.find({
      schoolId: school._id.toString(),
      isActive: true
    }).sort({ name: 1 }).toArray();  // Database uses 'name' field

    console.log(`📚 Found ${tests.length} tests for school ${schoolCode}`);

    // Transform tests for frontend use
    const formattedTests = tests.map(test => ({
      _id: test._id,
      testId: test.testId,
      testName: test.name || test.testName,  // Database uses 'name' field
      testType: test.testType,
      className: test.className,
      academicYear: test.academicYear,
      maxMarks: test.maxMarks,
      duration: test.duration,
      description: test.description,
      displayName: `${test.name || test.testName} (${test.testType || 'Test'})`,
      isActive: test.isActive
    }));

    // Group tests by class for easier filtering
    const testsByClass = {};
    formattedTests.forEach(test => {
      if (!testsByClass[test.className]) {
        testsByClass[test.className] = [];
      }
      testsByClass[test.className].push(test);
    });

    res.json({
      success: true,
      data: {
        schoolId: school._id,
        schoolName: school.name,
        schoolCode: school.code,
        tests: formattedTests,
        testsByClass: testsByClass,
        totalTests: formattedTests.length
      }
    });

  } catch (error) {
    console.error('Error fetching school tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school tests',
      error: error.message
    });
  }
};

// Save test scoring configuration
exports.saveTestScoring = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { scoring } = req.body;
    
    console.log(`💾 Saving test scoring for school: ${schoolCode}`);
    console.log('Scoring data:', scoring);
    
    if (!scoring || !Array.isArray(scoring)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scoring data'
      });
    }

    // Get school information
    const school = await School.findOne({ code: schoolCode.toUpperCase() });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await getSchoolConnectionWithFallback(schoolCode);
    const testsCollection = schoolConnection.collection('testdetails');

    // Update each test with scoring configuration
    let updatedCount = 0;
    for (const testScoring of scoring) {
      const { testId, maxMarks, weightage } = testScoring;
      
      const result = await testsCollection.updateOne(
        { _id: new ObjectId(testId) },
        { 
          $set: { 
            maxMarks: maxMarks,
            weightage: weightage,
            updatedAt: new Date(),
            updatedBy: req.user.userId
          }
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} tests with scoring configuration`);

    res.json({
      success: true,
      message: `Successfully updated scoring for ${updatedCount} tests`,
      data: {
        updatedCount: updatedCount,
        totalTests: scoring.length
      }
    });

  } catch (error) {
    console.error('Error saving test scoring:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving test scoring',
      error: error.message
    });
  }
};
