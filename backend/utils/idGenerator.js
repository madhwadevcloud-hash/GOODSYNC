const User = require('../models/User');
const School = require('../models/School');

/**
 * Generate a unique student ID based on school code
 * Format: SCHOOL_CODE + YEAR + SEQUENTIAL_NUMBER (e.g., NPS2024001)
 */
async function generateStudentId(schoolId, academicYear) {
  try {
    const school = await School.findById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    const schoolCode = school.code;
    const year = academicYear.slice(-4); // Extract last 4 digits of year
    
    // Find the last student ID for this school and year
    const lastStudent = await User.findOne({
      schoolId,
      role: 'student',
      'studentDetails.studentId': { $regex: `^${schoolCode}${year}` }
    }).sort({ 'studentDetails.studentId': -1 });

    let sequence = 1;
    if (lastStudent && lastStudent.studentDetails.studentId) {
      const lastSequence = parseInt(lastStudent.studentDetails.studentId.slice(-3));
      sequence = lastSequence + 1;
    }

    // Format: SCHOOL_CODE + YEAR + 3-digit sequence
    const studentId = `${schoolCode}${year}${sequence.toString().padStart(3, '0')}`;
    
    return studentId;
  } catch (error) {
    throw new Error(`Error generating student ID: ${error.message}`);
  }
}

/**
 * Generate a unique teacher ID based on school code
 * Format: SCHOOL_CODE + T + SEQUENTIAL_NUMBER (e.g., NPST001)
 */
async function generateTeacherId(schoolId) {
  try {
    const school = await School.findById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    const schoolCode = school.code;
    
    // Find the last teacher ID for this school
    const lastTeacher = await User.findOne({
      schoolId,
      role: 'teacher',
      'teacherDetails.employeeId': { $regex: `^${schoolCode}T` }
    }).sort({ 'teacherDetails.employeeId': -1 });

    let sequence = 1;
    if (lastTeacher && lastTeacher.teacherDetails.employeeId) {
      const lastSequence = parseInt(lastTeacher.teacherDetails.employeeId.slice(-3));
      sequence = lastSequence + 1;
    }

    // Format: SCHOOL_CODE + T + 3-digit sequence
    const teacherId = `${schoolCode}T${sequence.toString().padStart(3, '0')}`;
    
    return teacherId;
  } catch (error) {
    throw new Error(`Error generating teacher ID: ${error.message}`);
  }
}

/**
 * Generate a unique parent ID based on school code
 * Format: SCHOOL_CODE + P + SEQUENTIAL_NUMBER (e.g., NPSP001)
 */
async function generateParentId(schoolId) {
  try {
    const school = await School.findById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    const schoolCode = school.code;
    
    // Find the last parent ID for this school
    const lastParent = await User.findOne({
      schoolId,
      role: 'parent',
      'parentDetails.parentId': { $regex: `^${schoolCode}P` }
    }).sort({ 'parentDetails.parentId': -1 });

    let sequence = 1;
    if (lastParent && lastParent.parentDetails.parentId) {
      const lastSequence = parseInt(lastParent.parentDetails.parentId.slice(-3));
      sequence = lastSequence + 1;
    }

    // Format: SCHOOL_CODE + P + 3-digit sequence
    const parentId = `${schoolCode}P${sequence.toString().padStart(3, '0')}`;
    
    return parentId;
  } catch (error) {
    throw new Error(`Error generating parent ID: ${error.message}`);
  }
}

/**
 * Generate a unique admission number
 * Format: SCHOOL_CODE + YEAR + SEQUENTIAL_NUMBER (e.g., NPS2024001)
 */
async function generateAdmissionNumber(schoolId, academicYear) {
  try {
    const school = await School.findById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    const schoolCode = school.code;
    const year = academicYear.slice(-4); // Extract last 4 digits of year
    
    // Find the last admission number for this school and year
    const Admission = require('../models/Admission');
    const lastAdmission = await Admission.findOne({
      schoolId,
      academicYear,
      admissionNumber: { $regex: `^${schoolCode}${year}` }
    }).sort({ admissionNumber: -1 });

    let sequence = 1;
    if (lastAdmission && lastAdmission.admissionNumber) {
      const lastSequence = parseInt(lastAdmission.admissionNumber.slice(-3));
      sequence = lastSequence + 1;
    }

    // Format: SCHOOL_CODE + YEAR + 3-digit sequence
    const admissionNumber = `${schoolCode}${year}${sequence.toString().padStart(3, '0')}`;
    
    return admissionNumber;
  } catch (error) {
    throw new Error(`Error generating admission number: ${error.message}`);
  }
}

module.exports = {
  generateStudentId,
  generateTeacherId,
  generateParentId,
  generateAdmissionNumber
};
