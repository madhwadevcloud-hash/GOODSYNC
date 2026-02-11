const DatabaseManager = require('../utils/databaseManager');
const School = require('../models/School');

// Migrate existing students to add academic year
exports.migrateStudentAcademicYear = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { academicYear } = req.body;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }

    console.log(`📢 Migration Request: Setting academic year ${academicYear} for all students in ${schoolCode}`);

    // Get school
    const school = await School.findOne({ code: schoolCode });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const usersCollection = schoolConnection.collection('users');

    // Find all active students without academic year or with empty academic year
    const studentsToUpdate = await usersCollection.find({
      role: 'student',
      isActive: true,
      $or: [
        { 'studentDetails.academic.academicYear': { $exists: false } },
        { 'studentDetails.academic.academicYear': null },
        { 'studentDetails.academic.academicYear': '' }
      ]
    }).toArray();

    console.log(`📊 Found ${studentsToUpdate.length} students without academic year`);

    if (studentsToUpdate.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All students already have academic year set',
        data: { updated: 0 }
      });
    }

    // Update all students
    const result = await usersCollection.updateMany(
      {
        role: 'student',
        isActive: true,
        $or: [
          { 'studentDetails.academic.academicYear': { $exists: false } },
          { 'studentDetails.academic.academicYear': null },
          { 'studentDetails.academic.academicYear': '' }
        ]
      },
      {
        $set: {
          'studentDetails.academic.academicYear': academicYear,
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

// Diagnostic: Check students' academic year status
exports.checkStudentsAcademicYear = async (req, res) => {
  try {
    const { schoolCode } = req.params;

    console.log(`📊 Checking academic year status for school: ${schoolCode}`);

    // Get school database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const usersCollection = schoolConnection.collection('users');

    // Get all active students
    const allStudents = await usersCollection.find({
      role: 'student',
      isActive: true
    }).toArray();

    console.log(`📊 Total active students: ${allStudents.length}`);

    // Group by academic year
    const byAcademicYear = {};
    const withoutYear = [];

    allStudents.forEach(student => {
      const academicYear = student.studentDetails?.academic?.academicYear;
      if (academicYear) {
        if (!byAcademicYear[academicYear]) {
          byAcademicYear[academicYear] = [];
        }
        byAcademicYear[academicYear].push({
          userId: student.userId,
          name: student.name,
          class: student.studentDetails?.academic?.currentClass,
          section: student.studentDetails?.academic?.currentSection
        });
      } else {
        withoutYear.push({
          userId: student.userId,
          name: student.name,
          class: student.studentDetails?.academic?.currentClass,
          section: student.studentDetails?.academic?.currentSection
        });
      }
    });

    console.log(`📊 Students by academic year:`, Object.keys(byAcademicYear));
    console.log(`📊 Students without academic year: ${withoutYear.length}`);

    res.status(200).json({
      success: true,
      data: {
        totalStudents: allStudents.length,
        byAcademicYear: Object.keys(byAcademicYear).map(year => ({
          year,
          count: byAcademicYear[year].length,
          students: byAcademicYear[year]
        })),
        withoutAcademicYear: {
          count: withoutYear.length,
          students: withoutYear
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
