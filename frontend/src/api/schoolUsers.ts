//
// File: jayeshsardesai/erp/ERP-7a5c138ae65bf53237b3e294be93792d26fb324a/frontend/src/api/schoolUsers.ts
//
import api from './axios'; // Use the same axios instance

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// School User Management API
export const schoolUserAPI = {
  // Add user to school
  addUser: async (schoolCode: string, userData: any, token: string) => {
    try {
      const response = await api.post(
        `/school-users/${schoolCode}/users`,
        userData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add user');
    }
  },

  // Get all users in a school
  getAllUsers: async (schoolCode: string, token: string) => {
    try {
      console.log(`🔍 Calling API: GET /school-users/${schoolCode}/users`);
      console.log(`🔐 Using token: ${token ? token.substring(0, 20) + '...' : 'MISSING'}`);

      const response = await api.get(
        `/school-users/${schoolCode}/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('✅ API Response:', response);
      // Return the data field which contains the grouped users, with proper null checking
      return response.data || {};
    } catch (error: any) {
      console.error('❌ API Error Details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers
      });

      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users';
      throw new Error(errorMessage);
    }
  },

  // Get users by role
  getUsersByRole: async (schoolCode: string, role: string, token: string) => {
    try {
      const response = await api.get(
        `/school-users/${schoolCode}/users/role/${role}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  },

  // Get specific user
  getUser: async (schoolCode: string, userId: string, token: string) => {
    try {
      const response = await api.get(
        `/school-users/${schoolCode}/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user');
    }
  },

  // Update user
  updateUser: async (schoolCode: string, userId: string, updateData: any, token: string) => {
    try {
      const response = await api.put(
        `/school-users/${schoolCode}/users/${userId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user');
    }
  },

  // Reset user password
  resetPassword: async (schoolCode: string, userId: string, token: string) => {
    try {
      const response = await api.post(
        `/school-users/${schoolCode}/users/${userId}/reset-password`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  },

  // Change user password (admin sets new password)
  changePassword: async (schoolCode: string, userId: string, newPassword: string, token: string) => {
    try {
      const response = await api.post(
        `/school-users/${schoolCode}/users/${userId}/change-password`,
        { newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  },

  // Toggle user status
  toggleStatus: async (schoolCode: string, userId: string, isActive: boolean, token: string) => {
    try {
      const response = await api.patch(
        `/school-users/${schoolCode}/users/${userId}/status`,
        { isActive },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user status');
    }
  },

  // Get all school users (simplified version for attendance)
  getSchoolUsers: async () => {
    try {
      const response = await api.get('/users/role/student');
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error('Error fetching school users:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch school users');
    }
  },

  // Delete user
  deleteUser: async (schoolCode: string, userId: string, token: string) => {
    try {
      const response = await api.delete(
        `/school-users/${schoolCode}/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete user');
    }
  },

  // Get access matrix
  getAccessMatrix: async (schoolCode: string, token: string) => {
    try {
      const response = await api.get(
        `/school-users/${schoolCode}/access-matrix`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch access matrix');
    }
  },

  // Update access matrix
  updateAccessMatrix: async (schoolCode: string, matrix: any, token: string) => {
    try {
      const response = await api.put(
        `/school-users/${schoolCode}/access-matrix`,
        { matrix },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update access matrix');
    }
  },

  // Import users from CSV
  importUsers: async (schoolCode: string, file: File, role: 'student' | 'teacher', token: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('role', role);

      const response = await api.post(
        `/school-users/${schoolCode}/import/users`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response;
    } catch (error: any) {
      if (error.response) {
        throw error.response.data;
      } else {
        throw new Error('Import failed: An unknown error occurred');
      }
    }
  },

  // Verify admin password and get teacher passwords
  verifyAdminAndGetPasswords: async (schoolCode: string, adminPassword: string, teacherUserId: string | null, token: string) => {
    try {
      const response = await api.post(
        `/school-users/${schoolCode}/verify-admin-password`,
        {
          adminPassword,
          teacherUserId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify password');
    }
  }
};

// School login API
export const schoolAuthAPI = {
  login: async (identifier: string, password: string, schoolCode: string) => {
    try {
      const response = await api.post(`/auth/school-login`, {
        identifier,
        password,
        schoolCode
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }
};

// Types for TypeScript
export interface User {
  _id: string;
  userId: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  name: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
  contact: {
    primaryPhone: string;
    secondaryPhone?: string;
    emergencyContact?: string;
  };
  address?: any;
  schoolCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  academicInfo?: any; // For students
  teachingInfo?: any; // For teachers
  adminInfo?: any; // For admins
  parentInfo?: any; // For parents
}

export interface CreateUserData {
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  firstName: string;
  lastName: string;
  phone?: string;
  // Role-specific fields
  class?: string; // For students
  section?: string; // For students
  rollNumber?: string; // For students
  subjects?: string[]; // For teachers
  qualification?: string; // For teachers
  department?: string; // For admins
  occupation?: string; // For parents
  relationToStudent?: string; // For parents
}

export interface UserCredentials {
  userId: string;
  email: string;
  password: string;
  loginUrl?: string;
  message?: string;
}

export interface AccessMatrix {
  admin: {
    [permission: string]: boolean;
  };
  teacher: {
    [permission: string]: boolean;
  };
  student: {
    [permission: string]: boolean;
  };
  parent: {
    [permission: string]: boolean;
  };
}