// This file will contain role-based access logic and helpers
// 
// IMPORTANT: For admin and teacher roles, "view" permissions grant FULL CRUD access:
// - viewAttendance: Grants ability to view, mark, update, and delete attendance
// - viewResults: Grants ability to view, create, update, freeze, and delete results
// - viewTimetable: Grants ability to view, create, update, and delete timetables
// - viewAssignments: Grants ability to view, create, update, and delete assignments
// - viewFees: Grants ability to view, create, update, and delete fee structures
// - viewReports: Grants ability to view and generate all reports
// - viewLeaves: Grants ability to view, create, update, and manage leave requests
// 
// This design ensures that when a superadmin grants a feature permission to admin/teacher,
// they get complete access to that feature, not just read-only access.
//
const accessMatrix = {
  superadmin: {
    manageUsers: true,
    manageSchoolSettings: true,
    createTimetable: true,
    viewTimetable: true,
    markAttendance: true,
    viewAttendance: true,
    addAssignments: false,
    submitAssignments: false,
    viewResults: true,
    updateResults: false,
    viewLeaves: true,
    message: true
  },
  admin: {
    manageUsers: true,
    manageSchoolSettings: true,
    createTimetable: true,
    viewTimetable: true,
    markAttendance: true,
    viewAttendance: true,
    addAssignments: true,
    submitAssignments: false,
    viewResults: true,
    updateResults: false,
    viewLeaves: true,
    message: true
  },
  teacher: {
    manageUsers: false,
    manageSchoolSettings: 'limited',
    createTimetable: true,
    viewTimetable: true,
    markAttendance: true,
    viewAttendance: true,
    addAssignments: true,
    submitAssignments: false,
    viewResults: 'own',
    updateResults: true,
    viewLeaves: 'own',
    message: true
  },
  student: {
    manageUsers: false,
    manageSchoolSettings: false,
    createTimetable: false,
    viewTimetable: true,
    markAttendance: false,
    viewAttendance: true, // Students can view their own attendance
    viewAssignments: true, // Students can view assignments assigned to them
    addAssignments: false,
    submitAssignments: true,
    viewResults: true,
    updateResults: false,
    viewLeaves: false,
    message: false
  },
  parent: {
    manageUsers: false,
    manageSchoolSettings: false,
    createTimetable: false,
    viewTimetable: false,
    markAttendance: false,
    viewAttendance: false,
    addAssignments: false,
    submitAssignments: false,
    viewResults: false,
    updateResults: false,
    viewLeaves: false,
    message: false
  }
};

module.exports = accessMatrix;
