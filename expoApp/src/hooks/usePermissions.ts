import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/src/services/api';

// Default permissions based on role (matching backend)
const defaultPermissions = {
  superadmin: {
    manageUsers: true,
    manageSchoolSettings: true,
    createTimetable: true,
    viewTimetable: true,
    markAttendance: true,
    viewAttendance: true,
    addAssignments: false,
    submitAssignments: false,
    viewAssignments: true,
    viewResults: true,
    updateResults: false,
    viewLeaves: true,
    message: true
  },
  admin: {
    manageUsers: true,
    manageSchoolSettings: true,
    createTimetable: true,
    viewTimetable: true,
    markAttendance: true,
    viewAttendance: true,
    addAssignments: true,
    submitAssignments: false,
    viewAssignments: true,
    viewResults: true,
    updateResults: false,
    viewLeaves: true,
    message: true
  },
  teacher: {
    manageUsers: false,
    manageSchoolSettings: false,
    createTimetable: true,
    viewTimetable: true,
    markAttendance: true,
    viewAttendance: true,
    addAssignments: true,
    submitAssignments: false,
    viewAssignments: true,
    viewResults: true,
    updateResults: true,
    viewLeaves: true,
    message: true
  },
  student: {
    manageUsers: false,
    manageSchoolSettings: false,
    createTimetable: false,
    viewTimetable: true,
    markAttendance: false,
    viewAttendance: true,
    viewAssignments: true,
    addAssignments: false,
    submitAssignments: true,
    viewResults: true,
    updateResults: false,
    viewLeaves: false,
    message: false
  },
  parent: {
    manageUsers: false,
    manageSchoolSettings: false,
    createTimetable: false,
    viewTimetable: false,
    markAttendance: false,
    viewAttendance: false,
    addAssignments: false,
    submitAssignments: false,
    viewAssignments: false,
    viewResults: false,
    updateResults: false,
    viewLeaves: false,
    message: false
  }
};

// Permission mapping for admin/teacher roles (matching backend)
const permissionMapping = {
  'markAttendance': 'viewAttendance',
  'updateAttendance': 'viewAttendance',
  'deleteAttendance': 'viewAttendance',
  'createTimetable': 'viewTimetable',
  'updateTimetable': 'viewTimetable',
  'deleteTimetable': 'viewTimetable',
  'addAssignments': 'viewAssignments',
  'updateAssignments': 'viewAssignments',
  'deleteAssignments': 'viewAssignments',
  'updateResults': 'viewResults',
  'createResults': 'viewResults',
  'freezeResults': 'viewResults',
  'deleteResults': 'viewResults',
  'createLeave': 'viewLeaves',
  'updateLeave': 'viewLeaves',
  'deleteLeave': 'viewLeaves',
  'approveLeave': 'viewLeaves',
  'rejectLeave': 'viewLeaves'
};

interface UserPermissions {
  [key: string]: boolean | string;
}

interface PermissionsState {
  permissions: UserPermissions;
  loading: boolean;
  error: string | null;
  role: string | null;
}

/**
 * Hook to manage user permissions based on access matrix
 * Matches the backend permission system exactly
 */
export const usePermissions = () => {
  const [state, setState] = useState<PermissionsState>({
    permissions: {},
    loading: true,
    error: null,
    role: null
  });

  useEffect(() => {
    loadPermissions();
    
    // Set up periodic refresh to check for permission changes (reduced frequency)
    const refreshInterval = setInterval(() => {
      console.log('[PERMISSIONS] Periodic refresh check');
      loadPermissions();
    }, 300000); // Refresh every 5 minutes instead of 30 seconds
    
    // Listen for app state changes to refresh permissions when app comes to foreground
    // But add throttling to prevent excessive calls
    let lastRefreshTime = 0;
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        // Only refresh if more than 60 seconds have passed since last refresh
        if (now - lastRefreshTime > 60000) {
          console.log('[PERMISSIONS] App became active, refreshing permissions');
          loadPermissions();
          lastRefreshTime = now;
        }
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearInterval(refreshInterval);
      subscription?.remove();
    };
  }, []);

  const loadPermissions = async (forceRefresh: boolean = false) => {
    try {
      // Check if we already have permissions and don't need to refresh
      if (!forceRefresh && state.permissions && Object.keys(state.permissions).length > 0 && !state.loading) {
        console.log('[PERMISSIONS] Using cached permissions');
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get user data from storage
      const userData = await AsyncStorage.getItem('userData');
      const role = await AsyncStorage.getItem('role');
      
      if (!userData || !role) {
        throw new Error('User data not found');
      }

      const user = JSON.parse(userData);
      
      // Superadmin always has all permissions
      if (role === 'superadmin') {
        setState({
          permissions: defaultPermissions.superadmin,
          loading: false,
          error: null,
          role
        });
        return;
      }

      // Try to fetch access matrix from backend
      let accessMatrix = null;
      try {
        const response = await api.get('/permissions/my-permissions');
        if (response.data?.success && response.data?.permissions) {
          accessMatrix = response.data.permissions;
        }
      } catch (error) {
        console.log('[PERMISSIONS] Could not fetch from backend, using defaults:', error);
      }

      // Use access matrix or fall back to defaults
      let userPermissions: UserPermissions;
      
      if (accessMatrix && accessMatrix[role]) {
        userPermissions = accessMatrix[role];
        console.log('[PERMISSIONS] Using access matrix permissions for', role);
      } else {
        userPermissions = defaultPermissions[role as keyof typeof defaultPermissions] || {};
        console.log('[PERMISSIONS] Using default permissions for', role);
      }

      setState({
        permissions: userPermissions,
        loading: false,
        error: null,
        role
      });

    } catch (error: any) {
      console.error('[PERMISSIONS] Error loading permissions:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load permissions'
      }));
    }
  };

  /**
   * Check if user has a specific permission
   * Implements the same logic as backend permission checking
   */
  const hasPermission = (permission: string): boolean => {
    const { permissions, role } = state;

    // Superadmin always has access
    if (role === 'superadmin') {
      return true;
    }

    // Check direct permission
    let hasAccess = permissions[permission];

    // Handle string values like 'own', 'limited', 'self' as truthy
    if (typeof hasAccess === 'string') {
      return true;
    }

    // If permission is boolean, return it
    if (typeof hasAccess === 'boolean') {
      return hasAccess;
    }

    // For admin/teacher roles, check permission mapping
    if ((role === 'admin' || role === 'teacher') && !hasAccess) {
      const basePermission = (permissionMapping as any)[permission];
      if (basePermission && permissions[basePermission]) {
        console.log(`[PERMISSIONS] Granting ${permission} access based on ${basePermission} permission`);
        return true;
      }
    }

    return false;
  };

  /**
   * Check multiple permissions at once
   */
  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  /**
   * Check if user has all specified permissions
   */
  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  /**
   * Refresh permissions from backend
   */
  const refreshPermissions = () => {
    loadPermissions(true); // Force refresh
  };

  return {
    ...state,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions
  };
};

/**
 * Higher-order component to wrap components with permission checking
 */
export const withPermissions = (
  WrappedComponent: any,
  requiredPermissions: string | string[],
  fallbackComponent?: any
) => {
  return (props: any) => {
    const { hasPermission, hasAnyPermission, loading } = usePermissions();
    
    if (loading) {
      return null; // or loading component
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const hasAccess = hasAnyPermission(permissions);

    if (!hasAccess) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent;
        return FallbackComponent(props);
      }
      return null;
    }

    return WrappedComponent(props);
  };
};

export default usePermissions;
