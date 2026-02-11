import React, { useState, useEffect } from 'react';
import * as attendanceAPI from '../../../api/attendance';
import { schoolUserAPI } from '../../../api/schoolUsers';
import { useAuth } from '../../../auth/AuthContext';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import api from '../../../api/axios';
import { Calendar, Users, Search, Sun, Moon, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface Student {
  _id: string;
  userId: string;
  name: string;
  class: string;
  section: string;
  morningStatus: 'present' | 'absent' | null;
  afternoonStatus: 'present' | 'absent' | null;
}

const ViewAttendanceRecords: React.FC = () => {
  const { token, user } = useAuth();
  const { currentAcademicYear, viewingAcademicYear, isViewingHistoricalYear, setViewingYear, availableYears, loading: academicYearLoading } = useAcademicYear();

  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    getClassOptions,
    getSectionsByClass,
    hasClasses
  } = useSchoolClasses();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [session, setSession] = useState<'morning' | 'afternoon'>('morning');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get class list from superadmin configuration
  const classList = classesData?.classes?.map(c => c.className) || [];

  // Update available sections when class changes
  useEffect(() => {
    if (selectedClass && classesData) {
      const sections = getSectionsByClass(selectedClass);
      setAvailableSections(sections);
      // Auto-select first section if available
      if (sections.length > 0) {
        setSelectedSection(sections[0].value);
      } else {
        setSelectedSection('');
      }
    } else {
      setAvailableSections([]);
      setSelectedSection('');
    }
  }, [selectedClass, classesData]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClass, selectedSection, selectedDate, session]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm]);

  const fetchStudentsAndAttendance = async () => {
    if (!selectedClass || !selectedSection) {
      setStudents([]);
      return;
    }

    if (!token || !user?.schoolCode) {
      setError('Authentication required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching students for:', { 
        class: selectedClass, 
        section: selectedSection, 
        schoolCode: user.schoolCode 
      });

      // Make API call with query parameters for filtering
      const response = await api.get(`/users/role/student?class=${selectedClass}&section=${selectedSection}`, {
        headers: {
          'x-school-code': user.schoolCode
        }
      });

      const data = response.data;
      console.log('📊 API Response:', data);
      
      const users = data.data || data || [];
      console.log(`👥 Total users received: ${users.length}`);

      // Filter students - check multiple possible field structures, prioritizing academicInfo
      const filtered = users.filter((u: any) => {
        const isStudent = u.role === 'student';
        // Check all possible locations for class, prioritizing academicInfo
        const studentClass = u.academicInfo?.class ||
                            u.studentDetails?.academic?.currentClass ||
                            u.studentDetails?.currentClass || 
                            u.studentDetails?.class ||
                            u.class;
        // Check all possible locations for section, prioritizing academicInfo
        const studentSection = u.academicInfo?.section ||
                              u.studentDetails?.academic?.currentSection ||
                              u.studentDetails?.currentSection || 
                              u.studentDetails?.section ||
                              u.section;
        
        const matchesClass = String(studentClass).trim() === String(selectedClass).trim();
        const matchesSection = String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
        
        // Filter by viewing academic year - check multiple possible locations
        const studentAcademicYear = u.studentDetails?.academicYear || 
                                   u.studentDetails?.academic?.academicYear ||
                                   u.academicYear ||
                                   u.academicInfo?.academicYear;
        // If academic year is not set, don't filter it out (allow it through)
        const matchesAcademicYear = !studentAcademicYear || String(studentAcademicYear).trim() === String(viewingAcademicYear).trim();
        
        return isStudent && matchesClass && matchesSection && matchesAcademicYear;
      });

      console.log(`✅ Filtered students: ${filtered.length}`);

      let studentsWithAttendance = filtered.map((u: any) => ({
        _id: u._id,
        userId: u.userId,
        name: u.name?.displayName || u.name || 'Unknown',
        class: u.academicInfo?.class ||
               u.studentDetails?.academic?.currentClass ||
               u.studentDetails?.currentClass || 
               u.studentDetails?.class ||
               u.class || 
               selectedClass,
        section: u.academicInfo?.section ||
                u.studentDetails?.academic?.currentSection ||
                u.studentDetails?.currentSection || 
                u.studentDetails?.section ||
                u.section || 
                selectedSection,
        morningStatus: null,
        afternoonStatus: null
      }));

      // Now load attendance data if date is selected
      if (selectedDate) {
        try {
          const attendanceResponse = await attendanceAPI.getAttendance({
            class: selectedClass,
            section: selectedSection,
            date: selectedDate,
            session: session
          });

          if (attendanceResponse.success && attendanceResponse.data && attendanceResponse.data.length > 0) {
            const sessionDoc = attendanceResponse.data.find(
              (doc: any) => doc.session === session && doc.dateString === selectedDate
            );

            if (sessionDoc && sessionDoc.students) {
              studentsWithAttendance = studentsWithAttendance.map(student => {
                const existingRecord = sessionDoc.students.find(
                  (record: any) => record.studentId === student.userId
                );

                if (existingRecord) {
                  return {
                    ...student,
                    [session === 'morning' ? 'morningStatus' : 'afternoonStatus']: existingRecord.status
                  };
                }
                return student;
              });
            }
          }
        } catch (err) {
          console.warn('Could not load existing attendance:', err);
        }
      }

      setStudents(studentsWithAttendance);
      
      if (studentsWithAttendance.length === 0) {
        setError(`No students found for Class ${selectedClass} Section ${selectedSection}`);
      }
    } catch (err) {
      setError('Failed to fetch students');
      console.error('❌ Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass || !selectedSection) {
      setStudents([]);
      return;
    }

    if (!token || !user?.schoolCode) {
      setError('Authentication required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching students for:', { 
        class: selectedClass, 
        section: selectedSection, 
        schoolCode: user.schoolCode 
      });

      // Make API call with query parameters for filtering
      const response = await api.get(`/users/role/student?class=${selectedClass}&section=${selectedSection}`, {
        headers: {
          'x-school-code': user.schoolCode
        }
      });

      const data = response.data;
      console.log('📊 API Response:', data);
      
      const users = data.data || data || [];
      console.log(`👥 Total users received: ${users.length}`);

      // Filter students - check multiple possible field structures, prioritizing academicInfo
      const filtered = users.filter((u: any) => {
        const isStudent = u.role === 'student';
        // Check all possible locations for class, prioritizing academicInfo
        const studentClass = u.academicInfo?.class ||
                            u.studentDetails?.academic?.currentClass ||
                            u.studentDetails?.currentClass || 
                            u.studentDetails?.class ||
                            u.class;
        // Check all possible locations for section, prioritizing academicInfo
        const studentSection = u.academicInfo?.section ||
                              u.studentDetails?.academic?.currentSection ||
                              u.studentDetails?.currentSection || 
                              u.studentDetails?.section ||
                              u.section;
        
        const matchesClass = String(studentClass).trim() === String(selectedClass).trim();
        const matchesSection = String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
        
        // Filter by viewing academic year - check multiple possible locations
        const studentAcademicYear = u.studentDetails?.academicYear || 
                                   u.studentDetails?.academic?.academicYear ||
                                   u.academicYear ||
                                   u.academicInfo?.academicYear;
        // If academic year is not set, don't filter it out (allow it through)
        const matchesAcademicYear = !studentAcademicYear || String(studentAcademicYear).trim() === String(viewingAcademicYear).trim();
        
        return isStudent && matchesClass && matchesSection && matchesAcademicYear;
      });

      console.log(`✅ Filtered students: ${filtered.length}`);

      const studentsWithAttendance = filtered.map((u: any) => ({
        _id: u._id,
        userId: u.userId,
        name: u.name?.displayName || u.name || 'Unknown',
        class: u.academicInfo?.class || u.studentDetails?.class || u.studentDetails?.currentClass || u.class || selectedClass,
        section: u.academicInfo?.section || u.studentDetails?.section || u.studentDetails?.currentSection || u.section || selectedSection,
        morningStatus: null,
        afternoonStatus: null
      }));

      setStudents(studentsWithAttendance);
      
      if (studentsWithAttendance.length === 0) {
        setError(`No students found for Class ${selectedClass} Section ${selectedSection}`);
      }
    } catch (err) {
      setError('Failed to fetch students');
      console.error('❌ Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  };

  const loadExistingAttendance = async () => {
    if (!selectedClass || !selectedSection || !selectedDate) {
      return;
    }

    try {
      // Use the getAttendance API with session-based storage
      const response = await attendanceAPI.getAttendance({
        class: selectedClass,
        section: selectedSection,
        date: selectedDate,
        session: session
      });

      if (response.success && response.data && response.data.length > 0) {
        // Find the session document
        const sessionDoc = response.data.find(
          (doc: any) => doc.session === session && doc.dateString === selectedDate
        );

        if (sessionDoc && sessionDoc.students) {
          // Update students with existing attendance data from session document
          setStudents(prev => prev.map(student => {
            const existingRecord = sessionDoc.students.find(
              (record: any) => record.studentId === student.userId
            );

            if (existingRecord) {
              return {
                ...student,
                [session === 'morning' ? 'morningStatus' : 'afternoonStatus']: existingRecord.status
              };
            }
            return student;
          }));
        }
      }
    } catch (err) {
      console.warn('Could not load existing attendance:', err);
      // Don't show error to user as this is optional
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
    setSelectedSection(''); // Reset section when class changes
    setStudents([]);
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(e.target.value);
  };

  // Helper function to get display name for class
  const getClassDisplayName = (cls: string) => {
    if (cls === 'LKG' || cls === 'UKG') return cls;
    return `Class ${cls}`;
  };

  const getCurrentStatus = (student: Student) => {
    return session === 'morning' ? student.morningStatus : student.afternoonStatus;
  };

  const getAttendanceSummary = () => {
    const statusField = session === 'morning' ? 'morningStatus' : 'afternoonStatus';
    const present = filteredStudents.filter(s => s[statusField] === 'present').length;
    const absent = filteredStudents.filter(s => s[statusField] === 'absent').length;
    const unmarked = filteredStudents.filter(s => s[statusField] === null).length;

    return { present, absent, unmarked, total: filteredStudents.length };
  };

  const summary = getAttendanceSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">View Attendance Records</h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Academic Year Selector */}
      {isViewingHistoricalYear && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>📚 Viewing Historical Data:</strong> You are viewing data from {viewingAcademicYear}. This data is read-only.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <select
              value={viewingAcademicYear}
              onChange={(e) => setViewingYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year} {year === currentAcademicYear && '(Current)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={classesLoading || !hasClasses()}
            >
              <option value="">{classesLoading ? 'Loading...' : 'Select Class'}</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>{getClassDisplayName(cls)}</option>
              ))}
            </select>
            {!classesLoading && !hasClasses() && (
              <span className="text-xs text-red-500 mt-1">No classes configured</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={handleSectionChange}
              disabled={!selectedClass || availableSections.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">{!selectedClass ? 'Select Class First' : 'Select Section'}</option>
              {availableSections.map((section) => (
                <option key={section.value} value={section.value}>Section {section.section}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session</label>
            <div className="flex rounded-lg border border-gray-300">
              <button
                type="button"
                onClick={() => setSession('morning')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-lg flex items-center justify-center ${
                  session === 'morning'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Sun className="h-4 w-4 mr-1" />
                Morning
              </button>
              <button
                type="button"
                onClick={() => setSession('afternoon')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-lg flex items-center justify-center ${
                  session === 'afternoon'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Moon className="h-4 w-4 mr-1" />
                Afternoon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      {selectedClass && selectedSection && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {selectedClass && selectedSection && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Present</div>
                <div className="text-2xl font-bold text-green-600">{summary.present}</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Absent</div>
                <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Not Marked</div>
                <div className="text-2xl font-bold text-gray-600">{summary.unmarked}</div>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>
      )}

      {/* Students List - Read Only */}
      {selectedClass && selectedSection && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {session.charAt(0).toUpperCase() + session.slice(1)} Attendance - {getClassDisplayName(selectedClass)} Section {selectedSection}
              </h3>
              <div className="text-sm text-gray-600">
                Total: {summary.total} students
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {students.length === 0
                  ? 'No students found in this class and section'
                  : 'No students match your search criteria'
                }
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => {
                  const status = getCurrentStatus(student);
                  return (
                    <div key={student._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">User ID: {student.userId}</div>
                          <div className="text-sm text-gray-500">{student.class} - Section {student.section}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {status === 'present' && (
                          <span className="px-4 py-2 rounded-lg bg-green-100 text-green-800 border border-green-200 text-sm font-medium flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>Present</span>
                          </span>
                        )}
                        {status === 'absent' && (
                          <span className="px-4 py-2 rounded-lg bg-red-100 text-red-800 border border-red-200 text-sm font-medium flex items-center space-x-1">
                            <XCircle className="h-4 w-4" />
                            <span>Absent</span>
                          </span>
                        )}
                        {status === null && (
                          <span className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 text-sm font-medium flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Not Marked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedClass || !selectedSection ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Get Started</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Select a date to view attendance</li>
                  <li>Choose a class from the dropdown</li>
                  <li>Select a section to view students</li>
                  <li>Choose morning or afternoon session</li>
                  <li>View the attendance records for that day</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ViewAttendanceRecords;
