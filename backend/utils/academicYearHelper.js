const School = require('../models/School');

/**
 * Get the current academic year for a school
 * @param {String} schoolCode - School code (e.g., 'P', 'NPS')
 * @returns {Promise<String>} - Academic year (e.g., '2024-2025')
 */
const getCurrentAcademicYear = async (schoolCode) => {
  try {
    const school = await School.findOne({ code: schoolCode }).select('settings.academicYear.currentYear');
    
    if (school && school.settings && school.settings.academicYear && school.settings.academicYear.currentYear) {
      return school.settings.academicYear.currentYear;
    }
    
    // Fallback to current year if not set
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Jan is 0
    
    // If current month is April or later, academic year is current-next
    // Otherwise, it's previous-current
    if (currentMonth >= 4) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  } catch (error) {
    console.error('Error fetching academic year:', error);
    // Return default fallback
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${currentYear + 1}`;
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
    
    // Fallback
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (currentMonth >= 4) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  } catch (error) {
    console.error('Error fetching academic year by ID:', error);
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${currentYear + 1}`;
  }
};

module.exports = {
  getCurrentAcademicYear,
  getCurrentAcademicYearById
};
