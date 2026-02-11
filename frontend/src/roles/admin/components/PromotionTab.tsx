import React, { useState, useEffect } from 'react';
import { Users, Search, Eye, CheckCircle, ArrowRight, Loader, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';

interface Student {
  sequenceId: string;
  userId: string;
  name: { firstName: string; lastName: string };
  studentDetails: {
    currentClass: string;
    currentSection: string;
    academicYear: string;
  };
  email: string;
}

interface PromotionTabProps {
  fromYear: string;
  setFromYear: (year: string) => void;
  toYear: string;
  classes: any[];
  loading: boolean;
}

const PromotionTab: React.FC<PromotionTabProps> = ({
  fromYear,
  setFromYear,
  toYear,
  classes,
  loading
}) => {
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

  const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const selectedClassData = classes.find(c => c.className === selectedClass);

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

  // Calculate promoted class
  const getPromotedClass = (currentClass: string): string => {
    const index = classOrder.indexOf(currentClass);
    if (index !== -1 && index < classOrder.length - 1) {
      return classOrder[index + 1];
    }
    return 'Graduated';
  };

  // 🔥 CRITICAL FIX: Validate if next class exists in school
  const validateNextClassExists = React.useCallback(async (currentClass: string): Promise<boolean> => {
    const nextClass = getPromotedClass(currentClass);
    
    // If graduated, show graduation option
    if (nextClass === 'Graduated') {
      setValidationError(null);
      setNextClassExists(false);
      setShowGraduationOption(true);
      return false;
    }

    // Check if next class exists in school configuration
    const classExists = classes.some(c => c.className === nextClass);
    
    if (!classExists) {
      // Next class doesn't exist - offer graduation option
      setValidationError(null);
      setNextClassExists(false);
      setShowGraduationOption(true);
      return false;
    }

    setValidationError(null);
    setNextClassExists(true);
    setShowGraduationOption(false);
    return true;
  }, [classes]);

  // Validate when class changes
  useEffect(() => {
    if (selectedClass && students.length > 0) {
      validateNextClassExists(selectedClass);
    } else {
      setValidationError(null);
      setNextClassExists(true);
      setShowGraduationOption(false);
      setGraduateMode(false);
    }
  }, [selectedClass, students, validateNextClassExists]);

  // Auto-select graduation mode when graduation option appears
  useEffect(() => {
    if (showGraduationOption) {
      setGraduateMode(true);
    }
  }, [showGraduationOption]);

  // Fetch students when class and section are selected
  const fetchStudents = React.useCallback(async () => {
    if (!selectedClass || !selectedSection) {
      console.log('⚠️ Cannot fetch students: selectedClass or selectedSection is empty');
      return;
    }

    const { schoolCode } = getAuthData();
    if (!schoolCode) {
      console.log('⚠️ Cannot fetch students: schoolCode is empty');
      return;
    }

    console.log('🔍 Fetching students for:', { selectedClass, selectedSection, fromYear, schoolCode });

    try {
      setFetchingStudents(true);
      const endpoint = `/school-users/${schoolCode}/users/role/student`;
      console.log('📡 API Endpoint:', endpoint);
      
      const response = await api.get(endpoint);
      console.log('📥 API Response:', response.data);
      
      if (response.data.success) {
        const allStudents = response.data.data || response.data.users || [];
        console.log(`📊 Total students fetched: ${allStudents.length}`);
        
        // Log first student structure for debugging
        if (allStudents.length > 0) {
          console.log('📋 Sample student structure:', allStudents[0]);
        }
        
        const classStudents = allStudents.filter((s: any) => {
          // Check all possible locations for class, section, and academic year, prioritizing academicInfo
          const studentClass = s.academicInfo?.class ||
                              s.studentDetails?.academic?.currentClass ||
                              s.studentDetails?.currentClass || 
                              s.studentDetails?.class ||
                              s.class;
          const studentSection = s.academicInfo?.section ||
                                s.studentDetails?.academic?.currentSection ||
                                s.studentDetails?.currentSection || 
                                s.studentDetails?.section ||
                                s.section;
          const studentYear = s.studentDetails?.academicYear || 
                             s.studentDetails?.academic?.academicYear ||
                             s.academicYear ||
                             s.academicInfo?.academicYear;
          
          const classMatch = String(studentClass).trim() === String(selectedClass).trim();
          const sectionMatch = String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
          const yearMatch = !studentYear || String(studentYear).trim() === String(fromYear).trim();
          
          const match = classMatch && sectionMatch && yearMatch;
          
          if (match) {
            console.log('✅ Matched student:', s.userId || s.sequenceId, s.name, { class: studentClass, section: studentSection, year: studentYear });
          }
          return match;
        });
        
        console.log(`✅ Filtered students for Class ${selectedClass}-${selectedSection} (Year: ${fromYear}): ${classStudents.length}`);
        setStudents(classStudents);
        setFilteredStudents(classStudents);
      } else {
        console.log('❌ API response not successful:', response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
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

  // Handle individual student selection
  const handleStudentSelect = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // Check if all filtered students are selected
  const allSelected = filteredStudents.length > 0 && 
    filteredStudents.every(s => selectedStudents.has(s.userId || s.sequenceId));

  // Filter students based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(student => {
      const fullName = `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.toLowerCase();
      const sequenceId = student.sequenceId?.toLowerCase() || '';
      const email = student.email?.toLowerCase() || '';
      
      return fullName.includes(query) || sequenceId.includes(query) || email.includes(query);
    });
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  // Fetch students when class or section changes
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

  // Handle promotion confirmation
  const handleConfirmPromotion = async () => {
    const { schoolCode } = getAuthData();
    if (!schoolCode) return;

    if (selectedStudents.size === 0) {
      alert('Please select at least one student to promote.');
      return;
    }

    const selectedCount = selectedStudents.size;
    const notSelectedCount = filteredStudents.length - selectedCount;
    
    let confirmMessage = '';
    if (graduateMode) {
      confirmMessage = `Are you sure you want to mark ${selectedCount} student(s) from Class ${selectedClass}-${selectedSection} as PASSED OUT?\n\nThey will be moved to Alumni and marked as inactive.`;
      if (notSelectedCount > 0) {
        confirmMessage += `\n\n${notSelectedCount} student(s) will remain in the same class.`;
      }
    } else {
      const nextClass = getPromotedClass(selectedClass);
      confirmMessage = `Are you sure you want to promote ${selectedCount} student(s) from Class ${selectedClass}-${selectedSection} to Class ${nextClass}?`;
      if (notSelectedCount > 0) {
        confirmMessage += `\n\n${notSelectedCount} student(s) will remain in the same class.`;
      }
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setPromoting(true);
      
      // Students who are NOT selected will be held back
      const holdBackIds = filteredStudents
        .filter(s => !selectedStudents.has(s.userId || s.sequenceId))
        .map(s => s.userId || s.sequenceId);
      
      const response = await api.post(`/admin/promotion/${schoolCode}/section`, {
        fromYear,
        toYear,
        className: selectedClass,
        section: selectedSection,
        holdBackSequenceIds: holdBackIds,
        graduateStudents: graduateMode
      });

      if (response.data.success) {
        let successMessage = `Successfully promoted ${selectedCount} student(s)!${notSelectedCount > 0 ? ` ${notSelectedCount} student(s) held back.` : ''}`;
        
        // Show warning if any students were skipped
        if (response.data.data?.warning) {
          successMessage += `\n\n⚠️ ${response.data.data.warning}`;
        }
        
        alert(successMessage);
        setSelectedClass('');
        setSelectedSection('');
        setStudents([]);
        setFilteredStudents([]);
        setSelectedStudents(new Set());
        setShowPreview(false);
        setSearchQuery('');
        setValidationError(null);
      } else {
        alert(response.data.message || 'Failed to promote students');
      }
    } catch (error: any) {
      console.error('Error promoting students:', error);
      const errorMsg = error.response?.data?.message || 'Failed to promote students';
      const errorDetails = error.response?.data?.details;
      
      if (errorDetails?.suggestion) {
        alert(`${errorMsg}\n\n${errorDetails.suggestion}`);
      } else {
        alert(errorMsg);
      }
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Student Promotion System</h3>
        <p className="text-sm text-gray-600">Promote students to the next academic year</p>
      </div>

      {/* Academic Year Selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">Promote From:</label>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="2023-24">2023-24</option>
              <option value="2024-25">2024-25</option>
              <option value="2025-26">2025-26</option>
            </select>
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
              {selectedClassData?.sections.sort().map((section: string) => (
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
                  Class {selectedClass} is the final year in your school. The next class (Class {getPromotedClass(selectedClass)}) is not configured.
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
                  💡 Students marked as "Passed Out" will be moved to Alumni and marked as inactive.
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
                          {student.studentDetails?.currentClass}-{student.studentDetails?.currentSection}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {student.studentDetails?.academicYear || fromYear}
                        </td>
                          {showPreview && (
                            <>
                              <td className="px-4 py-3 text-sm font-medium">
                                {isSelected ? (
                                  graduateMode ? (
                                    <span className="text-purple-600 font-semibold">🎓 Passed Out</span>
                                  ) : (
                                    <span className="text-green-600">{getPromotedClass(student.studentDetails?.currentClass)}</span>
                                  )
                                ) : (
                                  <span className="text-orange-600">{student.studentDetails?.currentClass} (Held Back)</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {isSelected ? (
                                  graduateMode ? (
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
                  disabled={selectedStudents.size === 0 || (!nextClassExists && !graduateMode)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title={!nextClassExists && !graduateMode ? 'Please select graduation mode' : ''}
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
                    disabled={promoting || selectedStudents.size === 0}
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
    </div>
  );
};

export default PromotionTab;
