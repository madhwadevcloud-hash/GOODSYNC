import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { SchoolUserRole } from '../types/school';

interface UserBulkActionsProps {
  selectedUsers: string[];
  availableRoles: SchoolUserRole[];
  onChangeRole: (role: SchoolUserRole) => void;
  onChangeStatus: (status: 'active' | 'inactive') => void;
  onClose: () => void;
}

export function UserBulkActions({
  selectedUsers,
  availableRoles,
  onChangeRole,
  onChangeStatus,
  onClose
}: UserBulkActionsProps) {
  const [selectedAction, setSelectedAction] = useState<'role' | 'status' | null>(null);
  const [selectedRole, setSelectedRole] = useState<SchoolUserRole | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive' | ''>('');

  const handleApply = () => {
    if (selectedAction === 'role' && selectedRole) {
      onChangeRole(selectedRole as SchoolUserRole);
    } else if (selectedAction === 'status' && selectedStatus) {
      onChangeStatus(selectedStatus as 'active' | 'inactive');
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Bulk Actions ({selectedUsers.length} users selected)
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <select
          value={selectedAction || ''}
          onChange={(e) => setSelectedAction(e.target.value as 'role' | 'status' | null)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select Action</option>
          <option value="role">Change Role</option>
          <option value="status">Change Status</option>
        </select>

        {selectedAction === 'role' && (
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as SchoolUserRole)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Role</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        )}

        {selectedAction === 'status' && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'inactive')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Status</option>
            <option value="active">Activate</option>
            <option value="inactive">Deactivate</option>
          </select>
        )}

        <button
          onClick={handleApply}
          disabled={!selectedAction || (selectedAction === 'role' && !selectedRole) || (selectedAction === 'status' && !selectedStatus)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="h-4 w-4" />
          <span>Apply</span>
        </button>
      </div>
    </div>
  );
}
