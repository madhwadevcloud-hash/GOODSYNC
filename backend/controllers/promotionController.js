const DatabaseManager = require('../utils/databaseManager');
const School = require('../models/School');
const UserGenerator = require('../utils/userGenerator');
const { v4: uuidv4 } = require('uuid');
const PromotionRequest = require('../models/PromotionRequest');
const SystemNotification = require('../models/Notification');
const { uploadPDFBufferToCloudinary } = require('../config/cloudinary');

// Class progression map
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
  '12': null // Final year
};

// Helper to format academic year
const cleanTestName = (name) => {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Helper function to create persistent and real-time notifications
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
  const schoolCode = req.params.schoolCode.toUpperCase();
  const { fromYear, toYear, finalYearAction } = req.body;

  // 1. Validate active approved request exists
  const activeRequest = await PromotionRequest.findOne({
    schoolCode: { $regex: new RegExp(`^${schoolCode}$`, 'i') },
    fromYear,
    status: 'Approved'
  });

  if (!activeRequest) {
    return res.status(400).json({
      success: false,
      message: 'No approved promotion request found for this academic year. Promotion is blocked.'
    });
  }

  const school = await School.findOne({ code: schoolCode });
  if (!school) {
    return res.status(404).json({ success: false, message: 'School not found' });
  }

  const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
  const session = await schoolConnection.startSession();

  try {
    session.startTransaction();

    let usersCollection = schoolConnection.collection('students');
    const alumniCollection = schoolConnection.collection('alumni');
    const classRequestsCollection = schoolConnection.collection('classrequests');
    const promotionHistoryCollection = schoolConnection.collection('promotion_history');

    // Fetch students using UserGenerator
    let allStudents = await UserGenerator.getUsersByRole(schoolCode, 'student');
    const students = allStudents.filter(student => {
      const academicYear = student.studentDetails?.academicYear || 
                         student.studentDetails?.academic?.academicYear || 
                         student.academicYear || 
                         student.currentAcademicYear;
      return academicYear === fromYear && (student.isActive !== false);
    });

    if (students.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: `No students found for academic year ${fromYear}`
      });
    }

    // Determine final year class
    const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const uniqueClasses = [...new Set(students.map(s => 
      s.studentDetails?.currentClass || s.studentDetails?.academic?.currentClass
    ).filter(Boolean))];
    const finalYearClass = uniqueClasses.reduce((max, cls) => {
      const maxIndex = classOrder.indexOf(max);
      const clsIndex = classOrder.indexOf(cls);
      return clsIndex > maxIndex ? cls : max;
    }, 'LKG');

    // Get all available classes in school to validate promotions
    const classesCollection = schoolConnection.collection('classes');
    const availableClasses = await classesCollection.find({ schoolCode, isActive: true }).toArray();
    const availableClassNames = new Set(availableClasses.map(c => c.className));

    let promotedCount = 0;
    let graduatedCount = 0;
    let skippedCount = 0;
    let errors = [];
    const promotionBatchId = uuidv4();
    const promotionRecords = [];

    for (const student of students) {
      const currentClass = student.studentDetails?.currentClass || student.studentDetails?.academic?.currentClass;
      const currentSection = student.studentDetails?.currentSection || student.studentDetails?.academic?.currentSection;

      if (!currentClass) {
        errors.push({ userId: student.userId, error: 'No current class found' });
        continue;
      }

      // Check if student has already been promoted to toYear to prevent double promotion
      const currentStudentYear = student.studentDetails?.academicYear || 
                                 student.studentDetails?.academic?.academicYear || 
                                 student.academicYear || 
                                 student.currentAcademicYear;
      if (currentStudentYear === toYear) {
        throw new Error(`Student ${student.userId} has already been promoted/updated for academic year ${toYear}.`);
      }

      // Handle final year students
      if (currentClass === finalYearClass) {
        if (finalYearAction === 'graduate') {
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

          const alumniRecord = {
            ...student,
            graduationYear: toYear,
            graduationClass: currentClass,
            graduationSection: currentSection,
            movedToAlumniAt: new Date(),
            originalStudentId: student._id
          };

          await alumniCollection.insertOne(alumniRecord, { session });
          await usersCollection.updateOne(
            { _id: student._id },
            {
              $set: {
                isActive: false,
                'studentDetails.status': 'alumni',
                'studentDetails.academicYear': toYear,
                updatedAt: new Date()
              }
            },
            { session }
          );

          graduatedCount++;
          promotionRecords.push({
            admissionNumber: student.userId,
            rollNumber: student.studentDetails?.rollNo || '',
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
          
          promotionRecords.push({
            admissionNumber: student.userId,
            rollNumber: student.studentDetails?.rollNo || '',
            studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
            currentClass,
            currentSection,
            promotedClass: currentClass,
            promotedSection: currentSection,
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

        await usersCollection.updateOne(
          { _id: student._id },
          {
            $set: {
              'studentDetails.currentClass': nextClass,
              'studentDetails.academicYear': toYear,
              updatedAt: new Date()
            },
            $push: {
              'studentDetails.academicHistory': {
                promotionBatchId,
                academicYear: fromYear,
                class: currentClass,
                section: currentSection,
                result: 'promoted',
                promotedAt: new Date()
              }
            }
          },
          { session }
        );

        promotedCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNo || '',
          studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
          currentClass,
          currentSection,
          promotedClass: nextClass,
          promotedSection: currentSection,
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

    // Compile and upload Excel CSV Report
    const csvContent = [
      'Admission Number,Roll Number,Student Name,Current Class,Current Section,Promoted Class,Promoted Section,Promotion Status,Promotion Reason if retained,Academic Year,Promotion Date,Effective Date,Approved By,Promoted By,Timestamp'
    ];
    for (const record of promotionRecords) {
      csvContent.push([
        `"${record.admissionNumber}"`,
        `"${record.rollNumber}"`,
        `"${record.studentName}"`,
        `"${record.currentClass}"`,
        `"${record.currentSection}"`,
        `"${record.promotedClass}"`,
        `"${record.promotedSection}"`,
        `"${record.promotionStatus}"`,
        `"${record.promotionReason}"`,
        `"${record.academicYear}"`,
        `"${record.promotionDate}"`,
        `"${record.effectiveDate}"`,
        `"${record.approvedBy}"`,
        `"${record.promotedBy}"`,
        `"${record.timestamp}"`
      ].join(','));
    }

    const csvBuffer = Buffer.from(csvContent.join('\n'), 'utf-8');
    const uploadResult = await uploadPDFBufferToCloudinary(
      csvBuffer,
      `promotions/${schoolCode}`,
      `bulk_promotion_report_${activeRequest._id}_${Date.now()}`,
      'text/csv'
    );

    // Update activeRequest to Completed
    activeRequest.status = 'Completed';
    activeRequest.excelReportUrl = uploadResult.secure_url;
    activeRequest.excelReportFilename = `bulk_promotion_report_${fromYear}.csv`;
    activeRequest.completedAt = new Date();
    activeRequest.auditLog.push({
      action: 'Execute Promotion',
      doneBy: req.user?.userId || 'admin',
      timestamp: new Date(),
      details: `Executed bulk promotion (${promotedCount} promoted, ${graduatedCount} graduated). Generated CSV report.`
    });
    await activeRequest.save();

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Successfully executed bulk promotion. Report generated: ${uploadResult.secure_url}`,
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
  const schoolCode = req.params.schoolCode.toUpperCase();
  const { fromYear, toYear, className, section, holdBackSequenceIds = [], graduateStudents = false } = req.body;

  // 1. Validate active approved request exists
  const activeRequest = await PromotionRequest.findOne({
    schoolCode: { $regex: new RegExp(`^${schoolCode}$`, 'i') },
    fromYear,
    status: 'Approved'
  });

  if (!activeRequest) {
    return res.status(400).json({
      success: false,
      message: 'No approved promotion request found for this academic year. Promotion is blocked.'
    });
  }

  const school = await School.findOne({ code: schoolCode });
  if (!school) {
    return res.status(404).json({ success: false, message: 'School not found' });
  }

  const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode);
  const session = await schoolConnection.startSession();

  try {
    session.startTransaction();

    let usersCollection = schoolConnection.collection('students');
    const alumniCollection = schoolConnection.collection('alumni');
    const promotionHistoryCollection = schoolConnection.collection('promotion_history');

    // Fetch students using UserGenerator
    let allStudents = await UserGenerator.getUsersByRole(schoolCode, 'student');
    const students = allStudents.filter(student => {
      const academicYear = student.studentDetails?.academicYear || 
                         student.studentDetails?.academic?.academicYear || 
                         student.academicYear || 
                         student.currentAcademicYear;
      const currentClass = student.studentDetails?.currentClass || student.studentDetails?.academic?.currentClass || student.currentClass;
      const currentSection = student.studentDetails?.currentSection || student.studentDetails?.academic?.currentSection || student.currentSection;
      
      return academicYear === fromYear && 
             currentClass === className && 
             currentSection === section && 
             (student.isActive !== false);
    });

    if (students.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: `No students found in Class ${className}-${section} for ${fromYear}`
      });
    }

    const nextClass = classProgression[className];
    if (!nextClass && !graduateStudents) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `No progression defined for class ${className}. This may be the final year.`
      });
    }

    // Check if next class exists
    if (!graduateStudents) {
      const classesCollection = schoolConnection.collection('classes');
      const nextClassExists = await classesCollection.findOne({
        schoolCode,
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
    }

    let promotedCount = 0;
    let heldBackCount = 0;
    let graduatedCount = 0;
    let errors = [];
    const promotionBatchId = uuidv4();
    const promotionRecords = [];

    for (const student of students) {
      // Prevent double promotion check
      const currentStudentYear = student.studentDetails?.academicYear || 
                                 student.studentDetails?.academic?.academicYear || 
                                 student.academicYear || 
                                 student.currentAcademicYear;
      if (currentStudentYear === toYear) {
        throw new Error(`Student ${student.userId} has already been promoted/updated for academic year ${toYear}.`);
      }

      if (holdBackSequenceIds.includes(student.userId)) {
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

        await usersCollection.updateOne(
          { _id: student._id },
          {
            $set: {
              'studentDetails.academicYear': toYear,
              updatedAt: new Date()
            },
            $push: {
              'studentDetails.academicHistory': {
                promotionBatchId,
                academicYear: fromYear,
                class: className,
                section,
                result: 'detained',
                detainedAt: new Date()
              }
            }
          },
          { session }
        );

        heldBackCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNo || '',
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
      } else if (graduateStudents) {
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

        const alumniRecord = {
          ...student,
          graduationYear: toYear,
          graduationClass: className,
          graduationSection: section,
          movedToAlumniAt: new Date(),
          originalStudentId: student._id,
          status: 'passedOut'
        };

        await alumniCollection.insertOne(alumniRecord, { session });
        await usersCollection.updateOne(
          { _id: student._id },
          {
            $set: {
              isActive: false,
              'studentDetails.status': 'passedOut',
              'studentDetails.academicYear': toYear,
              updatedAt: new Date()
            },
            $push: {
              'studentDetails.academicHistory': {
                promotionBatchId,
                academicYear: fromYear,
                class: className,
                section,
                result: 'passedOut',
                passedOutAt: new Date()
              }
            }
          },
          { session }
        );

        graduatedCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNo || '',
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

        await usersCollection.updateOne(
          { _id: student._id },
          {
            $set: {
              'studentDetails.currentClass': nextClass,
              'studentDetails.academicYear': toYear,
              updatedAt: new Date()
            },
            $push: {
              'studentDetails.academicHistory': {
                promotionBatchId,
                academicYear: fromYear,
                class: className,
                section,
                result: 'promoted',
                promotedAt: new Date()
              }
            }
          },
          { session }
        );

        promotedCount++;
        promotionRecords.push({
          admissionNumber: student.userId,
          rollNumber: student.studentDetails?.rollNo || '',
          studentName: `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim(),
          currentClass: className,
          currentSection: section,
          promotedClass: nextClass,
          promotedSection: section,
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

    // Compile and upload Excel CSV Report
    const csvContent = [
      'Admission Number,Roll Number,Student Name,Current Class,Current Section,Promoted Class,Promoted Section,Promotion Status,Promotion Reason if retained,Academic Year,Promotion Date,Effective Date,Approved By,Promoted By,Timestamp'
    ];
    for (const record of promotionRecords) {
      csvContent.push([
        `"${record.admissionNumber}"`,
        `"${record.rollNumber}"`,
        `"${record.studentName}"`,
        `"${record.currentClass}"`,
        `"${record.currentSection}"`,
        `"${record.promotedClass}"`,
        `"${record.promotedSection}"`,
        `"${record.promotionStatus}"`,
        `"${record.promotionReason}"`,
        `"${record.academicYear}"`,
        `"${record.promotionDate}"`,
        `"${record.effectiveDate}"`,
        `"${record.approvedBy}"`,
        `"${record.promotedBy}"`,
        `"${record.timestamp}"`
      ].join(','));
    }

    const csvBuffer = Buffer.from(csvContent.join('\n'), 'utf-8');
    const uploadResult = await uploadPDFBufferToCloudinary(
      csvBuffer,
      `promotions/${schoolCode}`,
      `section_promotion_report_${activeRequest._id}_${Date.now()}`,
      'text/csv'
    );

    // Update request state
    activeRequest.status = 'Completed';
    activeRequest.excelReportUrl = uploadResult.secure_url;
    activeRequest.excelReportFilename = `promotion_report_${className}_${section}_${fromYear}.csv`;
    activeRequest.completedAt = new Date();
    activeRequest.auditLog.push({
      action: 'Execute Promotion',
      doneBy: req.user?.userId || 'admin',
      timestamp: new Date(),
      details: `Executed manual promotion for Class ${className}-${section} (${promotedCount} promoted, ${heldBackCount} held back, ${graduatedCount} graduated). Generated CSV report.`
    });
    await activeRequest.save();

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Successfully executed manual promotion. Report generated: ${uploadResult.secure_url}`,
      data: {
        promoted: promotedCount,
        graduated: graduatedCount,
        heldBack: heldBackCount,
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
    const schoolCode = req.params.schoolCode.toUpperCase();
    const { fromYear, toYear, promotionDate, effectiveDate } = req.body;

    if (!fromYear || !toYear || !promotionDate || !effectiveDate) {
      return res.status(400).json({ success: false, message: 'Missing required configuration fields.' });
    }

    // Prevent duplicate active requests (Pending or Approved)
    const existingActive = await PromotionRequest.findOne({
      schoolCode: { $regex: new RegExp(`^${schoolCode}$`, 'i') },
      fromYear,
      status: { $in: ['Pending Approval', 'Approved'] }
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'A duplicate promotion request is already pending or approved for this academic year.'
      });
    }

    const school = await School.findOne({ code: schoolCode });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    // Count eligible students
    const allStudents = await UserGenerator.getUsersByRole(schoolCode, 'student');
    const eligibleStudents = allStudents.filter(student => {
      const academicYear = student.studentDetails?.academicYear || 
                         student.studentDetails?.academic?.academicYear || 
                         student.academicYear || 
                         student.currentAcademicYear;
      return academicYear === fromYear && (student.isActive !== false);
    });

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
      totalStudents: eligibleStudents.length,
      status: 'Pending Approval',
      auditLog: [{
        action: 'Submit Request',
        doneBy: req.user.userId || req.user.email || req.user._id?.toString() || 'Admin',
        timestamp: new Date(),
        details: `Submitted promotion request for academic year ${fromYear} -> ${toYear}. Total students: ${eligibleStudents.length}.`
      }]
    });

    // Notify Super Admin
    await createNotification(req, {
      userId: 'superadmin',
      role: 'superadmin',
      schoolCode,
      title: 'New Promotion Request Received',
      message: `School "${school.name}" has submitted a promotion request from ${fromYear} to ${toYear} for ${eligibleStudents.length} students.`,
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

    // Notify school Admin
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

    // Notify school Admin
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
    const schoolCode = req.params.schoolCode.toUpperCase();
    // Get latest request
    const request = await PromotionRequest.findOne({ 
      schoolCode: { $regex: new RegExp(`^${schoolCode}$`, 'i') } 
    }).sort({ createdAt: -1 });
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
    const filter = { userId, isRead: false };
    const list = await SystemNotification.find(filter).sort({ createdAt: -1 });
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
    await SystemNotification.findByIdAndUpdate(id, { isRead: true });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error updating notification:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = exports;
