const School = require('../models/School');

/**
 * Synchronously calculates the dynamic academic year based on current date.
 * Returns short format: YYYY-YY (e.g., 2024-25)
 */
const getDynamicAcademicYear = () => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed, 3 is April
  const startYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  return `${startYear}-${endYear.toString().slice(-2)}`;
};

/**
 * Get the current academic year for a school
 * @param {String} schoolCode - School code (e.g., 'P', 'NPS')
 * @returns {Promise<String>} - Academic year (e.g., '2024-25')
 */
const getCurrentAcademicYear = async (schoolCode) => {
  try {
    const school = await School.findOne({ code: schoolCode }).select('settings.academicYear.currentYear');
    
    if (school && school.settings && school.settings.academicYear && school.settings.academicYear.currentYear) {
      return school.settings.academicYear.currentYear;
    }
    
    return getDynamicAcademicYear();
  } catch (error) {
    console.error('Error fetching academic year:', error);
    return getDynamicAcademicYear();
  }
};

/**
 * Get academic year from school ID
 * @param {ObjectId} schoolId - School ObjectId
 * @returns {Promise<String>} - Academic year
 */
const getCurrentAcademicYearById = async (schoolId) => {
  try {
    const school = await School.findById(schoolId).select('settings.academicYear.currentYear');
    
    if (school && school.settings && school.settings.academicYear && school.settings.academicYear.currentYear) {
      return school.settings.academicYear.currentYear;
    }
    
    return getDynamicAcademicYear();
  } catch (error) {
    console.error('Error fetching academic year by ID:', error);
    return getDynamicAcademicYear();
  }
};

module.exports = {
  getCurrentAcademicYear,
  getCurrentAcademicYearById,
  getDynamicAcademicYear
};
