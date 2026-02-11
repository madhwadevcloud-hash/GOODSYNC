import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteSchoolModalProps {
  isOpen: boolean;
  schoolName: string;
  schoolId: string;
  onClose: () => void;
  onConfirm: (schoolId: string) => Promise<void>;
}

export function DeleteSchoolModal({ isOpen, schoolName, schoolId, onClose, onConfirm }: DeleteSchoolModalProps) {
  const [step, setStep] = useState<'warning' | 'confirm' | 'processing'>('warning');
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleFirstConfirm = () => {
    setStep('confirm');
    setError(null);
  };

  const handleFinalConfirm = async () => {
    if (confirmInput !== schoolName) {
      setError(`School name does not match. You entered: "${confirmInput}", Required: "${schoolName}"`);
      return;
    }

    setStep('processing');
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(schoolId);
      // Success - modal will be closed by parent
    } catch (err: any) {
      setError(err?.message || 'Failed to delete school. Please try again.');
      setStep('confirm');
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setStep('warning');
      setConfirmInput('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 transform transition-all">
          {/* Close button */}
          {!isDeleting && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Warning Step */}
          {step === 'warning' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Permanent Deletion Warning</h2>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900 mb-2">
                  You are about to delete school: <span className="font-bold">"{schoolName}"</span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">This action will PERMANENTLY DELETE:</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span>School record and all settings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span>All users (admins, teachers, students, parents)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span>All classes, sections, and subjects</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span>All test records and results</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span>All attendance data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span>School database and all data</span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-bold text-yellow-900 text-center">
                  ⚠️ THIS ACTION CANNOT BE UNDONE ⚠️
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFirstConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  I Understand, Continue
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Final Confirmation</h2>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900 mb-3">
                  To confirm deletion, please type the school name exactly as shown below:
                </p>
                <p className="text-lg font-bold text-red-900 text-center bg-white rounded px-3 py-2 border border-red-300">
                  {schoolName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type school name to confirm:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => {
                    setConfirmInput(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter school name"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-900">
                  <strong>Note:</strong> This will delete ALL data permanently and cannot be recovered.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalConfirm}
                  disabled={confirmInput !== schoolName}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-16 w-16 text-red-600 animate-spin" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Deleting School...
                  </h3>
                  <p className="text-sm text-gray-600">
                    Please wait while we delete "{schoolName}" and all associated data.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    This may take a few moments.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900 text-center">
                  Do not close this window or refresh the page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
