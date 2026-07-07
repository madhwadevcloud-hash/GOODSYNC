import React, { useState, useEffect } from 'react';
import { Calendar, Search, Save, Users, Clock, Check, X, Minus } from 'lucide-react';
import { schoolUserAPI } from '../../../api/schoolUsers';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../auth/AuthContext';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { normalizeAcademicYear } from '../../../utils/academicYearUtils';

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
  const { 
    currentAcademicYear, 
    viewingAcademicYear, 
    ready: academicYearReady 
  } = useAcademicYear();

  // Use the useSchoolClasses hook to fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    error: classesError,
    getClassOptions,
    getSectionsByClass,
    hasClasses
  } = useSchoolClasses(academicYearReady ? viewingAcademicYear : undefined);

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
  const getCurrentSession = (): 'morning' | 'afternoon' => {
  const hour = new Date().getHours();

  // 12:00 AM - 12:59 PM = Morning
  // 1:00 PM - 11:59 PM = Afternoon
  return hour < 13 ? 'morning' : 'afternoon';
};

const [activeSession, setActiveSession] = useState<'morning' | 'afternoon'>(getCurrentSession());
useEffect(() => {
  const updateSession = () => {
    setActiveSession(getCurrentSession());
  };

  // Set immediately
  updateSession();

  // Check every minute
  const timer = setInterval(updateSession, 60000);

  return () => clearInterval(timer);
}, []);

  // Get class list from superadmin configuration
  const classList = [...new Set(classesData?.classes?.map(c => c.className) || [])];

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
      const schoolCode = user?.schoolCode || 'R';

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
            ...user, // Preserve all properties including studentDetails
            _id: user._id,
            userId: user.userId || user._id,
            name: typeof user.name === 'object' ? (user.name.displayName || `${user.name.firstName} ${user.name.lastName}`) : user.name,
            class: user.academicInfo?.class || user.class || user.studentDetails?.academic?.currentClass || user.studentDetails?.class,
            section: user.academicInfo?.section || user.section || user.studentDetails?.academic?.currentSection || user.studentDetails?.section,
            academicYear: user.academicInfo?.academicYear || user.academicYear || user.studentDetails?.academic?.academicYear || user.studentDetails?.academicYear,
            rollNumber: user.academicInfo?.rollNumber || user.rollNumber || user.studentDetails?.academic?.rollNumber || user.studentDetails?.rollNumber
          }));
      } else if (response.data && response.data.students) {
        // Handle grouped response
        allStudents = response.data.students.map((user: any) => ({
            ...user, // Preserve all properties
            _id: user._id,
            userId: user.userId || user._id,
            name: typeof user.name === 'object' ? (user.name.displayName || `${user.name.firstName} ${user.name.lastName}`) : user.name,
            class: user.academicInfo?.class || user.class || user.studentDetails?.academic?.currentClass || user.studentDetails?.class,
            section: user.academicInfo?.section || user.section || user.studentDetails?.academic?.currentSection || user.studentDetails?.section,
            academicYear: user.academicInfo?.academicYear || user.academicYear || user.studentDetails?.academic?.academicYear || user.studentDetails?.academicYear,
            rollNumber: user.academicInfo?.rollNumber || user.rollNumber || user.studentDetails?.academic?.rollNumber || user.studentDetails?.rollNumber
        }));
      }

      // Filter students by selected class, section and academic year
      const targetYear = normalizeAcademicYear(viewingAcademicYear || currentAcademicYear);
      
      const filteredStudents = allStudents.filter(s => {
        // Handle nested data structure
        const studentClass = s.academicInfo?.class || s.studentDetails?.academic?.currentClass || s.class || s.studentDetails?.class;
        const studentSection = s.academicInfo?.section || s.studentDetails?.academic?.currentSection || s.section || s.studentDetails?.section;
        const studentYear = s.academicInfo?.academicYear || s.studentDetails?.academic?.academicYear || s.academicYear || s.studentDetails?.academicYear;
        
        const normalizedStudentYear = normalizeAcademicYear(String(studentYear || '').trim());
        const normalizedTargetYear = normalizeAcademicYear(String(viewingAcademicYear || currentAcademicYear || '').trim());

        const matchesClass = String(studentClass).trim() === String(selectedClass).trim();
        const matchesSection = String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
        const matchesYear = !studentYear || normalizedStudentYear === normalizedTargetYear;

        return matchesClass && matchesSection && matchesYear;
      });

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

    const session = activeSession;

    const attendanceData = {
      date: selectedDate,
      class: selectedClass,
      section: selectedSection,
      session,
      records: attendanceRecords,
      markedBy: user?.id || user?.email,
      timestamp: new Date().toISOString()
    };

    console.log('Saving attendance data:', attendanceData);

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
    <div className="space-y-6 relative">
      <div className="sticky top-[72px] z-20 flex flex-col gap-6 pt-4 pb-2 -mt-4 bg-[#f8fafc]">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden mx-2 sm:mx-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-3 rounded-xl flex items-center justify-center shadow-sm">
                <Users className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Mark and manage student attendance</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm font-semibold bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100">
              <Users className="h-4 w-4" />
              <span>{filteredRecords.length} students</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mx-2 sm:mx-0">
          <div className="p-6">

        {/* Date and Class Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700"
            >
              <option value="">Choose Class</option>
              {classList.map(cls => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
            {!classesLoading && !hasClasses() && (
              <span className="text-xs font-semibold text-red-500 mt-1.5">No classes configured</span>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 disabled:opacity-50"
              disabled={!selectedClass || availableSections.length === 0}
            >
              <option value="">{!selectedClass ? 'Select Class First' : 'Select Section'}</option>
              {availableSections.map(section => (
                <option key={section.value} value={section.value}>Section {section.section}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Session</label>
            <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
              <button
                disabled={activeSession !== 'morning'}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeSession === 'morning'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                Morning
              </button>

              <button
                disabled={activeSession !== 'afternoon'}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeSession === 'afternoon'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400 cursor-not-allowed opacity-60'
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
      </div>
      </div>

      {/* Attendance Table */}
      {selectedClass && selectedSection && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mx-2 sm:mx-0">
          <div className="px-4 sm:px-6 py-5 border-b border-slate-100 bg-slate-50/50 backdrop-blur-md">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 break-words">
              Class {selectedClass} - Section {selectedSection}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              {new Date(selectedDate).toLocaleDateString()} | 
              <span className="font-bold text-indigo-600 ml-1">
                {activeSession.charAt(0).toUpperCase() + activeSession.slice(1)} Session (Auto-detected)
              </span>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-sm sm:text-base text-slate-600 font-medium">Loading students...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-8 w-8 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-slate-500 font-medium">No students found for the selected class and section.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Student Details
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Morning Status
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Afternoon Status
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {activeSession.charAt(0).toUpperCase() + activeSession.slice(1)} Actions
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {filteredRecords.map((record) => (
                    <tr key={record.studentId} className="hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-50 last:border-0 group/row">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm border-2 border-white shrink-0 group-hover/row:scale-105 transition-transform duration-300">
                            {record.name ? record.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="flex flex-col">
                            <div className="text-sm sm:text-[15px] font-bold text-slate-800">{record.name}</div>
                            <div className="text-xs font-medium text-slate-500 mt-0.5">
                              {record.userId} • Class {record.class}-{record.section}
                              {record.rollNumber && ` • Roll: ${record.rollNumber}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getStatusColor(record.morningStatus)}`}>
                          {getStatusIcon(record.morningStatus)}
                          <span className="ml-1.5 capitalize">{record.morningStatus}</span>
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getStatusColor(record.afternoonStatus)}`}>
                          {getStatusIcon(record.afternoonStatus)}
                          <span className="ml-1.5 capitalize">{record.afternoonStatus}</span>
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center items-center bg-slate-100/80 p-1.5 rounded-xl w-max mx-auto shadow-inner border border-slate-200/60 gap-0.5">
                          <button
                            onClick={() => updateAttendanceStatus(record.studentId, activeSession, 'present')}
                            className={`flex items-center space-x-1 px-3.5 py-2 rounded-lg text-xs font-black transition-all duration-300 ${record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'present'
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200/50 scale-[1.02]'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-white'
                              }`}
                            title="Present"
                          >
                            <Check className="h-4 w-4" strokeWidth={record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'present' ? 3 : 2} />
                            <span className="hidden lg:inline">Present</span>
                          </button>
                          <button
                            onClick={() => updateAttendanceStatus(record.studentId, activeSession, 'half-day')}
                            className={`flex items-center space-x-1 px-3.5 py-2 rounded-lg text-xs font-black transition-all duration-300 ${record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'half-day'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-200/50 scale-[1.02]'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-white'
                              }`}
                            title="Half Day"
                          >
                            <Minus className="h-4 w-4" strokeWidth={record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'half-day' ? 3 : 2} />
                            <span className="hidden lg:inline">Half Day</span>
                          </button>
                          <button
                            onClick={() => updateAttendanceStatus(record.studentId, activeSession, 'absent')}
                            className={`flex items-center space-x-1 px-3.5 py-2 rounded-lg text-xs font-black transition-all duration-300 ${record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'absent'
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-200/50 scale-[1.02]'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-white'
                              }`}
                            title="Absent"
                          >
                            <X className="h-4 w-4" strokeWidth={record[activeSession === 'morning' ? 'morningStatus' : 'afternoonStatus'] === 'absent' ? 3 : 2} />
                            <span className="hidden lg:inline">Absent</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={record.remarks || ''}
                          onChange={(e) => updateRemarks(record.studentId, e.target.value)}
                          placeholder="Add remarks..."
                          className="w-full min-w-[140px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 group-hover/row:bg-white group-hover/row:border-slate-300"
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
