/**
 * ResultController.js
 * Merged and unified controller combining two versions:
 * - createOrUpdateResult, ranking, grading
 * - saveResults, getResults (supporting nested & flat formats)
 * - getResultsForTeacher (formatted teacher view)
 * - freezeResults, updateResult
 * - class performance endpoints & dashboard stats
 *
 * Framework: Express + Mongoose (CommonJS)
 *
 * Option A: Detailed logs, comments, and developer-friendly messages retained.
 */

const Result = require('../models/Result');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const { gradeSystem, gradeUtils } = require('../utils/gradeSystem');
const { getCurrentAcademicYear } = require('../utils/academicYearHelper');

// -----------------------------
// Core: Create / Update Result
// -----------------------------
exports.createOrUpdateResult = async (req, res) => {
  try {
    const {
      studentId,
      class: grade,
      section,
      academicYear,
      examType,
      subjects,
      overallGrade,
      remarks
    } = req.body;

    const schoolCode = req.user.schoolCode;
    const schoolId = req.user.schoolId;

    // Validate required fields
    if (!studentId || !grade || !section || !examType || !subjects || subjects.length === 0) {
      return res.status(400).json({
        message: 'Student ID, class, section, exam type, and subjects are required'
      });
    }

    // Validate student
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      schoolCode,
      isActive: true
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Validate class
    const classDoc = await Class.findOne({
      schoolCode,
      grade,
      section,
      academicYear: academicYear || '2024-25'
    });

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get grade-specific grading system
    const gradingSystem = gradeUtils.getGradingSystem(grade);
    if (!gradingSystem) {
      return res.status(400).json({ message: 'Invalid grade level' });
    }

    // Process subjects (validates subject existence & calculates per-subject grade)
    const processedSubjects = await processSubjectMarks(subjects, grade, gradingSystem, schoolCode);

    // Calculate overall statistics
    const overallStats = calculateOverallStatistics(processedSubjects, gradingSystem);

    // Find existing result or create new
    let result = await Result.findOne({
      schoolCode,
      studentId,
      academicYear: academicYear || '2024-25',
      'examDetails.examType': examType,
      'classDetails.grade': grade,
      'classDetails.section': section
    });

    const resultData = {
      schoolId,
      schoolCode,
      studentId,
      studentDetails: {
        studentName: `${student.name.firstName} ${student.name.lastName}`,
        rollNumber: student.studentDetails?.rollNumber || '',
        admissionNumber: student.studentDetails?.admissionNumber || '',
        parentName: student.parentDetails?.fatherName || '',
        parentContact: student.parentDetails?.mobileNumber || ''
      },
      classDetails: {
        grade,
        section,
        classSection: `${grade}${section}`,
        stream: classDoc.stream || null,
        academicYear: academicYear || '2024-25'
      },
      examDetails: {
        examType,
        examDate: new Date(),
        maxMarks: processedSubjects.reduce((sum, s) => sum + (s.total.maxMarks || 100), 0),
        resultDate: new Date()
      },
      subjects: processedSubjects,
      overallResult: {
        totalMarks: overallStats.totalMarks,
        maxMarks: overallStats.maxMarks,
        percentage: overallStats.percentage,
        grade: overallStats.grade,
        gradePoint: overallStats.gradePoint,
        status: overallStats.status,
        rank: null, // Will be calculated separately
        remarks: remarks || ''
      },
      gradingSystem: {
        type: gradingSystem.type,
        scale: gradingSystem.scale,
        grades: gradingSystem.grades
      },
      isActive: true,
      publishedAt: new Date(),
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    };

    if (result) {
      // Update existing result
      Object.assign(result, resultData);
      result.lastModified = new Date();
      await result.save();
      console.log(`✏️  Updated result for student ${studentId} (${grade}-${section})`);
    } else {
      // Create new result
      result = new Result(resultData);
      await result.save();
      console.log(`🆕 Created result for student ${studentId} (${grade}-${section})`);
    }

    // Calculate rank among classmates (updates all documents in that class & exam)
    await calculateClassRank(result, schoolCode, grade, section, examType, academicYear || '2024-25');

    res.status(result.isNew ? 201 : 200).json({
      success: true,
      message: result.isNew ? 'Result created successfully' : 'Result updated successfully',
      result: {
        id: result._id,
        resultId: result.resultId,
        studentName: result.studentDetails.studentName,
        classSection: result.classDetails.classSection,
        examType: result.examDetails.examType,
        percentage: result.overallResult.percentage,
        grade: result.overallResult.grade,
        status: result.overallResult.status,
        rank: result.overallResult.rank
      }
    });

  } catch (error) {
    console.error('Error creating/updating result:', error);
    res.status(500).json({ message: 'Error processing result', error: error.message });
  }
};

// --------------------------------------
// Process subject marks & grade calc
// --------------------------------------
const processSubjectMarks = async (subjects, grade, gradingSystem, schoolCode) => {
  const processedSubjects = [];

  for (let subjectData of subjects) {
    const {
      subjectCode,
      marksObtained,
      maxMarks = 100,
      practicalMarks = 0,
      maxPracticalMarks = 0,
      isOptional = false
    } = subjectData;

    // Validate subject exists for the grade
    const subject = await Subject.findOne({
      schoolCode,
      subjectCode,
      'applicableGrades.grade': grade,
      isActive: true
    });

    if (!subject) {
      throw new Error(`Subject ${subjectCode} not found for grade ${grade}`);
    }

    // Calculate totals and percentages
    const theoryObtained = marksObtained || 0;
    const practicalObtained = practicalMarks || 0;
    const totalMarksObtained = theoryObtained + practicalObtained;
    const totalMaxMarks = (maxMarks || 100) + (maxPracticalMarks || 0);

    const percentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

    // Calculate grade using grading system
    const subjectGrade = calculateGrade(percentage, gradingSystem);

    processedSubjects.push({
      subjectCode,
      subjectName: subject.subjectName,
      subjectType: subject.subjectType,
      isOptional,
      theory: {
        marksObtained: theoryObtained,
        maxMarks: maxMarks || 100,
        percentage: maxMarks > 0 ? ((theoryObtained) / maxMarks) * 100 : 0
      },
      practical: {
        marksObtained: practicalObtained,
        maxMarks: maxPracticalMarks || 0,
        percentage: maxPracticalMarks > 0 ? (practicalObtained / maxPracticalMarks) * 100 : 0
      },
      total: {
        marksObtained: totalMarksObtained,
        maxMarks: totalMaxMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade: subjectGrade.grade,
        gradePoint: subjectGrade.gradePoint,
        status: subjectGrade.status
      },
      teacherRemarks: subjectData.teacherRemarks || ''
    });
  }

  return processedSubjects;
};

// --------------------------------------
// Overall statistics calculation
// --------------------------------------
const calculateOverallStatistics = (subjects, gradingSystem) => {
  const totalMarks = subjects.reduce((sum, s) => sum + (s.total.marksObtained || 0), 0);
  const maxMarks = subjects.reduce((sum, s) => sum + (s.total.maxMarks || 0), 0);
  const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;

  const overallGrade = calculateGrade(percentage, gradingSystem);

  return {
    totalMarks,
    maxMarks,
    percentage: Math.round(percentage * 100) / 100,
    grade: overallGrade.grade,
    gradePoint: overallGrade.gradePoint,
    status: overallGrade.status
  };
};

// --------------------------------------
// Grading helpers
// --------------------------------------
const calculateGrade = (percentage, gradingSystem) => {
  for (let grade of gradingSystem.grades) {
    if (percentage >= grade.minPercentage && percentage <= grade.maxPercentage) {
      return {
        grade: grade.grade,
        gradePoint: grade.gradePoint,
        status: grade.grade === 'F' ? 'fail' : 'pass'
      };
    }
  }

  // Default to fail if no grade found
  return {
    grade: 'F',
    gradePoint: 0,
    status: 'fail'
  };
};

// Simpler CBSE/ICSE style grading used in some endpoints
const calculateSimpleGrade = (obtainedMarks, totalMarks) => {
  if (obtainedMarks === null || obtainedMarks === undefined || !totalMarks || totalMarks === 0) return null;

  const percentage = (obtainedMarks / totalMarks) * 100;

  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  if (percentage >= 21) return 'E1';
  return 'E2';
};

// --------------------------------------
// Rank calculation (updates all class results)
// --------------------------------------
const calculateClassRank = async (currentResult, schoolCode, grade, section, examType, academicYear) => {
  try {
    const classResults = await Result.find({
      schoolCode,
      'classDetails.grade': grade,
      'classDetails.section': section,
      'examDetails.examType': examType,
      'classDetails.academicYear': academicYear,
      isActive: true
    }).sort({ 'overallResult.percentage': -1 });

    for (let i = 0; i < classResults.length; i++) {
      const result = classResults[i];
      result.overallResult.rank = i + 1;
      result.overallResult.totalStudents = classResults.length;
      await result.save();
    }

    console.log(`🏅 Updated ranks for ${classResults.length} students in ${grade}-${section} (${examType})`);
  } catch (error) {
    console.error('Error calculating class rank:', error);
  }
};

// ---------------------------------------------------------
// Get student result history (used by student profile view)
// ---------------------------------------------------------
exports.getStudentResultHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, examType } = req.query;

    const schoolCode = req.user.schoolCode;

    // Build query
    const query = {
      schoolCode,
      studentId,
      isActive: true
    };

    if (academicYear) query['classDetails.academicYear'] = academicYear;
    if (examType) query['examDetails.examType'] = examType;

    const results = await Result.find(query)
      .sort({ 'examDetails.examDate': -1 })
      .select({
        resultId: 1,
        'classDetails.grade': 1,
        'classDetails.section': 1,
        'examDetails.examType': 1,
        'examDetails.examDate': 1,
        'overallResult.percentage': 1,
        'overallResult.grade': 1,
        'overallResult.status': 1,
        'overallResult.rank': 1,
        'overallResult.totalStudents': 1
      });

    // Calculate progress trend
    const progressTrend = calculateProgressTrend(results);

    res.json({
      success: true,
      studentId,
      resultCount: results.length,
      results,
      progressTrend
    });

  } catch (error) {
    console.error('Error fetching student result history:', error);
    res.status(500).json({ message: 'Error fetching result history', error: error.message });
  }
};

const calculateProgressTrend = (results) => {
  if (!results || results.length < 2) return { trend: 'insufficient_data' };

  const latest = results[0];
  const previous = results[1];

  const improvement = latest.overallResult.percentage - previous.overallResult.percentage;

  return {
    trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
    improvement: Math.round(improvement * 100) / 100,
    latestPercentage: latest.overallResult.percentage,
    previousPercentage: previous.overallResult.percentage
  };
};

// ---------------------------------------------------------
// Generate class performance report (API)
// ---------------------------------------------------------
exports.generateClassPerformanceReport = async (req, res) => {
  try {
    const { grade, section } = req.params;
    const { academicYear, examType } = req.query;

    const schoolCode = req.user.schoolCode;

    // Get all results for the class
    const results = await Result.find({
      schoolCode,
      'classDetails.grade': grade,
      'classDetails.section': section,
      'classDetails.academicYear': academicYear || '2024-25',
      'examDetails.examType': examType,
      isActive: true
    }).populate('studentId', 'name');

    if (results.length === 0) {
      return res.status(404).json({ message: 'No results found for the specified criteria' });
    }

    // Calculate class statistics
    const classStats = calculateClassStatistics(results);

    // Generate subject-wise analysis
    const subjectAnalysis = generateSubjectAnalysis(results);

    // Find top performers
    const topPerformers = results
      .sort((a, b) => b.overallResult.percentage - a.overallResult.percentage)
      .slice(0, 5)
      .map(r => ({
        studentId: r.studentId._id,
        studentName: `${r.studentId.name.firstName} ${r.studentId.name.lastName}`,
        percentage: r.overallResult.percentage,
        grade: r.overallResult.grade,
        rank: r.overallResult.rank
      }));

    // Generate grade distribution
    const gradeDistribution = generateGradeDistribution(results);

    res.json({
      success: true,
      classDetails: {
        grade,
        section,
        academicYear: academicYear || '2024-25',
        examType,
        totalStudents: results.length
      },
      classStatistics: classStats,
      subjectAnalysis,
      topPerformers,
      gradeDistribution
    });

  } catch (error) {
    console.error('Error generating class performance report:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};

// ---------------------------------------------------------
// Class statistics helpers
// ---------------------------------------------------------
const calculateClassStatistics = (results) => {
  const percentages = results.map(r => r.overallResult.percentage || 0);
  const total = percentages.reduce((sum, p) => sum + p, 0);

  return {
    averagePercentage: percentages.length > 0 ? Math.round((total / percentages.length) * 100) / 100 : 0,
    highestPercentage: percentages.length > 0 ? Math.max(...percentages) : 0,
    lowestPercentage: percentages.length > 0 ? Math.min(...percentages) : 0,
    passCount: results.filter(r => r.overallResult.status === 'pass').length,
    failCount: results.filter(r => r.overallResult.status === 'fail').length,
    passPercentage: results.length > 0 ? Math.round((results.filter(r => r.overallResult.status === 'pass').length / results.length) * 10000) / 100 : 0
  };
};

const generateSubjectAnalysis = (results) => {
  const subjectStats = {};

  results.forEach(result => {
    (result.subjects || []).forEach(subject => {
      if (!subjectStats[subject.subjectCode]) {
        subjectStats[subject.subjectCode] = {
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          percentages: [],
          passCount: 0,
          failCount: 0
        };
      }

      // Some legacy documents might store percentage at root or subject.total
      const subjectPercentage = subject.total?.percentage ?? subject.percentage ?? null;
      if (subjectPercentage !== null && subjectPercentage !== undefined) {
        subjectStats[subject.subjectCode].percentages.push(subjectPercentage);
      }

      if ((subject.total && subject.total.status) === 'pass' || subject.status === 'pass') {
        subjectStats[subject.subjectCode].passCount++;
      } else {
        subjectStats[subject.subjectCode].failCount++;
      }
    });
  });

  Object.keys(subjectStats).forEach(subjectCode => {
    const subject = subjectStats[subjectCode];
    const total = subject.percentages.reduce((sum, p) => sum + p, 0);
    subject.averagePercentage = subject.percentages.length > 0 ? Math.round((total / subject.percentages.length) * 100) / 100 : 0;
    subject.highestPercentage = subject.percentages.length > 0 ? Math.max(...subject.percentages) : 0;
    subject.lowestPercentage = subject.percentages.length > 0 ? Math.min(...subject.percentages) : 0;
    subject.passPercentage = subject.percentages.length > 0 ? Math.round((subject.passCount / subject.percentages.length) * 10000) / 100 : 0;

    // Remove raw percentages array to keep API compact
    delete subject.percentages;
  });

  return subjectStats;
};

const generateGradeDistribution = (results) => {
  const distribution = {};

  results.forEach(result => {
    const grade = result.overallResult.grade;
    distribution[grade] = (distribution[grade] || 0) + 1;
  });

  return distribution;
};

// ---------------------------------------------------------
// Simple results save (bulk) & compatibility with legacy schema
// ---------------------------------------------------------
exports.saveResults = async (req, res) => {
  try {
    const {
      schoolCode,
      class: className,
      section,
      testType,
      subject,
      maxMarks,
      academicYear,
      results
    } = req.body;

    console.log('💾 Saving results:', { schoolCode, className, section, testType, subject, maxMarks, academicYear, resultsCount: results?.length });

    if (!schoolCode || !className || !section || !testType || !subject || !results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolCode, class, section, testType, subject, and results array'
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required. Please ensure the school settings have a current academic year configured.'
      });
    }

    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');

    const savedResults = [];
    const errors = [];

    for (const result of results) {
      try {
        const studentId = result.studentId;
        const obtainedMarks = result.obtainedMarks !== null && result.obtainedMarks !== undefined
          ? parseInt(result.obtainedMarks)
          : null;

        const existingResult = await resultsCollection.findOne({
          schoolCode: schoolCode.toUpperCase(),
          className,
          section,
          academicYear: academicYear || '2024-25',
          studentId
        });

        const now = new Date();

        if (existingResult) {
          // Update existing document - add or update the subject entry
          const subjectIndex = existingResult.subjects?.findIndex(
            s => s.subjectName === subject && s.testType === testType
          );

          if (subjectIndex >= 0 && existingResult.subjects[subjectIndex].frozen) {
            errors.push({
              studentId: result.studentId,
              studentName: result.studentName,
              error: 'Results are frozen and cannot be modified'
            });
            continue; // Skip this student
          }

          let updatedSubjects = existingResult.subjects || [];

          const totalMarksValue = parseInt(result.totalMarks || maxMarks);
          const calculatedGrade = calculateSimpleGrade(obtainedMarks, totalMarksValue);
          const calculatedPercentage = obtainedMarks !== null && totalMarksValue > 0
            ? Math.round((obtainedMarks / totalMarksValue) * 100 * 100) / 100
            : null;

          if (subjectIndex >= 0) {
            updatedSubjects[subjectIndex] = {
              subjectName: subject,
              testType,
              maxMarks: parseInt(maxMarks),
              obtainedMarks,
              totalMarks: totalMarksValue,
              grade: calculatedGrade,
              percentage: calculatedPercentage,
              updatedAt: now,
              frozen: existingResult.subjects[subjectIndex].frozen || false,
              frozenAt: existingResult.subjects[subjectIndex].frozenAt || null,
              frozenBy: existingResult.subjects[subjectIndex].frozenBy || null
            };
          } else {
            updatedSubjects.push({
              subjectName: subject,
              testType,
              maxMarks: parseInt(maxMarks),
              obtainedMarks,
              totalMarks: totalMarksValue,
              grade: calculatedGrade,
              percentage: calculatedPercentage,
              createdAt: now,
              updatedAt: now
            });
          }

          await resultsCollection.updateOne(
            { _id: existingResult._id },
            {
              $set: {
                subjects: updatedSubjects,
                updatedAt: now,
                updatedBy: req.user?._id || null
              }
            }
          );

          savedResults.push({
            studentId,
            studentName: result.studentName,
            userId: result.userId,
            action: 'updated'
          });
        } else {
          // Create new result document
          const totalMarksValue = parseInt(result.totalMarks || maxMarks);
          const calculatedGrade = calculateSimpleGrade(obtainedMarks, totalMarksValue);
          const calculatedPercentage = obtainedMarks !== null && totalMarksValue > 0
            ? Math.round((obtainedMarks / totalMarksValue) * 100 * 100) / 100
            : null;

          // Ensure academic year is provided
          if (!academicYear) {
            throw new Error('Academic year is required but not provided');
          }

          const newResult = {
            schoolCode: schoolCode.toUpperCase(),
            className,
            section,
            academicYear: academicYear,
            studentId,
            studentName: result.studentName,
            userId: result.userId,
            subjects: [{
              subjectName: subject,
              testType,
              maxMarks: parseInt(maxMarks),
              obtainedMarks,
              totalMarks: totalMarksValue,
              grade: calculatedGrade,
              percentage: calculatedPercentage,
              createdAt: now,
              updatedAt: now
            }],
            createdAt: now,
            updatedAt: now,
            createdBy: req.user?._id || null
          };

          await resultsCollection.insertOne(newResult);

          savedResults.push({
            studentId,
            studentName: result.studentName,
            userId: result.userId,
            action: 'created'
          });
        }
      } catch (err) {
        console.error(`Error saving result for student ${result.studentId}:`, err);
        errors.push({
          studentId: result.studentId,
          studentName: result.studentName,
          error: err.message
        });
      }
    }

    console.log(`✅ Saved ${savedResults.length} results to school_${schoolCode.toLowerCase()}.results`);
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} errors occurred:`, errors);
    }

    res.json({
      success: true,
      message: `Successfully saved ${savedResults.length} results${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        schoolCode,
        className,
        section,
        testType,
        subject,
        savedCount: savedResults.length,
        results: savedResults,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error saving results:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving results',
      error: error.message
    });
  }
};

// ---------------------------------------------------------
// Get existing results for a class and section (generic)
// Supports nested (subjects array) and flat legacy schema
// ---------------------------------------------------------
exports.getResults = async (req, res) => {
  try {
    const { schoolCode, class: className, section, subject, testType, academicYear, studentId } = req.query;

    console.log('🔍 Fetching results:', { schoolCode, className, section, subject, testType, academicYear, studentId });

    const DatabaseManager = require('../utils/databaseManager');
    let studentClass = className;
    let studentSection = section;
    let studentObjectId = null; // Store the student's ObjectId for results query

    // Establish school database connection once
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);

    // If studentId is provided (student fetching their own results), get their class/section
    if (studentId && !className) {
      console.log('🔍 [RESULTS] Student query detected, fetching student info for:', studentId);
      
      try {
        // IMPORTANT: Students are stored in the SCHOOL-SPECIFIC database, not main database
        // Query from school_<code>.students collection
        console.log('🔍 [RESULTS] Looking for student in school-specific database...');
        const studentsCollection = schoolConn.collection('students');
        
        const student = await studentsCollection.findOne({
          userId: studentId,
          role: 'student'
        });
        
        if (!student) {
          console.error('🔍 [RESULTS] ❌ Student not found in school database');
          console.log('🔍 [RESULTS] Search criteria:', {
            userId: studentId,
            schoolCode: schoolCode.toUpperCase(),
            role: 'student'
          });
          
          // Try to find with different field names
          const studentByAnyId = await studentsCollection.findOne({
            $or: [
              { userId: studentId },
              { _id: studentId },
              { studentId: studentId }
            ],
            role: 'student'
          });
          
          if (studentByAnyId) {
            console.log('🔍 [RESULTS] Found student with alternate field:', {
              userId: studentByAnyId.userId,
              _id: studentByAnyId._id,
              class: studentByAnyId.academicInfo?.class || studentByAnyId.studentDetails?.currentClass || studentByAnyId.class
            });
            // Use this student
            studentClass = studentByAnyId.academicInfo?.class || studentByAnyId.studentDetails?.currentClass || studentByAnyId.class;
            studentSection = studentByAnyId.academicInfo?.section || studentByAnyId.studentDetails?.currentSection || studentByAnyId.section;
            studentObjectId = studentByAnyId._id; // Store ObjectId for results query
          } else {
            console.log('🔍 [RESULTS] Student not found with any ID field:', studentId);
            return res.status(404).json({
              success: false,
              message: 'Student not found in school database'
            });
          }
        } else {
          console.log('🔍 [RESULTS] ✅ Student found:', student.name?.displayName || `${student.name?.firstName} ${student.name?.lastName}`);
          
          // Extract class and section from student record
          studentClass = student.academicInfo?.class || student.studentDetails?.currentClass || student.class;
          studentSection = student.academicInfo?.section || student.studentDetails?.currentSection || student.section;
          studentObjectId = student._id; // Store ObjectId for results query
        }
        
        console.log('🔍 [RESULTS] Student class/section:', { studentClass, studentSection });
        console.log('🔍 [RESULTS] Student details structure:', {
          hasAcademicInfo: !!student?.academicInfo,
          hasStudentDetails: !!student?.studentDetails,
          hasClass: !!student?.class,
          hasSection: !!student?.section,
          academicInfoClass: student?.academicInfo?.class,
          academicInfoSection: student?.academicInfo?.section,
          studentDetailsClass: student?.studentDetails?.currentClass,
          studentDetailsSection: student?.studentDetails?.currentSection
        });
      } catch (studentLookupError) {
        console.error('🔍 [RESULTS] ❌ Error during student lookup:', studentLookupError);
        return res.status(500).json({
          success: false,
          message: 'Error fetching student information',
          error: studentLookupError.message
        });
      }
    }

    // If we have studentId but didn't fetch student info yet (className was provided), get the ObjectId
    if (studentId && !studentObjectId) {
      console.log('🔍 [RESULTS] Fetching student ObjectId for results query...');
      try {
        const studentsCollection = schoolConn.collection('students');
        const student = await studentsCollection.findOne({
          $or: [
            { userId: studentId },
            { _id: studentId },
            { studentId: studentId }
          ],
          role: 'student'
        });
        
        if (student) {
          studentObjectId = student._id;
          console.log('🔍 [RESULTS] ✅ Found student ObjectId:', studentObjectId);
        } else {
          console.log('🔍 [RESULTS] ⚠️ Could not find student ObjectId, will use userId in query');
        }
      } catch (err) {
        console.error('🔍 [RESULTS] ❌ Error fetching student ObjectId:', err.message);
      }
    }

    if (!schoolCode || !studentClass || !studentSection) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolCode, class, and section'
      });
    }

    // Use the already established connection
    const resultsCollection = schoolConn.collection('results');

    const query = {
      schoolCode: schoolCode.toUpperCase(),
      className: studentClass,
      section: studentSection
    };
    
    // Filter by studentId if provided
    // IMPORTANT: Results collection stores studentId as ObjectId, not userId string
    if (studentId) {
      console.log(`🔍 [RESULTS] Filtering by student - ObjectId: ${studentObjectId}, userId: ${studentId}`);
      
      if (studentObjectId) {
        // Use the ObjectId from student lookup (most reliable)
        query.$or = [
          { studentId: studentObjectId.toString() },
          { studentId: studentObjectId },
          { userId: studentId }
        ];
      } else {
        // Fallback: try both userId and studentId
        query.$or = [
          { studentId: studentId },
          { userId: studentId }
        ];
      }
    }

    // For student queries, ALWAYS filter by academic year (same as assignments)
    let yearToFilter = academicYear;
    
    // For students, ALWAYS filter by academic year (use provided or current)
    if (studentId && !yearToFilter) {
      // Get current academic year from school settings
      console.log(`🔍 [RESULTS] Student request - fetching current academic year...`);
      console.log(`🔍 [RESULTS] Looking for school with code: ${schoolCode}`);
      try {
        const School = require('../models/School');
        const school = await School.findOne({ code: { $regex: new RegExp(`^${schoolCode}$`, 'i') } });
        
        if (school && school.settings && school.settings.academicYear && school.settings.academicYear.currentYear) {
          yearToFilter = school.settings.academicYear.currentYear;
          console.log(`🔍 [RESULTS] ✅ Using current academic year from school settings: ${yearToFilter}`);
        } else {
          // Fallback to current year calculation
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1; // Jan is 0
          
          // If current month is April or later, academic year is current-next
          // Otherwise, it's previous-current
          if (currentMonth >= 4) {
            yearToFilter = `${currentYear}-${currentYear + 1}`;
          } else {
            yearToFilter = `${currentYear - 1}-${currentYear}`;
          }
          console.log(`🔍 [RESULTS] ⚠️ No academic year in school settings, using fallback: ${yearToFilter}`);
        }
      } catch (err) {
        console.error('🔍 [RESULTS] ❌ Error fetching current academic year:', err.message);
        // Fallback to current year
        const currentYear = new Date().getFullYear();
        yearToFilter = `${currentYear}-${currentYear + 1}`;
        console.log(`🔍 [RESULTS] Using error fallback academic year: ${yearToFilter}`);
      }
    }

    if (yearToFilter) {
      // Normalize academic year format to handle both "2024-25" and "2024-2025"
      const parts = yearToFilter.split('-');
      if (parts.length === 2) {
        const startYear = parts[0];
        const endYear = parts[1].length === 2 ? parts[1] : parts[1].slice(-2); // Get last 2 digits
        const fullEndYear = parts[1].length === 4 ? parts[1] : `20${parts[1]}`; // Expand to 4 digits
        
        // Match both "2024-25" and "2024-2025" formats
        query.academicYear = {
          $in: [
            `${startYear}-${endYear}`,      // Short format: 2024-25
            `${startYear}-${fullEndYear}`   // Long format: 2024-2025
          ]
        };
        console.log(`🔍 [RESULTS] ✅ Filtering by academic year (both formats): ${startYear}-${endYear} OR ${startYear}-${fullEndYear}`);
      } else {
        query.academicYear = yearToFilter;
        console.log(`🔍 [RESULTS] ✅ Filtering by academic year: ${yearToFilter}`);
      }
    } else {
      console.log(`🔍 [RESULTS] ⚠️ No academic year filter - returning ALL results (this may show old data)`);
    }

    console.log(`🔍 [RESULTS] Final query:`, JSON.stringify(query, null, 2));

    const resultDocs = await resultsCollection.find(query).sort({ createdAt: -1 }).toArray();

    console.log(`📚 [RESULTS] Found ${resultDocs.length} student result documents for ${studentClass}-${studentSection}`);
    
    // Log sample result if found
    if (resultDocs.length > 0) {
      console.log(`📚 [RESULTS] Sample result:`, {
        _id: resultDocs[0]._id,
        schoolCode: resultDocs[0].schoolCode,
        className: resultDocs[0].className,
        section: resultDocs[0].section,
        academicYear: resultDocs[0].academicYear,
        studentId: resultDocs[0].studentId,
        subjectsCount: resultDocs[0].subjects?.length
      });
    } else {
      console.log(`📚 [RESULTS] ⚠️ No results found - checking what's in the collection...`);
      // Check what results exist for this student
      const allStudentResults = await resultsCollection.find({
        $or: [
          { studentId: studentId },
          { userId: studentId }
        ]
      }).toArray();
      console.log(`📚 [RESULTS] Total results for student ${studentId} (any year):`, allStudentResults.length);
      if (allStudentResults.length > 0) {
        console.log(`📚 [RESULTS] Available academic years:`, [...new Set(allStudentResults.map(r => r.academicYear))]);
      }
    }

    const filteredResults = [];

    for (const doc of resultDocs) {
      // New nested structure
      if (doc.subjects && Array.isArray(doc.subjects)) {
        let matchingSubjects = doc.subjects;

        if (subject) {
          matchingSubjects = matchingSubjects.filter(s => s.subjectName === subject);
        }

        if (testType) {
          matchingSubjects = matchingSubjects.filter(s => s.testType === testType);
        }

        for (const subj of matchingSubjects) {
          filteredResults.push({
            _id: doc._id,
            schoolCode: doc.schoolCode,
            className: doc.className,
            section: doc.section,
            academicYear: doc.academicYear,
            studentId: doc.studentId,
            studentName: doc.studentName,
            userId: doc.userId,
            subject: subj.subjectName,
            testType: subj.testType,
            maxMarks: subj.maxMarks,
            obtainedMarks: subj.obtainedMarks,
            totalMarks: subj.totalMarks,
            grade: subj.grade,
            percentage: subj.percentage,
            frozen: subj.frozen || false,
            frozenAt: subj.frozenAt || null,
            frozenBy: subj.frozenBy || null,
            createdAt: subj.createdAt || doc.createdAt,
            updatedAt: subj.updatedAt || doc.updatedAt
          });
        }
      }
      // Legacy flat structure
      else if (doc.testType && doc.obtainedMarks !== undefined) {
        const matchesSubject = !subject || doc.subject === subject;
        const matchesTestType = !testType || doc.testType === testType;

        if (matchesSubject && matchesTestType) {
          filteredResults.push({
            _id: doc._id,
            schoolCode: doc.schoolCode,
            className: doc.className,
            section: doc.section,
            academicYear: doc.academicYear,
            studentId: doc.studentId,
            studentName: doc.studentName,
            userId: doc.userId,
            subject: doc.subject || 'Unknown',
            testType: doc.testType,
            maxMarks: doc.maxMarks,
            obtainedMarks: doc.obtainedMarks,
            totalMarks: doc.totalMarks,
            grade: doc.grade,
            percentage: doc.percentage,
            frozen: doc.frozen || false,
            frozenAt: doc.frozenAt || null,
            frozenBy: doc.frozenBy || null,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        }
      }
    }

    console.log(`✅ Found ${filteredResults.length} subject-specific results for ${className}-${section}${subject ? ` (${subject})` : ''}${testType ? ` (${testType})` : ''}`);

    res.json({
      success: true,
      message: `Found ${filteredResults.length} results`,
      data: filteredResults
    });

  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
};

// ---------------------------------------------------------
// Update a single student result (subject-level). Respects frozen flag.
// ---------------------------------------------------------
exports.updateResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const {
      schoolCode,
      class: className,
      section,
      subject,
      testType,
      maxMarks,
      obtainedMarks,
      totalMarks,
      studentId,
      studentName,
      userId
    } = req.body;

    console.log('🔄 Updating result:', { resultId, schoolCode, className, section, subject, testType });

    if (!resultId || !schoolCode || !className || !section || !subject || !testType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');
    const { ObjectId } = require('mongodb');

    const existingResult = await resultsCollection.findOne({
      _id: new ObjectId(resultId)
    });

    if (!existingResult) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const now = new Date();
    const obtainedMarksValue = obtainedMarks !== null && obtainedMarks !== undefined
      ? parseInt(obtainedMarks)
      : null;

    const subjectIndex = existingResult.subjects?.findIndex(
      s => s.subjectName === subject && s.testType === testType
    );

    if (subjectIndex >= 0 && existingResult.subjects[subjectIndex].frozen) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update frozen results. Results have been locked and cannot be modified.'
      });
    }

    let updatedSubjects = existingResult.subjects || [];
    const resolvedTotalMarks = parseInt(totalMarks || maxMarks || (updatedSubjects[subjectIndex]?.totalMarks) || maxMarks || 100);

    if (subjectIndex >= 0) {
      updatedSubjects[subjectIndex] = {
        ...updatedSubjects[subjectIndex], // preserve any existing fields (like frozen)
        subjectName: subject,
        testType,
        maxMarks: parseInt(maxMarks),
        obtainedMarks: obtainedMarksValue,
        totalMarks: resolvedTotalMarks,
        grade: req.body.grade || updatedSubjects[subjectIndex].grade || null,
        percentage: obtainedMarksValue !== null && resolvedTotalMarks > 0
          ? Math.round((obtainedMarksValue / resolvedTotalMarks) * 100 * 100) / 100
          : null,
        updatedAt: now
      };
    } else {
      updatedSubjects.push({
        subjectName: subject,
        testType,
        maxMarks: parseInt(maxMarks),
        obtainedMarks: obtainedMarksValue,
        totalMarks: resolvedTotalMarks,
        grade: req.body.grade || null,
        percentage: obtainedMarksValue !== null && resolvedTotalMarks > 0
          ? Math.round((obtainedMarksValue / resolvedTotalMarks) * 100 * 100) / 100
          : null,
        createdAt: now,
        updatedAt: now
      });
    }

    const updateResult = await resultsCollection.updateOne(
      { _id: new ObjectId(resultId) },
      {
        $set: {
          subjects: updatedSubjects,
          updatedAt: now,
          updatedBy: req.user?._id || null
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes made to the result'
      });
    }

    console.log(`✅ Updated result ${resultId} for subject ${subject}, test ${testType}`);

    res.json({
      success: true,
      message: 'Result updated successfully',
      data: {
        resultId,
        subject,
        testType,
        obtainedMarks: obtainedMarksValue
      }
    });

  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating result',
      error: error.message
    });
  }
};

// ---------------------------------------------------------
// Freeze results for a class/section/subject/testType
// ---------------------------------------------------------
exports.freezeResults = async (req, res) => {
  try {
    const {
      schoolCode,
      class: className,
      section,
      subject,
      testType,
      academicYear
    } = req.body;

    console.log('🔒 Freezing results:', { schoolCode, className, section, subject, testType, academicYear });

    if (!schoolCode || !className || !section || !subject || !testType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolCode, class, section, subject, and testType'
      });
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required. Please ensure the school settings have a current academic year configured.'
      });
    }

    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');

    const now = new Date();

    const updateResult = await resultsCollection.updateMany(
      {
        schoolCode: schoolCode.toUpperCase(),
        className,
        section,
        academicYear: academicYear,
        'subjects.subjectName': subject,
        'subjects.testType': testType
      },
      {
        $set: {
          'subjects.$[elem].frozen': true,
          'subjects.$[elem].frozenAt': now,
          'subjects.$[elem].frozenBy': req.user?._id || null,
          updatedAt: now
        }
      },
      {
        arrayFilters: [{ 'elem.subjectName': subject, 'elem.testType': testType }]
      }
    );

    console.log(`✅ Frozen ${updateResult.modifiedCount} results for ${className}-${section}, ${subject} (${testType})`);

    res.json({
      success: true,
      message: `Successfully frozen ${updateResult.modifiedCount} results`,
      data: {
        schoolCode,
        className,
        section,
        subject,
        testType,
        frozenCount: updateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error freezing results:', error);
    res.status(500).json({
      success: false,
      message: 'Error freezing results',
      error: error.message
    });
  }
};

// ---------------------------------------------------------
// Get results for teacher view - formatted and aggregated
// ---------------------------------------------------------
exports.getResultsForTeacher = async (req, res) => {
  try {
    const { schoolCode, class: className, section, subject, testType, academicYear } = req.query;

    console.log('👨‍🏫 Teacher fetching results:', { schoolCode, className, section, subject, testType, academicYear });

    if (!schoolCode || !className || !section || !subject || !testType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolCode, class, section, subject, and testType'
      });
    }

    // Helper function to normalize academic year format (handles both 2024-2025 and 2024-25)
    const normalizeAcademicYear = (year) => {
      if (!year) return null;
      const yearStr = String(year).trim();
      // If format is 2024-25, convert to 2024-2025
      const match = yearStr.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        return `${match[1]}-20${match[2]}`;
      }
      // If format is 2024-2025, keep as is
      if (yearStr.match(/^\d{4}-\d{4}$/)) {
        return yearStr;
      }
      return yearStr;
    };

    const DatabaseManager = require('../utils/databaseManager');
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');

    // For teachers, ALWAYS filter by academic year (use provided or current)
    let yearToFilter = academicYear;
    
    if (!yearToFilter) {
      // Get current academic year from school settings
      console.log(`🔍 [👨‍🏫 TEACHER] No academic year provided - fetching current academic year...`);
      console.log(`🔍 [👨‍🏫 TEACHER] Looking for school with code: ${schoolCode}`);
      try {
        const School = require('../models/School');
        const school = await School.findOne({ code: { $regex: new RegExp(`^${schoolCode}$`, 'i') } });
        
        if (school && school.settings && school.settings.academicYear && school.settings.academicYear.currentYear) {
          yearToFilter = school.settings.academicYear.currentYear;
          console.log(`� [👨‍🏫 TEACHER] ✅ Using current academic year from school settings: ${yearToFilter}`);
        } else {
          // Fallback to current year calculation
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1; // Jan is 0
          
          // If current month is April or later, academic year is current-next
          // Otherwise, it's previous-current
          if (currentMonth >= 4) {
            yearToFilter = `${currentYear}-${currentYear + 1}`;
          } else {
            yearToFilter = `${currentYear - 1}-${currentYear}`;
          }
          console.log(`🔍 [👨‍🏫 TEACHER] ⚠️ No academic year in school settings, using fallback: ${yearToFilter}`);
        }
      } catch (err) {
        console.error('🔍 [👨‍🏫 TEACHER] ❌ Error fetching current academic year:', err.message);
        // Fallback to current year
        const currentYear = new Date().getFullYear();
        yearToFilter = `${currentYear}-${currentYear + 1}`;
        console.log(`🔍 [👨‍🏫 TEACHER] Using error fallback academic year: ${yearToFilter}`);
      }
    }

    const query = {
      schoolCode: schoolCode.toUpperCase(),
      className,
      section
    };

    // Add academic year filter with format normalization
    if (yearToFilter) {
      // Normalize academic year format to handle both "2024-25" and "2024-2025"
      const parts = yearToFilter.split('-');
      if (parts.length === 2) {
        const startYear = parts[0];
        const endYear = parts[1].length === 2 ? parts[1] : parts[1].slice(-2); // Get last 2 digits
        const fullEndYear = parts[1].length === 4 ? parts[1] : `20${parts[1]}`; // Expand to 4 digits
        
        // Match both "2024-25" and "2024-2025" formats
        query.academicYear = {
          $in: [
            `${startYear}-${endYear}`,      // Short format: 2024-25
            `${startYear}-${fullEndYear}`   // Long format: 2024-2025
          ]
        };
        console.log(`🔍 [👨‍🏫 TEACHER] ✅ Filtering by academic year (both formats): ${startYear}-${endYear} OR ${startYear}-${fullEndYear}`);
      } else {
        query.academicYear = yearToFilter;
        console.log(`🔍 [👨‍🏫 TEACHER] ✅ Filtering by academic year: ${yearToFilter}`);
      }
    } else {
      console.log(`🔍 [👨‍🏫 TEACHER] ⚠️ No academic year filter - returning ALL results (this may show old data)`);
    }

    console.log('🔍 Query:', JSON.stringify(query));
    let resultDocs = await resultsCollection.find(query).sort({ studentName: 1 }).toArray();

    console.log(`📚 Found ${resultDocs.length} student result documents for ${className}-${section} (AY: ${yearToFilter || 'ALL'})`);

    // If no results found, try with exact format match (in case normalization didn't work)
    if (resultDocs.length === 0 && yearToFilter && academicYear && yearToFilter !== academicYear) {
      console.log(`⚠️ No results with AY "${yearToFilter}", trying original format "${academicYear}"`);
      const queryWithOriginalAY = {
        schoolCode: schoolCode.toUpperCase(),
        className,
        section,
        academicYear: academicYear // Use original format
      };
      resultDocs = await resultsCollection.find(queryWithOriginalAY).sort({ studentName: 1 }).toArray();
      console.log(`📚 Found ${resultDocs.length} results with original AY format`);
    }

    // DEBUG: If still no results, try without AY filter to see if data exists
    if (resultDocs.length === 0 && yearToFilter) {
      const queryWithoutAY = {
        schoolCode: schoolCode.toUpperCase(),
        className,
        section
      };
      const docsWithoutAY = await resultsCollection.find(queryWithoutAY).limit(5).toArray();
      console.log(`🔍 DEBUG: Found ${docsWithoutAY.length} results WITHOUT academic year filter`);
      if (docsWithoutAY.length > 0) {
        console.log('📋 Sample document structure:', JSON.stringify({
          _id: docsWithoutAY[0]._id,
          academicYear: docsWithoutAY[0].academicYear,
          className: docsWithoutAY[0].className,
          section: docsWithoutAY[0].section,
          hasSubjects: !!docsWithoutAY[0].subjects,
          subjectsCount: docsWithoutAY[0].subjects?.length || 0
        }, null, 2));
        console.log('⚠️ ISSUE: Results exist but academicYear field does not match!');
        console.log(`   Expected: "${yearToFilter}" or "${academicYear || 'N/A'}"`);
        console.log(`   Found in DB: "${docsWithoutAY[0].academicYear}"`);
      }
    }

    const formattedResults = [];

    for (const doc of resultDocs) {
      if (doc.subjects && Array.isArray(doc.subjects)) {
        const matchingSubject = doc.subjects.find(
          s => s.subjectName === subject && s.testType === testType
        );

        if (matchingSubject) {
          formattedResults.push({
            id: doc._id.toString(),
            _id: doc._id.toString(),
            studentId: doc.studentId,
            userId: doc.userId,
            name: doc.studentName || 'Unknown',
            studentName: doc.studentName || 'Unknown',
            rollNumber: doc.rollNumber || 'N/A',
            class: className,
            className: className,
            section: section,
            subject: subject,
            testType: testType,
            obtainedMarks: matchingSubject.obtainedMarks !== null && matchingSubject.obtainedMarks !== undefined ? matchingSubject.obtainedMarks : null,
            totalMarks: matchingSubject.maxMarks || matchingSubject.totalMarks || 100,
            maxMarks: matchingSubject.maxMarks || matchingSubject.totalMarks || 100,
            percentage: matchingSubject.obtainedMarks !== null && matchingSubject.obtainedMarks !== undefined ? matchingSubject.percentage : null,
            grade: matchingSubject.grade || calculateSimpleGrade(
              matchingSubject.obtainedMarks,
              matchingSubject.maxMarks || matchingSubject.totalMarks || 100
            ),
            frozen: matchingSubject.frozen || false,
            createdAt: doc.createdAt || doc.updatedAt || new Date(),
            updatedAt: doc.updatedAt || doc.createdAt || new Date()
          });
        }
      }
    }

    console.log(`✅ Formatted ${formattedResults.length} results for teacher view`);

    // Log frozen status for debugging
    const frozenCount = formattedResults.filter(r => r.frozen).length;
    if (frozenCount > 0) {
      console.log(`🔒 ${frozenCount} results are FROZEN and cannot be edited`);
    }

    // Calculate statistics for teacher display
    const statistics = {
      totalStudents: formattedResults.length,
      averageMarks: formattedResults.length > 0
        ? Math.round(formattedResults.reduce((sum, r) => sum + r.obtainedMarks, 0) / formattedResults.length)
        : 0,
      averagePercentage: formattedResults.length > 0
        ? Math.round(formattedResults.reduce((sum, r) => sum + r.percentage, 0) / formattedResults.length)
        : 0,
      highestScore: formattedResults.length > 0
        ? Math.max(...formattedResults.map(r => r.obtainedMarks))
        : 0,
      lowestScore: formattedResults.length > 0
        ? Math.min(...formattedResults.map(r => r.obtainedMarks))
        : 0,
      passCount: formattedResults.filter(r => r.percentage >= 40).length,
      failCount: formattedResults.filter(r => r.percentage < 40).length
    };

    res.json({
      success: true,
      message: `Found ${formattedResults.length} results`,
      data: {
        results: formattedResults,
        statistics,
        filters: {
          schoolCode,
          className,
          section,
          subject,
          testType,
          academicYear: academicYear || '2024-25'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching results for teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
};

// ---------------------------------------------------------
// Dashboard: get class performance stats aggregated
// ---------------------------------------------------------
exports.getClassPerformanceStats = async (req, res) => {
  try {
    const schoolCode = req.user?.schoolCode;

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code is required'
      });
    }

    console.log(`[CLASS PERFORMANCE] Fetching stats for school: ${schoolCode}`);

    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConnection.collection('results');

    const results = await resultsCollection.find({}).toArray();

    console.log(`[CLASS PERFORMANCE] Found ${results.length} result documents`);

    if (results.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const performanceMap = {};

    results.forEach(result => {
      const classKey = `${result.className || 'Unknown'}-${result.section || 'A'}`;

      if (!performanceMap[classKey]) {
        performanceMap[classKey] = {
          class: result.className || 'Unknown',
          section: result.section || 'A',
          totalPercentage: 0,
          subjectCount: 0,
          studentCount: 0
        };
      }

      // Use subject percentages if available
      if (result.subjects && Array.isArray(result.subjects)) {
        result.subjects.forEach(subject => {
          if (subject.percentage !== undefined && subject.percentage !== null) {
            performanceMap[classKey].totalPercentage += parseFloat(subject.percentage);
            performanceMap[classKey].subjectCount++;
          }
        });
        performanceMap[classKey].studentCount++;
      }
    });

    let performanceData = Object.values(performanceMap)
      .map(item => {
        const avgPercentage = item.subjectCount > 0
          ? (item.totalPercentage / item.subjectCount).toFixed(1)
          : 0;

        return {
          name: `${item.class}-${item.section}`,
          class: item.class,
          section: item.section,
          percentage: parseFloat(avgPercentage),
          studentCount: item.studentCount
        };
      });

    // Ensure classes 1-10 with section A are present
    const allClasses = [];
    for (let i = 1; i <= 10; i++) {
      const classKey = `${i}-A`;
      const existingClass = performanceData.find(item => item.name === classKey);

      if (existingClass) {
        allClasses.push(existingClass);
      } else {
        allClasses.push({
          name: classKey,
          class: i.toString(),
          section: 'A',
          percentage: 0,
          studentCount: 0
        });
      }
    }

    // Add other sections (B, C...) after A
    performanceData.forEach(item => {
      if (item.section !== 'A') {
        allClasses.push(item);
      }
    });

    performanceData = allClasses.sort((a, b) => {
      if (a.class !== b.class) {
        const aNum = parseInt(a.class);
        const bNum = parseInt(b.class);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.class.localeCompare(b.class);
      }
      return a.section.localeCompare(b.section);
    });

    // Count sections per class to determine display format
    const classSectionCount = {};
    performanceData.forEach(item => {
      if (!classSectionCount[item.class]) {
        classSectionCount[item.class] = 0;
      }
      classSectionCount[item.class]++;
    });

    // Update display names: show only class number if single section, otherwise show class-section
    performanceData = performanceData.map(item => ({
      ...item,
      name: classSectionCount[item.class] > 1 ? `${item.class}-${item.section}` : item.class
    }));

    console.log(`[CLASS PERFORMANCE] Calculated performance for ${performanceData.length} class-sections (including all 1-10)`);

    res.json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    console.error('Error fetching class performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class performance stats',
      error: error.message
    });
  }
};

// ---------------------------------------------------------
// Get results statistics for Reports page
// ---------------------------------------------------------
exports.getResultsStats = async (req, res) => {
  try {
    const { academicYear, class: className, section } = req.query;
    const schoolCode = req.user?.schoolCode;

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code is required'
      });
    }

    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    
    if (!schoolConnection) {
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to school database'
      });
    }
    
    const resultsCollection = schoolConnection.collection('results');

    // Build query
    const query = {};
    
    // Filter by class if provided (results use 'className' field)
    if (className && className !== 'all') {
      query.className = className;
    }
    
    // Filter by section if provided
    if (section) {
      query.section = section;
    }
    
    // Normalize academic year format to handle both "2024-25" and "2024-2025"
    if (academicYear) {
      const parts = academicYear.split('-');
      if (parts.length === 2) {
        const startYear = parts[0];
        const endYear = parts[1].length === 2 ? parts[1] : parts[1].slice(-2);
        const fullEndYear = parts[1].length === 4 ? parts[1] : `20${parts[1]}`;
        
        // Match both formats
        query.academicYear = {
          $in: [
            `${startYear}-${endYear}`,
            `${startYear}-${fullEndYear}`
          ]
        };
      } else {
        query.academicYear = academicYear;
      }
    }

    let results = await resultsCollection.find(query).toArray();

    console.log(`[RESULTS STATS] Query used:`, JSON.stringify(query));
    console.log(`[RESULTS STATS] Found ${results.length} result documents with initial query`);
    
    // If no results found and we have filters, try without academic year to debug
    if (results.length === 0 && Object.keys(query).length > 0) {
      console.log(`[RESULTS STATS] No results with full query, checking what exists in DB...`);
      
      // First check total count in collection
      const totalCount = await resultsCollection.countDocuments();
      console.log(`[RESULTS STATS] Total results in collection: ${totalCount}`);
      
      if (totalCount > 0) {
        // Check if ANY results exist for this class/section
        const debugQuery = {};
        if (className && className !== 'all') {
          debugQuery.className = className;
        }
        if (section) {
          debugQuery.section = section;
        }
        
        const debugResults = await resultsCollection.find(debugQuery).limit(1).toArray();
        if (debugResults.length > 0) {
          console.log(`[RESULTS STATS] Found results without academic year filter. Sample:`, {
            className: debugResults[0].className,
            section: debugResults[0].section,
            academicYear: debugResults[0].academicYear,
            subjectsCount: debugResults[0].subjects?.length
          });
          console.log(`[RESULTS STATS] Academic year mismatch! Query had: ${JSON.stringify(query.academicYear)}, DB has: ${debugResults[0].academicYear}`);
        } else {
          console.log(`[RESULTS STATS] No results found for class ${className}, section ${section}`);
          
          // Show what classes DO have results
          const availableClasses = await resultsCollection.distinct('className');
          console.log(`[RESULTS STATS] Available classes with results:`, availableClasses);
        }
      } else {
        console.log(`[RESULTS STATS] Results collection is empty - no results have been entered yet`);
      }
    }
    
    if (results.length > 0) {
      console.log(`[RESULTS STATS] Sample result:`, {
        className: results[0].className,
        section: results[0].section,
        academicYear: results[0].academicYear,
        subjectsCount: results[0].subjects?.length
      });
    }

    if (results.length === 0) {
      const message = className && className !== 'all' 
        ? `No results data found for Class ${className}${section ? ` Section ${section}` : ''} in academic year ${academicYear || 'current'}`
        : 'No results data found for the specified filters. Results may not have been entered yet.';
      
      console.log(`[RESULTS STATS] ${message}`);
      return res.json({
        success: true,
        subjectStats: [],
        gradeDistribution: [],
        totalStudents: 0,
        averagePercentage: 0,
        message: message
      });
    }

    // Calculate subject-wise statistics
    const subjectMap = {};
    const gradeMap = {
      'A+ (90-100)': 0,
      'A (80-89)': 0,
      'B (70-79)': 0,
      'C (60-69)': 0,
      'D (Below 60)': 0
    };
    let totalStudents = 0;
    let totalPercentage = 0;
    let studentCount = 0;

    results.forEach(result => {
      // Process subjects array
      if (result.subjects && Array.isArray(result.subjects) && result.subjects.length > 0) {
        let studentTotalObtained = 0;
        let studentTotalMarks = 0;
        
        result.subjects.forEach(subject => {
          const subjectName = subject.subjectName || subject.name || 'Unknown';
          
          if (!subjectMap[subjectName]) {
            subjectMap[subjectName] = {
              subject: subjectName,
              totalMarks: 0,
              totalObtained: 0,
              studentCount: 0,
              average: 0
            };
          }

          const obtained = parseFloat(subject.obtainedMarks || subject.marks || 0);
          const total = parseFloat(subject.totalMarks || subject.maxMarks || 100);

          if (total > 0) {
            subjectMap[subjectName].totalObtained += obtained;
            subjectMap[subjectName].totalMarks += total;
            subjectMap[subjectName].studentCount++;
            
            // Accumulate for overall percentage calculation
            studentTotalObtained += obtained;
            studentTotalMarks += total;
          }
        });

        // Calculate overall percentage for this student
        // First try document-level percentage, then calculate from subjects
        let overallPercentage = parseFloat(result.percentage || result.overallPercentage || 0);
        
        if (overallPercentage === 0 && studentTotalMarks > 0) {
          // Calculate from subjects if not present at document level
          overallPercentage = (studentTotalObtained / studentTotalMarks) * 100;
        }
        
        if (overallPercentage > 0) {
          if (overallPercentage >= 90) {
            gradeMap['A+ (90-100)']++;
          } else if (overallPercentage >= 80) {
            gradeMap['A (80-89)']++;
          } else if (overallPercentage >= 70) {
            gradeMap['B (70-79)']++;
          } else if (overallPercentage >= 60) {
            gradeMap['C (60-69)']++;
          } else {
            gradeMap['D (Below 60)']++;
          }

          totalPercentage += overallPercentage;
          studentCount++;
        }
      }

      totalStudents++;
    });

    // Calculate subject averages
    const subjectStats = Object.values(subjectMap).map(subject => {
      const average = subject.totalMarks > 0
        ? ((subject.totalObtained / subject.totalMarks) * 100).toFixed(1)
        : 0;
      
      return {
        subject: subject.subject,
        average: parseFloat(average),
        students: subject.studentCount
      };
    }).sort((a, b) => b.average - a.average);

    // Format grade distribution
    const gradeDistribution = [
      { name: 'A+ (90-100)', value: gradeMap['A+ (90-100)'], color: '#10B981' },
      { name: 'A (80-89)', value: gradeMap['A (80-89)'], color: '#3B82F6' },
      { name: 'B (70-79)', value: gradeMap['B (70-79)'], color: '#F59E0B' },
      { name: 'C (60-69)', value: gradeMap['C (60-69)'], color: '#EF4444' },
      { name: 'D (Below 60)', value: gradeMap['D (Below 60)'], color: '#6B7280' }
    ];

    const averagePercentage = studentCount > 0 ? (totalPercentage / studentCount).toFixed(1) : 0;

    console.log(`[RESULTS STATS] Calculated stats for ${totalStudents} students, ${subjectStats.length} subjects`);

    res.json({
      success: true,
      subjectStats,
      gradeDistribution,
      totalStudents,
      averagePercentage: parseFloat(averagePercentage)
    });

  } catch (error) {
    console.error('Error fetching results stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results stats',
      error: error.message
    });
  }
};

// ---------------------------------------------------------
// Module exports (explicit)
// ---------------------------------------------------------
module.exports = {
  createOrUpdateResult: exports.createOrUpdateResult,
  getStudentResultHistory: exports.getStudentResultHistory,
  generateClassPerformanceReport: exports.generateClassPerformanceReport,
  saveResults: exports.saveResults,
  getResults: exports.getResults,
  updateResult: exports.updateResult,
  freezeResults: exports.freezeResults,
  getResultsForTeacher: exports.getResultsForTeacher,
  getClassPerformanceStats: exports.getClassPerformanceStats,
  getResultsStats: exports.getResultsStats
};
