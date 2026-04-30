const DatabaseManager = require('../utils/databaseManager');
const School = require('../models/School');

// Migrate existing students to add academic year
exports.migrateStudentAcademicYear = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { academicYear, forceAll = false } = req.body;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }

    console.log(`📢 Migration Request: Setting academic year ${academicYear} for all students in ${schoolCode} (forceAll: ${forceAll})`);

    // Get school
    const school = await School.findOne({ code: schoolCode.toUpperCase() });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const studentsCollection = schoolConnection.collection('students');

    // Build filter
    let filter = { isActive: true };
    if (!forceAll) {
      filter.$and = [
        { 
          $or: [
            { 'studentDetails.academic.academicYear': { $exists: false } },
            { 'studentDetails.academic.academicYear': null },
            { 'studentDetails.academic.academicYear': '' }
          ]
        },
        { 
          $or: [
            { 'studentDetails.academicYear': { $exists: false } },
            { 'studentDetails.academicYear': null },
            { 'studentDetails.academicYear': '' }
          ]
        },
        { 
          $or: [
            { 'academicYear': { $exists: false } },
            { 'academicYear': null },
            { 'academicYear': '' }
          ]
        }
      ];
    }

    // Find students to update for logging
    const studentsToUpdate = await studentsCollection.find(filter).toArray();
    console.log(`📊 Found ${studentsToUpdate.length} students to update to academic year ${academicYear}`);

    if (studentsToUpdate.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No students found matching update criteria',
        data: { updated: 0 }
      });
    }

    // Update all matching students
    const result = await studentsCollection.updateMany(
      filter,
      {
        $set: {
          'studentDetails.academic.academicYear': academicYear,
          'studentDetails.academicYear': academicYear, // Keep redundant fields in sync
          'academicYear': academicYear,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} students with academic year: ${academicYear}`);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} students with academic year ${academicYear}`,
      data: {
        updated: result.modifiedCount,
        academicYear: academicYear
      }
    });

  } catch (error) {
    console.error('❌ Error in migration:', error);
    res.status(500).json({
      success: false,
      message: 'Error migrating students',
      error: error.message
    });
  }
};

// Migrate Class Subjects to new academic year
exports.migrateClassSubjects = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { fromYear, toYear } = req.body;

    if (!fromYear || !toYear) {
      return res.status(400).json({
        success: false,
        message: 'Both fromYear and toYear are required'
      });
    }

    console.log(`📢 Migrating Class Subjects for ${schoolCode} from ${fromYear} to ${toYear}`);

    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const subjectsCollection = schoolConnection.collection('classsubjects');

    // Find subjects for source year
    const sourceSubjects = await subjectsCollection.find({ 
      academicYear: fromYear 
    }).toArray();

    console.log(`📊 Found ${sourceSubjects.length} subjects in ${fromYear}`);

    if (sourceSubjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No subjects found for source year ${fromYear}`
      });
    }

    // Check if subjects already exist for target year
    const targetCount = await subjectsCollection.countDocuments({ academicYear: toYear });
    if (targetCount > 0) {
      console.log(`⚠️ Target year ${toYear} already has ${targetCount} subjects. Skipping copy to prevent duplicates.`);
      return res.status(200).json({
        success: true,
        message: `Subjects already exist for ${toYear}. No migration needed.`,
        data: { copied: 0, existing: targetCount }
      });
    }

    // Prepare documents for insertion
    const newSubjects = sourceSubjects.map(sub => {
      const { _id, ...rest } = sub;
      return {
        ...rest,
        academicYear: toYear,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    const result = await subjectsCollection.insertMany(newSubjects);

    console.log(`✅ Successfully copied ${result.insertedCount} subjects to ${toYear}`);

    res.status(200).json({
      success: true,
      message: `Successfully migrated ${result.insertedCount} subjects to ${toYear}`,
      data: { copied: result.insertedCount }
    });

  } catch (error) {
    console.error('❌ Error migrating subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Error migrating subjects',
      error: error.message
    });
  }
};

// Migrate Classes to new academic year
exports.migrateClasses = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { fromYear, toYear } = req.body;

    if (!fromYear || !toYear) {
      return res.status(400).json({
        success: false,
        message: 'Both fromYear and toYear are required'
      });
    }

    console.log(`📢 Migrating Classes for ${schoolCode} from ${fromYear} to ${toYear}`);

    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const classesCollection = schoolConnection.collection('classes');

    // Find classes for source year
    const sourceClasses = await classesCollection.find({ 
      academicYear: fromYear,
      isActive: true
    }).toArray();

    console.log(`📊 Found ${sourceClasses.length} classes in ${fromYear}`);

    if (sourceClasses.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No classes found for source year ${fromYear}`
      });
    }

    // Check if classes already exist for target year
    const targetCount = await classesCollection.countDocuments({ academicYear: toYear, isActive: true });
    if (targetCount > 0) {
      return res.status(200).json({
        success: true,
        message: `Classes already exist for ${toYear}.`,
        data: { copied: 0, existing: targetCount }
      });
    }

    // Prepare documents for insertion
    const newClasses = sourceClasses.map(cls => {
      const { _id, ...rest } = cls;
      return {
        ...rest,
        academicYear: toYear,
        classId: `${schoolCode}_${cls.className}_${toYear.replace('-', '')}`,
        students: [], // Reset students for new year
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    const result = await classesCollection.insertMany(newClasses);

    console.log(`✅ Successfully copied ${result.insertedCount} classes to ${toYear}`);

    res.status(200).json({
      success: true,
      message: `Successfully migrated ${result.insertedCount} classes to ${toYear}`,
      data: { copied: result.insertedCount }
    });

  } catch (error) {
    console.error('❌ Error migrating classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error migrating classes',
      error: error.message
    });
  }
};

// Migrate Tests to new academic year
exports.migrateTests = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { fromYear, toYear } = req.body;

    if (!toYear) {
      return res.status(400).json({
        success: false,
        message: 'toYear is required'
      });
    }

    console.log(`📢 Migrating Tests for ${schoolCode} to ${toYear}`);

    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const testsCollection = schoolConnection.collection('testdetails');

    // Check if tests already exist for target year
    const targetCount = await testsCollection.countDocuments({ academicYear: toYear, isActive: true });
    if (targetCount > 0) {
      return res.status(200).json({
        success: true,
        message: `Tests already exist for ${toYear}. ${targetCount} tests found.`,
        data: { copied: 0, existing: targetCount }
      });
    }

    // Find ALL tests that are NOT already in target year
    // This handles: tests with fromYear, tests with null/undefined academicYear (superadmin-created)
    const allTests = await testsCollection.find({ isActive: { $ne: false } }).toArray();
    const sourceTests = allTests.filter(t => !t.academicYear || t.academicYear !== toYear);
    
    console.log(`📊 Found ${allTests.length} total tests, ${sourceTests.length} eligible to copy to ${toYear}`);

    if (sourceTests.length === 0) {
      // No tests found at all - create a default one
      return res.status(200).json({
        success: true,
        message: `No existing tests found to migrate to ${toYear}. Please create tests in the Academic Management > Tests section first.`,
        data: { copied: 0 }
      });
    }

    // Prepare documents for insertion
    const newTests = sourceTests.map(test => {
      const { _id, ...rest } = test;
      return {
        ...rest,
        academicYear: toYear,
        testId: test.testId ? 
          (test.testId.includes(fromYear || '') ? test.testId.replace(fromYear, toYear) : `${test.testId}_${toYear}`) 
          : `${schoolCode}_test_${toYear}_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    const result = await testsCollection.insertMany(newTests);

    console.log(`✅ Successfully copied ${result.insertedCount} tests to ${toYear}`);

    res.status(200).json({
      success: true,
      message: `Successfully migrated ${result.insertedCount} tests to ${toYear}`,
      data: { copied: result.insertedCount }
    });

  } catch (error) {
    console.error('❌ Error migrating tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error migrating tests',
      error: error.message
    });
  }
};

// Diagnostic: Check students' academic year status
exports.checkStudentsAcademicYear = async (req, res) => {
  try {
    const { schoolCode } = req.params;

    console.log(`📊 Checking academic year status for school: ${schoolCode}`);

    // Get school database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const studentsCollection = schoolConnection.collection('students');
    const subjectsCollection = schoolConnection.collection('classsubjects');
    const classesCollection = schoolConnection.collection('classes');
    const testsCollection = schoolConnection.collection('testdetails');

    // Get all active students
    const allStudents = await studentsCollection.find({
      isActive: true
    }).toArray();

    // Group by academic year
    const studentStats = {};
    allStudents.forEach(student => {
      const year = student.studentDetails?.academic?.academicYear || student.academicYear || 'Unknown';
      studentStats[year] = (studentStats[year] || 0) + 1;
    });

    // Get counts for other collections
    const subjectStats = await subjectsCollection.aggregate([
      { $group: { _id: "$academicYear", count: { $sum: 1 } } }
    ]).toArray();

    const classStats = await classesCollection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$academicYear", count: { $sum: 1 } } }
    ]).toArray();

    const testStats = await testsCollection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$academicYear", count: { $sum: 1 } } }
    ]).toArray();

    res.status(200).json({
      success: true,
      data: {
        students: {
          total: allStudents.length,
          byYear: studentStats
        },
        subjects: {
          byYear: subjectStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
        },
        classes: {
          byYear: classStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
        },
        tests: {
          byYear: testStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
        }
      }
    });

  } catch (error) {
    console.error('❌ Error checking students:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking students',
      error: error.message
    });
  }
};

module.exports = exports;


