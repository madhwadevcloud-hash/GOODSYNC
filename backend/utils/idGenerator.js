const User = require('../models/User');
const School = require('../models/School');
const Counter = require('../models/Counter');

/**
 * Helper to get atomic sequence
 */
async function getAtomicSequence(counterName, findMaxRecordFn, extractSeqFn) {
  let counter = await Counter.findById(counterName);
  if (!counter) {
    const lastRecord = await findMaxRecordFn();
    let lastSequence = 0;
    if (lastRecord) {
      lastSequence = extractSeqFn(lastRecord) || 0;
    }
    try {
      await Counter.create({ _id: counterName, seq: lastSequence });
    } catch (err) {
      // Ignore if it already exists due to concurrent creation
    }
  }
  return await Counter.getNextSequence(counterName);
}

/**
 * Generate a unique student ID based on school code
 * Format: SCHOOL_CODE + YEAR + SEQUENTIAL_NUMBER (e.g., NPS2024001)
 */
async function generateStudentId(schoolId, academicYear) {
  try {
    const school = await School.findById(schoolId);
    if (!school) throw new Error('School not found');

    const schoolCode = school.code;
    const year = academicYear.slice(-4);
    const counterName = `studentId_${schoolCode}_${year}`;

    const sequence = await getAtomicSequence(
      counterName,
      () => User.findOne({
        schoolId, role: 'student', 'studentDetails.studentId': { $regex: `^${schoolCode}${year}` }
      }).sort({ 'studentDetails.studentId': -1 }),
      (lastStudent) => parseInt(lastStudent.studentDetails.studentId.slice(-3))
    );

    return `${schoolCode}${year}${sequence.toString().padStart(3, '0')}`;
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
    if (!school) throw new Error('School not found');

    const schoolCode = school.code;
    const counterName = `teacherId_${schoolCode}`;

    const sequence = await getAtomicSequence(
      counterName,
      () => User.findOne({
        schoolId, role: 'teacher', 'teacherDetails.employeeId': { $regex: `^${schoolCode}T` }
      }).sort({ 'teacherDetails.employeeId': -1 }),
      (lastTeacher) => parseInt(lastTeacher.teacherDetails.employeeId.slice(-3))
    );

    return `${schoolCode}T${sequence.toString().padStart(3, '0')}`;
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
    if (!school) throw new Error('School not found');

    const schoolCode = school.code;
    const counterName = `parentId_${schoolCode}`;

    const sequence = await getAtomicSequence(
      counterName,
      () => User.findOne({
        schoolId, role: 'parent', 'parentDetails.parentId': { $regex: `^${schoolCode}P` }
      }).sort({ 'parentDetails.parentId': -1 }),
      (lastParent) => parseInt(lastParent.parentDetails.parentId.slice(-3))
    );

    return `${schoolCode}P${sequence.toString().padStart(3, '0')}`;
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
    if (!school) throw new Error('School not found');

    const schoolCode = school.code;
    const year = academicYear.slice(-4);
    const counterName = `admissionNo_${schoolCode}_${year}`;
    const Admission = require('../models/Admission');

    const sequence = await getAtomicSequence(
      counterName,
      () => Admission.findOne({
        schoolId, academicYear, admissionNumber: { $regex: `^${schoolCode}${year}` }
      }).sort({ admissionNumber: -1 }),
      (lastAdmission) => parseInt(lastAdmission.admissionNumber.slice(-3))
    );

    return `${schoolCode}${year}${sequence.toString().padStart(3, '0')}`;
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
