const School = require('../models/School');

// Get current academic year settings
exports.getAcademicYear = async (req, res) => {
  try {
    const { schoolCode } = req.params;

    console.log(`📅 [ACADEMIC YEAR] Fetch request for school: ${schoolCode}`);

    // Normalize school code to lowercase for consistency
    const normalizedSchoolCode = schoolCode.toLowerCase();

    // Find school with case-insensitive search
    const school = await School.findOne({ code: { $regex: new RegExp(`^${normalizedSchoolCode}$`, 'i') } });
    if (!school) {
      console.error(`📅 [ACADEMIC YEAR] ❌ School not found: ${schoolCode}`);
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    console.log(`📅 [ACADEMIC YEAR] Found school: ${school.name} (${school.code})`);

    const academicYear = school.settings?.academicYear || {
      currentYear: '2024-25',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31')
    };

    console.log(`📅 [ACADEMIC YEAR] Current academic year: ${academicYear.currentYear}`);
    console.log(`📅 [ACADEMIC YEAR] Start date: ${academicYear.startDate}`);
    console.log(`📅 [ACADEMIC YEAR] End date: ${academicYear.endDate}`);

    res.status(200).json({
      success: true,
      data: academicYear
    });

  } catch (error) {
    console.error('📅 [ACADEMIC YEAR] ❌ Error fetching academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching academic year',
      error: error.message
    });
  }
};

// Update academic year settings
exports.updateAcademicYear = async (req, res) => {
  try {
    const { schoolCode } = req.params;
    const { currentYear, startDate, endDate } = req.body;

    console.log(`📅 [ACADEMIC YEAR] Update request for school: ${schoolCode}`);
    console.log(`📅 [ACADEMIC YEAR] Data:`, { currentYear, startDate, endDate });

    if (!currentYear) {
      return res.status(400).json({
        success: false,
        message: 'Current year is required'
      });
    }

    // Normalize school code to lowercase for consistency
    const normalizedSchoolCode = schoolCode.toLowerCase();
    console.log(`📅 [ACADEMIC YEAR] Normalized school code: ${normalizedSchoolCode}`);

    // Find school with case-insensitive search
    const school = await School.findOne({ code: { $regex: new RegExp(`^${normalizedSchoolCode}$`, 'i') } });
    if (!school) {
      console.error(`📅 [ACADEMIC YEAR] ❌ School not found: ${schoolCode}`);
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    console.log(`📅 [ACADEMIC YEAR] Found school: ${school.name} (${school.code})`);

    // Update academic year settings in main database
    school.settings = school.settings || {};
    school.settings.academicYear = {
      currentYear,
      startDate: startDate ? new Date(startDate) : school.settings.academicYear?.startDate,
      endDate: endDate ? new Date(endDate) : school.settings.academicYear?.endDate
    };

    await school.save();
    console.log(`📅 [ACADEMIC YEAR] ✅ Saved to main database (School model)`);
    console.log(`📅 [ACADEMIC YEAR] Academic year: ${currentYear}`);

    // Also update in school-specific database (school_info collection)
    try {
      const DatabaseManager = require('../utils/databaseManager');
      const schoolConn = await DatabaseManager.getSchoolConnection(normalizedSchoolCode);
      const schoolInfoCollection = schoolConn.collection('school_info');

      // Update or create school_info document
      const updateResult = await schoolInfoCollection.updateOne(
        {},
        {
          $set: {
            'settings.academicYear': {
              currentYear,
              startDate: startDate ? new Date(startDate) : school.settings.academicYear?.startDate,
              endDate: endDate ? new Date(endDate) : school.settings.academicYear?.endDate
            },
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      console.log(`📅 [ACADEMIC YEAR] ✅ Synced to school_${normalizedSchoolCode}.school_info`);
      console.log(`📅 [ACADEMIC YEAR] Update result:`, {
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount,
        upserted: updateResult.upsertedCount
      });
    } catch (syncError) {
      console.error(`📅 [ACADEMIC YEAR] ⚠️ Failed to sync to school database:`, syncError.message);
      // Don't fail the request if sync fails - main database is source of truth
    }

    res.status(200).json({
      success: true,
      message: 'Academic year updated successfully',
      data: school.settings.academicYear
    });

  } catch (error) {
    console.error('📅 [ACADEMIC YEAR] ❌ Error updating academic year:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating academic year',
      error: error.message
    });
  }
};

module.exports = exports;
