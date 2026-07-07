import React, { useState, useEffect, useCallback } from 'react';
import { Search, Save, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { resultsAPI } from '../../../services/api';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { normalizeAcademicYear, getDynamicFallbackYear } from '../../../utils/academicYearUtils';

interface StudentResult {
  id: string;
  name: string;
  userId: string;
  rollNumber: string;
  class: string;
  section: string;
  subjectMarks: { [subjectName: string]: number | null };
}

const Results: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentAcademicYear, 
    viewingAcademicYear, 
    isViewingHistoricalYear, 
    setViewingYear, 
    availableYears, 
    ready: academicYearReady 
  } = useAcademicYear();

  // Fetch classes configured by superadmin
  const {
    classesData,
    loading: classesLoading,
    getClassOptions,
    getSectionsByClass,
    hasClasses
  } = useSchoolClasses(academicYearReady ? viewingAcademicYear : undefined);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [selectedTestType, setSelectedTestType] = useState('');
  const [configuredMaxMarks, setConfiguredMaxMarks] = useState<number | null>(null);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showResultsTable, setShowResultsTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [testTypes, setTestTypes] = useState<string[]>([]);
  const [loadingTestTypes, setLoadingTestTypes] = useState(false);

  // Freeze functionality
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezing, setFreezing] = useState(false);

  // Comparator: sort by userId like SK-S-0847 (prefix, then numeric)
  const compareUserId = useCallback((a: string | undefined, b: string | undefined) => {
    const norm = (s?: string) => String(s || '').toUpperCase().trim();
    const parse = (s?: string) => {
      const id = norm(s);
      const m = id.match(/^(.*?)(\d+)$/);
      if (m) return { p: m[1], n: parseInt(m[2], 10) };
      return { p: id, n: Number.MAX_SAFE_INTEGER };
    };
    const A = parse(a);
    const B = parse(b);
    const pc = A.p.localeCompare(B.p);
    if (pc !== 0) return pc;
    return A.n - B.n;
  }, []);

  const sortStudentsByUserId = useCallback((list: StudentResult[]) => {
    return [...list].sort((x, y) => compareUserId(x.userId, y.userId));
  }, [compareUserId]);

  // Get class list from superadmin configuration
  const classList = [...new Set(classesData?.classes?.map(c => c.className) || [])];

  // Fetch test types for the selected class
  const fetchTestTypes = useCallback(async (className: string) => {
    if (!className) {
      setTestTypes([]);
      return;
    }

    setLoadingTestTypes(true);
    try {
      if (classesData && classesData.testsByClass) {
        let classTests = classesData.testsByClass[className] || classesData.testsByClass[String(className)] || [];
        if (classTests.length === 0 && classesData.tests) {
          classTests = classesData.tests.filter((t: any) => String(t.className) === String(className));
        }

        // Only include active tests with configured maxMarks
        const withMarks = (classTests || []).filter((t: any) => typeof t?.maxMarks === 'number' && t.maxMarks > 0);
        if (withMarks.length > 0) {
          const names = withMarks
            .map((t: any) => t.testName || t.displayName || t.name || t.testType)
            .filter(Boolean);
          const unique = [...new Set(names)];
          setTestTypes(unique as string[]);
          setLoadingTestTypes(false);
          return;
        }
      }
      setTestTypes([]);
    } catch (error) {
      console.error('Error fetching test types:', error);
      toast.error('Failed to load test types');
      setTestTypes([]);
    } finally {
      setLoadingTestTypes(false);
    }
  }, [classesData]);

  // Update available sections when class changes
  useEffect(() => {
    if (selectedClass && classesData) {
      const sections = getSectionsByClass(selectedClass);
      setAvailableSections(sections);
      if (sections.length > 0) {
        setSelectedSection(sections[0].value);
      } else {
        setSelectedSection('');
      }
    } else {
      setAvailableSections([]);
      setSelectedSection('');
    }
    setShowResultsTable(false);
    setIsFrozen(false);
  }, [selectedClass, classesData, getSectionsByClass]);

  // Fetch test types when selected class changes
  useEffect(() => {
    if (selectedClass) {
      fetchTestTypes(selectedClass);
      setSelectedTestType('');
      setConfiguredMaxMarks(null);
    } else {
      setTestTypes([]);
    }
  }, [selectedClass, fetchTestTypes]);

  // Compute configured max marks from test config when selected test changes
  useEffect(() => {
    if (!selectedClass || !selectedTestType || !classesData) {
      setConfiguredMaxMarks(null);
      return;
    }
    const classTests = (classesData.testsByClass?.[selectedClass] || classesData.tests || []) as any[];
    const match = classTests.find((t: any) => {
      const name = t.testName || t.displayName || t.name || t.testType;
      return name === selectedTestType;
    });
    const value = typeof match?.maxMarks === 'number' ? match.maxMarks : null;
    setConfiguredMaxMarks(value);
  }, [selectedClass, selectedTestType, classesData]);

  // Calculate subject-level grade
  const calculateGrade = (obtained: number | null, total: number | null): string => {
    if (obtained === null || obtained === undefined || !total || total === 0) return 'N/A';
    const percentage = (obtained / total) * 100;

    const dynamicGradingSystem = (classesData as any)?.gradingSystem;
    if (dynamicGradingSystem && Array.isArray(dynamicGradingSystem) && dynamicGradingSystem.length > 0) {
      for (const range of dynamicGradingSystem) {
        const min = Number(range.minPercentage);
        const max = Number(range.maxPercentage);
        if (percentage >= min && percentage <= max) {
          return range.grade;
        }
      }
    }

    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    if (percentage >= 21) return 'E1';
    return 'E2';
  };

  // Fetch subjects, students, and existing results
  const fetchResultsOrStudents = async () => {
    if (!selectedClass || !selectedSection || !selectedTestType) {
      toast.error('Please select class, section, and test type');
      return;
    }

    setLoading(true);
    setError(null);
    setIsFrozen(false);

    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      if (!schoolCode) {
        toast.error('School code not available');
        setLoading(false);
        return;
      }

      // 1. Fetch class subjects
      setLoadingSubjects(true);
      let activeSubjects: string[] = [];
      try {
        const resp = await api.get(`/class-subjects/class/${encodeURIComponent(selectedClass)}`, {
          params: { academicYear: viewingAcademicYear, section: selectedSection },
          headers: { 'x-school-code': schoolCode }
        });
        if (resp.data?.success && resp.data?.data?.subjects) {
          const activeList = resp.data.data.subjects.filter((s: any) => s.isActive !== false);
          activeSubjects = activeList.map((s: any) => s.name || s.subjectName).filter(Boolean);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }

      if (activeSubjects.length === 0) {
        setError('No active subjects are configured for this class and section. Please configure subjects first.');
        setStudentResults([]);
        setShowResultsTable(false);
        setLoading(false);
        return;
      }
      setSubjects(activeSubjects);

      // 2. Fetch class students
      let fetchedStudents: any[] = [];
      const studentsResp = await resultsAPI.getStudents(schoolCode, {
        class: selectedClass,
        section: selectedSection
      });
      if (studentsResp.data.success && studentsResp.data.data) {
        const raw = studentsResp.data.data as any[];
        fetchedStudents = raw.filter((s: any) => {
          const sClass = s.academicInfo?.class || s.studentDetails?.academic?.currentClass || s.studentDetails?.currentClass || s.studentDetails?.class || s.currentclass || s.class || s.className;
          const sSection = s.academicInfo?.section || s.studentDetails?.academic?.currentSection || s.studentDetails?.currentSection || s.studentDetails?.section || s.currentsection || s.section;
          const sYear = s.studentDetails?.academicYear || s.studentDetails?.academic?.academicYear || s.academicYear || s.academicInfo?.academicYear;
          return String(sClass).trim() === String(selectedClass).trim() &&
            String(sSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase() &&
            (!sYear || normalizeAcademicYear(String(sYear).trim()) === normalizeAcademicYear(String(viewingAcademicYear || currentAcademicYear || '').trim()));
        });
      }

      if (fetchedStudents.length === 0) {
        // Fallback students fetch
        try {
          const altResp = await api.get(`/school-users/${schoolCode}/users`);
          const altData = altResp.data;
          fetchedStudents = ((altData?.data || []) as any[]).filter((u: any) => {
            const isStudent = u.role === 'student';
            const uClass = u.studentDetails?.currentClass || u.currentclass || u.class || u.className;
            const uSection = u.studentDetails?.currentSection || u.currentsection || u.section;
            return isStudent && String(uClass) === String(selectedClass) && String(uSection).toUpperCase() === String(selectedSection).toUpperCase();
          });
        } catch (altErr) {
          console.error('Alt students fetch failed:', altErr);
        }
      }

      if (fetchedStudents.length === 0) {
        setError('No students found for the selected class and section');
        setStudentResults([]);
        setShowResultsTable(false);
        setLoading(false);
        return;
      }

      // 3. Fetch existing results (all subjects at once)
      let existingResultsList: any[] = [];
      try {
        const resultsResp = await resultsAPI.getResults({
          schoolCode,
          class: selectedClass,
          section: selectedSection,
          testType: selectedTestType,
          academicYear: viewingAcademicYear
        });
        if (resultsResp.data?.success && Array.isArray(resultsResp.data?.data)) {
          existingResultsList = resultsResp.data.data;
        }
      } catch (err) {
        console.error('Error fetching existing results:', err);
      }

      // Map existing results to a dictionary of: studentId -> subject -> obtainedMarks
      const existingMarksMap: { [studentId: string]: { [subjectName: string]: number | null } } = {};
      let frozenDetected = false;

      existingResultsList.forEach((r: any) => {
        const sid = String(r.studentId || r.userId || '');
        if (!sid) return;
        if (!existingMarksMap[sid]) {
          existingMarksMap[sid] = {};
        }
        existingMarksMap[sid][r.subject] = r.obtainedMarks ?? null;
        if (r.frozen) {
          frozenDetected = true;
        }
      });

      setIsFrozen(frozenDetected);

      // Assemble tabular rows
      const gridRows: StudentResult[] = fetchedStudents.map((student: any, index: number) => {
        const sid = student._id || student.id;
        const roll = student.studentDetails?.academic?.rollNumber
          || student.studentDetails?.rollNumber
          || student.studentDetails?.currentRollNumber
          || student.rollNumber
          || student.sequenceId
          || `${schoolCode}-${selectedSection}-${String(index + 1).padStart(4, '0')}`;

        const subjectMarks: { [subjectName: string]: number | null } = {};
        activeSubjects.forEach((subj) => {
          subjectMarks[subj] = existingMarksMap[sid]?.[subj] ?? null;
        });

        return {
          id: sid,
          name: typeof student.name === 'object'
            ? (student.name.displayName || `${student.name.firstName || ''} ${student.name.lastName || ''}`.trim())
            : (student.name || student.fullName || 'Unknown'),
          userId: student.userId || student.user_id || 'N/A',
          rollNumber: roll,
          class: selectedClass,
          section: selectedSection,
          subjectMarks
        };
      });

      setStudentResults(sortStudentsByUserId(gridRows));
      setShowResultsTable(true);

      if (frozenDetected) {
        toast.error('⚠️ Results are FROZEN and cannot be edited.', { duration: 5000 });
      } else {
        toast.success(`Loaded ${gridRows.length} student rows with configured subjects.`);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load students or configured class settings');
      setStudentResults([]);
      setShowResultsTable(false);
    } finally {
      setLoading(false);
    }
  };

  const updateStudentMark = (studentId: string, subjectName: string, value: number | null) => {
    setStudentResults((prev) =>
      prev.map((student) => {
        if (student.id === studentId) {
          return {
            ...student,
            subjectMarks: {
              ...student.subjectMarks,
              [subjectName]: value
            }
          };
        }
        return student;
      })
    );
  };

  const handleSaveAll = async () => {
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      if (!schoolCode) {
        toast.error('School code not available');
        return;
      }

      setLoading(true);

      // Package results state
      const payload = {
        schoolCode,
        class: selectedClass,
        section: selectedSection,
        testType: selectedTestType,
        academicYear: viewingAcademicYear || getDynamicFallbackYear(),
        results: studentResults.map((student) => ({
          studentId: student.id,
          studentName: student.name,
          userId: student.userId,
          subjectMarks: student.subjectMarks
        }))
      };

      const saveResp = await resultsAPI.saveResults(payload);
      if (saveResp.data?.success) {
        toast.success('Successfully saved all subject marks for the selected test!');
        await fetchResultsOrStudents();
      } else {
        toast.error(saveResp.data?.message || 'Failed to save results');
      }
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Failed to save results');
    } finally {
      setLoading(false);
    }
  };

  const handleFreezeResults = async () => {
    if (!selectedClass || !selectedSection || !selectedTestType) {
      toast.error('Please select class, section, and test');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to FREEZE results for Class ${selectedClass}-${selectedSection} (${selectedTestType})?\n\nOnce frozen, marks for all subjects under this test CANNOT be edited anymore!`
    );
    if (!confirmed) return;

    setFreezing(true);
    try {
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
      await resultsAPI.freezeResults({
        schoolCode,
        class: selectedClass,
        section: selectedSection,
        testType: selectedTestType,
        academicYear: viewingAcademicYear || getDynamicFallbackYear()
      });

      setIsFrozen(true);
      toast.success('Results frozen successfully! Marks are now locked.');
    } catch (error) {
      console.error('Error freezing results:', error);
      toast.error('Failed to freeze results');
    } finally {
      setFreezing(false);
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
                <ShieldAlert className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Results</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Manage student marks and academic performance</p>
              </div>
            </div>
            {showResultsTable && !isFrozen && (
              <button
                onClick={handleSaveAll}
                disabled={loading}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 flex items-center font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <Save className="h-5 w-5 mr-2" />
                Save All Changes
              </button>
            )}
          </div>
        </div>

      {isViewingHistoricalYear && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mx-2 sm:mx-0 shadow-sm">
          <p className="text-sm text-amber-800 font-medium">
            <strong className="text-amber-900">📚 Viewing Historical Data:</strong> You are viewing data from {viewingAcademicYear}. This data is read-only.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mx-2 sm:mx-0">
        <div className="flex flex-wrap gap-4">
          {/* Academic Year Selection */}
          <div className="flex flex-col">
            <label htmlFor="year-select" className="text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Academic Year</label>
            <select
              id="year-select"
              value={viewingAcademicYear}
              onChange={(e) => setViewingYear(e.target.value)}
              disabled={user?.role !== "superadmin"}
              className={`px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 min-w-[150px] ${
                user?.role !== "superadmin"
                  ? "opacity-60 cursor-not-allowed"
                  : ""
              }`}
            >
              {[...new Set(availableYears)].map((year) => (
                <option key={year} value={year}>
                  {year} {year === currentAcademicYear && '(Current)'}
                </option>
              ))}
            </select>
          </div>

          {/* Class Selection */}
          <div className="flex flex-col">
            <label htmlFor="class-select" className="text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Class</label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 min-w-[150px]"
              disabled={classesLoading || !hasClasses()}
            >
              <option value="">{classesLoading ? 'Loading...' : 'Select Class'}</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          <div className="flex flex-col">
            <label htmlFor="section-select" className="text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section</label>
            <select
              id="section-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 min-w-[150px]"
              disabled={!selectedClass || availableSections.length === 0}
            >
              <option value="">{!selectedClass ? 'Select Class First' : 'Select Section'}</option>
              {availableSections.map((section) => (
                <option key={section.value} value={section.value}>Section {section.section}</option>
              ))}
            </select>
          </div>

          {/* Test Type Selection */}
          <div className="flex flex-col">
            <label htmlFor="test-type-select" className="text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Test Type</label>
            <select
              id="test-type-select"
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-700 min-w-[180px]"
              disabled={!selectedClass || loadingTestTypes}
            >
              <option value="">
                {!selectedClass
                  ? 'Select Class First'
                  : loadingTestTypes
                    ? 'Loading...'
                    : 'Select Test'}
              </option>
              {testTypes.map((type, index) => (
                <option key={`${type}-${index}`} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="flex flex-col justify-end">
          <button
            onClick={fetchResultsOrStudents}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl flex items-center transition-all shadow-sm font-semibold disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Search className="h-4 w-4 mr-2" strokeWidth={2.5} />
            )}
            Search
          </button>
          </div>

          {/* Freeze Results Button */}
          {showResultsTable && !isFrozen && (
            <div className="flex flex-col justify-end ml-auto">
            <button
              onClick={handleFreezeResults}
              disabled={freezing || loading}
              className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white px-5 py-2.5 rounded-xl flex items-center transition-all shadow-sm font-semibold disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4 mr-2" strokeWidth={2.5} />
              Freeze Results
            </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tabular Input Table */}
      {showResultsTable && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mx-2 sm:mx-0">
          {isFrozen && (
            <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-100 flex items-center gap-2 backdrop-blur-md">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <span className="text-rose-700 font-bold text-sm">Results are FROZEN - Editing is disabled</span>
            </div>
          )}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50 backdrop-blur-md border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Student Details
                  </th>
                  {subjects.map((subj) => (
                    <th key={subj} className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap border-l border-slate-100">
                      {subj} <span className="text-slate-400 font-medium">({configuredMaxMarks ? `/${configuredMaxMarks}` : ''})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {studentResults.map((student) => (
                  <tr key={student.id} className={isFrozen ? "bg-slate-50/30" : "hover:bg-slate-50/80 transition-colors duration-150 group/row"}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm border-2 border-white shrink-0 group-hover/row:scale-105 transition-transform duration-300">
                          {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="flex flex-col">
                          <div className="text-sm sm:text-[15px] font-bold text-slate-800">{student.name}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">
                            ID: {student.userId || '-'}
                            {student.rollNumber && ` • Roll: ${student.rollNumber}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    {subjects.map((subj) => {
                      const score = student.subjectMarks[subj];
                      const grade = calculateGrade(score, configuredMaxMarks);
                      return (
                        <td key={subj} className="px-6 py-4 whitespace-nowrap text-sm border-l border-slate-100 align-middle">
                          <div className="flex flex-col items-center gap-1.5">
                            <input
                              type="number"
                              value={score !== null ? score : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const max = configuredMaxMarks ?? 100;
                                if (val === '' || (val.length <= 3 && parseInt(val) <= max && parseInt(val) >= 0)) {
                                  updateStudentMark(student.id, subj, val === '' ? null : parseInt(val));
                                }
                              }}
                              disabled={isFrozen}
                              className="w-20 px-3 py-1.5 text-center bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all disabled:bg-slate-100 disabled:cursor-not-allowed font-bold text-slate-700"
                              placeholder="-"
                              min="0"
                              max={configuredMaxMarks ?? 100}
                            />
                            {score !== null && (
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold shadow-sm border ${
                                ['A1', 'A2', 'A+'].includes(grade) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                ['B1', 'B2', 'B'].includes(grade) ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                ['C1', 'C2', 'C'].includes(grade) ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                grade === 'D' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {grade}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
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

export default Results;
