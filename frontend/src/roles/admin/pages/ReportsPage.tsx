import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, DollarSign, Users, UserCheck, AlertCircle, CheckCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import ClassSectionSelect from '../components/ClassSectionSelect';
import api from '../../../api/axios';
import { 
  getSchoolSummary,
  getStudentFeeRecords, 
  StudentFeeRecord, 
  exportFeeRecordsToCSV,
  getStudentsByClassSection,
  StudentDetail
} from '../../../api/reports';
import { schoolUserAPI } from '../../../api/schoolUsers';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { bg: string; text: string }> = {
    paid: { bg: 'bg-green-100', text: 'text-green-800' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    overdue: { bg: 'bg-red-100', text: 'text-red-800' },
    partial: { bg: 'bg-blue-100', text: 'text-blue-800' },
  };

  const statusConfig = statusMap[status.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAcademicYear, viewingAcademicYear, isViewingHistoricalYear, setViewingYear, availableYears, loading: academicYearLoading } = useAcademicYear();
  
  // Filter state
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');


  // Summary data from API
  const [summary, setSummary] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    avgMarks: 0,
    classWiseDues: []
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const [classWiseCounts, setClassWiseCounts] = useState<Array<{
    className: string;
    sections: Array<{name: string, count: number, avgMarks?: number, avgAttendance?: number}>;
    total: number;
  }>>([]);

  // State for expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [studentDetails, setStudentDetails] = useState<Map<string, StudentDetail[]>>(new Map());
  const [loadingStudents, setLoadingStudents] = useState<Set<string>>(new Set());

  // State for dues list
  const [duesList, setDuesList] = useState<StudentFeeRecord[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Handle export to CSV
  const handleExportToCSV = async () => {
    try {
      const params = {
        academicYear: viewingAcademicYear,
        class: selectedClass !== 'ALL' ? selectedClass : undefined,
        section: selectedSection !== 'ALL' ? selectedSection : undefined,
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      };

      const csvBlob = await exportFeeRecordsToCSV(params);
      
      // Create a download link
      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.setAttribute('download', `fee-due-report-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      setError('Failed to export data. Please try again.');
    }
  };

  // Fetch due fees data
  const fetchDuesList = useCallback(async () => {
    try {
      setLoadingDues(true);
      setError(null);
      
      const params = {
        academicYear: viewingAcademicYear,
        class: selectedClass !== 'ALL' ? selectedClass : undefined,
        section: selectedSection !== 'ALL' ? selectedSection : undefined,
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      };
      
      const response = await getStudentFeeRecords(params);
      
      if (response.success) {
        setDuesList(response.data.records);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          pages: response.data.pagination.pages
        }));
      } else {
        throw new Error('Failed to fetch dues list');
      }
    } catch (err) {
      console.error('Error fetching dues list:', err);
      setError('Failed to load dues data. Please try again.');
    } finally {
      setLoadingDues(false);
    }
  }, [viewingAcademicYear, selectedClass, selectedSection, pagination.page, pagination.limit, searchTerm, statusFilter]);

  // Fetch class and section wise student counts from school-users endpoint
  const fetchClassWiseCounts = useCallback(async () => {
    console.log('🔍 [fetchClassWiseCounts] Starting fetch with filters:', {
      class: selectedClass,
      section: selectedSection
    });
    
    try {
      // Get authentication token and school code
      const authData = localStorage.getItem('erp.auth');
      const token = authData ? JSON.parse(authData).token : null;
      const schoolCode = user?.schoolCode;

      if (!token || !schoolCode) {
        setError('Authentication required');
        return;
      }

      console.log('Fetching students from school-users endpoint...');
      const response = await schoolUserAPI.getAllUsers(schoolCode, token);
      
      // Extract students from response
      let students: any[] = [];
      if (response.data && Array.isArray(response.data)) {
        students = response.data.filter((u: any) => u.role === 'student');
      } else if (response.students && Array.isArray(response.students)) {
        students = response.students;
      }

      console.log(`Found ${students.length} students`);
      
      // Apply filters
      let filteredStudents = students;
      
      // Filter by academic year - check multiple possible locations
      filteredStudents = filteredStudents.filter((s: any) => {
        const studentAcademicYear = s.studentDetails?.academicYear || 
                                   s.studentDetails?.academic?.academicYear ||
                                   s.academicYear ||
                                   s.academicInfo?.academicYear;
        // If academic year is not set, don't filter it out (allow it through)
        if (!studentAcademicYear) return true;
        return String(studentAcademicYear).trim() === String(viewingAcademicYear).trim();
      });
      
      if (selectedClass !== 'ALL') {
        filteredStudents = filteredStudents.filter((s: any) => {
          // Check all possible locations for class, prioritizing academicInfo
          const studentClass = s.academicInfo?.class ||
                              s.studentDetails?.academic?.currentClass ||
                              s.studentDetails?.currentClass || 
                              s.studentDetails?.class ||
                              s.class;
          return String(studentClass).trim() === String(selectedClass).trim();
        });
      }
      if (selectedSection !== 'ALL') {
        filteredStudents = filteredStudents.filter((s: any) => {
          // Check all possible locations for section, prioritizing academicInfo
          const studentSection = s.academicInfo?.section ||
                              s.studentDetails?.academic?.currentSection ||
                              s.studentDetails?.currentSection || 
                              s.studentDetails?.section ||
                              s.section;
          return String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
        });
      }

      // Group students by class and section
      const classMap = new Map();
      
      filteredStudents.forEach((student: any) => {
        // Check all possible locations for class and section, prioritizing academicInfo
        const className = student.academicInfo?.class ||
                         student.studentDetails?.academic?.currentClass ||
                         student.studentDetails?.currentClass || 
                         student.studentDetails?.class ||
                         student.class || 
                         'Unknown';
        const section = student.academicInfo?.section ||
                       student.studentDetails?.academic?.currentSection ||
                       student.studentDetails?.currentSection || 
                       student.studentDetails?.section ||
                       student.section || 
                       'Not Assigned';
        
        if (!classMap.has(className)) {
          classMap.set(className, {
            className,
            sections: new Map(),
            total: 0
          });
        }
        
        const classData = classMap.get(className);
        classData.total++;
        
        if (!classData.sections.has(section)) {
          classData.sections.set(section, { count: 0, students: [] });
        }
        const sectionData = classData.sections.get(section);
        sectionData.count++;
        sectionData.students.push(student);
      });
      
      // Fetch attendance and results stats for each class-section combination
      console.log('📊 Fetching attendance and results stats for each class-section...');
      const formattedDataPromises = Array.from(classMap.values()).map(async (classData) => {
        const sectionsWithStats = await Promise.all(
          Array.from(classData.sections.entries()).map(async ([name, data]) => {
            let avgAttendance = 0;
            let avgMarks = 0;
            
            try {
              // Fetch attendance stats
              const attendanceParams = {
                class: classData.className,
                section: name,
                academicYear: viewingAcademicYear
              };
              
              console.log(`📈 Fetching attendance for Class ${classData.className} Section ${name}:`, attendanceParams);
              const attendanceResponse = await api.get('/attendance/stats', { params: attendanceParams });
              avgAttendance = attendanceResponse.data?.averageAttendance || 0;
              console.log(`✅ Class ${classData.className} Section ${name}: ${avgAttendance}% attendance`);
            } catch (error) {
              console.error(`❌ Error fetching attendance for ${classData.className}-${name}:`, error);
            }
            
            try {
              // Fetch results stats
              const resultsParams = {
                class: classData.className,
                section: name,
                academicYear: viewingAcademicYear
              };
              
              const resultsResponse = await api.get('/results/stats', { params: resultsParams });
              avgMarks = resultsResponse.data?.averagePercentage || 0;
              console.log(`✅ Class ${classData.className} Section ${name}: ${avgMarks}% marks`);
            } catch (error) {
              console.error(`❌ Error fetching results for ${classData.className}-${name}:`, error);
            }
            
            return {
              name,
              count: data.count,
              avgMarks: avgMarks,
              avgAttendance: avgAttendance
            };
          })
        );
        
        return {
          className: classData.className,
          sections: sectionsWithStats,
          total: classData.total
        };
      });
      
      const formattedData = await Promise.all(formattedDataPromises);
      
      console.log('Formatted class-wise data with stats:', formattedData);
      setClassWiseCounts(formattedData);
      setError(null);
      
    } catch (error: any) {
      console.error('❌ Error fetching class data:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      setError('Failed to load class distribution data');
      setClassWiseCounts([]);
    }
  }, [viewingAcademicYear, selectedClass, selectedSection, user?.schoolCode]);

  // Fetch school summary data from school-users endpoint
  const fetchSchoolSummary = useCallback(async () => {
    try {
      setLoading(true);
      setSummaryLoading(true);
      setError(null);
      
      console.log('Fetching school summary with params:', {
        class: selectedClass,
        section: selectedSection
      });
      
      // Get authentication token and school code
      const authData = localStorage.getItem('erp.auth');
      const token = authData ? JSON.parse(authData).token : null;
      const schoolCode = user?.schoolCode;

      if (!token || !schoolCode) {
        setError('Authentication required');
        setLoading(false);
        setSummaryLoading(false);
        return;
      }

      const response = await schoolUserAPI.getAllUsers(schoolCode, token);
      
      // Extract students from response
      let students: any[] = [];
      if (response.data && Array.isArray(response.data)) {
        students = response.data.filter((u: any) => u.role === 'student');
      } else if (response.students && Array.isArray(response.students)) {
        students = response.students;
      }

      // Apply filters
      let filteredStudents = students;
      
      // Filter by academic year - check multiple possible locations
      filteredStudents = filteredStudents.filter((s: any) => {
        const studentAcademicYear = s.studentDetails?.academicYear || 
                                   s.studentDetails?.academic?.academicYear ||
                                   s.academicYear ||
                                   s.academicInfo?.academicYear;
        // If academic year is not set, don't filter it out (allow it through)
        if (!studentAcademicYear) return true;
        return String(studentAcademicYear).trim() === String(viewingAcademicYear).trim();
      });
      
      if (selectedClass !== 'ALL') {
        filteredStudents = filteredStudents.filter((s: any) => {
          // Check all possible locations for class, prioritizing academicInfo
          const studentClass = s.academicInfo?.class ||
                              s.studentDetails?.academic?.currentClass ||
                              s.studentDetails?.currentClass || 
                              s.studentDetails?.class ||
                              s.class;
          return String(studentClass).trim() === String(selectedClass).trim();
        });
      }
      if (selectedSection !== 'ALL') {
        filteredStudents = filteredStudents.filter((s: any) => {
          // Check all possible locations for section, prioritizing academicInfo
          const studentSection = s.academicInfo?.section ||
                              s.studentDetails?.academic?.currentSection ||
                              s.studentDetails?.currentSection || 
                              s.studentDetails?.section ||
                              s.section;
          return String(studentSection).trim().toUpperCase() === String(selectedSection).trim().toUpperCase();
        });
      }

      // Calculate summary statistics
      const totalStudents = filteredStudents.length;
      
      // Fetch overall attendance stats
      let avgAttendance = 0;
      try {
        const attendanceParams: any = {
          academicYear: viewingAcademicYear
        };
        
        if (selectedClass !== 'ALL') {
          attendanceParams.class = selectedClass;
        }
        if (selectedSection !== 'ALL') {
          attendanceParams.section = selectedSection;
        }
        
        console.log('📊 Fetching overall attendance stats:', attendanceParams);
        const attendanceResponse = await api.get('/attendance/stats', { params: attendanceParams });
        avgAttendance = attendanceResponse.data?.averageAttendance || 0;
        console.log('✅ Overall attendance:', avgAttendance);
      } catch (error) {
        console.error('❌ Error fetching overall attendance:', error);
      }
      
      // Fetch overall results/marks stats
      let avgMarks = 0;
      try {
        const resultsParams: any = {
          academicYear: viewingAcademicYear
        };
        
        if (selectedClass !== 'ALL') {
          resultsParams.class = selectedClass;
        }
        if (selectedSection !== 'ALL') {
          resultsParams.section = selectedSection;
        }
        
        console.log('📊 Fetching overall results stats:', resultsParams);
        const resultsResponse = await api.get('/results/stats', { params: resultsParams });
        avgMarks = resultsResponse.data?.averagePercentage || 0;
        console.log('✅ Overall average marks:', avgMarks);
      } catch (error) {
        console.error('❌ Error fetching overall results:', error);
      }
      
      setSummary({
        totalStudents,
        avgAttendance,
        avgMarks,
        classWiseDues: []
      });
      
      console.log('Updated summary state:', {
        totalStudents,
        avgAttendance,
        avgMarks
      });
      
    } catch (err) {
      console.error('Error in fetchSchoolSummary:', err);
      setError('Failed to load school summary data. Please check the console for details.');
    } finally {
      setLoading(false);
      setSummaryLoading(false);
    }
  }, [viewingAcademicYear, selectedClass, selectedSection, user?.schoolCode]);

  // Fetch students for a specific class and section with their marks and attendance
  const fetchStudentsForClassSection = useCallback(async (className: string, section: string) => {
    // Include academic year in cache key to ensure fresh data when year changes
    const key = `${viewingAcademicYear}-${className}-${section}`;
    
    // If already loaded, don't fetch again
    if (studentDetails.has(key)) {
      return;
    }
    
    try {
      setLoadingStudents(prev => new Set(prev).add(key));
      
      console.log(`🔍 Fetching students with stats for class ${className}, section: ${section}, academicYear: ${viewingAcademicYear}`);
      
      // Use the backend API that returns students with their avgMarks and avgAttendance
      const response = await getStudentsByClassSection({
        className: className,
        section: section,
        academicYear: viewingAcademicYear
      });
      
      if (response.success && response.students) {
        console.log(`✅ Fetched ${response.students.length} students with stats for ${className}-${section}`);
        setStudentDetails(prev => new Map(prev).set(key, response.students));
      } else {
        console.warn(`⚠️ No students found for ${className}-${section}`);
        setStudentDetails(prev => new Map(prev).set(key, []));
      }
      
    } catch (error) {
      console.error(`❌ Error fetching students for ${className}-${section}:`, error);
      setStudentDetails(prev => new Map(prev).set(key, []));
    } finally {
      setLoadingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [studentDetails, viewingAcademicYear]);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((className: string, section: string) => {
    // Use same key format as fetchStudentsForClassSection
    const key = `${viewingAcademicYear}-${className}-${section}`;
    
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
        // Fetch students when expanding
        fetchStudentsForClassSection(className, section);
      }
      return newSet;
    });
  }, [fetchStudentsForClassSection, viewingAcademicYear]);

  // Export overview data to CSV with student details
  const handleExportOverview = useCallback(async () => {
    try {
      const csvRows: string[] = [];
      
      // Add main headers
      csvRows.push('Class,Section,Students,Avg. Marks (%),Avg. Attendance (%)');
      
      // Fetch student details for each class/section and add to CSV
      for (const classItem of classWiseCounts) {
        for (const section of classItem.sections) {
          // Add class summary row
          csvRows.push(
            `Class ${classItem.className},${section.name},${section.count},${section.avgMarks?.toFixed(1) || 'N/A'},${section.avgAttendance?.toFixed(1) || 'N/A'}`
          );
          
          // Fetch student details if not already loaded
          const rowKey = `${viewingAcademicYear}-${classItem.className}-${section.name}`;
          let students = studentDetails.get(rowKey);
          
          if (!students) {
            // Fetch student data with marks and attendance from backend API
            try {
              const response = await getStudentsByClassSection({
                className: classItem.className,
                section: section.name,
                academicYear: viewingAcademicYear
              });
              
              if (response.success && response.students) {
                students = response.students;
              } else {
                students = [];
              }
            } catch (err) {
              console.error('Error fetching students for export:', err);
              students = [];
            }
          }
          
          // Add student details header
          if (students && students.length > 0) {
            csvRows.push('Student Details');
            csvRows.push('Student Name,Avg. Marks (%),Avg. Attendance (%)');
            
            // Add each student
            students.forEach(student => {
              csvRows.push(
                `"${student.studentName}",${student.avgMarks > 0 ? student.avgMarks.toFixed(1) : 'N/A'},${student.avgAttendance > 0 ? student.avgAttendance.toFixed(1) : 'N/A'}`
              );
            });
          }
          
          // Add empty row for separation
          csvRows.push('');
        }
      }
      
      const csvContent = csvRows.join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `school_report_detailed_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data');
    }
  }, [classWiseCounts, studentDetails]);

  // Load data when component mounts or filters change
  useEffect(() => {
    if (activeTab === 'dues') {
      fetchDuesList();
    } else if (activeTab === 'overview') {
      fetchSchoolSummary();
      // Also fetch class-wise counts when filters change
      fetchClassWiseCounts();
    }
  }, [activeTab, fetchDuesList, fetchSchoolSummary, fetchClassWiseCounts]);
  
  // Clear cached student details when filters change
  useEffect(() => {
    console.log('🔄 Filters changed, clearing student details cache');
    setStudentDetails(new Map());
    setExpandedRows(new Set());
  }, [viewingAcademicYear, selectedClass, selectedSection]);

  // Reset to first page when filters change
  useEffect(() => {
    if (activeTab === 'dues') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [selectedClass, selectedSection, searchTerm, statusFilter, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">School Reports</h1>
        </div>
      </div>

      {/* Alerts and Refresh Button */}
      <div className="flex justify-between items-center mb-4">
        {error && (
          <div className="flex-1 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        {activeTab === 'overview' && (
          <div className="flex gap-2">
            <button 
              onClick={handleExportOverview}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center whitespace-nowrap"
              disabled={classWiseCounts.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button 
              onClick={fetchSchoolSummary}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center whitespace-nowrap"
              disabled={summaryLoading}
            >
              {summaryLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Refresh Stats
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('dues')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dues'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dues List
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Academic Year Warning Banner */}
          {isViewingHistoricalYear && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>📚 Viewing Historical Data:</strong> You are viewing data from {viewingAcademicYear}. This data is read-only.
              </p>
            </div>
          )}

          {/* Global Filters */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Academic Year Selection */}
              <div className="flex flex-col md:col-span-1">
                <label htmlFor="year-select" className="text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                <select
                  id="year-select"
                  value={viewingAcademicYear}
                  onChange={(e) => setViewingYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year} {year === currentAcademicYear && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-4">
                <ClassSectionSelect
                  schoolId={user?.schoolId}
                  valueClass={selectedClass}
                  valueSection={selectedSection}
                  onClassChange={setSelectedClass}
                  onSectionChange={setSelectedSection}
                />
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Students Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Students</h3>
                      <p className="mt-2 text-3xl font-bold text-blue-600">
                        {summaryLoading ? (
                          <span className="inline-block h-8 w-16 bg-gray-200 rounded animate-pulse"></span>
                        ) : (
                          summary.totalStudents.toLocaleString()
                        )}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Average Attendance Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Avg. Attendance</h3>
                      <p className="mt-2 text-3xl font-bold text-green-600">
                        {summaryLoading ? (
                          <span className="inline-block h-8 w-16 bg-gray-200 rounded animate-pulse"></span>
                        ) : (
                          `${summary.avgAttendance.toFixed(1)}%`
                        )}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Avg Marks Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Avg. Marks</h3>
                      <p className="mt-2 text-3xl font-bold text-yellow-600">
                        {summaryLoading ? (
                          <span className="inline-block h-8 w-16 bg-gray-200 rounded animate-pulse"></span>
                        ) : (
                          `${summary.avgMarks.toFixed(1)}%`
                        )}
                      </p>
                      <span className="text-xs text-gray-500 mt-1">current term</span>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-full">
                      <TrendingUp className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Class & Section Wise Students */}
              <div className="bg-white rounded-lg shadow mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Students by Class & Section</h3>
                </div>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : classWiseCounts.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Class
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Section
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Students
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg. Marks
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg. Attendance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {classWiseCounts.map((classItem, classIdx) => (
                          <React.Fragment key={`${classItem.className}-${classIdx}`}>
                            {classItem.sections.map((section, idx) => {
                              // Use same key format with academic year
                              const rowKey = `${viewingAcademicYear}-${classItem.className}-${section.name}`;
                              const isExpanded = expandedRows.has(rowKey);
                              const students = studentDetails.get(rowKey) || [];
                              const isLoadingStudents = loadingStudents.has(rowKey);
                              
                              return (
                                <React.Fragment key={rowKey}>
                                  <tr 
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => toggleRowExpansion(classItem.className, section.name)}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        {isExpanded ? (
                                          <ChevronUp className="h-4 w-4 text-gray-500 mr-2" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-gray-500 mr-2" />
                                        )}
                                        <div className="text-sm font-medium text-gray-900">
                                          Class {classItem.className}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {section.name || 'All Sections'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className="text-sm font-medium text-gray-900">
                                          {section.count.toLocaleString()}
                                        </span>
                                        {idx === 0 && classItem.sections.length > 1 && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            (Total: {classItem.total})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">
                                        {section.avgMarks !== undefined ? `${section.avgMarks.toFixed(1)}%` : 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">
                                        {section.avgAttendance !== undefined ? `${section.avgAttendance.toFixed(1)}%` : 'N/A'}
                                      </span>
                                    </td>
                                  </tr>
                                  
                                  {/* Expanded row showing student details */}
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                                        {isLoadingStudents ? (
                                          <div className="flex justify-center items-center py-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-3 text-gray-600">Loading students...</span>
                                          </div>
                                        ) : students.length > 0 ? (
                                          <div className="space-y-2">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Student Details</h4>
                                            {console.log('📊 [ReportsPage] Displaying students:', students)}
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-100">
                                                <tr>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                    Student Name
                                                  </th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                    Avg. Marks
                                                  </th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                    Avg. Attendance
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="bg-white divide-y divide-gray-200">
                                                {students.map((student) => (
                                                  <tr key={student.studentId} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                      {student.studentName}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                      {student.avgMarks !== undefined && student.avgMarks !== null 
                                                        ? `${Number(student.avgMarks).toFixed(1)}%` 
                                                        : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                      {student.avgAttendance !== undefined && student.avgAttendance !== null 
                                                        ? `${Number(student.avgAttendance).toFixed(1)}%` 
                                                        : 'N/A'}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <div className="text-center py-4 text-gray-500">
                                            No student data available
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No class/section data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dues Tab */}
          {activeTab === 'dues' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <div className="flex space-x-2">
                  <button
                    onClick={handleExportToCSV}
                    disabled={loadingDues}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {loadingDues ? 'Exporting...' : 'Export to CSV'}
                  </button>
                  <button
                    onClick={fetchDuesList}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={loadingDues}
                  >
                    {loadingDues ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Outstanding Dues</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search students..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class / Section
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {/* Next Due column removed as requested */}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingDues ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                          </td>
                        </tr>
                      ) : duesList.length > 0 ? (
                        duesList.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                                  {record.rollNumber && (
                                    <div className="text-sm text-gray-500">{record.rollNumber}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{record.studentClass}</div>
                              <div className="text-sm text-gray-500">Sec: {record.studentSection}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(record.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {formatCurrency(record.totalPaid)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              {formatCurrency(record.totalPending)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={record.status.toLowerCase()} />
                            </td>
                            {/* Next Due data cell removed as requested */}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                            No dues records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                        disabled={pagination.page === 1}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          pagination.page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                        disabled={pagination.page >= pagination.pages}
                        className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          pagination.page >= pagination.pages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{pagination.total}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                            disabled={pagination.page === 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                              pagination.page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Previous</span>
                            &larr;
                          </button>
                          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                            // Show first page, last page, current page, and pages around current page
                            let pageNum;
                            if (pagination.pages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.page >= pagination.pages - 2) {
                              pageNum = pagination.pages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPagination({ ...pagination, page: pageNum })}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pagination.page === pageNum
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                            disabled={pagination.page >= pagination.pages}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                              pagination.page >= pagination.pages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Next</span>
                            &rarr;
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
