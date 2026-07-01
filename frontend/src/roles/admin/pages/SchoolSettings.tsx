import React, { useState, useEffect } from 'react';
import { Save, Calendar, GraduationCap, Clock, Users, Award, BookOpen, ChevronDown, ChevronRight, FileText, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import { useAuth } from '../../../auth/AuthContext';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { normalizeAcademicYear, getDynamicFallbackYear } from '../../../utils/academicYearUtils';
import PromotionTab from '../components/PromotionTab';
import UniversalTemplate from '../components/UniversalTemplate';

interface TestData {
  _id: string;
  testName: string;
  testType?: string;
  className: string;
  description?: string;
  isActive: boolean;
  maxMarks?: number;
  weightage?: number;
  displayName?: string;
}

interface ClassData {
  _id: string;
  className: string;
  sections: string[];
  academicYear: string;
  createdAt: string;
  studentCount?: number;
  sectionCounts?: Record<string, number>;
}

const SchoolSettings: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentAcademicYear: academicYearFromContext, 
    viewingAcademicYear, 
    academicYearStart: startFromContext,
    academicYearEnd: endFromContext,
    ready: academicYearReady,
    refreshAcademicYear 
  } = useAcademicYear();

  // Local state for form inputs
  const [activeTab, setActiveTab] = useState('academic');
  const [tests, setTests] = useState<TestData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [testScoring, setTestScoring] = useState<Record<string, { maxMarks: number; weightage: number }>>({});
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  interface GradeScaleRule {
    grade: string;
    minPercentage: number;
    maxPercentage: number;
  }

  const DEFAULT_GRADING_SYSTEM: GradeScaleRule[] = [
    { grade: 'A1', minPercentage: 91, maxPercentage: 100 },
    { grade: 'A2', minPercentage: 81, maxPercentage: 90 },
    { grade: 'B1', minPercentage: 71, maxPercentage: 80 },
    { grade: 'B2', minPercentage: 61, maxPercentage: 70 },
    { grade: 'C1', minPercentage: 51, maxPercentage: 60 },
    { grade: 'C2', minPercentage: 41, maxPercentage: 50 },
    { grade: 'D', minPercentage: 33, maxPercentage: 40 },
    { grade: 'E1', minPercentage: 21, maxPercentage: 32 },
    { grade: 'E2', minPercentage: 0, maxPercentage: 20 }
  ];

  const [gradingSystem, setGradingSystem] = useState<GradeScaleRule[]>(DEFAULT_GRADING_SYSTEM);

  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [academicYearStart, setAcademicYearStart] = useState('');
  const [academicYearEnd, setAcademicYearEnd] = useState('');
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [isAcademicYearSaved, setIsAcademicYearSaved] = useState(false);
  const [savedAcademicYear, setSavedAcademicYear] = useState('');

  // Sync local state from AcademicYearContext
  useEffect(() => {
    if (academicYearReady) {
      const year = viewingAcademicYear || academicYearFromContext || getDynamicFallbackYear();
      setCurrentAcademicYear(year);
      setFromYear(year);
      setSavedAcademicYear(year);
      setIsAcademicYearSaved(!!academicYearFromContext);
      
      // Use dates from context, otherwise fallback to dynamic
      const startYearNum = parseInt(year.split('-')[0]);
      setAcademicYearStart(startFromContext || `${startYearNum}-04-01`);
      setAcademicYearEnd(endFromContext || `${startYearNum + 1}-03-31`);
    }
  }, [academicYearReady, viewingAcademicYear, academicYearFromContext, startFromContext, endFromContext]);

  // Reset saved state when academic year is modified
  useEffect(() => {
    if (savedAcademicYear && currentAcademicYear !== savedAcademicYear) {
      setIsAcademicYearSaved(false);
    }
  }, [currentAcademicYear, savedAcademicYear]);

  // Get school code and token from localStorage
  const getAuthData = () => {
    const authData = localStorage.getItem('erp.auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      const schoolCode = user?.schoolCode || 'R';
      const token = parsed.token;
      console.log('🔍 Admin Auth Data:', parsed);
      console.log('🔍 Extracted School Code:', schoolCode);
      console.log('🔍 Token exists:', !!token);
      return { schoolCode, token };
    }
    console.error('❌ No auth data found in localStorage');
    return { schoolCode: null, token: null };
  };

  // Fetch tests from Admin API
  const fetchTests = async () => {
    const { schoolCode, token } = getAuthData();
    if (!schoolCode || !token) {
      console.error('❌ Cannot fetch tests: School code or token not found');
      toast.error('Authentication error. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const yearToFetch = viewingAcademicYear || academicYearFromContext || currentAcademicYear || getDynamicFallbackYear();
      const endpoint = `/admin/classes/${schoolCode}/tests?academicYear=${yearToFetch}`;
      console.log('📡 Fetching tests from endpoint:', endpoint);
      console.log('📡 Using school code:', schoolCode, 'year:', yearToFetch);

      const response = await api.get(endpoint);

      console.log('📥 Tests API Response:', response.data);

      if (response.data.success) {
        const tests = response.data.data?.tests || response.data.tests || [];

        // Log the first test to see its structure
        if (tests.length > 0) {
          console.log('📋 First test structure:', tests[0]);
          console.log('📋 Test fields:', Object.keys(tests[0]));
        }

        setTests(tests);
        const backendGradingSystem = response.data.data?.gradingSystem;
        if (backendGradingSystem && Array.isArray(backendGradingSystem) && backendGradingSystem.length > 0) {
          setGradingSystem(backendGradingSystem);
        } else {
          setGradingSystem(DEFAULT_GRADING_SYSTEM);
        }
        console.log('✅ Fetched tests:', tests);
        toast.success(`Loaded ${tests.length} tests`);
      } else {
        console.error('❌ API returned success: false', response.data);
        toast.error(response.data.message || 'Failed to fetch tests');
      }
    } catch (error: any) {
      console.error('❌ Error fetching tests:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes from Admin API
  const fetchClasses = async () => {
    const { schoolCode, token } = getAuthData();
    if (!schoolCode || !token) {
      console.error('❌ Cannot fetch classes: School code or token not found');
      toast.error('Authentication error. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const yearToFetch = viewingAcademicYear || academicYearFromContext || currentAcademicYear || getDynamicFallbackYear();
      const endpoint = `/admin/classes/${schoolCode}/classes-sections?academicYear=${yearToFetch}`;
      console.log('📡 Fetching classes from endpoint:', endpoint);
      console.log('📡 Using school code:', schoolCode, 'year:', yearToFetch);

      const response = await api.get(endpoint);

      console.log('📥 Classes API Response:', response.data);

      if (response.data.success) {
        const classes = response.data.data?.classes || response.data.classes || [];

        // Fetch all students once (more efficient than per-class)
        let allStudents: any[] = [];
        try {
          const studentsEndpoint = `/school-users/${schoolCode}/users/role/student`;
          const studentsResponse = await api.get(studentsEndpoint);

          if (studentsResponse.data.success) {
            allStudents = studentsResponse.data.data || studentsResponse.data.users || [];
            console.log(`📊 Fetched ${allStudents.length} total students`);
          }
        } catch (error) {
          console.error('Error fetching students:', error);
        }

        // Count students for each class and section
        const classesWithCounts = classes.map((cls: ClassData) => {
          const targetYear = cls.academicYear || currentAcademicYear;

          const classStudents = allStudents.filter((s: any) => {
            const studentClass =
              s.academicInfo?.class ||
              s.studentDetails?.academic?.currentClass ||
              s.studentDetails?.currentClass ||
              s.studentDetails?.class ||
              s.class ||
              s.className;

            const studentSection =
              s.academicInfo?.section ||
              s.studentDetails?.academic?.currentSection ||
              s.studentDetails?.currentSection ||
              s.studentDetails?.section ||
              s.section;

            const studentYear =
              s.studentDetails?.academicYear ||
              s.studentDetails?.academic?.academicYear ||
              s.academicYear ||
              s.academicInfo?.academicYear;
            
            const normalizedStudentYear = normalizeAcademicYear(String(studentYear || '').trim());
            const normalizedTargetYear = normalizeAcademicYear(String(targetYear || '').trim());
            
            const classMatch = String(studentClass || '').trim() === String(cls.className).trim();
            const yearMatch =
              !normalizedTargetYear ||
              !normalizedStudentYear ||
              normalizedStudentYear === normalizedTargetYear;

            // Extra debug for Class 1 students
            if (cls.className === "1" && classMatch && yearMatch) {
                // console.log(`Matched student for Class 1: ${s.userId || s._id} - Section: ${studentSection}`);
            }

            return classMatch && yearMatch; // Removed !!studentSection to be more inclusive
          });

          // Count students per section
          const sectionCounts: Record<string, number> = {};
          cls.sections.forEach(section => {
            sectionCounts[section] = classStudents.filter((s: any) => {
              const studentSection =
                s.academicInfo?.section ||
                s.studentDetails?.academic?.currentSection ||
                s.studentDetails?.currentSection ||
                s.studentDetails?.section ||
                s.section;

              return (
                String(studentSection || '')
                  .trim()
                  .toUpperCase() === String(section).trim().toUpperCase()
              );
            }).length;
          });

          // Total students in class (sum of all sections)
          const totalStudentCount = Object.values(sectionCounts).reduce((sum, count) => sum + count, 0);

          return {
            ...cls,
            studentCount: totalStudentCount,
            sectionCounts
          };
        });

        // Sort classes in order: LKG, UKG, then 1-12
        const sortedClasses = classesWithCounts.sort((a: ClassData, b: ClassData) => {
          const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

          const aIndex = classOrder.indexOf(a.className);
          const bIndex = classOrder.indexOf(b.className);

          // If both are in the predefined order, sort by index
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // If only a is in the order, it comes first
          if (aIndex !== -1) return -1;
          // If only b is in the order, it comes first
          if (bIndex !== -1) return 1;
          // If neither is in the order, sort alphabetically
          return a.className.localeCompare(b.className);
        });

        // Sort sections within each class
        sortedClasses.forEach((cls: ClassData) => {
          if (cls.sections && cls.sections.length > 0) {
            cls.sections.sort((a, b) => a.localeCompare(b));
          }
        });

        setClasses(sortedClasses);
        console.log('✅ Fetched classes with student counts (sorted):', sortedClasses);
        toast.success(`Loaded ${classes.length} classes`);
      } else {
        console.error('❌ API returned success: false', response.data);
        toast.error(response.data.message || 'Failed to fetch classes');
      }
    } catch (error: any) {
      console.error('❌ Error fetching classes:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  // Toggle test expansion
  const toggleTestExpansion = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  // Toggle class expansion
  const toggleClassExpansion = (className: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(className)) {
        newSet.delete(className);
      } else {
        newSet.add(className);
      }
      return newSet;
    });
  };

  // Handle test scoring changes
  const handleScoringChange = (testId: string, field: 'maxMarks' | 'weightage', value: number) => {
    setTestScoring(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value
      }
    }));
  };

  // Save scoring configuration
  const handleSaveScoring = async () => {
    const { schoolCode, token } = getAuthData();
    if (!schoolCode || !token) {
      toast.error('Authentication error. Please login again.');
      return;
    }

    // Validate total weight percent is exactly 100% for each class that has configurations
    const testsByClass: Record<string, TestData[]> = {};
    tests.forEach(test => {
      if (!testsByClass[test.className]) {
        testsByClass[test.className] = [];
      }
      testsByClass[test.className].push(test);
    });

    const configuredClasses: string[] = [];
    const unconfiguredClasses: string[] = [];

    for (const className in testsByClass) {
      const classTests = testsByClass[className];
      
      let totalWeight = 0;
      for (const test of classTests) {
        const currentScoring = testScoring[test._id];
        const testWeight = currentScoring && currentScoring.weightage !== undefined
          ? currentScoring.weightage
          : (test.weightage || 0);
        totalWeight += Number(testWeight);
      }

      if (totalWeight === 100) {
        configuredClasses.push(className);
      } else {
        unconfiguredClasses.push(className);
      }
    }

    // Get tests scoring data only for configured classes (where total weight is exactly 100%)
    const configuredTests = tests.filter(test => 
      configuredClasses.includes(test.className)
    );

    // Validate that at least one class is fully configured (weightage sum = 100%) before saving
    if (configuredTests.length === 0) {
      toast.error('Please configure at least one class (total weight must equal exactly 100%) before saving.');
      return;
    }

    // Validate grading scale has no overlaps and values are valid
    const sortedScales = [...gradingSystem].sort((a, b) => a.minPercentage - b.minPercentage);
    for (let i = 0; i < sortedScales.length; i++) {
      const scale = sortedScales[i];
      if (scale.minPercentage > scale.maxPercentage) {
        toast.error(`Invalid range for grade ${scale.grade}: Min percentage cannot be greater than Max percentage.`);
        return;
      }
      if (i > 0) {
        const prevScale = sortedScales[i - 1];
        if (scale.minPercentage <= prevScale.maxPercentage) {
          toast.error(`Overlapping ranges detected between grade ${prevScale.grade} and ${scale.grade}.`);
          return;
        }
      }
    }

    try {
      console.log('Saving scoring configuration:', testScoring);
      console.log('Saving grading scale:', gradingSystem);

      // Prepare data for API - send both newly edited and unchanged existing configurations
      const scoringData = configuredTests.map(test => {
        const currentScoring = testScoring[test._id];
        const maxMarks = currentScoring && currentScoring.maxMarks !== undefined
          ? currentScoring.maxMarks
          : (test.maxMarks || 0);
        const weightage = currentScoring && currentScoring.weightage !== undefined
          ? currentScoring.weightage
          : (test.weightage || 0);
        return {
          testId: test._id,
          testName: test.testName || (test as any).name || 'Unnamed Test',
          className: test.className,
          maxMarks,
          weightage
        };
      });

      const endpoint = `/admin/classes/${schoolCode}/test-scoring`;
      const response = await api.post(endpoint, { 
        scoring: scoringData,
        gradingSystem: gradingSystem,
        academicYear: viewingAcademicYear || currentAcademicYear
      });

      if (response.data.success) {
        let message = 'All configurations saved successfully!';
        if (configuredClasses.length > 0 && unconfiguredClasses.length > 0) {
          const classListStr = configuredClasses.map(c => `${c}`).join(', ');
          if (configuredClasses.length === 1) {
            message = `Only class ${classListStr} percent is configured, rest all class are needed to be configured.`;
          } else {
            message = `Only classes ${classListStr} percent are configured, rest all classes need to be configured.`;
          }
        }
        toast.success(message);
        console.log('✅ Saved configurations:', response.data);
        // Refresh tests to get updated data
        await fetchTests();
      } else {
        toast.error(response.data.message || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('❌ Error saving configuration:', error);
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    }
  };

  // Fetch academic year settings
  const fetchAcademicYear = async () => {
    const { schoolCode, token } = getAuthData();
    if (!schoolCode || !token) return;

    try {
      const response = await api.get(`/admin/academic-year/${schoolCode}`);
      if (response.data.success) {
        const { currentYear, startDate, endDate } = response.data.data;
        const dynamicYear = getDynamicFallbackYear();
        const startYearNum = parseInt(dynamicYear.split('-')[0]);
        setCurrentAcademicYear(currentYear || dynamicYear);
        setAcademicYearStart(startDate ? startDate.split('T')[0] : `${startYearNum}-04-01`);
        setAcademicYearEnd(endDate ? endDate.split('T')[0] : `${startYearNum + 1}-03-31`);
        setFromYear(currentYear || dynamicYear);
        setSavedAcademicYear(currentYear || dynamicYear);
        setIsAcademicYearSaved(true);
      }
    } catch (error: any) {
      console.error('Error fetching academic year:', error);
    }
  };

  // Save academic year settings
  const handleSaveAcademicYear = async () => {
    const { schoolCode, token } = getAuthData();
    if (!schoolCode || !token) {
      toast.error('Authentication error');
      return;
    }

    try {
      setLoading(true);

      // Save academic year
      const response = await api.put(`/admin/academic-year/${schoolCode}`, {
        currentYear: currentAcademicYear,
        startDate: academicYearStart,
        endDate: academicYearEnd
      });

      if (response.data.success) {
        toast.success('Academic year updated successfully!');
        setFromYear(currentAcademicYear);
        setSavedAcademicYear(currentAcademicYear);
        setIsAcademicYearSaved(true);

        // Refresh academic year context so all pages get the new year
        await refreshAcademicYear();
      }
    } catch (error: any) {
      console.error('Error saving academic year:', error);
      toast.error('Failed to save academic year');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'academic') {
      refreshAcademicYear();
    } else if (activeTab === 'scoring') {
      fetchTests();
    } else if (activeTab === 'classes') {
      fetchClasses();
    } else if (activeTab === 'promotion') {
      fetchClasses();
      refreshAcademicYear();
    }
  }, [activeTab, academicYearReady, viewingAcademicYear]);

  // Auto-calculate toYear when fromYear changes
  useEffect(() => {
    if (fromYear) {
      const [startYear, endYear] = fromYear.split('-').map(Number);
      const nextStartYear = startYear + 1;
      const nextEndYear = endYear + 1;
      // Handle both 2024-25 and 2024-2025 formats
      if (endYear < 100) {
        // Short format like 2024-25
        setToYear(`${nextStartYear}-${nextEndYear.toString().slice(-2)}`);
      } else {
        // Full format like 2024-2025
        setToYear(`${nextStartYear}-${nextEndYear}`);
      }
    }
  }, [fromYear]);

  // Initialize testScoring state when tests are loaded
  useEffect(() => {
    if (tests.length > 0) {
      const initialScoring: Record<string, { maxMarks: number; weightage: number }> = {};
      tests.forEach(test => {
        console.log(`🔍 Checking test ${test.testName || test._id}:`, {
          maxMarks: test.maxMarks,
          weightage: test.weightage,
          hasMaxMarks: !!test.maxMarks,
          hasWeightage: !!test.weightage
        });

        if (test.maxMarks || test.weightage) {
          initialScoring[test._id] = {
            maxMarks: test.maxMarks || 0,
            weightage: test.weightage || 0
          };
          console.log(`✅ Added to initialScoring:`, initialScoring[test._id]);
        }
      });
      setTestScoring(initialScoring);
      console.log('📊 Initialized test scoring with existing values:', initialScoring);
    }
  }, [tests]);

  const tabs = [
    { id: 'academic', name: 'Academic Year', icon: Calendar },
    { id: 'promotion', name: 'Promotion', icon: GraduationCap, disabled: !isAcademicYearSaved },
    { id: 'scoring', name: 'Scoring System', icon: GraduationCap },
    { id: 'classes', name: 'Class Structure', icon: Users },
    { id: 'templates', name: 'Templates', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">School Settings</h1>
        {activeTab === 'scoring' && (
          <button
            onClick={handleSaveScoring}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Scoring
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                title={tab.disabled ? 'Please save Academic Year first' : ''}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
                {tab.disabled && <span className="ml-1 text-xs">🔒</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Academic Year Configuration</h3>
                {isAcademicYearSaved && (
                  <span className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Saved: {savedAcademicYear}
                  </span>
                )}
              </div>
              {!isAcademicYearSaved && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> Please save the academic year before proceeding to promotion. This ensures all students are properly assigned to the correct academic year.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Academic Year</label>
                  <input
                    type="text"
                    value={currentAcademicYear}
                    onChange={(e) => setCurrentAcademicYear(e.target.value)}
                    placeholder="2024-2025"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year Start</label>
                  <input
                    type="date"
                    value={academicYearStart}
                    onChange={(e) => setAcademicYearStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year End</label>
                  <input
                    type="date"
                    value={academicYearEnd}
                    onChange={(e) => setAcademicYearEnd(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveAcademicYear}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Save Academic Year
              </button>
            </div>
          )}

          {activeTab === 'promotion' && (
            <>
              {!isAcademicYearSaved ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Academic Year Not Set</h3>
                  <p className="text-gray-600 mb-4">Please save the academic year in the Academic Year tab before proceeding with promotion.</p>
                  <button
                    onClick={() => setActiveTab('academic')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Go to Academic Year Settings
                  </button>
                </div>
              ) : (
                <PromotionTab
                  fromYear={fromYear}
                  setFromYear={setFromYear}
                  toYear={toYear}
                  classes={classes}
                  loading={loading}
                />
              )}
            </>
          )}

          {activeTab === 'scoring' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column: Tests list (takes 2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 font-semibold">Test Scoring Configuration</h3>
                    <p className="text-sm text-gray-500">Configure max marks and weightage for tests</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Tests are created by SuperAdmin. Here you can configure the scoring parameters (Max Marks and Weightage) for each test.
                    </p>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading tests...</p>
                    </div>
                  ) : tests.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Found</h3>
                      <p className="text-gray-600">Tests created by SuperAdmin will appear here.</p>
                      <p className="text-sm text-gray-500 mt-2">Ask your SuperAdmin to create tests in the Academics section.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const groupedTests: Record<string, TestData[]> = {};
                        tests.forEach(test => {
                          if (!groupedTests[test.className]) {
                            groupedTests[test.className] = [];
                          }
                          groupedTests[test.className].push(test);
                        });

                        const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
                        const sortedClasses = Object.keys(groupedTests).sort((a, b) => {
                          const aIndex = classOrder.indexOf(a);
                          const bIndex = classOrder.indexOf(b);
                          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                          if (aIndex !== -1) return -1;
                          if (bIndex !== -1) return 1;
          return a.localeCompare(b);
                        });

                        return sortedClasses.map((className) => {
                          const classTests = groupedTests[className];
                          const isExpanded = expandedClasses.has(className);
                          
                          // Calculate total weightage configured for this class so far
                          const totalClassWeight = classTests.reduce((sum, test) => {
                            const currentScoring = testScoring[test._id];
                            const weight = currentScoring && currentScoring.weightage !== undefined
                              ? currentScoring.weightage
                              : (test.weightage || 0);
                            return sum + weight;
                          }, 0);
                          
                          // Check if all tests for this class are configured
                          const allConfigured = classTests.every(test => {
                            const currentScoring = testScoring[test._id];
                            return (currentScoring && currentScoring.maxMarks) || test.maxMarks;
                          });

                          return (
                            <div key={className} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow mb-4">
                              {/* Class Card Header / Dropdown Toggle */}
                              <div 
                                onClick={() => toggleClassExpansion(className)}
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-gray-50/50"
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-gray-500" />
                                  )}
                                  <div>
                                    <h4 className="text-base font-bold text-gray-900">Class {className}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {classTests.length} SuperAdmin-configured test{classTests.length > 1 ? 's' : ''} • Total weight: {totalClassWeight}%
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                  totalClassWeight === 100
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {totalClassWeight === 100 ? 'Configured (100%)' : 'Needs Configuration'}
                                </span>
                              </div>

                              {/* Class Card Dropdown Content */}
                              {isExpanded && (
                                <div className="p-6 border-t border-gray-100 bg-white space-y-6">
                                  {classTests.map((test) => {
                                    const testName = test.testName || (test as any).name || 'Unnamed Test';
                                    return (
                                      <div key={test._id} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                                        <div className="mb-2">
                                          <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{testName}</h5>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Total Marks (Max)</label>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="e.g. 100"
                                              value={testScoring[test._id]?.maxMarks !== undefined ? testScoring[test._id].maxMarks : (test.maxMarks || '')}
                                              onChange={(e) => handleScoringChange(test._id, 'maxMarks', parseInt(e.target.value) || 0)}
                                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Weightage (%)</label>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              placeholder="e.g. 25"
                                              value={testScoring[test._id]?.weightage !== undefined ? testScoring[test._id].weightage : (test.weightage || '')}
                                              onChange={(e) => handleScoringChange(test._id, 'weightage', parseInt(e.target.value) || 0)}
                                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>How it works:</strong> SuperAdmin creates tests (e.g., "Maths for Class 1"). You configure the scoring parameters here. Tests will appear automatically when SuperAdmin adds them.
                    </p>
                  </div>
                </div>

                {/* Right column: Grading System (takes 1 col) */}
                <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200 h-fit">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-2">
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        Grading Scale
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Customize grade name and percentage thresholds.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGradingSystem(prev => [
                          ...prev,
                          { grade: `G${prev.length + 1}`, minPercentage: 0, maxPercentage: 0 }
                        ]);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center"
                    >
                      + Add Grade
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {gradingSystem.map((scale, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="w-16">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">Grade</label>
                          <input
                            type="text"
                            value={scale.grade}
                            onChange={(e) => {
                              const updated = [...gradingSystem];
                              updated[index].grade = e.target.value;
                              setGradingSystem(updated);
                            }}
                            placeholder="A+"
                            className="w-full text-sm font-semibold border-b border-gray-300 focus:border-blue-500 focus:ring-0 py-1 bg-transparent text-center"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase text-center">Min (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={scale.minPercentage}
                            onChange={(e) => {
                              const updated = [...gradingSystem];
                              updated[index].minPercentage = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setGradingSystem(updated);
                            }}
                            className="w-full text-sm text-center border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="text-gray-400 text-sm font-medium pt-3">-</div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase text-center">Max (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={scale.maxPercentage}
                            onChange={(e) => {
                              const updated = [...gradingSystem];
                              updated[index].maxPercentage = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setGradingSystem(updated);
                            }}
                            className="w-full text-sm text-center border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGradingSystem(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="text-red-500 hover:text-red-700 pt-3 flex-shrink-0"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-[11px] text-gray-500 italic flex items-start gap-1">
                    <span>💡</span>
                    <span>Click "Save Scoring" above to apply your changes to the grading scale.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Class Structure</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Classes and sections are managed by SuperAdmin. This is a read-only view.
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading classes...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
                  <p className="text-gray-600">Classes created by SuperAdmin will appear here.</p>
                  <p className="text-sm text-gray-500 mt-2">Ask your SuperAdmin to create classes in the Academics section.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {classes.map((cls) => (
                    <div key={cls._id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Class {cls.className}</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {cls.sections.length} sections
                        </span>
                      </div>

                      {/* Total student count below class name */}
                      <div className="mb-3 p-2 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700 flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          Total Students: {cls.studentCount !== undefined ? cls.studentCount : '...'}
                        </p>
                      </div>

                      {cls.sections.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sections</p>
                          {cls.sections.map((section, index) => (
                            <div key={index} className="flex items-center justify-between text-sm bg-white border border-gray-100 rounded-md p-2">
                              <div className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                <span className="text-gray-700">Section {section}</span>
                              </div>
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                                {cls.sectionCounts?.[section] !== undefined ? cls.sectionCounts[section] : '...'} students
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No sections added</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <UniversalTemplate />
          )}

        </div>
      </div>
    </div>
  );
};

export default SchoolSettings;