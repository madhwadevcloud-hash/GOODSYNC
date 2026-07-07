import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Info, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccessMatrix, RolePermissions } from '../types';
import { toast } from 'react-hot-toast';

const allPermissions = [
  { key: 'manageUsers', label: 'Manage Users', description: 'Access to add, edit, and delete users' },
  { key: 'manageSchoolSettings', label: 'Manage School Settings', description: 'Access to configure school settings' },
  { key: 'viewAcademicDetails', label: 'Academic Details', description: 'Access to manage academic year and classes' },
  { key: 'viewAttendance', label: 'Attendance', description: 'Access to view and mark attendance' },
  { key: 'viewAssignments', label: 'Assignments', description: 'Access to manage assignments' },
  { key: 'viewResults', label: 'Results', description: 'Access to view student results' },
  { key: 'viewLeaves', label: 'Leave Management', description: 'Access to manage leave requests and approvals' },
  { key: 'messageStudentsParents', label: 'Message Students/Parents', description: 'Access to send messages to students and parents' },
  { key: 'viewFees', label: 'Manage Fees', description: 'Access to manage fee structure and payments' },
  { key: 'viewReports', label: 'View Reports', description: 'Access to generate and view reports' },
];

// Permissions specific to teacher role
const teacherPermissions = [
  { key: 'viewAttendance', label: 'Attendance', description: 'Access to view and mark attendance' },
  { key: 'viewAssignments', label: 'Assignments', description: 'Access to view assignments' },
  { key: 'viewResults', label: 'Results', description: 'Access to view student results' },
  { key: 'viewLeaves', label: 'Leave Management', description: 'Access to manage own leave requests' },
  { key: 'messageStudentsParents', label: 'Message Students/Parents', description: 'Access to send messages to students and parents' }
];

// Admin gets all permissions (including new ones)
const adminPermissions = allPermissions;

const roles = ['admin', 'teacher'] as const;

export function ViewAccess() {
  const { schools, selectedSchoolId, setCurrentView, updateSchoolAccess } = useApp();
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix | null>(null);

  const school = schools.find(s => s.id === selectedSchoolId);

  useEffect(() => {
    if (school) {
      setAccessMatrix(school.accessMatrix);
    }
  }, [school]);

  if (!school || !accessMatrix) {
    return (
      <div className="p-6 animate-fadeIn">
        <p className="text-gray-600">School not found</p>
      </div>
    );
  }

  const handlePermissionChange = (role: keyof AccessMatrix, permission: keyof RolePermissions) => {
    if (!accessMatrix) return;

    setAccessMatrix(prev => {
      const currentValue = prev![role][permission];
      let newValue;

      // Handle special cases for teacher permissions that use string values
      if (role === 'teacher' && permission === 'viewLeaves') {
        // Toggle between 'own' (enabled) and false (disabled)
        newValue = (currentValue === 'own' || currentValue === true) ? false : 'own';
      } else if (role === 'teacher' && permission === 'viewResults') {
        // Toggle between 'own' (enabled) and false (disabled)
        newValue = (currentValue === 'own' || currentValue === true) ? false : 'own';
      } else if (role === 'teacher' && permission === 'manageSchoolSettings') {
        // Toggle between 'limited' (enabled) and false (disabled)
        newValue = (currentValue === 'limited' || currentValue === true) ? false : 'limited';
      } else {
        // Standard boolean toggle for other permissions
        newValue = !currentValue;
      }

      return {
        ...prev!,
        [role]: {
          ...prev![role],
          [permission]: newValue
        }
      };
    });
  };

  const handleSave = async () => {
    if (accessMatrix && selectedSchoolId) {
      try {
        await updateSchoolAccess(selectedSchoolId, accessMatrix);

        toast.success('Access permissions updated successfully!');

        // Wait a moment for the backend to complete the update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Trigger permission refresh event for logged-in users
        window.dispatchEvent(new Event('permission-refresh'));

        setCurrentView('dashboard');
      } catch (error) {
        toast.error('Failed to update access permissions');
        console.error('Error updating access matrix:', error);
      }
    }
  };

  const RolePermissionTable = ({ role, delay }: { role: keyof AccessMatrix; delay: number }) => {
    const permissions = role === 'teacher' ? teacherPermissions : adminPermissions;

    const activePermissions = permissions.filter(p =>
      !!accessMatrix[role][p.key as keyof RolePermissions]
    ).length;

    return (
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-0 animate-slideUp"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2.5 rounded-xl">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 capitalize">{role} Access Matrix</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Configure access permissions for {role} role</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  {activePermissions} of {permissions.length} permissions enabled
                </p>
                <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(activePermissions / permissions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 min-w-[250px] sm:min-w-[300px]">
                  Permissions
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold text-gray-900 min-w-[80px] sm:min-w-[120px]">
                  Access
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {permissions.map((permission) => (
                <tr key={permission.key} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-medium text-gray-900">
                        {permission.label}
                      </span>
                      {'description' in permission && (
                        <span className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                          {permission.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={!!accessMatrix[role][permission.key as keyof RolePermissions]}
                        onChange={() => handlePermissionChange(role, permission.key as keyof RolePermissions)}
                        className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {/* Header banner */}
        <div className="opacity-0 animate-slideUp bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Access Control</h1>
              <p className="text-indigo-100 mt-1 text-sm sm:text-base">{school.name}</p>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center justify-center space-x-2 bg-white text-indigo-700 px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors duration-200 w-full sm:w-auto font-semibold shadow-sm"
            >
              <Save className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Save Changes</span>
            </button>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        </div>

        {/* Info Banner */}
        <div
          className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 opacity-0 animate-slideUp"
          style={{ animationDelay: '100ms' }}
        >
          <Info className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-indigo-900">
            <strong className="font-semibold">Access Control:</strong> When you uncheck a permission, users of that role will see a popup notification when they try to access that feature. Changes take effect immediately for logged-in users.
          </p>
        </div>

        {/* Admin Table - Shows all permissions */}
        <RolePermissionTable role="admin" delay={150} />

        {/* Teacher Table - Shows only specific permissions */}
        <RolePermissionTable role="teacher" delay={200} />

        {/* Role Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role, i) => {
            const permissions = role === 'teacher' ? teacherPermissions : adminPermissions;
            const activePermissions = permissions.filter(p =>
              !!accessMatrix[role][p.key as keyof RolePermissions]
            ).length;

            return (
              <div
                key={role}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200 opacity-0 animate-slideUp"
                style={{ animationDelay: `${250 + i * 60}ms` }}
              >
                <h3 className="text-sm font-semibold text-gray-900 capitalize mb-2">{role} Role Summary</h3>
                <p className="text-xs text-gray-500 mb-2">
                  {activePermissions} of {permissions.length} permissions enabled
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(activePermissions / permissions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}