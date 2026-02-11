import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions, PermissionKey } from '../hooks/usePermissions';
import { PermissionDeniedModal } from './PermissionDeniedModal';

interface PermissionGuardProps {
  permission: PermissionKey;
  permissionName: string;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ permission, permissionName, children }) => {
  const { hasPermission, showPermissionDenied, setShowPermissionDenied, deniedPermissionName, setDeniedPermissionName, loading, permissions } = usePermissions();
  const navigate = useNavigate();
  const [hasCheckedPermission, setHasCheckedPermission] = React.useState(false);

  // Set up modal when permission is denied - only check once when permissions are loaded
  React.useEffect(() => {
    // Only check permission once loading is complete and we haven't checked yet
    if (!loading && !hasCheckedPermission && permission) {
      setHasCheckedPermission(true);
      
      // Only show modal if permission is denied
      if (!hasPermission(permission)) {
        setShowPermissionDenied(true);
        setDeniedPermissionName(permissionName);
      }
    }
  }, [loading, hasCheckedPermission, permission, permissionName, hasPermission, setShowPermissionDenied, setDeniedPermissionName]);

  // Reset check when permission changes (navigating to different page)
  React.useEffect(() => {
    setHasCheckedPermission(false);
  }, [permission]);

  // Handle modal close - redirect to dashboard
  const handleModalClose = () => {
    setShowPermissionDenied(false);
    navigate('/admin');
  };

  // If no permission is required, render children
  if (!permission) {
    return <>{children}</>;
  }

  // Wait for permissions to finish loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center animate-spin">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Check if user has the permission
  if (!hasPermission(permission)) {
    return (
      <>
        {/* Show modal but don't block - user can navigate away */}
        <PermissionDeniedModal
          isOpen={showPermissionDenied}
          onClose={handleModalClose}
          permissionName={deniedPermissionName || permissionName}
        />
        {/* Show minimal content with message */}
        <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m6-6a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-sm text-gray-600 mb-4">
              You don't have permission to access <strong>{permissionName}</strong>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Please use the navigation menu on the left to access other sections
            </p>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  // User has permission, render the children
  return <>{children}</>;
};

