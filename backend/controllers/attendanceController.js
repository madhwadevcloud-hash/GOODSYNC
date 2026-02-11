const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const School = require('../models/School');
const DatabaseOptimization = require('../utils/databaseOptimization');
const UserGenerator = require('../utils/userGenerator');

// Enhanced attendance marking with multiple methods and tracking
exports.markAttendance = async (req, res) => {
  try {
    const {
      studentId,
      class: className,
      section,
      date,
      status,
      attendanceType = 'daily',
      method = 'manual',
      deviceId,
      location,
      periods,
      leaveDetails,
      lateDetails,
      teacherNotes
    } = req.body;

    // Check if user is admin or teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolCode = req.user.schoolCode;
    const schoolId = req.user.schoolId;

    // Get student information
    const student = await UserGenerator.getUserByIdOrEmail(schoolCode, studentId);

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if attendance already exists for this student-date
    let attendance = await Attendance.findOne({
      schoolCode,
      studentId,
      date: new Date(date)
    });

    const currentTime = new Date();
    const attendanceData = {
      schoolId,
      schoolCode,
      studentId,
      studentName: `${student.name.firstName} ${student.name.lastName}`,
      studentRollNumber: student.studentDetails?.rollNumber,
      class: className,
      section,
      date: new Date(date),
      status,
      attendanceType,
      timeTracking: {
        schoolStartTime: '08:00',
        schoolEndTime: '15:30'
      }
    };

    // Set check-in/check-out based on status
    if (status === 'present' || status === 'late') {
      attendanceData.timeTracking.checkIn = {
        time: currentTime.toTimeString().slice(0, 5),
        timestamp: currentTime,
        method,
        recordedBy: req.user._id,
        deviceId,
        location
      };
    }

    // Add period-wise attendance if provided
    if (periods && periods.length > 0) {
      attendanceData.timeTracking.periods = periods.map(period => ({
        ...period,
        markedAt: new Date(),
        markedBy: req.user._id
      }));

      // Calculate totals
      attendanceData.timeTracking.totalPeriodsScheduled = periods.length;
      attendanceData.timeTracking.totalPeriodsPresent = periods.filter(p => p.status === 'present').length;
    }

    // Add leave details if absent
    if (status === 'absent' && leaveDetails) {
      attendanceData.leaveDetails = {
        ...leaveDetails,
        appliedBy: leaveDetails.appliedBy || req.user._id,
        appliedAt: new Date()
      };
    }

    // Add late details if late
    if (status === 'late' && lateDetails) {
      attendanceData.lateDetails = lateDetails;
    }

    // Add teacher notes
    if (teacherNotes) {
      attendanceData.teacherNotes = [{
        teacherId: req.user._id,
        teacherName: `${req.user.name.firstName} ${req.user.name.lastName}`,
        note: teacherNotes,
        timestamp: new Date()
      }];
    }

    if (attendance) {
      // Update existing attendance
      if (attendance.isLocked) {
        return res.status(400).json({ message: 'Attendance is locked and cannot be modified' });
      }

      // Track modifications
      const modifications = [];
      if (attendance.status !== status) {
        modifications.push({
          field: 'status',
          oldValue: attendance.status,
          newValue: status,
          modifiedBy: req.user._id,
          modifiedAt: new Date(),
          reason: 'Status update'
        });
      }

      // Update attendance
      Object.assign(attendance, attendanceData);
      attendance.modifications = [...(attendance.modifications || []), ...modifications];
      attendance.lastModifiedBy = req.user._id;
      attendance.lastModifiedAt = new Date();

    } else {
      // Create new attendance record
      attendanceData.createdBy = req.user._id;
      attendanceData.createdAt = new Date();
      attendance = new Attendance(attendanceData);
    }

    await attendance.save();

    // Send parent notification for absence or late arrival
    if (status === 'absent' || status === 'late') {
      await sendParentNotification(attendance, student);
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        attendanceId: attendance.attendanceId,
        studentName: attendance.studentName,
        status: attendance.status,
        date: attendance.date,
        timeTracking: attendance.timeTracking
      }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Session-based bulk attendance marking (morning/afternoon)
exports.markSessionAttendance = async (req, res) => {
  try {
    const {
      date,
      class: className,
      section,
      session, // 'morning' or 'afternoon'
      students // Array of { studentId, userId, status }
    } = req.body;

    // Check permissions
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolCode = req.user.schoolCode;
    const schoolId = req.user.schoolId;
    const results = [];
    const sessionTime = session === 'morning' ? '08:00' : '13:00';
    const markedBy = req.user.name || req.user.userId;

    console.log(`🎯 Processing ${session} attendance for Class ${className} Section ${section} on ${date}`);
    console.log(`👥 Students to process: ${students.length}`);
    console.log(`🏫 School code: ${schoolCode}, School ID: ${schoolId}`);
    console.log(`👤 Marked by: ${markedBy} (${req.user.role})`);

    // Fetch school's current academic year
    const school = await School.findOne({ code: schoolCode });
    const currentAcademicYear = school?.settings?.academicYear?.currentYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    console.log(`📅 Using academic year: ${currentAcademicYear}`);

    // Use school-specific database for attendance storage
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Create the session attendance document ID
    const sessionDocumentId = `${date}_${className}_${section}_${session}`;

    // Check if attendance is already marked (frozen) for this session
    const existingSession = await attendanceCollection.findOne({ _id: sessionDocumentId });
    if (existingSession) {
      console.log(`🔒 Attendance already marked and frozen for ${session} session`);
      return res.status(400).json({
        success: false,
        message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance has already been marked and is frozen. Cannot modify existing attendance.`,
        data: {
          date,
          class: className,
          section,
          session,
          isFrozen: true,
          existingDocument: {
            documentId: sessionDocumentId,
            markedAt: existingSession.markedAt,
            markedBy: existingSession.markedBy,
            totalStudents: existingSession.totalStudents,
            progress: existingSession.progress
          }
        }
      });
    }

    // Process all students and collect their data
    const processedStudents = [];
    let successCount = 0;
    let failCount = 0;

    for (const studentData of students) {
      try {
        console.log(`🔍 Processing student: ${studentData.userId || studentData.studentId} with status: ${studentData.status}`);

        // Validate required fields
        if (!studentData.studentId || !studentData.status) {
          console.log(`❌ Missing data for student: ${JSON.stringify(studentData)}`);
          failCount++;
          continue;
        }

        // Validate status - only 'present' or 'absent' allowed
        if (!['present', 'absent'].includes(studentData.status)) {
          console.log(`❌ Invalid status '${studentData.status}' for student: ${studentData.studentId}`);
          failCount++;
          continue;
        }

        // Get student information using UserGenerator
        console.log(`🔎 Looking up student: ${studentData.studentId} in school: ${schoolCode}`);
        const student = await UserGenerator.getUserByIdOrEmail(schoolCode, studentData.studentId);

        if (!student || student.role !== 'student') {
          console.log(`❌ Student not found or not a student: ${studentData.studentId}`);
          failCount++;
          continue;
        }

        console.log(`✅ Found student: ${student.name?.displayName || student.name} (${student.userId})`);

        // Add student data to the processed list
        processedStudents.push({
          studentId: student.userId, // "P-S-0997"
          studentName: student.name?.displayName || student.name,
          studentDetails: {
            firstName: student.name?.firstName || '',
            lastName: student.name?.lastName || '',
            displayName: student.name?.displayName || student.name
          },
          class: className,
          section: section,
          status: studentData.status, // "present" or "absent"
          markedAt: new Date(),
          rollNumber: student.studentDetails?.rollNumber || student.userId
        });

        successCount++;

      } catch (error) {
        console.error(`Error processing student ${studentData.studentId}:`, error);
        failCount++;
      }
    }

    // Create the single session attendance document
    const sessionAttendanceDocument = {
      // Document Identification
      _id: sessionDocumentId,
      documentType: 'session_attendance',

      // Session Information
      date: new Date(date),
      dateString: date, // "2025-09-07"
      session: session, // "morning" or "afternoon"
      dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),

      // Class Information
      class: className,
      section: section,
      classInfo: `${session.charAt(0).toUpperCase() + session.slice(1)} Attendance - Class ${className} Section ${section}`,

      // Progress Information
      totalStudents: students.length,
      processedStudents: processedStudents.length,
      successCount: successCount,
      failCount: failCount,
      progress: `${successCount}/${students.length} marked`,

      // All Students Data
      students: processedStudents,

      // Academic Information
      academicYear: currentAcademicYear,
      schoolCode: schoolCode,

      // Metadata
      createdAt: new Date(),
      createdBy: req.user._id || req.user.userId,
      markedBy: markedBy,
      markedByRole: req.user.role,

      // Session Timing
      sessionTime: sessionTime,
      markedAt: new Date()
    };

    // Store the single document (upsert to handle updates)
    await attendanceCollection.replaceOne(
      { _id: sessionDocumentId },
      sessionAttendanceDocument,
      { upsert: true }
    );

    console.log(`✅ Stored ${session} attendance document for Class ${className} Section ${section}`);
    console.log(`📊 Document contains ${processedStudents.length} students`);

    // Create response results
    const responseResults = processedStudents.map(student => ({
      studentId: student.studentId,
      userId: student.studentId,
      success: true,
      message: `${session} attendance marked successfully`
    }));

    // Add failed students to response results
    const failedCount = students.length - successCount;
    for (let i = 0; i < failedCount; i++) {
      responseResults.push({
        studentId: `failed_${i}`,
        userId: `failed_${i}`,
        success: false,
        message: 'Failed to process student'
      });
    }

    console.log(`Attendance marking completed: ${successCount} successful, ${failCount} failed`);

    res.json({
      success: true,
      message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance marked successfully: ${successCount} students processed, ${failCount} failed`,
      data: {
        date,
        class: className,
        section,
        session,
        totalStudents: students.length,
        successCount,
        failCount,
        progress: `${successCount}/${students.length} marked`,
        documentId: sessionDocumentId,
        studentsData: processedStudents,
        results: responseResults
      }
    });

  } catch (error) {
    console.error('Error in markSessionAttendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking attendance',
      error: error.message
    });
  }
};

// Bulk attendance marking for entire class
exports.markBulkAttendance = async (req, res) => {
  try {
    const {
      class: className,
      section,
      date,
      students, // Array of { studentId, status, notes }
      academicYear,
      period,
      subject
    } = req.body;

    // Check permissions
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolCode = req.user.schoolCode;
    const results = [];

    for (const studentData of students) {
      try {
        const student = await User.findOne({
          _id: studentData.studentId,
          role: 'student',
          schoolCode: schoolCode
        });

        if (!student) {
          results.push({
            studentId: studentData.studentId,
            success: false,
            error: 'Student not found'
          });
          continue;
        }

        // Check if attendance already exists
        let attendance = await Attendance.findOne({
          schoolCode,
          studentId: studentData.studentId,
          date: new Date(date)
        });

        const attendanceData = {
          schoolId: req.user.schoolId,
          schoolCode,
          studentId: studentData.studentId,
          studentName: `${student.name.firstName} ${student.name.lastName}`,
          studentRollNumber: student.studentDetails?.rollNumber,
          class: className,
          section,
          date: new Date(date),
          status: studentData.status,
          attendanceType: 'daily',
          timeTracking: {
            schoolStartTime: '08:00',
            schoolEndTime: '15:30'
          },
          createdBy: req.user._id
        };

        // Add period information if provided
        if (period && subject) {
          attendanceData.timeTracking.periods = [{
            periodNumber: period,
            subjectName: subject,
            teacherId: req.user._id,
            teacherName: `${req.user.name.firstName} ${req.user.name.lastName}`,
            status: studentData.status,
            markedAt: new Date(),
            markedBy: req.user._id
          }];
        }

        // Add notes if provided
        if (studentData.notes) {
          attendanceData.teacherNotes = [{
            teacherId: req.user._id,
            teacherName: `${req.user.name.firstName} ${req.user.name.lastName}`,
            note: studentData.notes,
            timestamp: new Date()
          }];
        }

        if (attendance) {
          // Update existing
          Object.assign(attendance, attendanceData);
          attendance.lastModifiedBy = req.user._id;
          attendance.lastModifiedAt = new Date();
        } else {
          // Create new
          attendance = new Attendance(attendanceData);
        }

        await attendance.save();

        results.push({
          studentId: studentData.studentId,
          studentName: attendanceData.studentName,
          success: true,
          attendanceId: attendance.attendanceId
        });

        // Send notifications for absent students
        if (studentData.status === 'absent') {
          await sendParentNotification(attendance, student);
        }

      } catch (error) {
        results.push({
          studentId: studentData.studentId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Attendance marked: ${successCount} successful, ${failCount} failed`,
      results,
      summary: {
        total: students.length,
        successful: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    console.error('Error marking bulk attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get attendance for a class
exports.getAttendance = async (req, res) => {
  try {
    const { class: className, section, date, startDate, endDate, session } = req.query;
    const schoolCode = req.user.schoolCode || 'P'; // Default fallback

    console.log(`📊 Getting attendance for Class ${className} Section ${section} Date ${date} Session ${session}`);

    // Check if user has access
    if (!['admin', 'teacher', 'student', 'parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use school-specific database for attendance retrieval
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    let attendanceDocuments = [];

    if (date && className && section) {
      // Get specific date attendance for both sessions
      const morningDocId = `${date}_${className}_${section}_morning`;
      const afternoonDocId = `${date}_${className}_${section}_afternoon`;

      const morningDoc = await attendanceCollection.findOne({ _id: morningDocId });
      const afternoonDoc = await attendanceCollection.findOne({ _id: afternoonDocId });

      if (morningDoc) attendanceDocuments.push(morningDoc);
      if (afternoonDoc) attendanceDocuments.push(afternoonDoc);

    } else if (date && session && className && section) {
      // Get specific session attendance
      const docId = `${date}_${className}_${section}_${session}`;
      const doc = await attendanceCollection.findOne({ _id: docId });
      if (doc) attendanceDocuments.push(doc);

    } else if (startDate && endDate && className && section) {
      // Get attendance for date range
      const query = {
        documentType: 'session_attendance',
        class: className,
        section: section,
        dateString: {
          $gte: startDate,
          $lte: endDate
        }
      };
      attendanceDocuments = await attendanceCollection.find(query).toArray();

    } else {
      // Get recent attendance (last 30 days) if no specific filters
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const query = {
        documentType: 'session_attendance',
        date: { $gte: thirtyDaysAgo }
      };

      if (className) query.class = className;
      if (section) query.section = section;

      attendanceDocuments = await attendanceCollection.find(query)
        .sort({ date: -1 })
        .limit(50)
        .toArray();
    }

    // Filter for students/parents (they can only see their own attendance)
    if (req.user.role === 'student') {
      attendanceDocuments = attendanceDocuments.map(doc => {
        const studentRecord = doc.students?.find(s => s.studentId === req.user.userId);
        if (studentRecord) {
          return {
            ...doc,
            students: [studentRecord], // Only show the student's own record
            totalStudents: 1,
            processedStudents: 1
          };
        }
        return null;
      }).filter(Boolean);
    }

    if (req.user.role === 'parent') {
      // Find child's studentId (this would need proper parent-child relationship lookup)
      const childStudentId = req.user.childStudentId; // This would need to be implemented
      attendanceDocuments = attendanceDocuments.map(doc => {
        const studentRecord = doc.students?.find(s => s.studentId === childStudentId);
        if (studentRecord) {
          return {
            ...doc,
            students: [studentRecord],
            totalStudents: 1,
            processedStudents: 1
          };
        }
        return null;
      }).filter(Boolean);
    }

    // Transform the data for frontend compatibility
    const transformedAttendance = attendanceDocuments.map(doc => ({
      _id: doc._id,
      date: doc.date,
      dateString: doc.dateString,
      class: doc.class,
      section: doc.section,
      session: doc.session,
      sessionTime: doc.sessionTime,
      dayOfWeek: doc.dayOfWeek,
      classInfo: doc.classInfo,
      totalStudents: doc.totalStudents,
      processedStudents: doc.processedStudents,
      successCount: doc.successCount,
      failCount: doc.failCount,
      progress: doc.progress,
      students: doc.students || [],
      academicYear: doc.academicYear,
      markedBy: doc.markedBy,
      markedByRole: doc.markedByRole,
      createdAt: doc.createdAt,
      markedAt: doc.markedAt,
      isFrozen: true, // All saved attendance is frozen (cannot be modified)
      canModify: false // Attendance cannot be modified once saved
    }));

    console.log(`✅ Found ${transformedAttendance.length} attendance sessions`);

    res.json({
      success: true,
      message: `Found ${transformedAttendance.length} attendance sessions`,
      data: transformedAttendance,
      totalSessions: transformedAttendance.length
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance',
      error: error.message
    });
  }
};

// Check if attendance session is already marked (frozen)
exports.checkSessionStatus = async (req, res) => {
  try {
    const { class: className, section, date, session } = req.query;
    const schoolCode = req.user.schoolCode || 'P';

    console.log(`🔍 Checking session status for ${date}_${className}_${section}_${session}`);

    // Use school-specific database for attendance retrieval
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    const sessionDocumentId = `${date}_${className}_${section}_${session}`;
    const existingSession = await attendanceCollection.findOne({ _id: sessionDocumentId });

    if (existingSession) {
      // Session is marked and frozen
      res.json({
        success: true,
        isMarked: true,
        isFrozen: true,
        canModify: false,
        message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance is already marked and frozen`,
        data: {
          documentId: sessionDocumentId,
          markedAt: existingSession.markedAt,
          markedBy: existingSession.markedBy,
          totalStudents: existingSession.totalStudents,
          progress: existingSession.progress,
          session: existingSession.session,
          classInfo: existingSession.classInfo
        }
      });
    } else {
      // Session is not marked yet
      res.json({
        success: true,
        isMarked: false,
        isFrozen: false,
        canModify: true,
        message: `${session.charAt(0).toUpperCase() + session.slice(1)} attendance can be marked`,
        data: {
          documentId: sessionDocumentId,
          date,
          class: className,
          section,
          session
        }
      });
    }

  } catch (error) {
    console.error('Error checking session status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking session status',
      error: error.message
    });
  }
};

// Get daily attendance statistics for the last 7 days
exports.getDailyAttendanceStats = async (req, res) => {
  try {
    const { schoolCode } = req.query;

    // Check if user has access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userSchoolCode = schoolCode || req.user.schoolCode;

    if (!userSchoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code is required'
      });
    }

    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(userSchoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Get last 7 days
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    console.log(`[DAILY STATS] Fetching attendance from ${sevenDaysAgo.toISOString()} to ${today.toISOString()}`);

    // Fetch attendance sessions for the last 7 days
    const sessions = await attendanceCollection.find({
      date: {
        $gte: sevenDaysAgo,
        $lte: today
      }
    }).toArray();

    console.log(`[DAILY STATS] Found ${sessions.length} sessions`);

    // Group by date and calculate daily attendance rate from students array
    const dailyMap = {};

    sessions.forEach(session => {
      const dateStr = session.dateString || new Date(session.date).toISOString().split('T')[0];

      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          totalPresent: 0,
          totalAbsent: 0,
          totalHalfDay: 0
        };
      }

      // Count from students array if available
      if (session.students && Array.isArray(session.students)) {
        session.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            dailyMap[dateStr].totalPresent++;
          } else if (status === 'absent') {
            dailyMap[dateStr].totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            dailyMap[dateStr].totalHalfDay++;
          }
        });
      } else {
        // Fallback to successCount/failCount
        dailyMap[dateStr].totalPresent += (session.successCount || 0);
        dailyMap[dateStr].totalAbsent += (session.failCount || 0);
      }
    });

    // Calculate attendance rate for each day
    const dailyStats = Object.values(dailyMap).map(day => {
      const total = day.totalPresent + day.totalAbsent + day.totalHalfDay;
      const attendanceRate = total > 0 ? Math.round((day.totalPresent / total) * 100 * 10) / 10 : 0;

      return {
        date: day.date,
        totalPresent: day.totalPresent,
        totalAbsent: day.totalAbsent,
        totalHalfDay: day.totalHalfDay,
        totalRecords: total,
        attendanceRate
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`[DAILY STATS] Calculated stats for ${dailyStats.length} days`);

    res.json({
      success: true,
      dailyStats,
      period: {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error fetching daily attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily attendance stats',
      error: error.message
    });
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
  try {
    const { class: className, section, startDate, endDate, date, academicYear } = req.query;

    console.log(`[ATTENDANCE STATS] Request received:`, {
      userId: req.user?.userId,
      role: req.user?.role,
      schoolCode: req.user?.schoolCode,
      className,
      section,
      academicYear,
      startDate,
      endDate,
      date
    });

    // Check if user has access (more flexible role checking)
    if (!req.user) {
      console.error('[ATTENDANCE STATS] No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const schoolCode = req.user.schoolCode;

    if (!schoolCode) {
      console.error('[ATTENDANCE STATS] No school code found in user object');
      return res.status(400).json({ 
        success: false,
        message: 'School code is required' 
      });
    }

    console.log(`[ATTENDANCE STATS] Fetching stats for school: ${schoolCode}, academic year: ${academicYear || 'all'}`);

    // Build match query
    const matchQuery = {};
    if (className && className !== 'all') matchQuery.class = className;
    if (section) matchQuery.section = section;
    
    // Normalize academic year format to handle both "2024-25" and "2024-2025"
    if (academicYear) {
      const parts = academicYear.split('-');
      if (parts.length === 2) {
        const startYear = parts[0];
        const endYear = parts[1].length === 2 ? parts[1] : parts[1].slice(-2);
        const fullEndYear = parts[1].length === 4 ? parts[1] : `20${parts[1]}`;
        
        // Match both formats
        matchQuery.academicYear = {
          $in: [
            `${startYear}-${endYear}`,
            `${startYear}-${fullEndYear}`
          ]
        };
        console.log(`[ATTENDANCE STATS] Filtering by academic year (both formats): ${startYear}-${endYear} OR ${startYear}-${fullEndYear}`);
      } else {
        matchQuery.academicYear = academicYear;
      }
    }

    // Support single date query (for today's attendance)
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      matchQuery.date = {
        $gte: targetDate,
        $lt: nextDay
      };
    } else if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Fetch all attendance session documents (morning and afternoon)
    const sessionDocs = await attendanceCollection.find(matchQuery).toArray();

    console.log(`[ATTENDANCE STATS] Found ${sessionDocs.length} session documents for school: ${schoolCode}`);

    if (sessionDocs.length === 0) {
      return res.json({
        success: true,
        totalSessions: 0,
        totalPresent: 0,
        totalAbsent: 0,
        presentCount: 0,
        absentCount: 0,
        totalRecords: 0,
        averageAttendance: 0,
        attendanceRate: '0.0%'
      });
    }

    // Calculate statistics from students array in each session document
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalSessions = sessionDocs.length;

    sessionDocs.forEach(doc => {
      // Count students by status from the students array
      if (doc.students && Array.isArray(doc.students)) {
        doc.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            totalPresent++;
          } else if (status === 'absent') {
            totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            totalHalfDay++;
          }
        });

        console.log(`[SESSION] ${doc.session || 'unknown'} on ${doc.dateString || doc.date}: ${doc.students.length} students - Present=${doc.students.filter(s => s.status?.toLowerCase() === 'present').length}, Absent=${doc.students.filter(s => s.status?.toLowerCase() === 'absent').length}`);
      } else {
        // Fallback to successCount/failCount if students array doesn't exist
        const present = doc.successCount || 0;
        const absent = doc.failCount || 0;

        totalPresent += present;
        totalAbsent += absent;

        console.log(`[SESSION FALLBACK] ${doc.session || 'unknown'} on ${doc.dateString || doc.date}: Present=${present}, Absent=${absent}`);
      }
    });

    const totalRecords = totalPresent + totalAbsent + totalHalfDay;
    const averageAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100 * 10) / 10 : 0;

    console.log(`[ATTENDANCE STATS] Total: ${totalRecords}, Present: ${totalPresent}, Absent: ${totalAbsent}, Half-Day: ${totalHalfDay}, Rate: ${averageAttendance}%`);

    res.json({
      success: true,
      totalSessions,
      totalPresent,
      totalAbsent,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      totalRecords,
      averageAttendance,
      attendanceRate: `${averageAttendance}%`
    });

  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance stats',
      error: error.message
    });
  }
};

// Get session-specific attendance data (morning or afternoon)
exports.getSessionAttendanceData = async (req, res) => {
  try {
    const { date, session } = req.query;

    // Check if user has access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!date || !session) {
      return res.status(400).json({
        success: false,
        message: 'Date and session parameters are required'
      });
    }

    if (!['morning', 'afternoon'].includes(session.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Session must be either "morning" or "afternoon"'
      });
    }

    const schoolCode = req.user.schoolCode;

    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Build query for specific date and session
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const query = {
      date: {
        $gte: targetDate,
        $lt: nextDay
      },
      session: session.toLowerCase()
    };

    // Fetch session documents
    const sessionDocs = await attendanceCollection.find(query).toArray();

    console.log(`[SESSION DATA] Found ${sessionDocs.length} ${session} session documents for ${date}`);

    if (sessionDocs.length === 0) {
      return res.json({
        success: true,
        session: session.toLowerCase(),
        date,
        presentCount: 0,
        absentCount: 0,
        halfDayCount: 0,
        totalRecords: 0,
        attendanceRate: 0
      });
    }

    // Calculate statistics from students array
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;

    sessionDocs.forEach(doc => {
      if (doc.students && Array.isArray(doc.students)) {
        doc.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            totalPresent++;
          } else if (status === 'absent') {
            totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            totalHalfDay++;
          }
        });
      }
    });

    const totalRecords = totalPresent + totalAbsent + totalHalfDay;
    const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100 * 10) / 10 : 0;

    console.log(`[SESSION DATA] ${session} - Present: ${totalPresent}, Absent: ${totalAbsent}, Half-Day: ${totalHalfDay}, Rate: ${attendanceRate}%`);

    res.json({
      success: true,
      session: session.toLowerCase(),
      date,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      halfDayCount: totalHalfDay,
      totalRecords,
      attendanceRate,
      attendanceRateFormatted: `${attendanceRate}%`
    });

  } catch (error) {
    console.error('Error fetching session attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching session attendance data',
      error: error.message
    });
  }
};

// Get overall attendance rate for all sessions, days, and sections
exports.getOverallAttendanceRate = async (req, res) => {
  try {
    // Check if user has access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const schoolCode = req.user.schoolCode;

    // Use school-specific database for attendance
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const attendanceCollection = schoolConnection.collection('attendances');

    // Fetch ALL attendance session documents (no filters)
    const allSessionDocs = await attendanceCollection.find({}).toArray();

    console.log(`[OVERALL ATTENDANCE] Found ${allSessionDocs.length} total session documents for school: ${schoolCode}`);

    if (allSessionDocs.length === 0) {
      return res.json({
        success: true,
        totalSessions: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalHalfDay: 0,
        totalRecords: 0,
        overallAttendanceRate: 0,
        attendanceRateFormatted: '0.0%'
      });
    }

    // Calculate statistics from students array in ALL session documents
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;

    allSessionDocs.forEach(doc => {
      // Count students by status from the students array
      if (doc.students && Array.isArray(doc.students)) {
        doc.students.forEach(student => {
          const status = student.status?.toLowerCase();
          if (status === 'present') {
            totalPresent++;
          } else if (status === 'absent') {
            totalAbsent++;
          } else if (status === 'half-day' || status === 'halfday') {
            totalHalfDay++;
          }
        });
      }
    });

    const totalRecords = totalPresent + totalAbsent + totalHalfDay;
    const overallAttendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100 * 10) / 10 : 0;

    console.log(`[OVERALL ATTENDANCE] Total Sessions: ${allSessionDocs.length}, Total Records: ${totalRecords}, Present: ${totalPresent}, Absent: ${totalAbsent}, Half-Day: ${totalHalfDay}, Overall Rate: ${overallAttendanceRate}%`);

    res.json({
      success: true,
      totalSessions: allSessionDocs.length,
      totalPresent,
      totalAbsent,
      totalHalfDay,
      totalRecords,
      overallAttendanceRate,
      attendanceRateFormatted: `${overallAttendanceRate}%`
    });

  } catch (error) {
    console.error('Error fetching overall attendance rate:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overall attendance rate',
      error: error.message
    });
  }
};

// Lock attendance (prevent further modifications)
exports.lockAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    // Check if user is admin or teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    // Check if user has access to this attendance's school
    if (req.user.schoolId?.toString() !== attendance.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    attendance.isLocked = true;
    attendance.lockedBy = req.user._id;
    attendance.lockedAt = new Date();
    attendance.updatedBy = req.user._id;
    attendance.updatedAt = new Date();

    await attendance.save();

    res.json({
      message: 'Attendance locked successfully',
      attendance: {
        id: attendance._id,
        isLocked: attendance.isLocked,
        lockedAt: attendance.lockedAt
      }
    });

  } catch (error) {
    console.error('Error locking attendance:', error);
    res.status(500).json({ message: 'Error locking attendance', error: error.message });
  }
};

// Get student attendance report
// Get student's own attendance (for student role)
exports.getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    // Only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only for students'
      });
    }

    // Get student's userId from authenticated user
    const studentUserId = req.user.userId || req.user._id;
    const schoolCode = req.user.schoolCode;
    
    console.log(`[GET MY ATTENDANCE] Student info from token:`, {
      userId: req.user.userId,
      _id: req.user._id,
      finalStudentUserId: studentUserId,
      schoolCode: schoolCode,
      role: req.user.role,
      fullUser: req.user
    });

    console.log(`[GET MY ATTENDANCE] Student: ${studentUserId}, School: ${schoolCode}`);

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }

    // Get student's class and section
    const studentClass = req.user.studentDetails?.currentClass ||
      req.user.studentDetails?.academic?.currentClass ||
      req.user.class;
    const studentSection = req.user.studentDetails?.currentSection ||
      req.user.studentDetails?.academic?.currentSection ||
      req.user.section;

    console.log(`[GET MY ATTENDANCE] Class: ${studentClass}, Section: ${studentSection}`);

    if (!studentClass || !studentSection) {
      return res.status(400).json({
        success: false,
        message: 'Student class/section information not found'
      });
    }

    // Build query to find session attendance documents for the student's class and section
    const sessionQuery = {
      class: studentClass,
      section: studentSection,
      documentType: 'session_attendance'
    };

    // Add date range if provided
    if (startDate && endDate) {
      sessionQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      sessionQuery.date = { $gte: thirtyDaysAgo };
    }

    console.log(`[GET MY ATTENDANCE] Session Query:`, JSON.stringify(sessionQuery));

    // Try school-specific database first
    let attendanceRecords = [];
    try {
      const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
      const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const attendanceCollection = schoolConn.collection('attendances');

      // Debug: Check what attendance records exist in the collection
      const totalRecords = await attendanceCollection.countDocuments();
      console.log(`[GET MY ATTENDANCE] Total attendance records in collection: ${totalRecords}`);

      // If no attendance records exist, create sample data for testing
      if (totalRecords === 0) {
        console.log(`[GET MY ATTENDANCE] No attendance records found, creating sample data for testing...`);
        await createSampleAttendanceData(attendanceCollection, studentClass, studentSection, studentUserId);
        
        // Re-count after creating sample data
        const newTotalRecords = await attendanceCollection.countDocuments();
        console.log(`[GET MY ATTENDANCE] After creating sample data, total records: ${newTotalRecords}`);
      }

      // Find all session documents for the student's class and section
      const sessionDocuments = await attendanceCollection
        .find(sessionQuery)
        .sort({ date: -1 })
        .limit(parseInt(limit) * 2) // Get more sessions since each may have 2 sessions (morning/afternoon)
        .toArray();

      console.log(`[GET MY ATTENDANCE] Found ${sessionDocuments.length} session documents`);

      // Extract student's attendance from each session document
      for (const sessionDoc of sessionDocuments) {
        if (sessionDoc.students && Array.isArray(sessionDoc.students)) {
          // Find this student in the session's student list
          // Handle different ID formats: AB-S-0006 vs 46, etc.
          const studentRecord = sessionDoc.students.find(s => {
            const sId = s.studentId?.toString();
            const sUserId = s.userId?.toString();
            const sRollNumber = s.rollNumber?.toString();
            const searchId = studentUserId?.toString();
            
            // Direct matches
            if (sId === searchId || sUserId === searchId || sRollNumber === searchId) {
              return true;
            }
            
            // Extract numeric part from formatted IDs (AB-S-0006 -> 6)
            const extractNumber = (id) => {
              if (!id) return null;
              const match = id.toString().match(/(\d+)$/);
              return match ? parseInt(match[1]) : null;
            };
            
            // Also extract all numbers from ID for broader matching
            const extractAllNumbers = (id) => {
              if (!id) return [];
              const matches = id.toString().match(/\d+/g);
              return matches ? matches.map(n => parseInt(n)) : [];
            };
            
            console.log(`[MATCHING DEBUG] Checking student: searchId=${searchId}, sId=${sId}, sUserId=${sUserId}, sRollNumber=${sRollNumber}`);
            
            const searchNum = extractNumber(searchId);
            const sIdNum = extractNumber(sId);
            const sUserIdNum = extractNumber(sUserId);
            const sRollNum = extractNumber(sRollNumber);
            
            console.log(`[MATCHING DEBUG] Extracted numbers: searchNum=${searchNum}, sIdNum=${sIdNum}, sUserIdNum=${sUserIdNum}, sRollNum=${sRollNum}`);
            
            // Match by numeric part
            if (searchNum && (searchNum === sIdNum || searchNum === sUserIdNum || searchNum === sRollNum)) {
              console.log(`[MATCHING DEBUG] ✅ NUMERIC MATCH FOUND!`);
              return true;
            }
            
            // Try comprehensive number matching - extract all numbers and cross-match
            const searchNumbers = extractAllNumbers(searchId);
            const sIdNumbers = extractAllNumbers(sId);
            const sUserIdNumbers = extractAllNumbers(sUserId);
            const sRollNumbers = extractAllNumbers(sRollNumber);
            
            console.log(`[MATCHING DEBUG] All numbers - search: [${searchNumbers}], sId: [${sIdNumbers}], sUserId: [${sUserIdNumbers}], sRoll: [${sRollNumbers}]`);
            
            // Check if any number from search ID matches any number from session student IDs
            for (const searchN of searchNumbers) {
              if (sIdNumbers.includes(searchN) || sUserIdNumbers.includes(searchN) || sRollNumbers.includes(searchN)) {
                console.log(`[MATCHING DEBUG] ✅ COMPREHENSIVE MATCH FOUND! Number: ${searchN}`);
                return true;
              }
            }
            
            // Also try reverse - if session ID is a simple number, see if it matches any part of our formatted ID
            if (sId && !isNaN(parseInt(sId))) {
              const sessionNum = parseInt(sId);
              if (searchNumbers.includes(sessionNum)) {
                console.log(`[MATCHING DEBUG] ✅ REVERSE MATCH FOUND! Session: ${sessionNum}`);
                return true;
              }
            }
            
            return false;
          });

          if (studentRecord) {
            attendanceRecords.push({
              _id: `${sessionDoc.dateString || sessionDoc.date}_${sessionDoc.class}_${sessionDoc.section}_${sessionDoc.session}_${studentUserId}`,
              date: sessionDoc.date,
              dateString: sessionDoc.dateString,
              session: sessionDoc.session, // 'morning' or 'afternoon'
              status: studentRecord.status, // 'present' or 'absent'
              studentId: studentUserId,
              class: sessionDoc.class,
              section: sessionDoc.section,
              markedAt: sessionDoc.createdAt,
              markedBy: sessionDoc.markedBy
            });
          }
        }
      }

      console.log(`[GET MY ATTENDANCE] Extracted ${attendanceRecords.length} attendance records for student ${studentUserId}`);

      // Enhanced debugging for session records
      if (sessionDocuments.length > 0) {
        console.log(`[GET MY ATTENDANCE] Session documents details:`, sessionDocuments.map(doc => ({
          _id: doc._id,
          dateString: doc.dateString,
          session: doc.session,
          studentsCount: doc.students?.length || 0,
          firstStudent: doc.students?.[0] ? {
            studentId: doc.students[0].studentId,
            userId: doc.students[0].userId,
            status: doc.students[0].status
          } : null
        })));

        sessionDocuments.forEach((doc, index) => {
          console.log(`[GET MY ATTENDANCE] Session ${index + 1}: ${doc.dateString} ${doc.session} - ${doc.students?.length || 0} students`);
          if (doc.students && doc.students.length > 0) {
            // Use the same matching logic as above
            const studentFound = doc.students.find(s => {
              const sId = s.studentId?.toString();
              const sUserId = s.userId?.toString();
              const sRollNumber = s.rollNumber?.toString();
              const searchId = studentUserId?.toString();
              
              if (sId === searchId || sUserId === searchId || sRollNumber === searchId) {
                return true;
              }
              
              const extractNumber = (id) => {
                if (!id) return null;
                const match = id.toString().match(/(\d+)$/);
                return match ? parseInt(match[1]) : null;
              };
              
              const searchNum = extractNumber(searchId);
              const sIdNum = extractNumber(sId);
              const sUserIdNum = extractNumber(sUserId);
              const sRollNum = extractNumber(sRollNumber);
              
              if (searchNum && (searchNum === sIdNum || searchNum === sUserIdNum || searchNum === sRollNum)) {
                return true;
              }
              
              if (sId && searchId) {
                const sessionIdNum = parseInt(sId);
                const formattedIdNum = extractNumber(searchId);
                if (!isNaN(sessionIdNum) && formattedIdNum === sessionIdNum) {
                  return true;
                }
              }
              
              return false;
            });
            
            if (studentFound) {
              console.log(`[GET MY ATTENDANCE] ✅ Student found in session: ${doc.dateString} ${doc.session} - Status: ${studentFound.status}`);
            } else {
              console.log(`[GET MY ATTENDANCE] ❌ Student NOT found in session: ${doc.dateString} ${doc.session}`);
              console.log(`[GET MY ATTENDANCE] Available students:`, doc.students.map(s => ({
                studentId: s.studentId,
                userId: s.userId, 
                rollNumber: s.rollNumber,
                name: s.name || s.studentName
              })));
            }
          }
        });
      }

    } catch (error) {
      console.error(`[GET MY ATTENDANCE] Error accessing school database:`, error.message);

      // Fallback to main database (though attendance is typically in school-specific DB)
      console.log(`[GET MY ATTENDANCE] Falling back to main database`);
      attendanceRecords = [];
    }

    // Transform session records into day-based records for statistics
    const dayRecordsMap = new Map();
    
    attendanceRecords.forEach(record => {
      const dateKey = record.dateString || record.date;
      if (!dayRecordsMap.has(dateKey)) {
        dayRecordsMap.set(dateKey, {
          date: record.date,
          dateString: record.dateString,
          sessions: { morning: null, afternoon: null }
        });
      }
      
      const dayRecord = dayRecordsMap.get(dateKey);
      dayRecord.sessions[record.session] = {
        status: record.status,
        markedAt: record.markedAt
      };
    });

    // Calculate statistics
    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let totalSessions = 0;
    let presentSessions = 0;

    dayRecordsMap.forEach(dayRecord => {
      totalDays++;
      
      // Count sessions
      if (dayRecord.sessions.morning) {
        totalSessions++;
        if (dayRecord.sessions.morning.status === 'present') presentSessions++;
      }
      if (dayRecord.sessions.afternoon) {
        totalSessions++;
        if (dayRecord.sessions.afternoon.status === 'present') presentSessions++;
      }

      // Determine overall day status based on sessions
      const morningPresent = dayRecord.sessions.morning?.status === 'present';
      const afternoonPresent = dayRecord.sessions.afternoon?.status === 'present';
      const morningExists = dayRecord.sessions.morning !== null;
      const afternoonExists = dayRecord.sessions.afternoon !== null;

      if (morningExists && afternoonExists) {
        if (morningPresent && afternoonPresent) {
          presentDays++;
        } else if (morningPresent || afternoonPresent) {
          // Count partial attendance as present day
          presentDays++;
        } else {
          absentDays++;
        }
      } else if (morningExists || afternoonExists) {
        if (morningPresent || afternoonPresent) {
          presentDays++;
        } else {
          absentDays++;
        }
      }
    });

    // Calculate attendance percentage based on sessions
    const attendancePercentage = totalSessions > 0
      ? Math.round((presentSessions / totalSessions) * 100)
      : 0;

    // Also calculate day-based attendance rate
    const attendanceRate = totalDays > 0
      ? Math.round((presentDays / totalDays) * 100)
      : 0;

    // Debug final transformed records
    const finalRecords = Array.from(dayRecordsMap.values()).map(dayRecord => ({
      _id: `${dayRecord.dateString || dayRecord.date}_${studentUserId}`,
      date: dayRecord.date,
      dateString: dayRecord.dateString,
      status: (() => {
        const morningStatus = dayRecord.sessions.morning?.status;
        const afternoonStatus = dayRecord.sessions.afternoon?.status;
        const hasMorning = dayRecord.sessions.morning !== null;
        const hasAfternoon = dayRecord.sessions.afternoon !== null;
        
        console.log(`[STATUS CALC] Date: ${dayRecord.dateString}, Morning: ${morningStatus} (has: ${hasMorning}), Afternoon: ${afternoonStatus} (has: ${hasAfternoon})`);
        
        // If no sessions exist for this day
        if (!hasMorning && !hasAfternoon) {
          return 'no-class';
        }
        
        // If any session is present, mark day as present
        if (morningStatus === 'present' || afternoonStatus === 'present') {
          return 'present';
        }
        
        // If all existing sessions are absent, mark as absent
        if ((hasMorning && morningStatus === 'absent') && (hasAfternoon && afternoonStatus === 'absent')) {
          return 'absent';
        }
        
        // If only one session exists and it's absent
        if ((hasMorning && !hasAfternoon && morningStatus === 'absent') || 
            (hasAfternoon && !hasMorning && afternoonStatus === 'absent')) {
          return 'absent';
        }
        
        // Default fallback
        return 'no-class';
      })(),
      sessions: dayRecord.sessions,
      studentId: studentUserId,
      class: studentClass,
      section: studentSection
    }));

    console.log(`[GET MY ATTENDANCE] Final transformed records: ${finalRecords.length}`);
    finalRecords.forEach(record => {
      console.log(`[GET MY ATTENDANCE] Final record: ${record.dateString} - Status: ${record.status} - Morning: ${record.sessions.morning?.status || 'null'} - Afternoon: ${record.sessions.afternoon?.status || 'null'}`);
      console.log(`[GET MY ATTENDANCE] Record sessions object:`, JSON.stringify(record.sessions, null, 2));
    });
    
    console.log(`[GET MY ATTENDANCE] Raw attendance records found: ${attendanceRecords.length}`);
    attendanceRecords.forEach(record => {
      console.log(`[GET MY ATTENDANCE] Raw record: ${record.dateString} - Session: ${record.session} - Status: ${record.status}`);
    });
    
    console.log(`[GET MY ATTENDANCE] Statistics: Total Sessions: ${totalSessions}, Present Sessions: ${presentSessions}, Session-based %: ${attendancePercentage}`);
    console.log(`[GET MY ATTENDANCE] Day Statistics: Total Days: ${totalDays}, Present Days: ${presentDays}, Day-based %: ${attendanceRate}`);

    res.json({
      success: true,
      data: {
        student: {
          userId: studentUserId,
          class: studentClass,
          section: studentSection
        },
        summary: {
          totalDays,
          presentDays,
          absentDays,
          lateDays: 0,
          leaveDays: 0,
          attendancePercentage: attendancePercentage, // Use session-based percentage as main percentage
          dayAttendanceRate: attendanceRate, // Keep day-based rate for reference
          totalSessions,
          presentSessions,
          sessionAttendanceRate: attendancePercentage
        },
        records: finalRecords
      }
    });

  } catch (error) {
    console.error('[GET MY ATTENDANCE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance',
      error: error.message
    });
  }
};

exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;

    // Check if user has access
    if (!['admin', 'teacher', 'student', 'parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolId = req.user.schoolId;

    // Determine which student to get report for
    let targetStudentId = studentId;

    if (req.user.role === 'student') {
      targetStudentId = req.user._id;
    } else if (req.user.role === 'parent') {
      const student = await User.findOne({
        'parentDetails.parentId': req.user.parentDetails?.parentId
      });
      if (student) {
        targetStudentId = student._id;
      }
    }

    if (!targetStudentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Build query
    const query = {
      schoolId,
      'records.student': targetStudentId
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('records.student', 'name email studentDetails')
      .sort({ date: -1 });

    // Calculate summary
    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let excusedDays = 0;

    attendance.forEach(record => {
      const studentRecord = record.records.find(r => r.student._id.toString() === targetStudentId.toString());
      if (studentRecord) {
        totalDays++;
        switch (studentRecord.status) {
          case 'present':
            presentDays++;
            break;
          case 'absent':
            absentDays++;
            break;
          case 'late':
            lateDays++;
            break;
          case 'half-day':
            halfDays++;
            break;
          case 'excused':
            excusedDays++;
            break;
        }
      }
    });

    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      student: attendance[0]?.records.find(r => r.student._id.toString() === targetStudentId.toString())?.student,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        excusedDays,
        attendancePercentage
      },
      details: attendance
    });

  } catch (error) {
    console.error('Error fetching student attendance report:', error);
    res.status(500).json({ message: 'Error fetching student attendance report', error: error.message });
  }
};

// Helper function to send parent notifications
const sendParentNotification = async (attendance, student) => {
  try {
    // Find parent
    const parent = await User.findOne({
      _id: student.studentDetails?.parentId,
      role: 'parent'
    });

    if (!parent) return;

    // Simulate SMS/Email notification (integrate with actual service)
    const message = `Dear Parent, Your child ${attendance.studentName} is ${attendance.status} today at ${new Date().toLocaleTimeString()}. - School`;

    console.log(`Notification sent to ${parent.email}: ${message}`);

    // Update attendance with notification status
    attendance.parentNotification = {
      sent: true,
      sentAt: new Date(),
      method: 'sms' // or 'email'
    };

    await attendance.save();

  } catch (error) {
    console.error('Error sending parent notification:', error);
  }
};

// Get attendance analytics and reports
exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const {
      class: className,
      section,
      startDate,
      endDate,
      studentId,
      type = 'monthly'
    } = req.query;

    const schoolCode = req.user.schoolCode;
    const filters = { schoolCode };

    // Add filters based on query params
    if (className) filters.class = className;
    if (section) filters.section = section;
    if (studentId) filters.studentId = studentId;
    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let analytics;

    switch (type) {
      case 'daily':
        analytics = await getDailyAnalytics(filters);
        break;
      case 'weekly':
        analytics = await getWeeklyAnalytics(filters);
        break;
      case 'monthly':
        analytics = await getMonthlyAnalytics(filters);
        break;
      case 'student':
        analytics = await getStudentAnalytics(filters);
        break;
      default:
        return res.status(400).json({ message: 'Invalid analytics type' });
    }

    res.json({
      success: true,
      type,
      filters,
      analytics
    });

  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Daily attendance analytics
const getDailyAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          class: '$class',
          section: '$section'
        },
        totalStudents: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        date: '$_id.date',
        class: '$_id.class',
        section: '$_id.section',
        totalStudents: 1,
        presentCount: 1,
        absentCount: 1,
        lateCount: 1,
        attendancePercentage: {
          $multiply: [
            { $divide: ['$presentCount', '$totalStudents'] },
            100
          ]
        }
      }
    },
    { $sort: { date: -1 } }
  ]);
};

// Weekly attendance analytics
const getWeeklyAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          week: { $week: '$date' },
          year: { $year: '$date' },
          class: '$class',
          section: '$section'
        },
        totalStudents: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        averageAttendance: { $avg: '$timeTracking.attendancePercentage' }
      }
    },
    {
      $project: {
        week: '$_id.week',
        year: '$_id.year',
        class: '$_id.class',
        section: '$_id.section',
        totalStudents: 1,
        presentCount: 1,
        absentCount: 1,
        averageAttendance: { $round: ['$averageAttendance', 2] },
        attendancePercentage: {
          $multiply: [
            { $divide: ['$presentCount', '$totalStudents'] },
            100
          ]
        }
      }
    },
    { $sort: { year: -1, week: -1 } }
  ]);
};

// Monthly attendance analytics
const getMonthlyAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          month: '$monthYear',
          class: '$class',
          section: '$section'
        },
        totalRecords: { $sum: 1 },
        totalPresent: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        totalAbsent: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        totalLate: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        uniqueStudents: { $addToSet: '$studentId' }
      }
    },
    {
      $project: {
        month: '$_id.month',
        class: '$_id.class',
        section: '$_id.section',
        totalRecords: 1,
        totalPresent: 1,
        totalAbsent: 1,
        totalLate: 1,
        uniqueStudents: { $size: '$uniqueStudents' },
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$totalPresent', '$totalRecords'] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { month: -1 } }
  ]);
};

// Student-specific analytics
const getStudentAnalytics = async (filters) => {
  return await Attendance.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          studentId: '$studentId',
          studentName: '$studentName'
        },
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateDays: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        averagePeriodsPresent: { $avg: '$timeTracking.totalPeriodsPresent' }
      }
    },
    {
      $project: {
        studentId: '$_id.studentId',
        studentName: '$_id.studentName',
        totalDays: 1,
        presentDays: 1,
        absentDays: 1,
        lateDays: 1,
        averagePeriodsPresent: { $round: ['$averagePeriodsPresent', 1] },
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$presentDays', '$totalDays'] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { attendancePercentage: -1 } }
  ]);
};

// Get attendance for a specific class and section
exports.getClassAttendance = async (req, res) => {
  try {
    const { class: className, section, date, session } = req.query;
    const schoolCode = req.user.schoolCode;

    const query = {
      schoolCode,
      class: className,
      section,
      date: new Date(date)
    };

    // Add session filter if provided
    if (session) {
      query['sessionInfo.session'] = session;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('studentId', 'name userId studentDetails')
      .sort({ studentName: 1 });

    const formattedRecords = attendanceRecords.map(record => ({
      attendanceId: record.attendanceId,
      studentId: record.studentId._id,
      studentName: record.studentName,
      userId: record.studentId.userId,
      rollNumber: record.studentRollNumber,
      status: record.status,
      session: record.sessionInfo?.session,
      markedAt: record.sessionInfo?.markedAt || record.createdAt,
      markedBy: record.sessionInfo?.markerName || 'System',
      timeTracking: record.timeTracking
    }));

    res.json({
      success: true,
      data: {
        class: className,
        section,
        date,
        session,
        totalRecords: formattedRecords.length,
        records: formattedRecords
      }
    });

  } catch (error) {
    console.error('Error fetching class attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance',
      error: error.message
    });
  }
};

// Helper function to create sample attendance data for testing
async function createSampleAttendanceData(attendanceCollection, studentClass, studentSection, studentUserId) {
  try {
    const sampleData = [];
    const today = new Date();

    // Create attendance records for the last 10 days
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      // Create morning session
      const morningSessionId = `${dateString}_${studentClass}_${studentSection}_morning`;
      const morningSession = {
        _id: morningSessionId,
        documentType: 'session_attendance',
        date: date,
        dateString: dateString,
        session: 'morning',
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        class: studentClass,
        section: studentSection,
        classInfo: `Morning Attendance - Class ${studentClass} Section ${studentSection}`,
        totalStudents: 1,
        processedStudents: 1,
        successCount: 1,
        failCount: 0,
        progress: '1/1 marked',
        students: [{
          studentId: studentUserId,
          userId: studentUserId,
          status: Math.random() > 0.2 ? 'present' : 'absent', // 80% present, 20% absent
          rollNumber: studentUserId,
          name: 'Test Student'
        }],
        academicYear: new Date().getFullYear().toString(),
        schoolCode: 'AB',
        createdAt: date,
        createdBy: 'system',
        markedBy: 'Sample Data',
        markedByRole: 'system',
        sessionTime: '09:00 AM'
      };

      // Create afternoon session
      const afternoonSessionId = `${dateString}_${studentClass}_${studentSection}_afternoon`;
      const afternoonSession = {
        _id: afternoonSessionId,
        documentType: 'session_attendance',
        date: date,
        dateString: dateString,
        session: 'afternoon',
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        class: studentClass,
        section: studentSection,
        classInfo: `Afternoon Attendance - Class ${studentClass} Section ${studentSection}`,
        totalStudents: 1,
        processedStudents: 1,
        successCount: 1,
        failCount: 0,
        progress: '1/1 marked',
        students: [{
          studentId: studentUserId,
          userId: studentUserId,
          status: Math.random() > 0.15 ? 'present' : 'absent', // 85% present, 15% absent
          rollNumber: studentUserId,
          name: 'Test Student'
        }],
        academicYear: new Date().getFullYear().toString(),
        schoolCode: 'AB',
        createdAt: date,
        createdBy: 'system',
        markedBy: 'Sample Data',
        markedByRole: 'system',
        sessionTime: '02:00 PM'
      };

      sampleData.push(morningSession, afternoonSession);
    }

    // Insert sample data
    await attendanceCollection.insertMany(sampleData);
    console.log(`[SAMPLE DATA] Created ${sampleData.length} sample attendance records`);

  } catch (error) {
    console.error('[SAMPLE DATA] Error creating sample attendance data:', error);
  }
}
