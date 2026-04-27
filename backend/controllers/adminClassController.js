const School = require('../models/School');
const { ObjectId } = require('mongodb');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');

// Get school database connection with fallback creation
async function getSchoolConnectionWithFallback(schoolCode) {
  try {
    return await SchoolDatabaseManager.getSchoolConnection(schoolCode);
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

    const { academicYear } = req.query;
    
    // Normalize academic year for consistent querying
    // We want to find both "2025-26" and "2025-2026"
    const getPossibleYearFormats = (year) => {
      if (!year) return [];
      const formats = [String(year).trim()];
      
      const matchShort = String(year).match(/^(\d{4})-(\d{2})$/);
      if (matchShort) {
        formats.push(`${matchShort[1]}-20${matchShort[2]}`);
      }
      
      const matchLong = String(year).match(/^(\d{4})-(\d{4})$/);
      if (matchLong) {
        formats.push(`${matchLong[1]}-${matchLong[2].substring(2)}`);
      }
      
      return [...new Set(formats)];
    };
    
    const possibleYears = getPossibleYearFormats(academicYear);
    
    // Build base query
    const baseQuery = { isActive: true };
    if (possibleYears.length > 0) {
      baseQuery.academicYear = { $in: possibleYears };
    }

    // Try with schoolCode field (primary - what migration inserts)
    let classes = await classesCollection.find({
      ...baseQuery,
      schoolCode: schoolCode.toUpperCase()
    }).sort({ academicYear: -1, className: 1 }).toArray(); // Sort by year DESC so we get newer ones first
    console.log(`📊 Query 1 (schoolCode): Found ${classes.length} classes for year formats: ${possibleYears.join(', ')}`);

    // ... (rest of queries 2 and 3 omitted for brevity but they should use the same baseQuery) ...
    if (classes.length === 0) {
        classes = await classesCollection.find({
          ...baseQuery,
          schoolId: school._id.toString()
        }).sort({ academicYear: -1, className: 1 }).toArray();
    }
    if (classes.length === 0) {
        classes = await classesCollection.find({
          ...baseQuery,
          schoolId: school._id
        }).sort({ academicYear: -1, className: 1 }).toArray();
    }

    // --- SMART INHERIT FALLBACK ---
    if (classes.length === 0 && academicYear) {
      console.log(`💡 No classes found for ${possibleYears.join('/')}, searching for latest available year...`);
      
      const latestClasses = await classesCollection.find({
        isActive: true,
        $or: [
          { schoolCode: schoolCode.toUpperCase() },
          { schoolId: school._id.toString() },
          { schoolId: school._id }
        ]
      }).sort({ academicYear: -1, className: 1 }).toArray();

      if (latestClasses.length > 0) {
        const years = [...new Set(latestClasses.map(c => c.academicYear))].filter(Boolean).sort().reverse();
        const latestYear = years[0];
        console.log(`✨ Found classes in ${latestYear}. Inheriting for ${academicYear}.`);
        classes = latestClasses.filter(c => c.academicYear === latestYear);
      }
    }

    // De-duplicate by className
    const seenClassNames = new Set();
    classes = classes.filter(cls => {
      const key = `${cls.className}`;
      if (seenClassNames.has(key)) return false;
      seenClassNames.add(key);
      return true;
    });

    console.log(`📚 Final (de-duplicated) result: ${classes.length} classes for school ${schoolCode}`);

    // Transform classes for frontend use
    // --- DISCOVERY FROM STUDENTS (Self-Healing) ---
    // Find classes/sections mentioned in student records but missing from classes collection
    try {
      console.log('🔍 Discovering classes from student records...');
      const studentDiscovery = await schoolConnection.collection('students').aggregate([
        { $match: { isActive: { $ne: false } } },
        {
          $group: {
            _id: {
              class: { $ifNull: ["$academicInfo.class", { $ifNull: ["$studentDetails.academic.currentClass", "$class"] }] },
              section: { $ifNull: ["$academicInfo.section", { $ifNull: ["$studentDetails.academic.currentSection", "$section"] }] }
            }
          }
        },
        { $match: { "_id.class": { $ne: null, $ne: "" } } }
      ]).toArray();

      console.log(`📊 Discovered ${studentDiscovery.length} class-section pairs from students.`);

      // Group discovery by class
      const discoveredMap = new Map();
      studentDiscovery.forEach(item => {
        const className = String(item._id.class).trim();
        const sectionName = item._id.section ? String(item._id.section).trim().toUpperCase() : 'A';
        if (!discoveredMap.has(className)) {
          discoveredMap.set(className, new Set());
        }
        discoveredMap.get(className).add(sectionName);
      });

      // Merge discovery into existing classes list
      discoveredMap.forEach((sections, className) => {
        const exists = classes.some(c => c.className.toLowerCase() === className.toLowerCase());
        if (!exists) {
          console.log(`➕ Auto-adding discovered class: ${className}`);
          classes.push({
            _id: new ObjectId(),
            className: className,
            sections: Array.from(sections),
            academicYear: academicYear || 'Current',
            isActive: true,
            isDiscovered: true // Flag for debugging
          });
        } else {
          // Check if sections are missing
          const existingClass = classes.find(c => c.className.toLowerCase() === className.toLowerCase());
          sections.forEach(s => {
            if (!existingClass.sections.includes(s)) {
              console.log(`➕ Auto-adding discovered section ${s} to class ${className}`);
              existingClass.sections.push(s);
            }
          });
        }
      });
    } catch (discoveryError) {
      console.warn('⚠️ Class discovery from students failed:', discoveryError.message);
    }

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

    const { academicYear } = req.query;
    
    // Normalize academic year for consistent querying
    const getPossibleYearFormats = (year) => {
      if (!year) return [];
      const formats = [String(year).trim()];
      
      const matchShort = String(year).match(/^(\d{4})-(\d{2})$/);
      if (matchShort) {
        formats.push(`${matchShort[1]}-20${matchShort[2]}`);
      }
      
      const matchLong = String(year).match(/^(\d{4})-(\d{4})$/);
      if (matchLong) {
        formats.push(`${matchLong[1]}-${matchLong[2].substring(2)}`);
      }
      
      return [...new Set(formats)];
    };
    
    const possibleYears = getPossibleYearFormats(academicYear);
    
    // Build base query
    const baseQuery = { isActive: true };
    if (possibleYears.length > 0) {
      baseQuery.academicYear = { $in: possibleYears };
    }

    // Try finding by schoolId as string first
    let tests = await testsCollection.find({ 
      ...baseQuery, 
      $or: [
        { schoolId: school._id.toString() },
        { schoolId: school._id },
        { schoolCode: schoolCode.toUpperCase() }
      ]
    }).sort({ name: 1 }).toArray();

    // --- SMART INHERIT FALLBACK FOR TESTS ---
    if (tests.length === 0 && academicYear) {
      console.log(`💡 No tests found for ${possibleYears.join('/')}, searching for latest available tests...`);
      
      const latestTests = await testsCollection.find({
        isActive: true,
        $or: [
          { schoolId: school._id.toString() },
          { schoolId: school._id },
          { schoolCode: schoolCode.toUpperCase() }
        ]
      }).sort({ academicYear: -1, name: 1 }).toArray();

      if (latestTests.length > 0) {
        const years = [...new Set(latestTests.map(t => t.academicYear))].filter(Boolean).sort().reverse();
        const latestYear = years[0];
        console.log(`✨ Found tests in ${latestYear}. Inheriting for ${academicYear}.`);
        tests = latestTests.filter(t => t.academicYear === latestYear);
      }
    }

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
