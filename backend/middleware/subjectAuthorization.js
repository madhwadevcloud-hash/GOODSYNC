/**
 * subjectAuthorization.js
 * 
 * Middleware that enforces teacher-subject authorization on marks-related APIs.
 * 
 * Rules:
 *   - Admin and superadmin: ALWAYS allowed (full unrestricted access)
 *   - Teacher: Must have an active assignment in TeacherSubjectAssignment
 *     for the specific (class, section, subject, academicYear) they're modifying
 *   - Student/Parent: Handled by existing route-level role checks
 * 
 * CRITICAL: The backend must NEVER trust frontend validation or request payloads.
 * Authorization is derived solely from authenticated user identity + assignment records.
 */

const TeacherAssignmentService = require('../services/teacherAssignmentService');
const { getDynamicAcademicYear } = require('../utils/academicYearHelper');

/**
 * Middleware to check if a teacher is authorized to modify marks for the given subjects.
 */
const enforceSubjectAuthorization = (options = {}) => {
  const { mode = 'strict' } = options;

  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin and superadmin bypass all subject authorization
      if (['admin', 'superadmin'].includes(user.role)) {
        return next();
      }

      // Only enforce for teachers
      if (user.role !== 'teacher') {
        return next();
      }

      const schoolCode = user.schoolCode;
      if (!schoolCode) {
        console.error('[SUBJECT_AUTH] Teacher has no schoolCode');
        return res.status(403).json({
          success: false,
          message: 'Authorization failed: School context not available'
        });
      }

      // Get teacher identifier - use userId (the school-scoped user ID like "SK_TEA001")
      const teacherId = user.userId || user._id?.toString();
      if (!teacherId) {
        console.error('[SUBJECT_AUTH] Cannot determine teacher identity');
        return res.status(403).json({
          success: false,
          message: 'Authorization failed: Cannot determine teacher identity'
        });
      }

      // Extract class, section, subject from request
      const className = req.body?.class || req.body?.className || req.query?.class || req.query?.className;
      const section = req.body?.section || req.query?.section;
      const academicYear = req.body?.academicYear || req.query?.academicYear || getDynamicAcademicYear();

      if (!className || !section) {
        console.warn('[SUBJECT_AUTH] Missing class/section in request, cannot verify authorization');
        return res.status(400).json({
          success: false,
          message: 'Class and section are required for teacher authorization'
        });
      }

      // For bulk save operations (mode: 'filter')
      if (mode === 'filter' && req.body?.results && Array.isArray(req.body.results)) {
        // Get all unique subject names from the results payload
        const allSubjectNames = new Set();
        req.body.results.forEach(r => {
          if (r.subjectMarks && typeof r.subjectMarks === 'object') {
            Object.keys(r.subjectMarks).forEach(s => allSubjectNames.add(s));
          }
        });

        if (allSubjectNames.size === 0) {
          return next(); // No subjects to check
        }

        // Get authorized subjects
        const authorizedSubjects = await TeacherAssignmentService.getAuthorizedSubjects(
          schoolCode,
          teacherId,
          className,
          section,
          academicYear,
          Array.from(allSubjectNames)
        );

        if (authorizedSubjects.length === 0) {
          console.warn(`[SUBJECT_AUTH] ❌ Teacher ${teacherId} has NO assignments for ${className}-${section} (${academicYear})`);
          return res.status(403).json({
            success: false,
            message: `You are not assigned to any subjects in Class ${className} Section ${section} for ${academicYear}. Contact your admin for subject assignment.`
          });
        }

        const authorizedSet = new Set(authorizedSubjects);
        const unauthorizedSubjects = Array.from(allSubjectNames).filter(s => !authorizedSet.has(s));

        if (unauthorizedSubjects.length > 0) {
          console.warn(`[SUBJECT_AUTH] Teacher ${teacherId} not authorized for: ${unauthorizedSubjects.join(', ')} in ${className}-${section}`);

          // Filter out unauthorized subjects from the payload
          req.body.results = req.body.results.map(r => {
            if (r.subjectMarks && typeof r.subjectMarks === 'object') {
              const filteredMarks = {};
              for (const [subjectName, marks] of Object.entries(r.subjectMarks)) {
                if (authorizedSet.has(subjectName)) {
                  filteredMarks[subjectName] = marks;
                }
              }
              return { ...r, subjectMarks: filteredMarks };
            }
            return r;
          });
        }

        // Attach authorization metadata to the request for downstream use
        req.teacherAuthorization = {
          teacherId,
          authorizedSubjects,
          unauthorizedSubjects,
          className,
          section,
          academicYear
        };

        console.log(`[SUBJECT_AUTH] ✅ Teacher ${teacherId} authorized for ${authorizedSubjects.length} subjects in ${className}-${section}`);
        return next();
      }

      // For single-subject operations (mode: 'strict')
      const subject = req.body?.subject || req.query?.subject;

      if (subject) {
        const isAuthorized = await TeacherAssignmentService.isTeacherAuthorized(
          schoolCode,
          teacherId,
          className,
          section,
          subject,
          academicYear
        );

        if (!isAuthorized) {
          console.warn(`[SUBJECT_AUTH] ❌ Teacher ${teacherId} NOT authorized for ${subject} in ${className}-${section} (${academicYear})`);
          return res.status(403).json({
            success: false,
            message: `You are not assigned to teach "${subject}" in Class ${className} Section ${section}. Contact your admin for subject assignment.`
          });
        }

        req.teacherAuthorization = {
          teacherId,
          authorizedSubjects: [subject],
          className,
          section,
          academicYear
        };

        console.log(`[SUBJECT_AUTH] ✅ Teacher ${teacherId} authorized for ${subject} in ${className}-${section}`);
      } else {
        // No specific subject in request - check if teacher has ANY assignments for this class-section
        const assignments = await TeacherAssignmentService.getTeacherAssignments(
          schoolCode,
          teacherId,
          academicYear
        );

        const classAssignments = assignments.filter(
          a => a.className === className && a.section === section.toUpperCase()
        );

        if (classAssignments.length === 0) {
          console.warn(`[SUBJECT_AUTH] ❌ Teacher ${teacherId} has NO assignments for ${className}-${section} (${academicYear})`);
          return res.status(403).json({
            success: false,
            message: `You are not assigned to any subjects in Class ${className} Section ${section}. Contact your admin for subject assignment.`
          });
        }

        req.teacherAuthorization = {
          teacherId,
          authorizedSubjects: classAssignments.map(a => a.subjectName),
          className,
          section,
          academicYear
        };
      }

      return next();
    } catch (error) {
      console.error('[SUBJECT_AUTH] Authorization check failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: error.message
      });
    }
  };
};

/**
 * Lightweight middleware that attaches teacher assignment info to the request
 * without blocking the request.
 */
const attachTeacherAssignments = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'teacher') {
      req.teacherAssignments = null;
      return next();
    }

    const schoolCode = user.schoolCode;
    const teacherId = user.userId || user._id?.toString();
    const academicYear = req.query?.academicYear || req.body?.academicYear || getDynamicAcademicYear();

    if (!schoolCode || !teacherId) {
      req.teacherAssignments = null;
      return next();
    }

    const assignments = await TeacherAssignmentService.getTeacherAssignments(
      schoolCode,
      teacherId,
      academicYear
    );

    req.teacherAssignments = assignments;
    return next();
  } catch (error) {
    console.error('[ATTACH_ASSIGNMENTS] Error fetching teacher assignments:', error);
    req.teacherAssignments = null;
    return next();
  }
};

module.exports = {
  enforceSubjectAuthorization,
  attachTeacherAssignments
};
