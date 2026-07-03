/**
 * studentPortalController.js
 *
 * Thin adapter layer for the Student Portal frontend (Attendance.tsx / Assignments.tsx).
 *
 * WHY THIS FILE EXISTS:
 * The frontend was built against a simple contract:
 *   GET /api/student/attendance  -> { summary, monthly, recentAttendance }
 *   GET /api/student/assignments -> Assignment[]
 *
 * We already have working, battle-tested logic for these in:
 *   - attendanceController.getMyAttendance   (GET /api/attendance/my-attendance)
 *   - assignmentController.getAssignments    (GET /api/assignments, student-filtered)
 *
 * Rather than duplicating that logic (and risking it drifting out of sync),
 * this file calls those existing controllers internally via a small "fake res"
 * shim, then reshapes their output into what the frontend needs.
 */

const attendanceController = require('./attendanceController');
const assignmentController = require('./assignmentController');
const messagesController = require('./messagesController');
const Submission = require('../models/Submission');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
const { ObjectId } = require('mongodb');

/**
 * Invoke an existing Express controller function without an HTTP round-trip,
 * capturing whatever it would have sent via res.json()/res.status().json().
 */
function invokeController(controllerFn, req) {
  return new Promise((resolve, reject) => {
    const fakeRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode >= 400) {
          const err = new Error(payload?.message || 'Request failed');
          err.statusCode = this.statusCode;
          err.payload = payload;
          reject(err);
        } else {
          resolve(payload);
        }
      },
    };

    Promise.resolve(controllerFn(req, fakeRes)).catch(reject);
  });
}

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// GET /api/student/attendance
exports.getMyAttendanceOverview = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'This endpoint is only for students' });
    }

    const raw = await invokeController(attendanceController.getMyAttendance, req);
    const records = raw?.data?.records || [];
    const summarySrc = raw?.data?.summary || {};

    // --- Monthly breakdown, derived from the daily records ---
    const monthMap = {}; // "July 2026" -> { present, absent, total }
    records.forEach((r) => {
      const d = new Date(r.date);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthMap[key]) monthMap[key] = { present: 0, absent: 0, total: 0 };

      if (r.status === 'present') {
        monthMap[key].present += 1;
        monthMap[key].total += 1;
      } else if (r.status === 'absent') {
        monthMap[key].absent += 1;
        monthMap[key].total += 1;
      }
      // 'no-class' days are excluded from working-day counts
    });

    // Sort chronologically (oldest -> newest), matching frontend table order
    const monthly = Object.entries(monthMap)
      .sort((a, b) => new Date(`1 ${a[0]}`) - new Date(`1 ${b[0]}`))
      .map(([month, v]) => ({
        month: month.split(' ')[0], // "July 2026" -> "July" (frontend only shows month name)
        present: v.present,
        absent: v.absent,
        percentage: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }));

    // --- Recent attendance (latest first) ---
    // NOTE: The current system only tracks 'present' / 'absent' / 'no-class'.
    // There's no separate "Leave" or "Holiday" concept wired up yet, so those
    // two statuses will not appear until leave/holiday data is integrated
    // (see models/LeaveRequest.js as a starting point for that later).
    const statusLabel = { present: 'Present', absent: 'Absent' };
    const recentAttendance = [...records]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .filter((r) => r.status === 'present' || r.status === 'absent')
      .map((r) => ({
        date: formatDate(r.date),
        status: statusLabel[r.status],
      }));

    res.json({
      summary: {
        attendancePercentage: summarySrc.attendancePercentage ?? null,
        totalWorkingDays: summarySrc.totalDays ?? null,
        presentDays: summarySrc.presentDays ?? null,
        absentDays: summarySrc.absentDays ?? null,
      },
      monthly,
      recentAttendance,
    });
  } catch (err) {
    console.error('[STUDENT PORTAL] attendance overview error:', err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.payload?.message || 'Unable to load attendance' });
  }
};

// GET /api/student/assignments
exports.getMyAssignmentsOverview = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'This endpoint is only for students' });
    }

    // The underlying getAssignments controller paginates (default limit 10).
    // The student portal page shows the full list, so raise the limit unless
    // the caller explicitly asked for pagination.
    if (!req.query.limit) req.query.limit = '100';

    const raw = await invokeController(assignmentController.getAssignments, req);
    const assignments = raw?.assignments || [];

    const assignmentIds = assignments.map((a) => a._id);
    const studentObjectId = req.user._id;

    const submissions = assignmentIds.length
      ? await Submission.find({
          assignmentId: { $in: assignmentIds },
          studentId: studentObjectId,
        }).lean()
      : [];

    const submissionByAssignment = {};
    submissions.forEach((s) => {
      submissionByAssignment[s.assignmentId.toString()] = s;
    });

    const now = new Date();

    const result = assignments.map((a) => {
      const submission = submissionByAssignment[a._id.toString()];
      const isPastDue = a.dueDate && now > new Date(a.dueDate);

      let status = 'Pending';
      let marks;
      let totalMarks;

      if (submission) {
        if (submission.status === 'graded') {
          status = 'Graded';
          marks = submission.grade;
          totalMarks = submission.maxMarks;
        } else if (submission.isLateSubmission) {
          status = 'Late';
        } else {
          status = 'Submitted';
        }
      } else if (isPastDue) {
        status = 'Late';
      }

      const shaped = {
        id: a._id.toString(),
        title: a.title,
        subject: a.subject,
        description: a.description,
        assignedDate: formatDate(a.startDate || a.createdAt),
        dueDate: formatDate(a.dueDate),
        status,
      };

      if (marks !== undefined && totalMarks !== undefined) {
        shaped.marks = marks;
        shaped.totalMarks = totalMarks;
      }

      return shaped;
    });

    res.json(result);
  } catch (err) {
    console.error('[STUDENT PORTAL] assignments overview error:', err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.payload?.message || 'Unable to load assignments' });
  }
};

// GET /api/student/messages
exports.getMyMessagesOverview = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'This endpoint is only for students' });
    }

    // WORKAROUND: messagesController.getStudentMessages only checks
    // req.user.studentDetails?.currentClass / req.user.class, and doesn't
    // fall back to studentDetails.academic.currentClass like getMyAttendance
    // does. Resolve it properly here and patch req.user before delegating,
    // rather than editing the shared controller (used elsewhere too).
    const resolvedClass =
      req.user.studentDetails?.currentClass ||
      req.user.studentDetails?.academic?.currentClass ||
      req.user.class;
    const resolvedSection =
      req.user.studentDetails?.currentSection ||
      req.user.studentDetails?.academic?.currentSection ||
      req.user.section;

    req.user.class = resolvedClass;
    req.user.section = resolvedSection;

    const raw = await invokeController(messagesController.getStudentMessages, req);
    const messages = raw?.data || [];

    const result = messages.map((m) => ({
      id: m.id,
      title: m.title,
      subject: m.subject,
      message: m.message,
      date: formatDate(m.createdAt),
      timeAgo: m.messageAge,
    }));

    res.json(result);
  } catch (err) {
    console.error('[STUDENT PORTAL] messages overview error:', err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.payload?.message || 'Unable to load messages' });
  }
};

// GET /api/student/profile
exports.getMyProfileOverview = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'This endpoint is only for students' });
    }

    const studentId = req.user.userId || req.user._id;
    const schoolCode = req.user.schoolCode;

    if (!schoolCode) {
      return res.status(400).json({ message: 'School code not found' });
    }

    // NOTE: student profile data lives in the school-specific "students"
    // collection (raw, not the Mongoose User model) — same source used by
    // the existing GET /api/users/my-profile route.
    const schoolConnection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = schoolConnection.db;

    const query = ObjectId.isValid(studentId)
      ? { $or: [{ userId: studentId }, { _id: new ObjectId(studentId) }] }
      : { userId: studentId };

    const student = await db.collection('students').findOne(query);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const displayName =
      student.name?.displayName ||
      [student.name?.firstName, student.name?.lastName].filter(Boolean).join(' ') ||
      (typeof student.name === 'string' ? student.name : '') ||
      '';

    const permanentAddress = student.address?.permanent;
    const address = permanentAddress
      ? [
          permanentAddress.street,
          permanentAddress.area,
          permanentAddress.city,
          permanentAddress.state,
          permanentAddress.pincode,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    res.json({
      name: displayName,
      studentId: student.userId,
      email: student.email,
      phone: student.contact?.primaryPhone || student.phone || null,
      class:
        student.studentDetails?.academic?.currentClass ||
        student.studentDetails?.currentClass ||
        student.class ||
        null,
      section:
        student.studentDetails?.academic?.currentSection ||
        student.studentDetails?.currentSection ||
        student.section ||
        null,
      rollNumber: student.studentDetails?.rollNumber || null,
      admissionNumber: student.studentDetails?.admissionNumber || null,
      dateOfBirth: student.studentDetails?.personal?.dateOfBirth || null,
      gender: student.studentDetails?.personal?.gender || null,
      bloodGroup: student.studentDetails?.personal?.bloodGroup || null,
      address,
      profileImage: student.profileImage || student.profilePicture || null,
      parentName:
        student.studentDetails?.family?.father?.name ||
        student.studentDetails?.family?.mother?.name ||
        null,
      parentPhone:
        student.studentDetails?.family?.father?.phone ||
        student.studentDetails?.family?.mother?.phone ||
        null,
    });
  } catch (err) {
    console.error('[STUDENT PORTAL] profile overview error:', err);
    res.status(500).json({ message: 'Unable to load profile' });
  }
};