const bcrypt = require('bcryptjs');

/**
 * Generate a random password with specified length
 * @param {number} length - Length of password (default: 8)
 * @returns {string} - Generated password
 */
function generateRandomPassword(length = 8) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  // Ensure at least one uppercase, one lowercase, and one number
  password += charset.charAt(Math.floor(Math.random() * 26)); // Uppercase
  password += charset.charAt(26 + Math.floor(Math.random() * 26)); // Lowercase
  password += charset.charAt(52 + Math.floor(Math.random() * 10)); // Number
  
  // Fill the rest randomly
  for (let i = 3; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate a student-specific password
 * Format: First letter of name + Last 4 digits of student ID + random 3 chars
 * @param {string} studentName - Student's name
 * @param {string} studentId - Student ID
 * @returns {string} - Generated password
 */
function generateStudentPassword(studentName, studentId) {
  const nameStr = String(studentName || '');
  const idStr = String(studentId || '');
  const firstLetter = nameStr.charAt(0).toUpperCase();
  const lastFourDigits = idStr.slice(-4);
  const randomChars = generateRandomPassword(3);
  return `${firstLetter}${lastFourDigits}${randomChars}`;
}

/**
 * Generate a student password based on Date of Birth
 * Format: DDMMYYYY (8 digits)
 * @param {string|Date} dateOfBirth - Date of birth in any format (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or Date object)
 * @returns {string} - Generated password based on DOB in DDMMYYYY format
 */
function generateStudentPasswordFromDOB(dateOfBirth) {
  if (!dateOfBirth) {
    return generateRandomPassword(8);
  }
  
  try {
    let day, month, year;
    
    // If it's a Date object, extract components
    if (dateOfBirth instanceof Date) {
      day = String(dateOfBirth.getUTCDate()).padStart(2, '0');
      month = String(dateOfBirth.getUTCMonth() + 1).padStart(2, '0');
      year = String(dateOfBirth.getUTCFullYear());
      return `${day}${month}${year}`;
    }
    
    const dobStr = String(dateOfBirth).trim();
    
    // Check if it's already in DDMMYYYY format (8 digits only)
    if (/^\d{8}$/.test(dobStr)) {
      return dobStr;
    }
    
    // Try to parse different date formats
    const parts = dobStr.split(/[\/\-\.]/);
    
    if (parts.length === 3) {
      // Determine format based on first part length
      if (parts[0].length === 4) {
        // YYYY-MM-DD or YYYY/MM/DD format
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
      } else {
        // DD-MM-YYYY or DD/MM/YYYY format
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = parts[2];
      }
      
      // Validate the components
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        return `${day}${month}${year}`;
      }
    }
    
    // If all parsing fails, try to create a Date object and extract components
    const dateObj = new Date(dobStr);
    if (!isNaN(dateObj.getTime())) {
      day = String(dateObj.getUTCDate()).padStart(2, '0');
      month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      year = String(dateObj.getUTCFullYear());
      return `${day}${month}${year}`;
    }
    
  } catch (error) {
    console.error(`Error parsing date of birth: ${dateOfBirth}`, error);
  }
  
  // Fallback to random password if all parsing fails
  console.warn(`Could not parse date of birth: ${dateOfBirth}, generating random password`);
  return generateRandomPassword(8);
}

/**
 * Generate a teacher-specific password
 * Format: First letter of name + Last 3 digits of employee ID + random 4 chars
 * @param {string} teacherName - Teacher's name
 * @param {string} employeeId - Employee ID
 * @returns {string} - Generated password
 */
function generateTeacherPassword(teacherName, employeeId) {
  const nameStr = String(teacherName || '');
  const idStr = String(employeeId || '');
  const firstLetter = nameStr.charAt(0).toUpperCase();
  const lastThreeDigits = idStr.slice(-3);
  const randomChars = generateRandomPassword(4);
  return `${firstLetter}${lastThreeDigits}${randomChars}`;
}

/**
 * Generate a parent-specific password
 * Format: First letter of name + Last 3 digits of parent ID + random 4 chars
 * @param {string} parentName - Parent's name
 * @param {string} parentId - Parent ID
 * @returns {string} - Generated password
 */
function generateParentPassword(parentName, parentId) {
  const nameStr = String(parentName || '');
  const idStr = String(parentId || '');
  const firstLetter = nameStr.charAt(0).toUpperCase();
  const lastThreeDigits = idStr.slice(-3);
  const randomChars = generateRandomPassword(4);
  return `${firstLetter}${lastThreeDigits}${randomChars}`;
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a temporary password for password reset
 * @returns {string} - Temporary password
 */
function generateTemporaryPassword() {
  return generateRandomPassword(10);
}

module.exports = {
  generateRandomPassword,
  generateStudentPassword,
  generateStudentPasswordFromDOB,
  generateTeacherPassword,
  generateParentPassword,
  hashPassword,
  verifyPassword,
  generateTemporaryPassword
};
