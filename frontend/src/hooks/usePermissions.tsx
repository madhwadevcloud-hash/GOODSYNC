import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { schoolAPI } from '../services/api';
import api from '../services/api';

export type PermissionKey =
  | 'manageUsers'
  | 'manageSchoolSettings'
  | 'viewAttendance'
  | 'viewResults'
  | 'viewLeaves'
  | 'messageStudentsParents'
  | 'viewAcademicDetails'
  | 'viewAssignments'
  | 'viewFees'
  | 'viewReports';

export interface RolePermissions {
  manageUsers: boolean;
  manageSchoolSettings: boolean;
  viewAttendance: boolean;
  viewResults: boolean;
  viewLeaves: boolean;
  messageStudentsParents: boolean;
  viewAcademicDetails: boolean;
  viewAssignments: boolean;
  viewFees: boolean;
  viewReports: boolean;
}

export interface AccessMatrix {
  admin: RolePermissions;
  teacher: RolePermissions;
  student: RolePermissions;
  parent: RolePermissions;
}

export interface PermissionContextType {
  permissions: RolePermissions | null;
  loading: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  showPermissionDenied: boolean;
  setShowPermissionDenied: (show: boolean) => void;
  deniedPermissionName: string;
  setDeniedPermissionName: (name: string) => void;
  checkAndNavigate: (permission: PermissionKey, permissionName: string, callback: () => void) => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPermissionDenied, setShowPermissionDenied] = useState(false);
  const [deniedPermissionName, setDeniedPermissionName] = useState('');

  useEffect(() => {
    async function fetchPermissions() {
      if (!user || !token || !user.schoolId) {
        setLoading(false);
        return;
      }

      // Superadmin has all permissions
      if (user.role === 'superadmin') {
        setPermissions({
          manageUsers: true,
          manageSchoolSettings: true,
          viewAttendance: true,
          viewResults: true,
          viewLeaves: true,
          messageStudentsParents: true,
          viewAcademicDetails: true,
          viewAssignments: true,
          viewFees: true,
          viewReports: true,
        });
        setLoading(false);
        return;
      }

      try {
        console.log('[PERMISSIONS] Fetching access matrix for user:', { schoolId: user.schoolId, schoolCode: user.schoolCode });

        // Get school code from various possible sources
        const schoolCode = (user.schoolCode || localStorage.getItem('erp.schoolCode')) as string;
        const schoolId = user.schoolId as string;

        console.log('[PERMISSIONS] School identifiers:', { schoolId, schoolCode });

        // If we have a school code, use it to get permissions from the school's dedicated database
        if (schoolCode) {
          try {
            console.log('[PERMISSIONS] Fetching permissions from school database via code:', schoolCode);
            // Use the school-user access-matrix endpoint which gets it from the school's dedicated DB
            const response = await api.get(`/school-users/${schoolCode}/access-matrix`);
            const accessMatrix = response.data?.data || response.data;

            console.log('[PERMISSIONS] Received access matrix from school DB:', accessMatrix);

            if (accessMatrix && accessMatrix[user.role]) {
              const rolePermissions = accessMatrix[user.role];
              console.log('[PERMISSIONS] Loaded permissions for', user.role, ':', rolePermissions);

              if (rolePermissions) {
                setPermissions(rolePermissions);
                setLoading(false);
                return;
              }
            }
          } catch (schoolError) {
            console.error('[PERMISSIONS] Failed to fetch from school database:', schoolError);
          }
        }

        // Try fetching by ID/code as fallback
        let response;
        try {
          response = await schoolAPI.getSchoolById(schoolId);
        } catch (error) {
          console.error('[PERMISSIONS] Failed to fetch school:', error);
          // Default permissions on error - admin gets all
          const errorPermissions = user.role === 'admin' ? {
            manageUsers: true,
            manageSchoolSettings: true,
            viewAttendance: true,
            viewResults: true,
            viewLeaves: true,
            messageStudentsParents: true,
            viewAcademicDetails: true,
            viewAssignments: true,
            viewFees: true,
            viewReports: true,
          } : {
            manageUsers: false,
            manageSchoolSettings: false,
            viewAttendance: false,
            viewResults: false,
            viewLeaves: false,
            messageStudentsParents: false,
            viewAcademicDetails: false,
            viewAssignments: false,
            viewFees: false,
            viewReports: false,
          };
          setPermissions(errorPermissions);
          setLoading(false);
          return;
        }

        const school = response.data?.school || response.data;
        console.log('[PERMISSIONS] Full school object:', school);
        console.log('[PERMISSIONS] Access matrix:', school?.accessMatrix);

        if (school && school.accessMatrix) {
          const rolePermissions = school.accessMatrix[user.role];
          console.log('[PERMISSIONS] Loaded permissions for', user.role, ':', rolePermissions);
          console.log('[PERMISSIONS] Role permissions type:', typeof rolePermissions);
          console.log('[PERMISSIONS] Role permissions values:', JSON.stringify(rolePermissions));

          if (rolePermissions) {
            setPermissions(rolePermissions);
          } else {
            // If no role-specific permissions found in matrix, default to all true for admin, false for others
            const defaultPermissions = user.role === 'admin' ? {
              manageUsers: true,
              manageSchoolSettings: true,
              viewAttendance: true,
              viewResults: true,
              viewLeaves: true,
              messageStudentsParents: true,
              viewAcademicDetails: true,
              viewAssignments: true,
              viewFees: true,
              viewReports: true,
            } : {
              manageUsers: false,
              manageSchoolSettings: false,
              viewAttendance: false,
              viewResults: false,
              viewLeaves: false,
              messageStudentsParents: false,
              viewAcademicDetails: false,
              viewAssignments: false,
              viewFees: false,
              viewReports: false,
            };
            setPermissions(defaultPermissions);
          }
        } else {
          console.warn('[PERMISSIONS] No access matrix found');
          // If no access matrix found in school, default based on role
          const defaultPermissions = user.role === 'admin' ? {
            manageUsers: true,
            manageSchoolSettings: true,
            viewAttendance: true,
            viewResults: true,
            viewLeaves: true,
            messageStudentsParents: true,
            viewAcademicDetails: true,
            viewAssignments: true,
            viewFees: true,
            viewReports: true,
          } : {
            manageUsers: false,
            manageSchoolSettings: false,
            viewAttendance: false,
            viewResults: false,
            viewLeaves: false,
            messageStudentsParents: false,
            viewAcademicDetails: false,
            viewAssignments: false,
            viewFees: false,
            viewReports: false,
          };
          setPermissions(defaultPermissions);
        }
      } catch (error) {
        console.error('[PERMISSIONS] Error fetching permissions:', error);
        // On error, default based on role - admin gets all permissions
        const errorPermissions = user.role === 'admin' ? {
          manageUsers: true,
          manageSchoolSettings: true,
          viewAttendance: true,
          viewResults: true,
          viewLeaves: true,
          messageStudentsParents: true,
          viewAcademicDetails: true,
          viewAssignments: true,
          viewFees: true,
          viewReports: true,
        } : {
          manageUsers: false,
          manageSchoolSettings: false,
          viewAttendance: false,
          viewResults: false,
          viewLeaves: false,
          messageStudentsParents: false,
          viewAcademicDetails: false,
          viewAssignments: false,
          viewFees: false,
          viewReports: false,
        };
        setPermissions(errorPermissions);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();

    // Add event listener for permission refresh
    const handlePermissionRefresh = async () => {
      console.log('[PERMISSIONS] Refreshing permissions due to access matrix update');
      // Re-fetch permissions from the backend
      if (user && user.schoolId && user.role !== 'superadmin') {
        try {
          let response;
          try {
            // Try fetching from school database first
            const schoolCode = user.schoolCode || localStorage.getItem('erp.schoolCode');
            if (schoolCode) {
              response = await api.get(`/school-users/${schoolCode}/access-matrix`);
              const accessMatrix = response.data?.data || response.data;

              if (accessMatrix && accessMatrix[user.role]) {
                const rolePermissions = accessMatrix[user.role];
                console.log('[PERMISSIONS] Refreshed permissions for', user.role, ':', rolePermissions);
                setPermissions(rolePermissions || null);
              }
              return;
            }

            response = await schoolAPI.getSchoolById(user.schoolId);
          } catch (error) {
            console.log('[PERMISSIONS REFRESH] Failed to fetch permissions:', error);
            return;
          }

          const school = response.data?.school || response.data;

          if (school && school.accessMatrix) {
            const rolePermissions = school.accessMatrix[user.role];
            console.log('[PERMISSIONS] Refreshed permissions for', user.role, ':', rolePermissions);
            setPermissions(rolePermissions || null);
          }
        } catch (error) {
          console.error('[PERMISSIONS] Error refreshing permissions:', error);
        }
      }
    };

    window.addEventListener('permission-refresh', handlePermissionRefresh);

    return () => {
      window.removeEventListener('permission-refresh', handlePermissionRefresh);
    };
  }, [user, token]);

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    if (!permissions) {
      return false;
    }

    const permissionValue = permissions[permission];
    // Handle boolean true, or string values like 'own', 'limited', 'self' as truthy
    const hasAccess = permissionValue === true || (typeof permissionValue === 'string' && permissionValue !== 'false');
    return hasAccess;
  }, [permissions]);

  const checkAndNavigate = useCallback((permission: PermissionKey, permissionName: string, callback: () => void) => {
    // If still loading permissions, allow navigation (permissions will be checked on page load)
    if (loading) {
      console.log('[PERMISSIONS] Still loading, allowing navigation - will check on page load');
      callback();
      return;
    }

    if (hasPermission(permission)) {
      callback();
    } else {
      console.log('[PERMISSIONS] Access denied to', permissionName);
      setDeniedPermissionName(permissionName);
      setShowPermissionDenied(true);
    }
  }, [hasPermission, loading]);

  const value: PermissionContextType = {
    permissions,
    loading,
    hasPermission,
    showPermissionDenied,
    setShowPermissionDenied,
    deniedPermissionName,
    setDeniedPermissionName,
    checkAndNavigate,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}