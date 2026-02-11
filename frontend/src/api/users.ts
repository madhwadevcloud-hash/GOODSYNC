import { api } from './client';
import { UserRole } from '../auth/types';
import { SchoolUserRole } from '../roles/superadmin/types/school';

// Map between SchoolUserRole and API UserRole (lowercase)
const roleMap: Record<SchoolUserRole, UserRole> = {
  admin: 'admin',
  teacher: 'teacher',
  student: 'student',
  parent: 'parent'
} as const;

export interface UserCreateDTO {
  name: string;
  email: string;
  role: SchoolUserRole;
  schoolId: string;
  subjects?: string[];
  classes?: string[];
  class?: string;
  rollNumber?: string;
}

export interface UserUpdateDTO {
  name?: string;
  email?: string;
  role?: SchoolUserRole;
  subjects?: string[];
  classes?: string[];
  class?: string;
  rollNumber?: string;
  status?: 'active' | 'inactive';
}

// Convert school role to API role (lowercase)
const getApiRole = (role: SchoolUserRole): UserRole => {
  switch (role) {
    case 'admin': return 'admin';
    case 'teacher': return 'teacher';
    case 'student': return 'student';
    case 'parent': return 'parent';
    default:
      throw new Error(`Invalid role: ${role}`);
  }
};

// API functions for user management
export interface BulkUpdateDTO {
  userIds: string[];
  update: {
    role?: SchoolUserRole;
    status?: 'active' | 'inactive';
  };
}

export const userApi = {
  // Create a new user (including admin)
  createUser: async (data: UserCreateDTO) => {
    const apiData = {
      ...data,
      role: getApiRole(data.role)
    };

    const response = await api<{ user: any; temporaryPassword: string }>(`/users`, {
      method: 'POST',
      body: JSON.stringify(apiData),
    });
    return response;
  },

  // Update user data
  updateUser: async (userId: string, data: UserUpdateDTO) => {
    const apiData = {
      ...data,
      role: data.role ? getApiRole(data.role) : undefined
    };

    const response = await api<{ user: any }>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(apiData),
    });
    return response;
  },

  // Bulk update users
  bulkUpdateUsers: async (data: BulkUpdateDTO) => {
    const apiData = {
      userIds: data.userIds,
      update: {
        ...data.update,
        role: data.update.role ? getApiRole(data.update.role) : undefined
      }
    };

    const response = await api<{ users: any[] }>(`/users/bulk`, {
      method: 'PATCH',
      body: JSON.stringify(apiData),
    });
    return response;
  },

  // Generate new password for user
  generatePassword: async (userId: string) => {
    const response = await api<{ temporaryPassword: string }>(`/users/${userId}/generate-password`, {
      method: 'POST',
    });
    return response;
  },

  // Get users for a school
  getSchoolUsers: async (schoolId: string) => {
    const response = await api<{ users: any[] }>(`/schools/${schoolId}/users`);
    return response;
  },
};
