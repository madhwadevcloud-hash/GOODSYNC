import React from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';

interface PermissionDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionName: string;
}

export function PermissionDeniedModal({ isOpen, onClose, permissionName }: PermissionDeniedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <Lock className="h-6 w-6 text-red-600" />
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Permission Required
          </h3>
          <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 text-left">
              You don't have permission to access <strong>{permissionName}</strong>.
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Access to this feature is currently disabled by the Super Admin. Please contact your Super Admin to request access. They can enable this permission from the Access Control panel.
          </p>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}