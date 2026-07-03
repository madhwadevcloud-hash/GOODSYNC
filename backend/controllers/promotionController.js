const DatabaseManager = require('../utils/databaseManager');
const School = require('../models/School');
const UserGenerator = require('../utils/userGenerator');
const { v4: uuidv4 } = require('uuid');
const PromotionRequest = require('../models/PromotionRequest');
const SystemNotification = require('../models/Notification');
const { uploadPDFBufferToCloudinary } = require('../config/cloudinary');
const NodeCache = require('node-cache');
const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Cache setup
// ---------------------------------------------------------------------------
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const CACHE_KEYS = {
  students: (schoolCode) => `students:${schoolCode}`,
  activeRequest: (schoolCode) => `activeRequest:${schoolCode}`,
  notifications: (userId) => `notifications:${userId}`
};

const getCachedStudents = async (schoolCode) => {
  const key = CACHE_KEYS.students(schoolCode);
  const cached = cache.get(key);
  if (cached) return cached;

  const students = await UserGenerator.getUsersByRole(schoolCode, 'student');
  cache.set(key, students, 120);
  return students;
};

const invalidateStudentsCache = (schoolCode) => {
  cache.del(CACHE_KEYS.students(schoolCode));
};

const invalidateActiveRequestCache = (schoolCode) => {
  cache.del(CACHE_KEYS.activeRequest(schoolCode));
};

const invalidateNotificationsCache = (userId) => {
  cache.del(CACHE_KEYS.notifications(userId));
};

const classProgression = {
  'LKG': 'UKG',
  'UKG': '1',
  '1': '2',
  '2': '3',
  '3': '4',
  '4': '5',
  '5': '6',
  '6': '7',
  '7': '8',
  '8': '9',
  '9': '10',
  '10': '11',
  '11': '12',
  '12': null
};

const cleanTestName = (name) => {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

// ---------------------------------------------------------------------------
// THIS IS THE FIX for "only 20-30 students appear instead of all 200-300".
//
// Students' academicYear can be stored in either short ("2026-27") or long
// ("2026-2027") format depending on which screen/import created them. The old
// code compared academicYear === fromYear with strict string equality, so
// only students whose stored format happened to exactly match the format the
// frontend sent got included - everyone else was silently dropped from the
// promotion batch and the CSV. getUsersByRole() already has this exact
// normalization logic when academicYear is passed as a DB filter; we need
// the same normalization here since we filter in JS after fetching.
// ---------------------------------------------------------------------------
const normalizeAcademicYear = (year) => {
  if (!year) return null;
  const str = String(year).trim();

  // Already short format: 2026-27
  if (/^\d{4}-\d{2}$/.test(str)) return str;

  // Long format: 2026-2027 -> 2026-27
  const longMatch = str.match(/^(\d{4})-(\d{4})$/);
  if (longMatch) return `${longMatch[1]}-${longMatch[2].slice(-2)}`;

  return str; // unrecognized format - leave as-is, will only match identical unrecognized values
};

const academicYearsMatch = (a, b) => {
  const na = normalizeAcademicYear(a);
  const nb = normalizeAcademicYear(b);
  return na !== null && na === nb;
};

const getStudentClass = (student) => {
  return (
    student?.academicInfo?.class ||
    student?.studentDetails?.academic?.currentClass ||
    student?.studentDetails?.currentClass ||
    student?.studentDetails?.class ||
    student?.class ||
    ''
  ).toString().trim();
};

const getStudentSection = (student) => {
  return (
    student?.academicInfo?.section ||
    student?.studentDetails?.academic?.currentSection ||
    student?.studentDetails?.currentSection ||
    student?.studentDetails?.section ||
    student?.section ||
    ''
  ).toString().trim();
};

const getStudentAcademicYear = (student) => {
  return (
    student?.academicInfo?.academicYear ||
    student?.studentDetails?.academic?.academicYear ||
    student?.studentDetails?.academicYear ||
    student?.academicYear ||
    student?.currentAcademicYear ||
    ''
  ).toString().trim();
};

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------
const escapeCsvField = (value) => {
  const str = value === undefined || value === null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

const buildPromotionCsv = (promotionRecords) => {
  const headers = [
    'Admission Number', 'Roll Number', 'Student Name', 'Current Class', 'Current Section',
    'Promoted Class', 'Promoted Section', 'Promotion Status', 'Promotion Reason if retained',
    'Academic Year', 'Promotion Date', 'Effective Date', 'Approved By', 'Promoted By', 'Timestamp'
  ];

  const rows = [headers.map(escapeCsvField).join(',')];

  for (const record of promotionRecords) {
    rows.push([
      escapeCsvField(record.admissionNumber),
      escapeCsvField(record.rollNumber),
      escapeCsvField(record.studentName),
      escapeCsvField(record.currentClass),
      escapeCsvField(record.currentSection),
      escapeCsvField(record.promotedClass),
      escapeCsvField(record.promotedSection),
      escapeCsvField(record.promotionStatus),
      escapeCsvField(record.promotionReason),
      escapeCsvField(record.academicYear),
      escapeCsvField(record.promotionDate),
      escapeCsvField(record.effectiveDate),
      escapeCsvField(record.approvedBy),
      escapeCsvField(record.promotedBy),
      escapeCsvField(record.timestamp)
    ].join(','));
  }

  const csvString = rows.join('\r\n');
  const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
  return Buffer.concat([BOM, Buffer.from(csvString, 'utf-8')]);
};

const createNotification = async (req, { userId, role, schoolCode, title, message, metadata }) => {
  try {
    const notification = await SystemNotification.create({
      userId,
      role,
      schoolCode,
      title,
      message,
      metadata
    });

    invalidateNotificationsCache(userId);

    const io = req.app.get('io');
    if (io) {
      if (role === 'superadmin') {
        io.to('superadmin').emit('new-notification', notification);
        console.log('📡 Broadcasted notification to superadmin room');
      } else {
        io.to(`user-${userId}`).emit('new-notification', notification);
        console.log(`📡 Broadcasted notification to user-${userId} room`);
      }
    }
    return notification;
  } catch (err) {
    console.error('⚠️ Failed to create notification:', err.message);
  }
};

// Bulk school-wide promotion
exports.bulkPromotion = async (req, res) => {
  console.log('🚀 BULK PROMOTION ENDPOINT HIT!');
  const schoolCode = req.params.schoolCode.trim().toUpperCase();
  const { fromYear, toYear, finalYearAction } = req.body;

  if (!fromYear || !toYear || !finalYearAction) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: fromYear, toYear, finalYearAction'
    });
  }

  // Retrieve approved promotion request matching both fromYear and toYear
  const school = await School.findOne({ code: schoolCode });
  if (!school) {
    return res.status(404).json({ success: false, message: 'School not found' });
  }

  // Validate that the destination Academic Year has been created and activated by the Super Admin
  if (!school.settings?.academicYear?.currentYear || school.settings.academicYear.currentYear !== toYear) {
    return res.status(400).json({
      success: false,
      message: 'The next Academic Year has not been created or activated by the Super Admin. Student promotion cannot proceed until the new Academic Year is set.'
    });
  }

  // Check if promotion has already been completed for this transition (LOCK enforcement)
  const completedRequest = await PromotionRequest.findOne({
    schoolCode: schoolCode,
    fromYear,
    toYear,
    status: 'Completed'
  });

  if (completedRequest) {
    return res.status(400).json({
      success: false,
      message: `Student promotion for Academic Year ${fromYear} to ${toYear} has already been completed. The Promotion Module will be available again after the Super Admin activates the next Academic Year.`
    });
  }

  // Retrieve approved promotion request matching both fromYear and toYear
  const activeRequest = await PromotionRequest.findOne({
    schoolCode: schoolCode,
    fromYear,
    toYear,
    status: 'Approved'
  });

  if (!activeRequest) {
    return res.status(400).json({
      success: false,
      message: `No approved promotion request found for transition ${fromYear} -> ${toYear}. Promotion is blocked.`
    });
  }

  const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
  const mongoose = require('mongoose');
  const session = await schoolConnection.startSession();

  try {
    session.startTransaction();

    const usersCollection = schoolConnection.collection('students');
    const alumniCollection = schoolConnection.collection('alumni');
    const classRequestsCollection = schoolConnection.collection('classrequests');
    const promotionHistoryCollection = schoolConnection.collection('promotion_history');

    // Build exact student matching query to avoid omissions
    const yearFormats = [fromYear];
    const matchShort = fromYear.match(/^(\d{4})-(\d{2})$/);
    if (matchShort) yearFormats.push(`${matchShort[1]}-20${matchShort[2]}`);
    const matchLong = fromYear.match(/^(\d{4})-(\d{4})$/);
    if (matchLong) yearFormats.push(`${matchLong[1]}-${matchLong[2].substring(2)}`);
    const uniqueYears = [...new Set(yearFormats)];

    const eligibleStudentsQuery = {
      isActive: { $ne: false },
      $or: [
        { "studentDetails.academic.academicYear": { $in: uniqueYears } },
        { "academicInfo.academicYear": { $in: uniqueYears } },
        { "academicYear": { $in: uniqueYears } },
        { "studentDetails.academicYear": { $in: uniqueYears } }
      ]
    };

    // Fetch students directly from collection (avoiding stale cache omissions)
    const students = await usersCollection.find(eligibleStudentsQuery).toArray();
    console.log(`📊 Students matching fromYear "${fromYear}": ${students.length}`);

    if (students.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: `No students found for academic year ${fromYear}`
      });
    }

    const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const classesCollection = schoolConnection.collection('classes');
    const availableClasses = await classesCollection.find({ schoolCode, isActive: true }).toArray();
    const availableClassNames = new Set(availableClasses.map(c => c.className));

    // Determine the highest configured class in the database
    const configuredClassNames = Array.from(availableClassNames);
    const finalYearClass = configuredClassNames.reduce((max, cls) => {
      const maxIndex = classOrder.indexOf(max);
      const clsIndex = classOrder.indexOf(cls);
      return clsIndex > maxIndex ? cls : max;
    }, configuredClassNames[0] || 'LKG');

    let promotedCount = 0;
    let graduatedCount = 0;
    let skippedCount = 0;
    let errors = [];
    const promotionBatchId = uuidv4();
    const promotionRecords = [];

    for (const student of students) {
      const currentClass = getStudentClass(student);
      const currentSection = getStudentSection(student);

      if (!currentClass) {
        errors.push({ userId: student.userId, error: 'No current class found' });
        continue;
      }

      // Check if student already has a record in the destination year to prevent duplicate promotions
      const existingDest = await usersCollection.findOne({
        userId: student.userId,
        $or: [
          { "studentDetails.academic.academicYear": toYear },
          { "academicInfo.academicYear": toYear },
          { "academicYear": toYear },
          { "studentDetails.academicYear": toYear }
        ]
      });

      if (existingDest) {
        console.log(`Student ${student.userId} already has enrollment in ${toYear}. Skipping duplicate.`);
        skippedCount++;
        continue;
      }

      if (currentClass === finalYearClass) {
        if (finalYearAction === 'graduate') {
          // Add record to promotion history
          await promotionHistoryCollection.insertOne({
            batchId: promotionBatchId,
            studentId: student._id,
            userId: student.userId,
            previousState: {
              academicYear: fromYear,
              class: currentClass,
              section: currentSection,
              status: student.studentDetails?.status || 'active'
            },
            action: 'graduated',
            targetAcademicYear: toYear,
            processedAt: new Date(),
            processedBy: req.user?.userId || 'admin'
          }, { session });

          // Clone student document to alumni collection
          const alumniRecord = {
            ...student,
            _id: new mongoose.Types.ObjectId(),
            graduationYear: toYear,
            graduationClass: currentClass,
            graduationSection: currentSection,
            movedToAlumniAt: new Date(),
            originalStudentId: student._id,
            status: 'passedOut'
          };
          if (alumniRecord.studentDetails) {
            alumniRecord.studentDetails = {
              ...alumniRecord.studentDetails,
              status: 'passedOut',
              academicYear: toYear
            };
          }
          await alumniCollection.insertOne(alumniRecord, { session });

          // Keep the original document in the students collection completely unchanged!
          // We do not run updateOne on usersCollection for this student!

          graduatedCount++;
          promotionRecords.push({
            admissionNumber: student.userId,
            rollNumber: student.studentDetails?.rollNumber || student.studentDetails?.rollNo || '',
            studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
            currentClass,
            currentSection,
            promotedClass: 'Graduated',
            promotedSection: '',
            promotionStatus: 'Passed Out',
            promotionReason: '',
            academicYear: fromYear,
            promotionDate: activeRequest.promotionDate ? activeRequest.promotionDate.toISOString().split('T')[0] : '',
            effectiveDate: activeRequest.effectiveDate ? activeRequest.effectiveDate.toISOString().split('T')[0] : '',
            approvedBy: activeRequest.approvedBy || '',
            promotedBy: req.user?.userId || 'admin',
            timestamp: new Date().toISOString()
          });
        } else if (finalYearAction === 'request') {
          const nextClass = (parseInt(finalYearClass) + 1).toString();
          await classRequestsCollection.updateOne(
            { schoolId: school._id.toString(), requestedClass: nextClass },
            {
              $set: {
                schoolId: school._id.toString(),
                schoolCode,
                schoolName: school.name,
                requestedClass: nextClass,
                currentFinalClass: finalYearClass,
                academicYear: toYear,
                status: 'pending',
                requestedBy: req.user?.userId || 'admin',
                requestedAt: new Date(),
                message: `Request to create Class ${nextClass} for ${toYear} academic year`
              }
            },
            { upsert: true, session }
          );
          continue;
        }
      } else {
        const nextClass = classProgression[currentClass];
        if (!nextClass) {
          errors.push({ userId: student.userId, error: `No progression defined for class ${currentClass}` });
          continue;
        }

        if (!availableClassNames.has(nextClass)) {
          errors.push({
            userId: student.userId,
            currentClass,
            nextClass,
            error: `Cannot promote to Class ${nextClass} - class not configured in school`
          });
          skippedCount++;

          // Create a new record in the destination academic year in the same class (retained/held back)
          // to preserve the historical record exactly as it was.
          const targetClass = currentClass;
          const targetSection = currentSection;

          const newStudentDoc = {
            ...student,
            _id: new mongoose.Types.ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            academicYear: toYear,
            class: targetClass,
            section: targetSection
          };

          if (newStudentDoc.academicInfo) {
            newStudentDoc.academicInfo = {
              ...newStudentDoc.academicInfo,
              academicYear: toYear,
              class: targetClass,
              section: targetSection
            };
          }
          if (newStudentDoc.studentDetails) {
            newStudentDoc.studentDetails = {
              ...newStudentDoc.studentDetails,
              academicYear: toYear,
              currentClass: targetClass,
              currentSection: targetSection
            };
            if (newStudentDoc.studentDetails.academic) {
              newStudentDoc.studentDetails.academic = {
                ...newStudentDoc.studentDetails.academic,
                academicYear: toYear,
                currentClass: targetClass,
                currentSection: targetSection
              };
            }
            newStudentDoc.studentDetails.academicHistory = [
              ...(newStudentDoc.studentDetails.academicHistory || [])
            ];
            newStudentDoc.studentDetails.academicHistory.push({
              promotionBatchId,
              academicYear: fromYear,
              class: currentClass,
              section: currentSection,
              result: 'detained',
              percentage: undefined,
              rank: undefined,
              attendance: undefined
            });
          }

          await usersCollection.insertOne(newStudentDoc, { session });

          promotionRecords.push({
            admissionNumber: student.userId,
            rollNumber: student.studentDetails?.rollNumber || student.studentDetails?.rollNo || '',
            studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
            currentClass,
            currentSection,
            promotedClass: targetClass,
            promotedSection: targetSection,
            promotionStatus: 'Retained',
            promotionReason: `Next class ${nextClass} not configured`,
            academicYear: fromYear,
            promotionDate: activeRequest.promotionDate ? activeRequest.promotionDate.toISOString().split('T')[0] : '',
            effectiveDate: activeRequest.effectiveDate ? activeRequest.effectiveDate.toISOString().split('T')[0] : '',
            approvedBy: activeRequest.approvedBy || '',
            promotedBy: req.user?.userId || 'admin',
            timestamp: new Date().toISOString()
          });
          continue;
        }

        // Add record to promotion history
        await promotionHistoryCollection.insertOne({
          batchId: promotionBatchId,
          studentId: student._id,
          userId: student.userId,
          previousState: {
            academicYear: fromYear,
            class: currentClass,
            section: currentSection,
            status: student.studentDetails?.status || 'active'
          },
          action: 'promoted',
          targetClass: nextClass,
          targetAcademicYear: toYear,
          processedAt: new Date(),
          processedBy: req.user?.userId || 'admin'
        }, { session });

        // Clone student document to create a completely new enrollment record for the destination academic year toYear.
        // The original document for fromYear is left completely unchanged!
        const targetClass = nextClass;
        const targetSection = currentSection;

        const newStudentDoc = {
          ...student,
          _id: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          academicYear: toYear,
          class: targetClass,
          section: targetSection
        };

        if (newStudentDoc.academicInfo) {
          newStudentDoc.academicInfo = {
            ...newStudentDoc.academicInfo,
            academicYear: toYear,
            class: targetClass,
            section: targetSection
          };
        }
        if (newStudentDoc.studentDetails) {
          newStudentDoc.studentDetails = {
            ...newStudentDoc.studentDetails,
            academicYear: toYear,
            currentClass: targetClass,
            currentSection: targetSection
          };
          if (newStudentDoc.studentDetails.academic) {
            newStudentDoc.studentDetails.academic = {
              ...newStudentDoc.studentDetails.academic,
              academicYear: toYear,
              currentClass: targetClass,
              currentSection: targetSection
            };
          }
          newStudentDoc.studentDetails.academicHistory = [
            ...(newStudentDoc.studentDetails.academicHistory || [])
          ];
          newStudentDoc.studentDetails.academicHistory.push({
            promotionBatchId,
            academicYear: fromYear,
            class: currentClass,
            section: currentSection,
            result: 'promoted',
            percentage: undefined,
            rank: undefined,
            attendance: undefined
          });
        }

        await usersCollection.insertOne(newStudentDoc, { session });

        promotedCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNumber || student.studentDetails?.rollNo || '',
          studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
          currentClass,
          currentSection,
          promotedClass: targetClass,
          promotedSection: targetSection,
          promotionStatus: 'Promoted',
          promotionReason: '',
          academicYear: fromYear,
          promotionDate: activeRequest.promotionDate ? activeRequest.promotionDate.toISOString().split('T')[0] : '',
          effectiveDate: activeRequest.effectiveDate ? activeRequest.effectiveDate.toISOString().split('T')[0] : '',
          approvedBy: activeRequest.approvedBy || '',
          promotedBy: req.user?.userId || 'admin',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Accumulate records into the request document
    activeRequest.promotionRecords = [
      ...(activeRequest.promotionRecords || []),
      ...promotionRecords
    ];

    // Check if there are any remaining students in fromYear to be processed
    const processedStudentIds = await promotionHistoryCollection.distinct('studentId', {
      targetAcademicYear: toYear
    });

    const remainingStudentsCount = await usersCollection.countDocuments({
      isActive: { $ne: false },
      $or: [
        { "studentDetails.academic.academicYear": { $in: uniqueYears } },
        { "academicInfo.academicYear": { $in: uniqueYears } },
        { "academicYear": { $in: uniqueYears } },
        { "studentDetails.academicYear": { $in: uniqueYears } }
      ],
      _id: { $nin: processedStudentIds }
    });

    if (remainingStudentsCount === 0) {
      // All students processed — generate the FINAL combined CSV
      const allRecords = activeRequest.promotionRecords || promotionRecords;
      const csvBuffer = buildPromotionCsv(allRecords);
      const uploadResult = await uploadPDFBufferToCloudinary(
        csvBuffer,
        `promotions/${schoolCode}`,
        `promotion_report_${activeRequest._id}_final`,
        'text/csv'
      );

      activeRequest.status = 'Completed';
      activeRequest.completedAt = new Date();
      activeRequest.excelReportUrl = uploadResult.downloadUrl;
      activeRequest.excelReportFilename = `promotion_report_${fromYear}_to_${toYear}.csv`;
      activeRequest.totalStudents = allRecords.length;
      console.log(`🎉 All students processed (${allRecords.length} records). Promotion request marked as Completed.`);
    } else {
      activeRequest.status = 'Approved';
      console.log(`📊 ${remainingStudentsCount} students remaining. Request status kept as Approved.`);
    }

    activeRequest.auditLog.push({
      action: 'Execute Promotion',
      doneBy: req.user?.userId || 'admin',
      timestamp: new Date(),
      details: `Executed bulk promotion (${promotedCount} promoted, ${graduatedCount} graduated, ${skippedCount} skipped). Status: ${activeRequest.status}`
    });
    await activeRequest.save();

    await session.commitTransaction();
    session.endSession();

    invalidateStudentsCache(schoolCode);
    invalidateActiveRequestCache(schoolCode);

    res.status(200).json({
      success: true,
      message: `Successfully executed bulk promotion.${remainingStudentsCount === 0 ? ' All students processed. Excel report generated.' : ''}`,
      data: {
        promoted: promotedCount,
        graduated: graduatedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
        fromYear,
        toYear
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error in bulk promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Error promoting students during transaction',
      error: error.message
    });
  }
};

// Manual section promotion with exceptions
exports.sectionPromotion = async (req, res) => {
  const schoolCode = req.params.schoolCode.trim().toUpperCase();
  const { fromYear, toYear, className, section, holdBackSequenceIds = [], graduateStudents = false } = req.body;

  if (!fromYear || !toYear || !className || !section) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: fromYear, toYear, className, section'
    });
  }

  const school = await School.findOne({ code: schoolCode });
  if (!school) {
    return res.status(404).json({ success: false, message: 'School not found' });
  }

  // Validate that the destination Academic Year has been created and activated by the Super Admin
  if (!school.settings?.academicYear?.currentYear || school.settings.academicYear.currentYear !== toYear) {
    return res.status(400).json({
      success: false,
      message: 'The next Academic Year has not been created or activated by the Super Admin. Student promotion cannot proceed until the new Academic Year is set.'
    });
  }

  // Check if promotion has already been completed for this transition (LOCK enforcement)
  const completedRequest = await PromotionRequest.findOne({
    schoolCode: schoolCode,
    fromYear,
    toYear,
    status: 'Completed'
  });

  if (completedRequest) {
    return res.status(400).json({
      success: false,
      message: `Student promotion for Academic Year ${fromYear} to ${toYear} has already been completed. The Promotion Module will be available again after the Super Admin activates the next Academic Year.`
    });
  }

  // Retrieve approved promotion request matching both fromYear and toYear
  const activeRequest = await PromotionRequest.findOne({
    schoolCode: schoolCode,
    fromYear,
    toYear,
    status: 'Approved'
  });

  if (!activeRequest) {
    return res.status(400).json({
      success: false,
      message: `No approved promotion request found for transition ${fromYear} -> ${toYear}. Promotion is blocked.`
    });
  }

  const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
  const mongoose = require('mongoose');
  const session = await schoolConnection.startSession();

  try {
    session.startTransaction();

    const usersCollection = schoolConnection.collection('students');
    const alumniCollection = schoolConnection.collection('alumni');
    const promotionHistoryCollection = schoolConnection.collection('promotion_history');

    // Build exact student matching query to avoid omissions
    const yearFormats = [fromYear];
    const matchShort = fromYear.match(/^(\d{4})-(\d{2})$/);
    if (matchShort) yearFormats.push(`${matchShort[1]}-20${matchShort[2]}`);
    const matchLong = fromYear.match(/^(\d{4})-(\d{4})$/);
    if (matchLong) yearFormats.push(`${matchLong[1]}-${matchLong[2].substring(2)}`);
    const uniqueYears = [...new Set(yearFormats)];

    const eligibleStudentsQuery = {
      isActive: { $ne: false },
      $or: [
        { "studentDetails.academic.academicYear": { $in: uniqueYears } },
        { "academicInfo.academicYear": { $in: uniqueYears } },
        { "academicYear": { $in: uniqueYears } },
        { "studentDetails.academicYear": { $in: uniqueYears } }
      ]
    };

    // Fetch students directly from collection (avoiding stale cache omissions)
    const allStudentsInDb = await usersCollection.find(eligibleStudentsQuery).toArray();

    // Filter by class and section
    const students = allStudentsInDb.filter(student => {
      const currentClass = getStudentClass(student);
      const currentSection = getStudentSection(student);
      return currentClass === className && currentSection === section;
    });

    console.log(`📊 Students matching Class ${className}-${section} for "${fromYear}": ${students.length}`);

    if (students.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: `No students found in Class ${className}-${section} for ${fromYear}`
      });
    }

    const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const classesCollection = schoolConnection.collection('classes');
    const activeClasses = await classesCollection.find({ isActive: true }).toArray();
    const configuredClassNames = activeClasses.map(c => c.className);

    // Determine the highest configured class in the school
    const finalYearClass = configuredClassNames.reduce((max, cls) => {
      const maxIndex = classOrder.indexOf(max);
      const clsIndex = classOrder.indexOf(cls);
      return clsIndex > maxIndex ? cls : max;
    }, configuredClassNames[0] || 'LKG');

    const isFinalClass = className === finalYearClass;

    // Determine next class from progression map
    const nextClass = classProgression[className];

    // Backend-driven graduation decision:
    // Graduate ONLY if this is the final configured class AND there is no valid next class to promote into.
    // If a next class exists in classProgression AND is configured in the school, always promote (never graduate).
    let shouldGraduate = false;
    if (isFinalClass && (!nextClass || !configuredClassNames.includes(nextClass))) {
      shouldGraduate = true;
      console.log(`🎓 Class ${className} is the final configured class. Students will be graduated as Alumni.`);
    } else if (!nextClass) {
      // classProgression doesn't define a next class (e.g. '12' -> null),
      // but the school may have custom classes beyond the standard progression.
      // Check if there's any higher class configured
      const currentIndex = classOrder.indexOf(className);
      const higherConfigured = configuredClassNames.find(c => classOrder.indexOf(c) > currentIndex);
      if (!higherConfigured) {
        shouldGraduate = true;
        console.log(`🎓 No higher class configured after ${className}. Students will be graduated as Alumni.`);
      } else {
        // There IS a higher class, but classProgression doesn't map to it.
        // This is a configuration gap — block promotion with a clear error.
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `No progression defined from Class ${className}. Higher classes exist (e.g. ${higherConfigured}) but no mapping is configured. Please contact support.`
        });
      }
    }

    if (!shouldGraduate) {
      // Verify the destination class actually exists in the school
      const nextClassExists = await classesCollection.findOne({
        className: nextClass,
        isActive: true
      });

      if (!nextClassExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Cannot promote to Class ${nextClass}. This class is not configured in your school.`,
          errorCode: 'CLASS_NOT_FOUND'
        });
      }
      console.log(`📚 Class ${className} -> ${nextClass}. Students will be promoted (not graduated).`);
    }

    let promotedCount = 0;
    let heldBackCount = 0;
    let graduatedCount = 0;
    let skippedCount = 0;
    let errors = [];
    const promotionBatchId = uuidv4();
    const promotionRecords = [];

    for (const student of students) {
      // Check duplicate promotion
      const existingDest = await usersCollection.findOne({
        userId: student.userId,
        $or: [
          { "studentDetails.academic.academicYear": toYear },
          { "academicInfo.academicYear": toYear },
          { "academicYear": toYear },
          { "studentDetails.academicYear": toYear }
        ]
      });

      if (existingDest) {
        console.log(`Student ${student.userId} already has enrollment in ${toYear}. Skipping duplicate.`);
        skippedCount++;
        continue;
      }

      const isHeldBack = holdBackSequenceIds.includes(student.userId);

      if (isHeldBack) {
        // Add to promotion history
        await promotionHistoryCollection.insertOne({
          batchId: promotionBatchId,
          studentId: student._id,
          userId: student.userId,
          previousState: {
            academicYear: fromYear,
            class: className,
            section,
            status: student.studentDetails?.status || 'active'
          },
          action: 'held_back',
          targetClass: className,
          targetAcademicYear: toYear,
          processedAt: new Date(),
          processedBy: req.user?.userId || 'admin'
        }, { session });

        // Clone student document for destination academic year, retaining class and section
        const targetClass = className;
        const targetSection = section;

        const newStudentDoc = {
          ...student,
          _id: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          academicYear: toYear,
          class: targetClass,
          section: targetSection
        };

        if (newStudentDoc.academicInfo) {
          newStudentDoc.academicInfo = {
            ...newStudentDoc.academicInfo,
            academicYear: toYear,
            class: targetClass,
            section: targetSection
          };
        }
        if (newStudentDoc.studentDetails) {
          newStudentDoc.studentDetails = {
            ...newStudentDoc.studentDetails,
            academicYear: toYear,
            currentClass: targetClass,
            currentSection: targetSection
          };
          if (newStudentDoc.studentDetails.academic) {
            newStudentDoc.studentDetails.academic = {
              ...newStudentDoc.studentDetails.academic,
              academicYear: toYear,
              currentClass: targetClass,
              currentSection: targetSection
            };
          }
          newStudentDoc.studentDetails.academicHistory = [
            ...(newStudentDoc.studentDetails.academicHistory || [])
          ];
          newStudentDoc.studentDetails.academicHistory.push({
            promotionBatchId,
            academicYear: fromYear,
            class: className,
            section,
            result: 'detained',
            percentage: undefined,
            rank: undefined,
            attendance: undefined
          });
        }

        await usersCollection.insertOne(newStudentDoc, { session });

        heldBackCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNumber || student.studentDetails?.rollNo || '',
          studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
          currentClass: className,
          currentSection: section,
          promotedClass: className,
          promotedSection: section,
          promotionStatus: 'Retained',
          promotionReason: 'Held back by Admin',
          academicYear: fromYear,
          promotionDate: activeRequest.promotionDate ? activeRequest.promotionDate.toISOString().split('T')[0] : '',
          effectiveDate: activeRequest.effectiveDate ? activeRequest.effectiveDate.toISOString().split('T')[0] : '',
          approvedBy: activeRequest.approvedBy || '',
          promotedBy: req.user?.userId || 'admin',
          timestamp: new Date().toISOString()
        });
      } else if (shouldGraduate) {
        // Add to promotion history
        await promotionHistoryCollection.insertOne({
          batchId: promotionBatchId,
          studentId: student._id,
          userId: student.userId,
          previousState: {
            academicYear: fromYear,
            class: className,
            section,
            status: student.studentDetails?.status || 'active'
          },
          action: 'graduated',
          targetAcademicYear: toYear,
          processedAt: new Date(),
          processedBy: req.user?.userId || 'admin'
        }, { session });

        // Clone student document to alumni collection
        const alumniRecord = {
          ...student,
          _id: new mongoose.Types.ObjectId(),
          graduationYear: toYear,
          graduationClass: className,
          graduationSection: section,
          movedToAlumniAt: new Date(),
          originalStudentId: student._id,
          status: 'passedOut'
        };
        if (alumniRecord.studentDetails) {
          alumniRecord.studentDetails = {
            ...alumniRecord.studentDetails,
            status: 'passedOut',
            academicYear: toYear
          };
        }
        await alumniCollection.insertOne(alumniRecord, { session });

        // Leave original record in students collection completely unchanged!

        graduatedCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNumber || student.studentDetails?.rollNo || '',
          studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
          currentClass: className,
          currentSection: section,
          promotedClass: 'Graduated',
          promotedSection: '',
          promotionStatus: 'Passed Out',
          promotionReason: '',
          academicYear: fromYear,
          promotionDate: activeRequest.promotionDate ? activeRequest.promotionDate.toISOString().split('T')[0] : '',
          effectiveDate: activeRequest.effectiveDate ? activeRequest.effectiveDate.toISOString().split('T')[0] : '',
          approvedBy: activeRequest.approvedBy || '',
          promotedBy: req.user?.userId || 'admin',
          timestamp: new Date().toISOString()
        });
      } else {
        // Add to promotion history
        await promotionHistoryCollection.insertOne({
          batchId: promotionBatchId,
          studentId: student._id,
          userId: student.userId,
          previousState: {
            academicYear: fromYear,
            class: className,
            section,
            status: student.studentDetails?.status || 'active'
          },
          action: 'promoted',
          targetClass: nextClass,
          targetAcademicYear: toYear,
          processedAt: new Date(),
          processedBy: req.user?.userId || 'admin'
        }, { session });

        // Clone student document to destination academic year, advancing class
        const targetClass = nextClass;
        const targetSection = section;

        const newStudentDoc = {
          ...student,
          _id: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          academicYear: toYear,
          class: targetClass,
          section: targetSection
        };

        if (newStudentDoc.academicInfo) {
          newStudentDoc.academicInfo = {
            ...newStudentDoc.academicInfo,
            academicYear: toYear,
            class: targetClass,
            section: targetSection
          };
        }
        if (newStudentDoc.studentDetails) {
          newStudentDoc.studentDetails = {
            ...newStudentDoc.studentDetails,
            academicYear: toYear,
            currentClass: targetClass,
            currentSection: targetSection
          };
          if (newStudentDoc.studentDetails.academic) {
            newStudentDoc.studentDetails.academic = {
              ...newStudentDoc.studentDetails.academic,
              academicYear: toYear,
              currentClass: targetClass,
              currentSection: targetSection
            };
          }
          newStudentDoc.studentDetails.academicHistory = [
            ...(newStudentDoc.studentDetails.academicHistory || [])
          ];
          newStudentDoc.studentDetails.academicHistory.push({
            promotionBatchId,
            academicYear: fromYear,
            class: className,
            section,
            result: 'promoted',
            percentage: undefined,
            rank: undefined,
            attendance: undefined
          });
        }

        await usersCollection.insertOne(newStudentDoc, { session });

        promotedCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNumber || student.studentDetails?.rollNo || '',
          studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
          currentClass: className,
          currentSection: section,
          promotedClass: targetClass,
          promotedSection: targetSection,
          promotionStatus: 'Promoted',
          promotionReason: '',
          academicYear: fromYear,
          promotionDate: activeRequest.promotionDate ? activeRequest.promotionDate.toISOString().split('T')[0] : '',
          effectiveDate: activeRequest.effectiveDate ? activeRequest.effectiveDate.toISOString().split('T')[0] : '',
          approvedBy: activeRequest.approvedBy || '',
          promotedBy: req.user?.userId || 'admin',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Accumulate this section's records into the request document
    // This ensures all sections' data is combined into one final Excel report
    activeRequest.promotionRecords = [
      ...(activeRequest.promotionRecords || []),
      ...promotionRecords
    ];

    // Check if there are any remaining students in fromYear to be processed
    const processedStudentIds = await promotionHistoryCollection.distinct('studentId', {
      targetAcademicYear: toYear
    });

    const remainingStudentsCount = await usersCollection.countDocuments({
      isActive: { $ne: false },
      $or: [
        { "studentDetails.academic.academicYear": { $in: uniqueYears } },
        { "academicInfo.academicYear": { $in: uniqueYears } },
        { "academicYear": { $in: uniqueYears } },
        { "studentDetails.academicYear": { $in: uniqueYears } }
      ],
      _id: { $nin: processedStudentIds }
    });

    if (remainingStudentsCount === 0) {
      // All students processed — generate the FINAL combined CSV from all accumulated records
      const allRecords = activeRequest.promotionRecords || promotionRecords;
      const csvBuffer = buildPromotionCsv(allRecords);
      const uploadResult = await uploadPDFBufferToCloudinary(
        csvBuffer,
        `promotions/${schoolCode}`,
        `promotion_report_${activeRequest._id}_final`,
        'text/csv'
      );

      activeRequest.status = 'Completed';
      activeRequest.completedAt = new Date();
      activeRequest.excelReportUrl = uploadResult.downloadUrl;
      activeRequest.excelReportFilename = `promotion_report_${fromYear}_to_${toYear}.csv`;
      activeRequest.totalStudents = allRecords.length;
      console.log(`🎉 All students processed (${allRecords.length} records). Promotion request marked as Completed. Excel: ${uploadResult.downloadUrl}`);
    } else {
      activeRequest.status = 'Approved';
      console.log(`📊 ${remainingStudentsCount} students remaining. Request status kept as Approved. Accumulated ${activeRequest.promotionRecords.length} records so far.`);
    }

    activeRequest.auditLog.push({
      action: 'Execute Promotion',
      doneBy: req.user?.userId || 'admin',
      timestamp: new Date(),
      details: `Executed promotion for Class ${className}-${section} (${promotedCount} promoted, ${heldBackCount} held back, ${graduatedCount} graduated, ${skippedCount} skipped). Status: ${activeRequest.status}`
    });
    await activeRequest.save();

    await session.commitTransaction();
    session.endSession();

    invalidateStudentsCache(schoolCode);
    invalidateActiveRequestCache(schoolCode);

    res.status(200).json({
      success: true,
      message: `Successfully promoted Class ${className}-${section}.${remainingStudentsCount === 0 ? ' All sections complete. Excel report generated.' : ` ${remainingStudentsCount} students remaining in other sections.`}`,
      data: {
        promoted: promotedCount,
        graduated: graduatedCount,
        heldBack: heldBackCount,
        skipped: skippedCount,
        fromYear,
        toYear
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error in section promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Error promoting section during transaction',
      error: error.message
    });
  }
};

// Submit Promotion Request
exports.submitPromotionRequest = async (req, res) => {
  try {
    const schoolCode = req.params.schoolCode.trim().toUpperCase();
    const { fromYear, toYear, promotionDate, effectiveDate } = req.body;

    if (!fromYear || !toYear || !promotionDate || !effectiveDate) {
      return res.status(400).json({ success: false, message: 'Missing required configuration fields.' });
    }

    const school = await School.findOne({ code: schoolCode });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Verify next Academic Year has been created and activated by Super Admin
    if (!school.settings?.academicYear?.currentYear || school.settings.academicYear.currentYear !== toYear) {
      return res.status(400).json({
        success: false,
        message: 'The next Academic Year has not been created or activated by the Super Admin. Student promotion cannot proceed until the new Academic Year is set.'
      });
    }

    // Check for any existing request (pending, approved, or already completed)
    const existingActive = await PromotionRequest.findOne({
      schoolCode: schoolCode,
      fromYear,
      toYear,
      status: { $in: ['Pending Approval', 'Approved', 'Completed'] }
    });

    if (existingActive) {
      if (existingActive.status === 'Completed') {
        return res.status(400).json({
          success: false,
          message: `Student promotion for Academic Year ${fromYear} to ${toYear} has already been completed. The Promotion Module will be available again after the Super Admin activates the next Academic Year.`
        });
      }
      return res.status(400).json({
        success: false,
        message: 'A duplicate promotion request is already pending or approved for this academic year transition.'
      });
    }

    // Direct database lookup for eligible students
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
    const studentsCollection = schoolConnection.collection('students');
    const yearFormats = [fromYear];
    const matchShort = fromYear.match(/^(\d{4})-(\d{2})$/);
    if (matchShort) yearFormats.push(`${matchShort[1]}-20${matchShort[2]}`);
    const matchLong = fromYear.match(/^(\d{4})-(\d{4})$/);
    if (matchLong) yearFormats.push(`${matchLong[1]}-${matchLong[2].substring(2)}`);
    const uniqueYears = [...new Set(yearFormats)];

    const eligibleStudentsQuery = {
      isActive: { $ne: false },
      $or: [
        { "studentDetails.academic.academicYear": { $in: uniqueYears } },
        { "academicInfo.academicYear": { $in: uniqueYears } },
        { "academicYear": { $in: uniqueYears } },
        { "studentDetails.academicYear": { $in: uniqueYears } }
      ]
    };
    const totalStudents = await studentsCollection.countDocuments(eligibleStudentsQuery);

    let displayName = 'Admin';
    if (req.user.name) {
      if (typeof req.user.name === 'object') {
        displayName = `${req.user.name.firstName || ''} ${req.user.name.lastName || ''}`.trim() || 'Admin';
      } else {
        displayName = String(req.user.name);
      }
    } else if (req.user.email) {
      displayName = req.user.email;
    }

    const request = await PromotionRequest.create({
      schoolCode,
      schoolName: school.name,
      requestedBy: req.user.userId || req.user.email || req.user._id?.toString() || 'Admin',
      requestedByName: displayName,
      fromYear,
      toYear,
      promotionDate: new Date(promotionDate),
      effectiveDate: new Date(effectiveDate),
      totalStudents,
      status: 'Pending Approval',
      auditLog: [{
        action: 'Submit Request',
        doneBy: req.user.userId || req.user.email || req.user._id?.toString() || 'Admin',
        timestamp: new Date(),
        details: `Submitted promotion request for academic year ${fromYear} -> ${toYear}. Total students: ${totalStudents}.`
      }]
    });

    invalidateActiveRequestCache(schoolCode);

    await createNotification(req, {
      userId: 'superadmin',
      role: 'superadmin',
      schoolCode,
      title: 'New Promotion Request Received',
      message: `School "${school.name}" has submitted a promotion request from ${fromYear} to ${toYear} for ${totalStudents} students.`,
      metadata: { requestId: request._id, schoolCode }
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    console.error('❌ Error submitting promotion request:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Fetch requests
exports.getPromotionRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const requests = await PromotionRequest.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('❌ Error fetching promotion requests:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Approve Request
exports.approvePromotionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PromotionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Promotion request not found.' });
    }

    request.status = 'Approved';
    request.approvedBy = req.user.email || req.user.userId || 'Super Admin';
    request.approvedAt = new Date();
    request.auditLog.push({
      action: 'Approve Request',
      doneBy: req.user.email || req.user.userId || 'Super Admin',
      timestamp: new Date(),
      details: 'Approved the student promotion request.'
    });
    await request.save();

    invalidateActiveRequestCache(request.schoolCode);

    await createNotification(req, {
      userId: request.requestedBy,
      role: 'admin',
      schoolCode: request.schoolCode,
      title: 'Promotion Request Approved',
      message: `Your promotion request for ${request.fromYear} has been approved by the Super Admin. You are now allowed to run the promotions.`,
      metadata: { requestId: request._id }
    });

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Reject Request
exports.rejectPromotionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const request = await PromotionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Promotion request not found.' });
    }

    request.status = 'Rejected';
    request.rejectionReason = rejectionReason;
    request.rejectedAt = new Date();
    request.auditLog.push({
      action: 'Reject Request',
      doneBy: req.user.email || req.user.userId || 'Super Admin',
      timestamp: new Date(),
      details: `Rejected promotion request. Reason: ${rejectionReason}`
    });
    await request.save();

    invalidateActiveRequestCache(request.schoolCode);

    await createNotification(req, {
      userId: request.requestedBy,
      role: 'admin',
      schoolCode: request.schoolCode,
      title: 'Promotion Request Rejected',
      message: `Your promotion request for ${request.fromYear} was rejected: ${rejectionReason}`,
      metadata: { requestId: request._id, reason: rejectionReason }
    });

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Get active request for school
exports.getActivePromotionRequest = async (req, res) => {
  try {
    const schoolCode = req.params.schoolCode.trim().toUpperCase();
    const cacheKey = CACHE_KEYS.activeRequest(schoolCode);

    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return res.status(200).json({ success: true, data: cached });
    }

    const request = await PromotionRequest.findOne({
      schoolCode: schoolCode
    }).sort({ createdAt: -1 });

    cache.set(cacheKey, request, 15);

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('❌ Error fetching active promotion request:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Notifications list
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.role === 'superadmin' ? 'superadmin' : req.user.userId;
    const cacheKey = CACHE_KEYS.notifications(userId);

    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return res.status(200).json({ success: true, data: cached });
    }

    const filter = { userId, isRead: false };
    const list = await SystemNotification.find(filter).sort({ createdAt: -1 });

    cache.set(cacheKey, list, 15);

    res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await SystemNotification.findByIdAndUpdate(id, { isRead: true });

    if (notification) {
      invalidateNotificationsCache(notification.userId);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error updating notification:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = exports;