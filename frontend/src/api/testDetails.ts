import api from './axios';

// API endpoints configuration
const TEST_DETAILS_ENDPOINTS = {
  // School context endpoints (for current school from JWT)
  getBySchoolCode: () => `/test-details/`,
  updateSchoolTestDetails: () => `/test-details/`,
  addTestType: (className: string) => `/test-details/class/${className}/test-type`,
  removeTestType: (className: string, testCode: string) =>
    `/test-details/class/${className}/test-type/${testCode}`,

  // Superadmin endpoints (with explicit school code)
  getBySchoolCodeSuperadmin: (schoolCode: string) => `/test-details/school/${schoolCode}`,
  updateSchoolTestDetailsSuperadmin: (schoolCode: string) => `/test-details/school/${schoolCode}`,
  addTestTypeSuperadmin: (schoolCode: string, className: string) =>
    `/test-details/school/${schoolCode}/class/${className}/test-type`,
  removeTestTypeSuperadmin: (schoolCode: string, className: string, testCode: string) =>
    `/test-details/school/${schoolCode}/class/${className}/test-type/${testCode}`,

  // Legacy endpoint
  getBySchoolId: (schoolId: string) => `/test-details/${schoolId}`
};// Configuration for test details operations
const TEST_DETAILS_CONFIG = {
  defaultAcademicYear: import.meta.env.VITE_DEFAULT_ACADEMIC_YEAR || '2024-25',
  defaultMaxMarks: parseInt(import.meta.env.VITE_DEFAULT_MAX_MARKS || '100'),
  defaultWeightage: parseFloat(import.meta.env.VITE_DEFAULT_WEIGHTAGE || '0.1'),
  maxGrade: parseInt(import.meta.env.VITE_MAX_GRADE || '12'),
  prePrimaryClasses: (import.meta.env.VITE_PRE_PRIMARY_CLASSES || 'LKG,UKG').split(',')
};

// API functions
export const testDetailsAPI = {
  // Fetch test details for current school (from JWT token)
  async getTestDetailsBySchoolCode(academicYear?: string) {
    console.log('[DEBUG] getTestDetailsBySchoolCode called with academicYear:', academicYear);
    console.log('[DEBUG] TEST_DETAILS_CONFIG.defaultAcademicYear:', TEST_DETAILS_CONFIG.defaultAcademicYear);
    const params = academicYear ? { academicYear } : { academicYear: TEST_DETAILS_CONFIG.defaultAcademicYear };
    console.log('[DEBUG] Final params:', params);
    const response = await api.get(TEST_DETAILS_ENDPOINTS.getBySchoolCode(), { params });
    return response.data;
  },

  // Add a test type to a specific class
  async addTestTypeToClass(className: string, testType: any, academicYear?: string) {
    const data = {
      testType,
      academicYear: academicYear || TEST_DETAILS_CONFIG.defaultAcademicYear
    };
    const response = await api.post(TEST_DETAILS_ENDPOINTS.addTestType(className), data);
    return response.data;
  },

  // Remove a test type from a specific class
  async removeTestTypeFromClass(className: string, testCode: string, academicYear?: string) {
    const params = academicYear ? { academicYear } : { academicYear: TEST_DETAILS_CONFIG.defaultAcademicYear };
    const response = await api.delete(TEST_DETAILS_ENDPOINTS.removeTestType(className, testCode), { params });
    return response.data;
  },

  // Bulk update test details for current school
  async updateSchoolTestDetails(classTestTypes: any, academicYear?: string) {
    const data = {
      classTestTypes,
      academicYear: academicYear || TEST_DETAILS_CONFIG.defaultAcademicYear
    };
    const response = await api.put(TEST_DETAILS_ENDPOINTS.updateSchoolTestDetails(), data);
    return response.data;
  },

  // Superadmin functions (with explicit school code)
  async getTestDetailsBySchoolCodeSuperadmin(schoolCode: string, academicYear?: string) {
    const params = academicYear ? { academicYear } : { academicYear: TEST_DETAILS_CONFIG.defaultAcademicYear };
    const response = await api.get(TEST_DETAILS_ENDPOINTS.getBySchoolCodeSuperadmin(schoolCode), { params });
    return response.data;
  },

  async addTestTypeToClassSuperadmin(schoolCode: string, className: string, testType: any, academicYear?: string) {
    const data = {
      testType,
      academicYear: academicYear || TEST_DETAILS_CONFIG.defaultAcademicYear
    };
    const response = await api.post(TEST_DETAILS_ENDPOINTS.addTestTypeSuperadmin(schoolCode, className), data);
    return response.data;
  },

  async removeTestTypeFromClassSuperadmin(schoolCode: string, className: string, testCode: string, academicYear?: string) {
    const params = academicYear ? { academicYear } : { academicYear: TEST_DETAILS_CONFIG.defaultAcademicYear };
    const response = await api.delete(TEST_DETAILS_ENDPOINTS.removeTestTypeSuperadmin(schoolCode, className, testCode), { params });
    return response.data;
  },

  async updateSchoolTestDetailsSuperadmin(schoolCode: string, classTestTypes: any, academicYear?: string) {
    const data = {
      classTestTypes,
      academicYear: academicYear || TEST_DETAILS_CONFIG.defaultAcademicYear
    };
    const response = await api.put(TEST_DETAILS_ENDPOINTS.updateSchoolTestDetailsSuperadmin(schoolCode), data);
    return response.data;
  }
};

// Export configuration
export { TEST_DETAILS_CONFIG, TEST_DETAILS_ENDPOINTS };

// Helper functions
export const testDetailsHelpers = {
  // Generate class list dynamically
  generateClassList(): string[] {
    const classes = [...TEST_DETAILS_CONFIG.prePrimaryClasses];
    for (let i = 1; i <= TEST_DETAILS_CONFIG.maxGrade; i++) {
      classes.push(i.toString());
    }
    return classes;
  },

  // Get default test type template
  getDefaultTestType() {
    return {
      name: '',
      code: '',
      description: '',
      maxMarks: TEST_DETAILS_CONFIG.defaultMaxMarks,
      weightage: TEST_DETAILS_CONFIG.defaultWeightage,
      isActive: true
    };
  },

  // Clean test type data for backend (remove frontend-specific fields)
  cleanTestType(testType: any) {
    const { _id, ...cleanTestType } = testType;
    return cleanTestType;
  },

  // Generate auto test code
  generateTestCode(prefix = 'TEST'): string {
    return `${prefix}_${Date.now()}`;
  }
};