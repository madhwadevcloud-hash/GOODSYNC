import React, { useState, useEffect } from 'react';
import { Calendar, Search, Save, Users, Clock, Check, X, Minus } from 'lucide-react';
import { schoolUserAPI } from '../../../api/schoolUsers';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../auth/AuthContext';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';

interface Student {
  _id: string;
  userId: string;
  name: string;
  class: string;
  section: string;
  rollNumber?: string;
}

interface AttendanceRecord {
  studentId: string;
  userId: string;
  name: string;
  class: string;
  section: string;
  rollNumber?: string;
  morningStatus: 'present' | 'absent' | 'half-day';
  afternoonStatus: 'present' | 'absent' | 'half-day';
  remarks?: string;
}

const Attendance: React.FC = () => {
  const { user } = useAuth();

  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    getClassOptions,
    getSectionsByClass,
    hasClasses
  } = useSchoolClasses();

  // State management
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSession, setActiveSession] = useState<'morning' | 'afternoon'>('morning');

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

  // Fetch students when class and section are selected
  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudents();
    }
  }, [selectedClass, selectedSection]);

  // Load existing attendance when date, class, or section changes
  useEffect(() => {
    if (selectedDate && selectedClass && selectedSection) {
      loadExistingAttendance();
    }
  }, [selectedDate, selectedClass, selectedSection]);

  // Fetch students from the selected class and section
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('erp.auth');
      const token = authData ? JSON.parse(authData).token : null;
      const schoolCode = user?.schoolCode || 'P';

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      console.log(`Fetching students for Class ${selectedClass} Section ${selectedSection}`);

      // Fetch all users and filter students
      const response = await schoolUserAPI.getAllUsers(schoolCode, token);

      let allStudents: Student[] = [];

      if (response.data && Array.isArray(response.data)) {
        // Handle flat array response
        allStudents = response.data
          .filter((user: any) => user.role === 'student')
          .map((user: any) => ({
            _id: user._id,
            userId: user.userId || user._id,
            name: user.name,
            class: user.class || user.studentDetails?.class,
            section: user.section || user.studentDetails?.section,
            rollNumber: user.rollNumber || user.studentDetails?.rollNumber
          }));
      } else if (response.data && response.data.students) {
        // Handle grouped response
        allStudents = response.data.students.map((user: any) => ({
          _id: user._id,
          userId: user.userId || user._id,
          name: user.name,
          class: user.class || user.studentDetails?.class,
          section: user.section || user.studentDetails?.section,
          rollNumber: user.rollNumber || user.studentDetails?.rollNumber
        }));
      }

      // Filter students by selected class and section
      const filteredStudents = allStudents.filter(student =>
        student.class === selectedClass && student.section === selectedSection
      );

      // Sort by roll number or name
      filteredStudents.sort((a, b) => {
        if (a.rollNumber && b.rollNumber) {
          return parseInt(a.rollNumber) - parseInt(b.rollNumber);
        }
        return a.name.localeCompare(b.name);
      });

      setStudents(filteredStudents);
      console.log(`Found ${filteredStudents.length} students in Class ${selectedClass} Section ${selectedSection}`);

      // Initialize attendance records
      initializeAttendanceRecords(filteredStudents);

    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Initialize attendance records for fetched students
  const initializeAttendanceRecords = (studentsList: Student[]) => {
    const records: AttendanceRecord[] = studentsList.map(student => ({
      studentId: student._id,
      userId: student.userId,
      name: student.name,
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      morningStatus: 'present',
      afternoonStatus: 'present',
      remarks: ''
    }));
    setAttendanceRecords(records);
  };

  // Load existing attendance data for the selected date
  const loadExistingAttendance = async () => {
    try {
      // This would typically fetch from an attendance API
      console.log(`Loading attendance for ${selectedDate}, Class ${selectedClass} Section ${selectedSection}`);
      // For now, we'll keep the initialized records
      // In a real implementation, you would fetch existing attendance data here
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  // Update attendance status for a student
  const updateAttendanceStatus = (
    studentId: string,
    session: 'morning' | 'afternoon',
    status: 'present' | 'absent' | 'half-day'
  ) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.studentId === studentId
          ? {
            ...record,
            [session === 'morning' ? 'morningStatus' : 'afternoonStatus']: status
          }
          : record
      )
    );
  };

  // Update remarks for a student
  const updateRemarks = (studentId: string, remarks: string) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.studentId === studentId
          ? { ...record, remarks }
          : record
      )
    );
  };

  // Mark all students as present/absent
  const markAllStudents = (session: 'morning' | 'afternoon', status: 'present' | 'absent') => {
    setAttendanceRecords(prev =>
      prev.map(record => ({
        ...record,
        [session === 'morning' ? 'morningStatus' : 'afternoonStatus']: status
      }))
    );
    toast.success(`All students marked as ${status} for ${session} session`);
  };

  // Save attendance data
  const saveAttendance = async () => {
    try {
      setSaving(true);

      const attendanceData = {
        date: selectedDate,
        class: selectedClass,
        section: selectedSection,
        records: attendanceRecords,
        markedBy: user?.id || user?.email,
        timestamp: new Date().toISOString()
      };

      console.log('Saving attendance data:', attendanceData);

      // Here you would typically send the data to your attendance API
      // await attendanceAPI.saveAttendance(schoolCode, attendanceData, token);

      toast.success('Attendance saved successfully');

    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Filter students based on search term
  const filteredRecords = attendanceRecords.filter(record =>
    record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.rollNumber && record.rollNumber.includes(searchTerm))
  );

  // Get attendance status icon
  const getStatusIcon = (status: 'present' | 'absent' | 'half-day') => {
    switch (status) {
      case 'present':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <X className="h-4 w-4 text-red-600" />;
      case 'half-day':
        return <Minus className="h-4 w-4 text-yellow-600" />;
    }
  };

  // Get status color classes
  const getStatusColor = (status: 'present' | 'absent' | 'half-day') => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'half-day':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mx-2 sm:mx-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Attendance Management</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Mark and manage student attendance</p>
          </div>
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{filteredRecords.length} students</span>
          </div>
        </div>

        {/* Date and Class Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
            >
              <option value="">Choose Class</option>
              {classList.map(cls => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
            {!classesLoading && !hasClasses() && (
              <span className="text-xs text-red-500 mt-1">No classes configured</span>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              disabled={!selectedClass || availableSections.length === 0}
            >
              <option value="">{!selectedClass ? 'Select Class First' : 'Select Section'}</option>
              {availableSections.map(section => (
                <option key={section.value} value={section.value}>Section {section.section}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Session</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveSession('morning')}
                className={`flex-1 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${activeSession === 'morning'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                Morning
              </button>
              <button
                onClick={() => setActiveSession('afternoon')}
                className={`flex-1 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${activeSession === 'afternoon'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                Afternoon
              </button>
            </div>
          </div>
        </div>

        {/* Search and Quick Actions */}
        {selectedClass && selectedSection && (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex flex-row gap-2">
              <button
                onClick={() => markAllStudents(activeSession, 'present')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Check className="h-4 w-4" />
                <span>Mark All Present</span>
              </button>
              <button
                onClick={() => markAllStudents(activeSession, 'absent')}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <X className="h-4 w-4" />
                <span>Mark All Absent</span>
              </button>
              <button
                onClick={saveAttendance}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>

            {/* Mobile Action Buttons */}
            <div className="sm:hidden space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => markAllStudents(activeSession, 'present')}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                >
                  <Check className="h-4 w-4" />
                  <span>All Present</span>
                </button>
                <button
                  onClick={() => markAllStudents(activeSession, 'absent')}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
                >
                  <X className="h-4 w-4" />
                  <span>All Absent</span>
                </button>
              </div>
              <button
                onClick={saveAttendance}
                disabled={saving}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-lg"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {selectedClass && selectedSection && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 break-words">
              Class {selectedClass} - Section {selectedSection}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {new Date(selectedDate).toLocaleDateString()} | {activeSession.charAt(0).toUpperCase() + activeSession.slice(1)} Session
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm sm:text-base text-gray-600">Loading students...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600">No students found for the selected class and section.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Student Details
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Morning Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Afternoon Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {activeSession.charAt(0).toUpperCase() + activeSession.slice(1)} Actions
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.studentId} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">{record.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {record.userId} | Class {record.class}-{record.section}
                            {record.rollNumber && ` | Roll: ${record.rollNumber}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.morningStatus)}`}>
                          {getStatusIcon(record.morningStatus)}
                          <span className="ml-1 capitalize">{record.morningStatus}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.afternoonStatus)}`}>
                          {getStatusIcon(record.afternoonStatus)}
                          <span className="ml-1 capitalize">{record.afternoonStatus}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => updateAttendanceStatus(record.studentId, activeSession, 'present')}
                            className={`p-1 sm:p-2 rounded ${record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'present'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                              }`}
                            title="Present"
                          >
                            <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            onClick={() => updateAttendanceStatus(record.studentId, activeSession, 'half-day')}
                            className={`p-1 sm:p-2 rounded ${record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'half-day'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'
                              }`}
                            title="Half Day"
                          >
                            <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            onClick={() => updateAttendanceStatus(record.studentId, activeSession, 'absent')}
                            className={`p-1 sm:p-2 rounded ${record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'absent'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                              }`}
                            title="Absent"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={record.remarks || ''}
                          onChange={(e) => updateRemarks(record.studentId, e.target.value)}
                          placeholder="Add remarks..."
                          className="w-full min-w-[120px] text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
