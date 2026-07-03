import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Eye, CheckCircle, ArrowRight, Loader, AlertTriangle, Bell, Check } from 'lucide-react';
import api from '../../../services/api';

interface Student {
  sequenceId: string;
  userId: string;
  name: { firstName: string; lastName: string };
  studentDetails: {
    currentClass: string;
    currentSection: string;
    academicYear: string;
    rollNo?: string;
  };
  email: string;
}

interface PromotionTabProps {
  fromYear: string;
  setFromYear: (year: string) => void;
  toYear: string;
  classes: any[];
  loading: boolean;
  currentAcademicYear: string;
}

const normalizeAcademicYear = (year: any): string | null => {
  if (!year) return null;
  const str = String(year).trim();
  if (/^\d{4}-\d{2}$/.test(str)) return str;
  const longMatch = str.match(/^(\d{4})-(\d{4})$/);
  if (longMatch) return `${longMatch[1]}-${longMatch[2].slice(-2)}`;
  return str;
};

const academicYearsMatch = (a: any, b: any): boolean => {
  const na = normalizeAcademicYear(a);
  const nb = normalizeAcademicYear(b);
  return na !== null && na === nb;
};

const PromotionTab: React.FC<PromotionTabProps> = ({
  fromYear,
  setFromYear,
  toYear,
  classes,
  loading,
  currentAcademicYear
}) => {
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [reqFromYear, setReqFromYear] = useState('');
  const [reqToYear, setReqToYear] = useState('');
  const [promotionDate, setPromotionDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [nextClassExists, setNextClassExists] = useState<boolean>(true);
  const [showGraduationOption, setShowGraduationOption] = useState<boolean>(false);
  const [graduateMode, setGraduateMode] = useState<boolean>(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  const isCurrentRequest = !!(activeRequest &&
    academicYearsMatch(activeRequest.fromYear, fromYear) &&
    academicYearsMatch(activeRequest.toYear, toYear));
  const hasActiveRequest = !!(activeRequest && isCurrentRequest);
  const isCompletedForCurrentTransition = !!(hasActiveRequest && activeRequest?.status === 'Completed');

  const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const selectedClassData = classes.find(c => c.className === selectedClass);

  // When "All Classes" is selected, section dropdown shows the union of every section across all classes
  const sectionOptions: string[] = selectedClass === 'ALL'
    ? Array.from(new Set(classes.flatMap((c: any) => c.sections || []))).sort()
    : (selectedClassData?.sections ? [...selectedClassData.sections].sort() : []);

  // Get auth data
  const getAuthData = () => {
    const authData = localStorage.getItem('erp.auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return {
        schoolCode: parsed.user?.schoolCode || parsed.schoolCode,
        token: parsed.token
      };
    }
    return { schoolCode: null, token: null };
  };

  // Fetch active request
  const fetchActiveRequest = useCallback(async () => {
    const { schoolCode } = getAuthData();
    if (!schoolCode) return;
    try {
      const resp = await api.get(`/admin/promotion/${schoolCode}/request/active`);
      if (resp.data.success) {
        const fresh = resp.data.data;
        // Only update state when something actually changed - the API returns a
        // brand-new object reference on every poll even when nothing changed,
        // which would otherwise force a re-render (and visible flicker) every
        // 10 seconds for no reason.
        setActiveRequest(prev => {
          if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
          return fresh;
        });
      }
    } catch (err) {
      console.error('Failed to load active promotion request:', err);
    } finally {
      setLoadingRequest(false);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const resp = await api.get('/admin/promotion/notifications');
      if (resp.data.success) {
        const fresh = resp.data.data;
        setNotifications(prev => {
          if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
          return fresh;
        });
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/admin/promotion/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  useEffect(() => {
    fetchActiveRequest();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchActiveRequest();
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchActiveRequest, fetchNotifications]);

  // Always sync request years from the parent-supplied dynamic props
  // fromYear = previous academic year (source), toYear = current academic year (destination)
  // These are computed from the Super Admin's active academic year and must never be manually editable
  useEffect(() => {
    if (fromYear) setReqFromYear(fromYear);
    if (toYear) setReqToYear(toYear);
  }, [fromYear, toYear]);

  // Resolve a student's actual current class/section, since different records
  // store this under different field paths (academicInfo.class, studentDetails.academic.currentClass,
  // studentDetails.currentClass, or class). Mirrors the fallback chain used in fetchStudents.
  const getStudentClass = (student: any): string => {
    return (
      student?.academicInfo?.class ||
      student?.studentDetails?.academic?.currentClass ||
      student?.studentDetails?.currentClass ||
      student?.studentDetails?.class ||
      student?.class ||
      ''
    ).toString().trim();
  };

  const getStudentSection = (student: any): string => {
    return (
      student?.academicInfo?.section ||
      student?.studentDetails?.academic?.currentSection ||
      student?.studentDetails?.currentSection ||
      student?.studentDetails?.section ||
      student?.section ||
      ''
    ).toString().trim();
  };

  const getStudentAcademicYear = (student: any): string => {
    return (
      student?.academicInfo?.academicYear ||
      student?.studentDetails?.academic?.academicYear ||
      student?.studentDetails?.academicYear ||
      student?.academicYear ||
      student?.currentAcademicYear ||
      ''
    ).toString().trim();
  };

  // Calculate promoted class
  const getPromotedClass = (currentClass: string): string => {
    if (!currentClass) return 'Unknown';
    const index = classOrder.indexOf(currentClass);
    if (index !== -1 && index < classOrder.length - 1) {
      return classOrder[index + 1];
    }
    return 'Graduated';
  };

  // Whether a given student's current class is the highest configured class (i.e. must graduate)
  // This mirrors the backend logic: graduate only if this is the final configured class
  // AND no higher class exists in the school's configured classes.
  const isStudentGraduating = React.useCallback((currentClass: string): boolean => {
    if (!currentClass) return false; // unknown class - don't wrongly mark as graduating
    if (!classes || classes.length === 0) return false; // no class data loaded yet - assume not graduating

    // Find the highest configured class in the school
    const configuredClassNames = classes.map(c => c.className);
    const highestClass = configuredClassNames.reduce((max, cls) => {
      const maxIndex = classOrder.indexOf(max);
      const clsIndex = classOrder.indexOf(cls);
      return clsIndex > maxIndex ? cls : max;
    }, configuredClassNames[0] || '');

    // Student graduates only if they are in the highest configured class
    if (currentClass !== highestClass) return false;

    // And there is no next class in the progression that exists in the school
    const nextClass = getPromotedClass(currentClass);
    if (nextClass !== 'Graduated' && configuredClassNames.includes(nextClass)) return false;

    return true;
  }, [classes]);

  // Validate if next class exists in school (works across every distinct class present in `students`,
  // so it still works correctly when "All Classes" is selected)
  const validateNextClassExists = React.useCallback(() => {
    if (!selectedClass || students.length === 0) {
      setValidationError(null);
      setNextClassExists(true);
      setShowGraduationOption(false);
      return;
    }

    const distinctClasses = Array.from(
      new Set(students.map(s => getStudentClass(s)).filter(Boolean))
    );

    const hasBoundaryClass = distinctClasses.some(cls => isStudentGraduating(cls));

    setValidationError(null);
    setNextClassExists(!hasBoundaryClass);
    setShowGraduationOption(hasBoundaryClass);
  }, [selectedClass, students, isStudentGraduating]);

  // Validate when class/students change
  useEffect(() => {
    if (selectedClass && students.length > 0) {
      validateNextClassExists();
    } else {
      setValidationError(null);
      setNextClassExists(true);
      setShowGraduationOption(false);
      setGraduateMode(false);
    }
  }, [selectedClass, students, validateNextClassExists]);

  useEffect(() => {
    if (showGraduationOption) {
      setGraduateMode(true);
    }
  }, [showGraduationOption]);

  // Fetch students
  const fetchStudents = React.useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    const { schoolCode } = getAuthData();
    if (!schoolCode) return;

    try {
      setFetchingStudents(true);
      const endpoint = `/school-users/${schoolCode}/users/role/student`;
      const response = await api.get(endpoint);
      if (response.data.success) {
        const allStudents = response.data.data || response.data.users || [];
        const classStudents = allStudents.filter((s: any) => {
          const studentClass = getStudentClass(s);
          const studentSection = getStudentSection(s);
          const studentYear = getStudentAcademicYear(s);

          const classMatch = selectedClass === 'ALL'
            ? true
            : String(studentClass).trim() === String(selectedClass).trim();
          const sectionMatch = selectedSection === 'ALL'
            ? true
            : String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
          const yearMatch = !studentYear || academicYearsMatch(studentYear, fromYear);
          return classMatch && sectionMatch && yearMatch;
        });
        setStudents(classStudents);
        setFilteredStudents(classStudents);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setFetchingStudents(false);
    }
  }, [selectedClass, selectedSection, fromYear]);

  // Handle select all / deselect all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allStudentIds = new Set(filteredStudents.map(s => s.userId || s.sequenceId));
      setSelectedStudents(allStudentIds);
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const allSelected = filteredStudents.length > 0 &&
    filteredStudents.every(s => selectedStudents.has(s.userId || s.sequenceId));

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = students.filter(student => {
      const fullName = `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.toLowerCase();
      return fullName.includes(query) || student.sequenceId?.toLowerCase().includes(query) || student.email?.toLowerCase().includes(query);
    });
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudents();
      setShowPreview(false);
      setSelectedStudents(new Set());
    } else {
      setStudents([]);
      setFilteredStudents([]);
      setShowPreview(false);
      setSelectedStudents(new Set());
    }
  }, [selectedClass, selectedSection, fromYear, fetchStudents]);

  // Handle Request Submission
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const { schoolCode } = getAuthData();
    if (!schoolCode) return;

    if (!reqFromYear || !reqToYear || !promotionDate || !effectiveDate) {
      alert('Please fill in all request fields.');
      return;
    }

    if (isCompletedForCurrentTransition) {
      alert(`Student promotion for Academic Year ${fromYear} to ${toYear} has already been completed. The Promotion Module will be available again after the Super Admin activates the next Academic Year.`);
      return;
    }

    if (!currentAcademicYear || currentAcademicYear !== reqToYear) {
      alert('The next Academic Year has not been created or activated by the Super Admin. Student promotion cannot proceed until the new Academic Year is set.');
      return;
    }

    try {
      setSubmittingRequest(true);
      const resp = await api.post(`/admin/promotion/${schoolCode}/request`, {
        fromYear: reqFromYear,
        toYear: reqToYear,
        promotionDate,
        effectiveDate
      });
      if (resp.data.success) {
        alert('Promotion request submitted successfully!');
        fetchActiveRequest();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Handle promotion execution
  // Groups selected students by their real (currentClass-currentSection) pair so that
  // "All Classes" / "All Sections" selections still submit correctly to the
  // single-class-section backend endpoint, one request per group.
  const handleConfirmPromotion = async () => {
    const { schoolCode } = getAuthData();
    if (!schoolCode) return;

    if (!fromYear || !toYear) {
      alert('Academic Year parameters are missing. Please wait for the page configurations to load.');
      return;
    }

    if (isCompletedForCurrentTransition) {
      alert(`Student promotion for Academic Year ${fromYear} to ${toYear} has already been completed. The Promotion Module will be available again after the Super Admin activates the next Academic Year.`);
      return;
    }

    if (!currentAcademicYear || currentAcademicYear !== toYear) {
      alert('The next Academic Year has not been created or activated by the Super Admin. Student promotion cannot proceed until the new Academic Year is set.');
      return;
    }

    if (selectedStudents.size === 0) {
      alert('Please select at least one student to promote.');
      return;
    }

    const selectedCount = selectedStudents.size;
    const notSelectedCount = filteredStudents.length - selectedCount;

    const groups = new Map<string, Student[]>();
    filteredStudents.forEach((s) => {
      const key = `${getStudentClass(s)}-${getStudentSection(s)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });

    const isMultiGroupMode = groups.size > 1;

    let confirmMessage = '';
    if (isMultiGroupMode) {
      confirmMessage = `Are you sure you want to promote ${selectedCount} student(s) across ${groups.size} class-section group(s)?`;
    } else if (graduateMode) {
      confirmMessage = `Are you sure you want to mark ${selectedCount} student(s) from Class ${selectedClass}-${selectedSection} as PASSED OUT?\n\nThey will be moved to Alumni and marked as inactive.`;
    } else {
      const nextClass = getPromotedClass(selectedClass);
      confirmMessage = `Are you sure you want to promote ${selectedCount} student(s) from Class ${selectedClass}-${selectedSection} to Class ${nextClass}-${selectedSection}?`;
    }
    if (notSelectedCount > 0) {
      confirmMessage += `\n\n${notSelectedCount} student(s) will remain in the same class.`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      setPromoting(true);

      for (const [key, groupStudents] of groups.entries()) {
        const [groupClass, groupSection] = key.split('-');

        if (!groupClass || !groupSection) {
          console.warn(`⚠️ Skipping group with invalid class/section: "${key}"`);
          continue;
        }

        const holdBackIds = groupStudents
          .filter(s => !selectedStudents.has(s.userId || s.sequenceId))
          .map(s => s.userId || s.sequenceId);

        // Skip groups where nobody was selected for promotion
        if (holdBackIds.length === groupStudents.length) continue;

        const response = await api.post(`/admin/promotion/${schoolCode}/section`, {
          fromYear,
          toYear,
          className: groupClass,
          section: groupSection,
          holdBackSequenceIds: holdBackIds,
          graduateStudents: false // Backend determines graduation dynamically from configured class hierarchy
        });

        if (!response.data.success) {
          alert(response.data.message || `Failed to execute promotion for Class ${groupClass}-${groupSection}`);
        }
      }

      alert('Promotion executed successfully!');
      setSelectedClass('');
      setSelectedSection('');
      setStudents([]);
      setFilteredStudents([]);
      setSelectedStudents(new Set());
      setShowPreview(false);
      setSearchQuery('');
      fetchActiveRequest();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to promote students');
    } finally {
      setPromoting(false);
    }
  };

  if (loadingRequest) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 font-medium">Checking Promotion Status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Center / Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div key={notif._id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <h5 className="font-semibold text-sm text-blue-900">{notif.title}</h5>
                  <p className="text-xs text-blue-700">{notif.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleMarkAsRead(notif._id)}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 p-1.5 rounded-full"
                title="Mark as Read"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Student Promotion System</h3>
        <p className="text-sm text-gray-600">Request and execute student academic year promotions</p>
      </div>

      {/* Completed / Locked State */}
      {isCompletedForCurrentTransition && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-start">
            <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-md font-semibold text-emerald-800 mb-2">Promotion Cycle Completed</h4>
              <p className="text-sm text-emerald-700 font-medium">
                Student promotion for Academic Year <strong>{fromYear}</strong> to <strong>{toYear}</strong> has already been completed. The Promotion Module will be available again after the Super Admin activates the next Academic Year.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-emerald-800 bg-emerald-100/50 p-4 rounded-lg">
                <p><strong>Completed On:</strong> {activeRequest.completedAt ? new Date(activeRequest.completedAt).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Students Processed:</strong> {activeRequest.totalStudents || 'N/A'}</p>
                <p><strong>Status:</strong> <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-xs font-semibold">Completed</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Request Submission Form */}
      {!isCompletedForCurrentTransition && (!hasActiveRequest || activeRequest?.status === 'Rejected') && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Request Student Promotion Approval</h4>
          {activeRequest?.status === 'Rejected' && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm">
              <strong>⚠️ Previous Request Rejected:</strong> {activeRequest.rejectionReason}
            </div>
          )}
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Academic Year (Students From)</label>
                <input
                  type="text"
                  value={reqFromYear}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Automatically derived from the institution's active Academic Year</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Academic Year (Promote To)</label>
                <input
                  type="text"
                  value={reqToYear}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Set by the Super Admin as the current active Academic Year</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Date</label>
                <input
                  type="date"
                  value={promotionDate}
                  onChange={(e) => setPromotionDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:bg-gray-400"
            >
              {submittingRequest ? 'Submitting...' : 'Submit Promotion Request'}
            </button>
          </form>
        </div>
      )}

      {/* Pending State */}
      {hasActiveRequest && activeRequest?.status === 'Pending Approval' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-md font-semibold text-yellow-800 mb-2">Promotion Request Pending Approval</h4>
              <p className="text-sm text-yellow-700 mb-4 font-medium">
                Your request to promote students from <strong>{activeRequest.fromYear}</strong> to <strong>{activeRequest.toYear}</strong> is currently pending Super Admin approval. Promotions are locked until approved.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-yellow-800 bg-yellow-100/50 p-4 rounded-lg">
                <p><strong>Promotion Date:</strong> {new Date(activeRequest.promotionDate).toLocaleDateString()}</p>
                <p><strong>Effective Date:</strong> {new Date(activeRequest.effectiveDate).toLocaleDateString()}</p>
                <p><strong>Students:</strong> {activeRequest.totalStudents}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approved State */}
      {hasActiveRequest && activeRequest?.status === 'Approved' && (
        <>
          {(!currentAcademicYear || currentAcademicYear !== toYear) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start mb-6">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-md font-semibold text-red-800 mb-2">Promotion Blocked</h4>
                <p className="text-sm text-red-700 font-medium">
                  The next Academic Year has not been created or activated by the Super Admin. Student promotion cannot proceed until the new Academic Year is set.
                </p>
              </div>
            </div>
          )}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-md font-semibold text-green-800 mb-2">Promotion Request Approved!</h4>
                <p className="text-sm text-green-700">
                  Super Admin approved promotions for Academic Year <strong>{activeRequest.fromYear} → {activeRequest.toYear}</strong>. You may execute promotions below.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Year Selector (Visual only) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Promote From:</label>
                <input
                  type="text"
                  value={fromYear}
                  disabled
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                />
              </div>
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Promote To:</label>
                <input
                  type="text"
                  value={toYear}
                  disabled
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Class and Section Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Select Class & Section</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSection('');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class...</option>
                  <option value="ALL">All Classes (LKG - 12)</option>
                  {classes.sort((a, b) => {
                    const aIndex = classOrder.indexOf(a.className);
                    const bIndex = classOrder.indexOf(b.className);
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return a.className.localeCompare(b.className);
                  }).map(cls => (
                    <option key={cls._id} value={cls.className}>
                      Class {cls.className}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a section...</option>
                  <option value="ALL">All Sections</option>
                  {sectionOptions.map((section: string) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Graduation Option Banner */}
            {showGraduationOption && (
              <div className="mb-4 bg-blue-50 border border-blue-300 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Final Year Class Detected</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      {selectedClass === 'ALL'
                        ? 'One or more classes in this selection have no next class configured.'
                        : `Class ${selectedClass} is the final year in your school. The next class (Class ${getPromotedClass(selectedClass)}) is not configured.`}
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="promotionMode"
                          checked={!graduateMode}
                          onChange={() => setGraduateMode(false)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          disabled
                        />
                        <span className="ml-2 text-sm text-gray-500">Promote to Next Class (Not Available)</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="promotionMode"
                          checked={graduateMode}
                          onChange={() => setGraduateMode(true)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm font-medium text-blue-900">Mark as Passed Out / Alumni</span>
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Students marked as "Passed Out" will be moved to Alumni and marked as inactive. In a multi-class selection, only students in a final-year class are affected — others promote normally.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            {selectedClass && selectedSection && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, sequence ID, or email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Students List */}
            {fetchingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading students...</span>
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    {filteredStudents.length} student(s) found
                    {selectedStudents.size > 0 && (
                      <span className="ml-2 text-blue-600 font-semibold">
                        ({selectedStudents.size} selected for promotion)
                      </span>
                    )}
                  </p>
                </div>

                {/* Students Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                              title="Select/Deselect All"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seq ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Class</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
                          {showPreview && (
                            <>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promoted To</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Year</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.map((student) => {
                          const studentId = student.userId || student.sequenceId;
                          const isSelected = selectedStudents.has(studentId);
                          const studentClass = getStudentClass(student);
                          const studentSection = getStudentSection(student);
                          const studentGraduating = isStudentGraduating(studentClass);
                          return (
                            <tr key={studentId} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleStudentSelect(studentId, e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{studentId}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {student.name?.firstName} {student.name?.lastName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {studentClass || '?'}-{studentSection || '?'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {student.studentDetails?.academicYear || fromYear}
                              </td>
                              {showPreview && (
                                <>
                                  <td className="px-4 py-3 text-sm font-medium">
                                    {isSelected ? (
                                      studentGraduating ? (
                                        <span className="text-purple-600 font-semibold">🎓 Passed Out</span>
                                      ) : (
                                        <span className="text-green-600">{getPromotedClass(studentClass)}-{studentSection || '?'}</span>
                                      )
                                    ) : (
                                      <span className="text-orange-600">{studentClass || '?'} (Held Back)</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium">
                                    {isSelected ? (
                                      studentGraduating ? (
                                        <span className="text-purple-600">Alumni</span>
                                      ) : (
                                        <span className="text-green-600">{toYear}</span>
                                      )
                                    ) : (
                                      <span className="text-orange-600">{toYear}</span>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                   {!showPreview ? (
                    <button
                      onClick={() => setShowPreview(true)}
                      disabled={selectedStudents.size === 0 || (!nextClassExists && !graduateMode) || currentAcademicYear !== toYear}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={currentAcademicYear !== toYear ? 'Academic year not active' : (!nextClassExists && !graduateMode ? 'Please select graduation mode' : '')}
                    >
                      <Eye className="h-5 w-5" />
                      {graduateMode ? 'Preview Pass Out' : 'Preview Promotion'} {selectedStudents.size > 0 && `(${selectedStudents.size})`}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Cancel Preview
                      </button>
                      <button
                        onClick={handleConfirmPromotion}
                        disabled={promoting || selectedStudents.size === 0 || currentAcademicYear !== toYear}
                        className={`flex-1 ${graduateMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
                      >
                        <CheckCircle className="h-5 w-5" />
                        {promoting ? (graduateMode ? 'Processing...' : 'Promoting...') : (graduateMode ? `Mark as Passed Out (${selectedStudents.size})` : `Confirm Promotion (${selectedStudents.size})`)}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : selectedClass && selectedSection ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No students found for Class {selectedClass}-{selectedSection}</p>
                <p className="text-sm">in academic year {fromYear}</p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default PromotionTab;