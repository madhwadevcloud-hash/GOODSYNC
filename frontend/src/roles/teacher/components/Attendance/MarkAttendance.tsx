import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, Calendar, Sun, Moon, Users as UsersIcon, Lock } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import api from '../../../../services/api';
import { useSchoolClasses } from '../../../../hooks/useSchoolClasses';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import { toast } from 'react-hot-toast';
import * as attendanceAPI from '../../../../api/attendance';

const MarkAttendance: React.FC = () => {
  const { user, token } = useAuth();
  const { classesData, loading: classesLoading, getSectionsByClass } = useSchoolClasses();
  const { currentAcademicYear } = useAcademicYear();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<{
    isMarked: boolean;
    isFrozen: boolean;
    canModify: boolean;
  }>({ isMarked: false, isFrozen: false, canModify: true });

  const classList = classesData?.classes?.map(c => c.className) || [];

  // Update sections when class changes
  useEffect(() => {
    if (selectedClass && classesData) {
      const sections = getSectionsByClass(selectedClass);
      setAvailableSections(sections);
    } else {
      setAvailableSections([]);
      setSelectedSection('');
    }
  }, [selectedClass, classesData, getSectionsByClass]);

  // Fetch students when class and section are selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !selectedSection) {
        setStudents([]);
        return;
      }

      if (!token || !user?.schoolCode) {
        toast.error('Authentication required');
        return;
      }

      setLoading(true);
      try {
        console.log('🔍 Fetching students for:', { 
          class: selectedClass, 
          section: selectedSection, 
          schoolCode: user.schoolCode,
          academicYear: currentAcademicYear
        });
        console.log('📅 Filtering by Academic Year:', currentAcademicYear);

        // Build query params including academic year
        const queryParams = new URLSearchParams({
          class: selectedClass,
          section: selectedSection
        });
        
        if (currentAcademicYear) {
          queryParams.append('academicYear', currentAcademicYear);
        }

        // Use the same API endpoint as admin - teachers have access via validateSchoolAccess(['admin', 'teacher'])
        const response = await api.get(`/users/role/student?${queryParams.toString()}`);
        const data = response.data;
        console.log('📊 API Response:', data);
        
        const users = data.data || data || [];
        console.log(`👥 Total users received from API (already filtered by backend): ${users.length}`);

        // Backend should filter by class, section, and academic year, but add defensive client-side filtering
        const filtered = users.filter((u: any) => {
          if (u.role !== 'student') return false;
          
          // Defensive check: verify class and section match (prioritizing academicInfo)
          const studentClass = u.academicInfo?.class ||
                              u.studentDetails?.academic?.currentClass ||
                              u.studentDetails?.currentClass || 
                              u.studentDetails?.class ||
                              u.class;
          const studentSection = u.academicInfo?.section ||
                                u.studentDetails?.academic?.currentSection ||
                                u.studentDetails?.currentSection || 
                                u.studentDetails?.section ||
                                u.section;
          
          const matchesClass = !selectedClass || String(studentClass).trim() === String(selectedClass).trim();
          const matchesSection = !selectedSection || String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
          
          return matchesClass && matchesSection;
        });

        console.log(`✅ Students for AY ${currentAcademicYear}: ${filtered.length}`);
        
        // Map to consistent format
        const mappedStudents = filtered.map((student: any) => ({
          _id: student._id,
          userId: student.userId,
          name: student.name,
          studentDetails: student.studentDetails,
          class: selectedClass,
          section: selectedSection
        }));

        setStudents(mappedStudents);
        
        // Don't initialize any attendance - let teacher mark each student
        setAttendance({});

        if (mappedStudents.length === 0) {
          console.log('ℹ️ No students found for this class and section');
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSection, token, user?.schoolCode, currentAcademicYear]);

  // Check session status when date, class, section or session changes
  useEffect(() => {
    if (selectedClass && selectedSection && selectedDate) {
      checkSessionStatus();
    }
  }, [selectedClass, selectedSection, selectedDate, selectedSession]);

  // Load existing attendance when students are loaded
  useEffect(() => {
    if (students.length > 0 && selectedDate) {
      loadExistingAttendance();
    }
  }, [students.length, selectedDate, selectedSession]);

  const checkSessionStatus = async () => {
    if (!selectedClass || !selectedSection || !selectedDate) {
      return;
    }

    try {
      const response = await attendanceAPI.checkSessionStatus({
        class: selectedClass,
        section: selectedSection,
        date: selectedDate,
        session: selectedSession
      });

      setSessionStatus({
        isMarked: response.isMarked || false,
        isFrozen: response.isFrozen || false,
        canModify: response.canModify !== false
      });

      if (response.isFrozen) {
        toast.error('This session attendance is frozen and cannot be modified');
      }
    } catch (err) {
      console.warn('Could not check session status:', err);
      setSessionStatus({ isMarked: false, isFrozen: false, canModify: true });
    }
  };

  const loadExistingAttendance = async () => {
    if (!selectedClass || !selectedSection || !selectedDate) {
      return;
    }

    try {
      const response = await attendanceAPI.getAttendance({
        class: selectedClass,
        section: selectedSection,
        date: selectedDate,
        session: selectedSession
      });

      if (response.success && response.data && response.data.length > 0) {
        const sessionDoc = response.data.find(
          (doc: any) => doc.session === selectedSession && doc.dateString === selectedDate
        );

        if (sessionDoc && sessionDoc.students) {
          const existingAttendance: Record<string, 'present' | 'absent'> = {};
          sessionDoc.students.forEach((record: any) => {
            const student = students.find(s => s.userId === record.studentId);
            if (student) {
              existingAttendance[student._id] = record.status;
            }
          });
          setAttendance(existingAttendance);
          console.log('✅ Loaded existing attendance:', existingAttendance);
        }
      }
    } catch (err) {
      console.warn('Could not load existing attendance:', err);
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent') => {
    if (sessionStatus.isFrozen) {
      toast.error('Attendance is frozen and cannot be modified');
      return;
    }
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAllPresent = () => {
    if (sessionStatus.isFrozen) {
      toast.error('Attendance is frozen and cannot be modified');
      return;
    }
    const newAttendance: Record<string, 'present' | 'absent'> = {};
    students.forEach(student => {
      newAttendance[student._id] = 'present';
    });
    setAttendance(newAttendance);
    toast.success('Marked all students as present');
  };

  const markAllAbsent = () => {
    if (sessionStatus.isFrozen) {
      toast.error('Attendance is frozen and cannot be modified');
      return;
    }
    const newAttendance: Record<string, 'present' | 'absent'> = {};
    students.forEach(student => {
      newAttendance[student._id] = 'absent';
    });
    setAttendance(newAttendance);
    toast.success('Marked all students as absent');
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedSection || students.length === 0) {
      toast.error('Please select class and section first');
      return;
    }

    if (sessionStatus.isFrozen) {
      toast.error('Attendance is frozen and cannot be modified');
      return;
    }

    setLoading(true);
    try {
      const attendanceRecords = students.map(student => ({
        studentId: student.userId,
        status: attendance[student._id] || 'present'
      }));

      const response = await attendanceAPI.markSessionAttendance({
        class: selectedClass,
        section: selectedSection,
        date: selectedDate,
        session: selectedSession,
        students: attendanceRecords
      });

      if (response.success) {
        toast.success('Attendance saved successfully!');
        // Refresh session status
        await checkSessionStatus();
      } else {
        toast.error(response.message || 'Failed to save attendance');
      }
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const records = Object.values(attendance);
    const present = records.filter(r => r === 'present').length;
    const absent = records.filter(r => r === 'absent').length;
    const total = students.length;
    
    return { present, absent, total };
  };

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
        
        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
          {sessionStatus.isFrozen && (
            <div className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
              <Lock className="h-4 w-4 mr-2" />
              Attendance Frozen
            </div>
          )}
          <button
            onClick={markAllPresent}
            disabled={students.length === 0 || loading || sessionStatus.isFrozen}
            className={`flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${sessionStatus.isFrozen ? 'opacity-50' : ''}`}
            title={sessionStatus.isFrozen ? 'Attendance is frozen and cannot be modified' : ''}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Present
          </button>
          <button
            onClick={markAllAbsent}
            disabled={students.length === 0 || loading || sessionStatus.isFrozen}
            className={`flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${sessionStatus.isFrozen ? 'opacity-50' : ''}`}
            title={sessionStatus.isFrozen ? 'Attendance is frozen and cannot be modified' : ''}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Mark All Absent
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={students.length === 0 || loading || sessionStatus.isFrozen}
            className={`flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${sessionStatus.isFrozen ? 'opacity-50' : ''}`}
            title={sessionStatus.isFrozen ? 'Attendance is frozen and cannot be modified' : ''}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Attendance
          </button>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <input
              type="text"
              value={currentAcademicYear || 'Loading...'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-semibold cursor-not-allowed"
              title="Current academic year (set by Admin)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setStudents([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Class</option>
              {classList.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Class First</option>
              {selectedClass && availableSections.map(section => (
                <option key={section.value} value={section.value}>{section.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSession('morning')}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border-2 transition-colors ${
                  selectedSession === 'morning'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
              >
                <Sun className="h-4 w-4 mr-1" />
                Morning
              </button>
              <button
                onClick={() => setSelectedSession('afternoon')}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border-2 transition-colors ${
                  selectedSession === 'afternoon'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
              >
                <Moon className="h-4 w-4 mr-1" />
                Afternoon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Get Started Instructions */}
      {students.length === 0 && (
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start">
            <UsersIcon className="h-6 w-6 text-blue-600 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Get Started</h3>
              <ol className="space-y-1 text-sm text-blue-800">
                <li>1. Select a date for attendance</li>
                <li>2. Choose a class from the dropdown</li>
                <li>3. Select a section to view students</li>
                <li>4. Choose morning or afternoon session</li>
                <li>5. Mark attendance for each student</li>
                <li>6. Save the attendance record</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Student List */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Student Attendance</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">Total: <strong>{stats.total}</strong></span>
                <span className="text-green-600">Present: <strong>{stats.present}</strong></span>
                <span className="text-red-600">Absent: <strong>{stats.absent}</strong></span>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {students.map((student, index) => (
              <div key={student._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-base font-semibold text-blue-700">
                        {(student.name?.firstName?.[0] || '') + (student.name?.lastName?.[0] || '')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {student.name?.firstName} {student.name?.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">User ID: {student.userId || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{student.class} - Section {student.section}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusChange(student._id, 'present')}
                      disabled={sessionStatus.isFrozen}
                      className={`flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        attendance[student._id] === 'present'
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : attendance[student._id] === 'absent'
                          ? 'bg-white text-gray-400 border-gray-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
                      } ${sessionStatus.isFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={sessionStatus.isFrozen ? 'Attendance is frozen and cannot be modified' : ''}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Present
                    </button>
                    
                    <button
                      onClick={() => handleStatusChange(student._id, 'absent')}
                      disabled={sessionStatus.isFrozen}
                      className={`flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        attendance[student._id] === 'absent'
                          ? 'bg-red-100 text-red-800 border-red-200' 
                          : attendance[student._id] === 'present'
                          ? 'bg-white text-gray-400 border-gray-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50'
                      } ${sessionStatus.isFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={sessionStatus.isFrozen ? 'Attendance is frozen and cannot be modified' : ''}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Absent
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkAttendance;