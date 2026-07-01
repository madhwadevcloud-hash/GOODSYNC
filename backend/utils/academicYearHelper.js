const School = require('../models/School');
const NodeCache = require('node-cache');

// Initialize cache for academic years
// stdTTL: 30 minutes (1800 seconds) since school years change rarely
// checkperiod: checks and removes expired elements every 60 seconds
const academicCache = new NodeCache({ stdTTL: 1800, checkperiod: 60 });

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
    if (!schoolCode) return getDynamicAcademicYear();

    const cacheKey = `ay_code_${schoolCode}`;
    const cachedYear = academicCache.get(cacheKey);
    if (cachedYear) {
      return cachedYear; // Instant non-blocking return
    }

    const school = await School.findOne({ code: schoolCode }).select('settings.academicYear.currentYear');
    
    if (school && school.settings && school.settings.academicYear && school.settings.academicYear.currentYear) {
      const year = school.settings.academicYear.currentYear;
      academicCache.set(cacheKey, year);
      return year;
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
    if (!schoolId) return getDynamicAcademicYear();

    const cacheKey = `ay_id_${schoolId.toString()}`;
    const cachedYear = academicCache.get(cacheKey);
    if (cachedYear) {
      return cachedYear;
    }

    const school = await School.findById(schoolId).select('settings.academicYear.currentYear');
    
    if (school && school.settings && school.settings.academicYear && school.settings.academicYear.currentYear) {
      const year = school.settings.academicYear.currentYear;
      academicCache.set(cacheKey, year);
      return year;
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
  getDynamicAcademicYear,
  academicCache // Exporting cache instance allows clearing on settings update
};