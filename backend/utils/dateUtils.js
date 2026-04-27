/**
 * Date and Academic Year Utilities
 */

/**
 * Get the current academic year based on today's date
 * Cycle: April to March
 * @returns {String} Academic Year (e.g., '2025-26')
 */
const getDefaultAcademicYear = () => {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 3=Apr
  const year = now.getFullYear();
  
  let startYear, endYear;
  
  if (month >= 3) { // April (3) or later
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }
  
  // Return format YYYY-YY (e.g., 2025-26)
  return `${startYear}-${endYear.toString().slice(-2)}`;
};

/**
 * Normalize academic year to YYYY-YYYY format
 * @param {String} ay 
 * @returns {String}
 */
const normalizeAcademicYear = (ay) => {
  if (!ay) return getDefaultAcademicYear();
  
  const trimmed = String(ay).trim();
  
  // If format is YYYY-YY (e.g., 2024-25)
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const century = parts[0].substring(0, 2);
    return `${parts[0]}-${century}${parts[1]}`;
  }
  
  // If format is already YYYY-YYYY
  if (/^\d{4}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  
  return trimmed;
};

module.exports = {
  getDefaultAcademicYear,
  normalizeAcademicYear
};
