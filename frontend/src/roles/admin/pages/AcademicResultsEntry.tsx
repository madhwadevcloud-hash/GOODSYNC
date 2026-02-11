import React, { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Save, Check, X } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { testDetailsAPI } from '../../../api/testDetails';
import { toast } from 'react-hot-toast';

interface StudentResult {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  totalMarks: number | null;
  obtainedMarks: number | null;
  grade: string | null;
}

const AcademicResultsEntry: React.FC = () => {
  const { user, token } = useAuth();
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTestType, setSelectedTestType] = useState('');
  const [showResultsTable, setShowResultsTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [editingAll, setEditingAll] = useState(false);
  const [savedRows, setSavedRows] = useState<{ [key: string]: boolean }>({});

  // Dynamic state for test types
  const [testTypes, setTestTypes] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loadingTestTypes, setLoadingTestTypes] = useState(false);

  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const grades = ['A+', 'A', 'B', 'C', 'D', 'F'];

  // Function to fetch test types for the selected class
  const fetchTestTypes = useCallback(async (className: string) => {
    if (!className) {
      setTestTypes([]);
      return;
    }

    setLoadingTestTypes(true);
    try {
      // Get the school code from localStorage or auth context
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      
      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      console.log('Fetching test types for school code:', schoolCode, 'class:', className);
      
      const response = await testDetailsAPI.getTestDetailsBySchoolCode();
      
      if (response.success && response.data?.classTestTypes) {
        const classTestTypes = response.data.classTestTypes;
        
        // Get test types for the selected class
        const classData = classTestTypes[className];
        if (classData && Array.isArray(classData)) {
          const testTypeNames = classData.map((test: any) => test.name).filter(Boolean);
          setTestTypes(testTypeNames);
          console.log('Test types loaded for class', className, ':', testTypeNames);
        } else {
          setTestTypes([]);
          console.log('No test types found for class:', className);
        }
        
        // Also update available classes
        const classNames = Object.keys(classTestTypes);
        setAvailableClasses(classNames);
      } else {
        setTestTypes([]);
        console.log('No test data found for school');
      }
    } catch (error) {
      console.error('Error fetching test types:', error);
      toast.error('Failed to load test types');
      setTestTypes([]);
    } finally {
      setLoadingTestTypes(false);
    }
  }, [user?.schoolCode]);

  // Fetch test types when selected class changes
  useEffect(() => {
    if (selectedClass) {
      fetchTestTypes(selectedClass);
      setSelectedTestType(''); // Reset test type when class changes
    } else {
      setTestTypes([]);
    }
  }, [selectedClass, fetchTestTypes]);

  // Mock function to fetch students - replace with actual API call
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // This is a mock - replace with actual API call to fetch students
      // based on selectedClass and selectedSection
      
      const mockStudents: StudentResult[] = [
        {
          id: '1',
          name: 'John Doe',
          rollNumber: '001',
          class: selectedClass,
          section: selectedSection,
          totalMarks: null,
          obtainedMarks: null,
          grade: null
        },
        {
          id: '2',
          name: 'Jane Smith',
          rollNumber: '002',
          class: selectedClass,
          section: selectedSection,
          totalMarks: null,
          obtainedMarks: null,
          grade: null
        }
      ];
      
      setStudentResults(mockStudents);
      setShowResultsTable(true);
      
      // Initialize saved states
      const initialSavedState: { [key: string]: boolean } = {};
      mockStudents.forEach(student => {
        initialSavedState[student.id] = false;
      });
      setSavedRows(initialSavedState);
      
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection]);

  const handleSearch = () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    if (!selectedSection) {
      toast.error('Please select a section');
      return;
    }
    if (!selectedTestType) {
      toast.error('Please select a test type');
      return;
    }
    
    fetchStudents();
  };

  const handleEditAll = () => {
    setEditingAll(true);
    // Reset all saved states when starting edit all
    const resetSavedState: { [key: string]: boolean } = {};
    studentResults.forEach(student => {
      resetSavedState[student.id] = false;
    });
    setSavedRows(resetSavedState);
  };

  const handleSaveAll = async () => {
    try {
      // Here you would call your API to save all results
      console.log('Saving all results:', studentResults);
      
      // Mock save - replace with actual API call
      toast.success('All results saved successfully');
      
      // Mark all rows as saved
      const allSavedState: { [key: string]: boolean } = {};
      studentResults.forEach(student => {
        allSavedState[student.id] = true;
      });
      setSavedRows(allSavedState);
      setEditingAll(false);
      
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Failed to save results');
    }
  };

  const updateStudentResult = (studentId: string, field: keyof StudentResult, value: any) => {
    setStudentResults(prev => 
      prev.map(student => 
        student.id === studentId 
          ? { ...student, [field]: value }
          : student
      )
    );
    
    // Mark this row as unsaved
    setSavedRows(prev => ({ ...prev, [studentId]: false }));
  };

  const calculateGrade = (obtained: number | null, total: number | null): string => {
    if (!obtained || !total || total === 0) return 'N/A';
    
    const percentage = (obtained / total) * 100;
    
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  // Auto-calculate grade when marks change
  useEffect(() => {
    setStudentResults(prev => 
      prev.map(student => ({
        ...student,
        grade: calculateGrade(student.obtainedMarks, student.totalMarks)
      }))
    );
  }, [studentResults.map(s => `${s.obtainedMarks}-${s.totalMarks}`).join(',')]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Results Entry</h1>
        {showResultsTable && (
          <div className="flex space-x-3">
            {!editingAll ? (
              <button
                onClick={handleEditAll}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit All
              </button>
            ) : (
              <button
                onClick={handleSaveAll}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Class Selection */}
          <div className="flex flex-col">
            <label htmlFor="class-select" className="text-sm font-medium text-gray-700">Class</label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
            >
              <option value="">Select Class</option>
              {availableClasses.length > 0 ? (
                availableClasses.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))
              ) : (
                <>
                  <option value="LKG">LKG</option>
                  <option value="UKG">UKG</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </>
              )}
            </select>
          </div>

          {/* Section Selection */}
          <div className="flex flex-col">
            <label htmlFor="section-select" className="text-sm font-medium text-gray-700">Section</label>
            <select
              id="section-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>

          {/* Test Type Selection */}
          <div className="flex flex-col">
            <label htmlFor="test-type-select" className="text-sm font-medium text-gray-700">Test Type</label>
            <select
              id="test-type-select"
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
              disabled={!selectedClass || loadingTestTypes}
            >
              <option value="">
                {!selectedClass 
                  ? 'Select Class First' 
                  : loadingTestTypes 
                    ? 'Loading...' 
                    : 'Select Test'}
              </option>
              {testTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {!selectedClass && (
              <span className="text-xs text-gray-500 mt-1">Select a class to see available tests</span>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors self-end"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results Table */}
      {showResultsTable && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obtained Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentResults.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.rollNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingAll ? (
                        <input
                          type="number"
                          value={student.totalMarks || ''}
                          onChange={(e) => updateStudentResult(student.id, 'totalMarks', parseInt(e.target.value) || null)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Total"
                        />
                      ) : (
                        student.totalMarks || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingAll ? (
                        <input
                          type="number"
                          value={student.obtainedMarks || ''}
                          onChange={(e) => updateStudentResult(student.id, 'obtainedMarks', parseInt(e.target.value) || null)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Obtained"
                        />
                      ) : (
                        student.obtainedMarks || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        student.grade === 'A+' ? 'bg-green-100 text-green-800' :
                        student.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                        student.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        student.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                        student.grade === 'D' ? 'bg-red-100 text-red-800' :
                        student.grade === 'F' ? 'bg-red-200 text-red-900' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {student.grade || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {savedRows[student.id] ? (
                        <span className="inline-flex items-center text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          Saved
                        </span>
                      ) : editingAll ? (
                        <span className="inline-flex items-center text-orange-600">
                          <X className="h-4 w-4 mr-1" />
                          Unsaved
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicResultsEntry;
