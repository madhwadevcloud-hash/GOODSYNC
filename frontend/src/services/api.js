import axios from 'axios';

// Use Vite env var, fallback to local backend
const API_BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:5050/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Try to get token from multiple possible storage locations
    let token = localStorage.getItem('token');
    console.log('[API] Token from localStorage (token):', token);

    if (!token) {
      token = localStorage.getItem('authToken');
      console.log('[API] Token from localStorage (authToken):', token);
    }

    if (!token) {
      // Try to get from auth context storage
      const authData = localStorage.getItem('erp.auth');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          token = parsed.token;
          console.log('[API] Token from erp.auth:', token);
        } catch (err) {
          console.error('[API] Error parsing auth data:', err);
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API] Authorization header set.');
    } else {
      console.warn('[API] No token found. Authorization header not set.');
    }

    // Add school code header
    let schoolCode;
    const authData = localStorage.getItem('erp.auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        schoolCode = parsed.user?.schoolCode;
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }

    if (!schoolCode) {
      schoolCode = localStorage.getItem('erp.schoolCode');
    }

    if (schoolCode) {
      config.headers['x-school-code'] = schoolCode;
    }

    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);

    // Only redirect on auth errors if not a school or user API call
    // This prevents redirect loops when the dashboard is loading
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isSchoolOrUserApi = url.includes('/schools/') || url.includes('/users/');

      // For school API failures, don't redirect immediately
      if (!isSchoolOrUserApi) {
        console.log('Unauthorized access. Redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('erp.auth');

        // Use timeout to avoid immediate redirect, allowing error messages to be shown
        setTimeout(() => {
          window.location.href = '/login?session=expired';
        }, 1000);
      } else {
        console.warn('Auth error on school/user API. Not redirecting to prevent loop.');
      }
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
};

// School Management APIs
export const schoolAPI = {
  createSchool: (schoolData) => {
    // If schoolData is FormData (for file uploads), delete Content-Type to let browser set it with boundary
    const config = schoolData instanceof FormData ? {
      headers: {
        'Content-Type': undefined
      }
    } : {};
    return api.post('/schools', schoolData, config);
  },
  getAllSchools: () => api.get('/schools'),
  getSchoolById: (schoolId) => {
    console.log(`Fetching school details for ID: ${schoolId}`);
    return api.get(`/schools/${schoolId}/info`);
  },
  updateSchool: (schoolId, updateData) => {
    // If updateData is FormData (for file uploads), delete Content-Type to let browser set it with boundary
    const config = updateData instanceof FormData ? {
      headers: {
        'Content-Type': undefined
      }
    } : {};
    return api.put(`/schools/${schoolId}`, updateData, config);
  },
  deleteSchool: (schoolId) => api.delete(`/schools/${schoolId}`),
  updateAccessMatrix: (schoolId, accessMatrix) => api.patch(`/schools/${schoolId}/access-matrix`, { accessMatrix }),
  updateBankDetails: (schoolId, bankDetails) => api.patch(`/schools/${schoolId}/bank-details`, { bankDetails }),
  updateUserRole: (schoolId, userId, newRole) => api.put(`/schools/${schoolId}/users/${userId}`, { role: newRole }),
  updateSchoolSettings: (schoolId, settings) => api.put(`/schools/${schoolId}`, { settings }),
  getSchoolStats: (schoolId) => api.get(`/schools/${schoolId}/stats`),
  getAllSchoolsStats: () => api.get('/schools/all-stats'),
  toggleSchoolStatus: (schoolId) => api.patch(`/schools/${schoolId}/toggle-status`),
};

// User Management APIs
export const userAPI = {
  createUser: (userData) => api.post('/users', userData),
  addTeacher: (teacherData) => api.post('/users/teachers', teacherData),
  addStudent: (studentData) => api.post('/users/students', studentData),
  addParent: (parentData) => api.post('/users/parents', parentData),
  getUsers: (schoolId, params) => api.get(`/schools/${schoolId}/users`, { params }),
  getUsersByRole: (role, params) => api.get(`/users/role/${role}`, { params }),
  getUserById: (userId) => api.get(`/users/${userId}`),
  updateUser: (userId, updateData) => api.put(`/users/${userId}`, updateData),
  resetUserPassword: (userId) => api.patch(`/users/${userId}/reset-password`),
  toggleUserStatus: (userId) => api.patch(`/users/${userId}/toggle-status`),
};

// Admission Management APIs
export const admissionAPI = {
  createAdmission: (admissionData) => api.post('/admissions', admissionData),
  getAdmissions: (params) => api.get('/admissions', { params }),
  getAdmissionById: (admissionId) => api.get(`/admissions/${admissionId}`),
  updateAdmission: (admissionId, updateData) => api.put(`/admissions/${admissionId}`, updateData),
  approveAdmission: (admissionId, adminNotes) => api.patch(`/admissions/${admissionId}/approve`, { adminNotes }),
  rejectAdmission: (admissionId, rejectionReason, adminNotes) =>
    api.patch(`/admissions/${admissionId}/reject`, { rejectionReason, adminNotes }),
  getAdmissionStats: (params) => api.get('/admissions/stats', { params }),
  searchAdmissions: (searchParams) => api.get('/admissions/search', { params: searchParams }),
};

// Assignment Management APIs
export const assignmentAPI = {
  createAssignment: (assignmentData) => api.post('/assignments', assignmentData),
  getAssignments: (params) => api.get('/assignments', { params }),
  fetchAssignments: () => api.get('/assignments').then(res => res.data),
  getAssignmentById: (assignmentId) => api.get(`/assignments/${assignmentId}`),
  updateAssignment: (assignmentId, updateData) => api.put(`/assignments/${assignmentId}`, updateData),
  publishAssignment: (assignmentId) => api.patch(`/assignments/${assignmentId}/publish`),
  deleteAssignment: (assignmentId) => api.delete(`/assignments/${assignmentId}`),
  getAssignmentStats: (params) => api.get('/assignments/stats', { params }),
  createAssignmentWithFiles: (formData) => api.post('/assignments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
};

// Attendance Management APIs
export const attendanceAPI = {
  markAttendance: (attendanceData) => api.post('/attendance/mark', attendanceData),
  getAttendance: (params) => api.get('/attendance', { params }),
  getAttendanceStats: (params) => api.get('/attendance/stats', { params }),
  lockAttendance: (attendanceId) => api.patch(`/attendance/${attendanceId}/lock`),
  getStudentAttendanceReport: (params) => api.get('/attendance/student-report', { params }),
  markSessionAttendance: (data) => api.post('/attendance/mark-session', data),
  checkSessionStatus: (params) => api.get('/attendance/session-status', { params }),
};

// Export/Import APIs
export const exportImportAPI = {
  // Export users to CSV/Excel
  exportUsers: (schoolCode, params) => api.get(`/export-import/${schoolCode}/export`, { // <-- Corrected path
    params,
    responseType: 'blob'
  }),

  // Import users from CSV
  importUsers: (schoolCode, file) => {
    const formData = new FormData();
    formData.append('file', file);
    // You might need to add the role here if the backend expects it for import routing
    // formData.append('role', 'student'); // Or 'teacher', 'admin' depending on context
    return api.post(`/export-import/${schoolCode}/import`, formData, { // <-- Corrected path
      headers: {
        'Content-Type': 'multipart/form-data'
      }
      // Add onUploadProgress here if needed
    });
  },

  // Generate template for import
  generateTemplate: (schoolCode, role) => api.get(`/export-import/${schoolCode}/template`, { // <-- Fixed: role as query param
    params: { role },
    responseType: 'blob'
  })
};

// Academic Results APIs
export const resultsAPI = {
  // Get students for a specific class and section
  getStudents: (schoolCode, params) => api.get('/users/role/student', {
    params,
    headers: {
      'X-School-Code': schoolCode
    }
  }),

  // Save student results for a test
  saveResults: (resultsData) => api.post('/results/save', resultsData),

  // Get existing results for a test
  getResults: (params) => api.get('/results', { params }),

  // Teacher-specific formatted results view
  getResultsForTeacher: (params) => api.get('/results/teacher/view', { params }),

  // Update a specific result (use PUT as primary)
  updateResult: (resultId, updateData) => api.put(`/results/${resultId}`, updateData),

  // Freeze results for a class/section/subject/test
  freezeResults: (freezeData) => api.post('/results/freeze', freezeData),

  // Delete a result
  deleteResult: (resultId) => api.delete(`/results/${resultId}`),

  // Get results statistics
  getResultsStats: (params) => api.get('/results/stats', { params }),
};

// Class Management API
export const classAPI = {
  // Get all classes for a school
  getSchoolClasses: async (schoolId) => {
    const response = await api.get(`/superadmin/classes/schools/${schoolId}/classes`);
    return response.data;
  },

  // Add a new class
  addClass: async (schoolId, classData) => {
    const response = await api.post(`/superadmin/classes/schools/${schoolId}/classes`, classData);
    return response.data;
  },

  // Add section to existing class
  addSectionToClass: async (schoolId, classId, section) => {
    const response = await api.post(`/superadmin/classes/schools/${schoolId}/classes/${classId}/sections`, { section });
    return response.data;
  },

  // Remove section from class
  removeSectionFromClass: async (schoolId, classId, section) => {
    const response = await api.delete(`/superadmin/classes/schools/${schoolId}/classes/${classId}/sections`, { data: { section } });
    return response.data;
  },

  // Update class information
  updateClass: async (schoolId, classId, updateData) => {
    const response = await api.put(`/superadmin/classes/schools/${schoolId}/classes/${classId}`, updateData);
    return response.data;
  },

  // Delete class (soft delete)
  deleteClass: async (schoolId, classId) => {
    const response = await api.delete(`/superadmin/classes/schools/${schoolId}/classes/${classId}`);
    return response.data;
  },

  // Get available classes for dropdown (used in test configuration)
  getAvailableClasses: async (schoolId) => {
    const response = await api.get(`/superadmin/classes/schools/${schoolId}/classes/available`);
    return response.data;
  }
};

// Test Management API
export const testAPI = {
  // Get all tests for a school
  getSchoolTests: async (schoolId) => {
    const response = await api.get(`/superadmin/tests/schools/${schoolId}/tests`);
    return response.data;
  },

  // Add a new test
  addTest: async (schoolId, testData) => {
    const response = await api.post(`/superadmin/tests/schools/${schoolId}/tests`, testData);
    return response.data;
  },

  // Update test information
  updateTest: async (schoolId, testId, updateData) => {
    const response = await api.put(`/superadmin/tests/schools/${schoolId}/tests/${testId}`, updateData);
    return response.data;
  },

  // Delete test (soft delete)
  deleteTest: async (schoolId, testId) => {
    const response = await api.delete(`/superadmin/tests/schools/${schoolId}/tests/${testId}`);
    return response.data;
  },

  // Get tests for a specific class
  getTestsByClass: async (schoolId, className) => {
    const response = await api.get(`/superadmin/tests/schools/${schoolId}/tests/class/${className}`);
    return response.data;
  }
};

// Utility functions
export const apiUtils = {
  // Handle API errors
  handleError: (error) => {
    if (error.response) {
      return error.response.data.message || 'An error occurred';
    } else if (error.request) {
      return 'Network error. Please check your connection.';
    } else {
      return 'An unexpected error occurred.';
    }
  },

  // Format date for API
  formatDate: (date) => {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
  },

  // Format date time for API
  formatDateTime: (date) => {
    if (!date) return null;
    return new Date(date).toISOString();
  },

  // Parse API response
  parseResponse: (response) => {
    return response.data;
  },

  // Create query string from object
  createQueryString: (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return searchParams.toString();
  },
};

// Messages API
export const messagesAPI = {
  sendMessage: (messageData) => api.post('/messages/send', messageData),
  previewMessage: (previewData) => api.post('/messages/preview', previewData),
  getMessages: (params) => api.get('/messages', { params }),
  getMessageDetails: (messageId) => api.get(`/messages/${messageId}`),
  getMessageStats: (params) => api.get('/messages/stats', { params }),
};

// Classes API - Uses different endpoints based on user role
export const classesAPI = {
  getSchoolClasses: (schoolCode) => {
    // Get the token from localStorage to check user role
    const authData = localStorage.getItem('erp.auth');
    let isSuperAdmin = false;

    try {
      if (authData) {
        const parsed = JSON.parse(authData);
        isSuperAdmin = parsed.role === 'superadmin' || parsed.userType === 'superadmin';
      }
    } catch (err) {
      console.error('Error parsing auth data:', err);
    }

    // Use superadmin endpoint for superadmins, regular endpoint for others
    const endpoint = isSuperAdmin
      ? `/superadmin/classes/schools/${schoolCode}/classes`
      : `/schools/${schoolCode}/classes`;

    console.log(`🔍 [classesAPI] Using endpoint: ${endpoint}`);
    return api.get(endpoint);
  },

  getSectionsForClass: (schoolCode, classId) => {
    // Get the token from localStorage to check user role
    const authData = localStorage.getItem('erp.auth');
    let isSuperAdmin = false;

    try {
      if (authData) {
        const parsed = JSON.parse(authData);
        isSuperAdmin = parsed.role === 'superadmin' || parsed.userType === 'superadmin';
      }
    } catch (err) {
      console.error('Error parsing auth data:', err);
    }

    // Use superadmin endpoint for superadmins, regular endpoint for others
    const endpoint = isSuperAdmin
      ? `/superadmin/classes/schools/${schoolCode}/classes/${classId}/sections`
      : `/schools/${schoolCode}/classes/${classId}/sections`;

    console.log(`🔍 [classesAPI] Using endpoint: ${endpoint}`);
    return api.get(endpoint);
  },
};

// Fees API
export const feesAPI = {
  // Get next chalan number from the server
  getNextChalanNumber: async () => {
    try {
      const response = await api.get('/chalans/next-chalan-number');
      return response.data;
    } catch (error) {
      console.error('Error getting next chalan number:', error);
      throw error;
    }
  },
  createFeeStructure: (feeStructureData) => api.post('/fees/structures', feeStructureData),
  getFeeStructures: (params) => api.get('/fees/structures', { params }),
  deleteFeeStructure: (id) => api.delete(`/fees/structures/${id}`),
  getStudentFeeRecords: (params) => api.get('/fees/records', { params }),
  getStudentFeeRecord: async (identifier) => {
    if (!identifier) {
      throw new Error('No student identifier provided');
    }

    console.log(`Attempting to fetch fee record for identifier: ${identifier}`);

    try {
      // Use the correct endpoint for fetching fee records
      const response = await api.get(`/fees/records/${identifier}`);
      console.log('Successfully fetched fee record:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching student fee record:', error);

      // Provide a detailed error message
      let errorMessage = 'Failed to fetch student fee record.\n\n';
      errorMessage += `Tried endpoint: /fees/records/${identifier}\n\n`;
      errorMessage += 'Please check that the student exists and has fee records.';

      throw new Error(errorMessage);
    }
  },
  getStudentByUserId: (userId) => {
    // First try to get the user directly by ID
    return api.get(`/users/${userId}`)
      .then(response => {
        // If successful, return the user data
        return { data: { data: response.data } };
      })
      .catch(() => {
        // If direct fetch fails, search by role
        return api.get(`/users/role/student?userId=${userId}`)
          .then(response => {
            const students = response.data?.data || [];
            const student = students.find(s =>
              s._id === userId ||
              s.userId === userId ||
              s.user_id === userId
            );

            if (student) {
              return { data: { data: student } };
            }
            throw new Error('Student not found');
          });
      });
  },
  getSchoolInfo: (schoolCode) => api.get(`/admin/classes/${schoolCode}/classes-sections`), // Use existing working endpoint
  downloadReceipt: (receiptNumber) => api.get(`/fees/receipts/${receiptNumber}`, { responseType: 'blob' }),
  recordOfflinePayment: (studentId, paymentData) => api.post(`/fees/records/${studentId}/offline-payment`, paymentData),
  getFeeStats: (params) => api.get('/fees/stats', { params }),

  // Generate a new chalan
  generateChalan: async (chalanData) => {
    try {
      // First, get the next available chalan number
      const { data: { chalanNumber } } = await api.get('/chalans/next-chalan-number');

      // Add the chalan number to the request data
      const requestData = {
        ...chalanData,
        chalanNumber,
        status: 'generated',
        generatedAt: new Date().toISOString(),
        // Add school ID from the current user's context
        schoolId: JSON.parse(localStorage.getItem('user') || '{}').schoolId
      };

      // Make the API call to generate the chalan
      const response = await api.post('/chalans/generate', requestData);

      // Return the response data with success status
      return {
        success: true,
        data: response.data,
        message: 'Chalan generated successfully'
      };
    } catch (error) {
      console.error('Error generating chalan:', error);

      // Return a structured error response
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to generate chalan',
        status: error.response?.status || 500
      };
    }
  },
};

// Reports API
export const reportsAPI = {
  getSchoolSummary: (params) => api.get('/reports/summary', { params }),
  getClassSummary: (params) => api.get('/reports/class-summary', { params }),
  getClassDetail: (className, params) => api.get(`/reports/class/${className}/detail`, { params }),
  getStudentProfile: (studentId) => api.get(`/reports/student/${studentId}/profile`),
  exportData: (params) => api.get('/reports/export', { params, responseType: 'blob' }),
  getDuesList: (params) => api.get('/reports/dues', { params }),
  getClassWiseAnalysis: (params) => api.get('/reports/class-wise', { params }),
  getPaymentTrends: (params) => api.get('/reports/payment-trends', { params }),
};

// Export the api instance for custom requests
export default api;
