//
// File: jayeshsardesai/erp/ERP-7a5c138ae65bf53237b3e294be93792d26fb324a/frontend/src/roles/superadmin/components/ImportUsersDialog.tsx
//
import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertTriangle, Check, Download, Loader2 } from 'lucide-react';
import { schoolUserAPI } from '../../../api/schoolUsers'; // Import the API

// Define the structure of the API response
interface ImportResultData {
  successData: Array<{
    row: number;
    userId: string;
    email: string;
    name: string;
    password?: string; // This is sent from the backend
  }>;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  totalRows: number;
  insertedCount: number;
}

interface ImportResponse {
  success: boolean;
  message: string;
  results: ImportResultData;
}

interface ImportUsersDialogProps {
  schoolCode: string; // Expect schoolCode from props
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportUsersDialog({ schoolCode, onClose, onSuccess }: ImportUsersDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null); // State to hold results

  // --- ADD THIS STATE ---
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  // -----------------------

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get auth token
  const getAuthToken = (): string | null => {
    const auth = localStorage.getItem('erp.auth');
    if (auth) {
      try {
        return JSON.parse(auth).token;
      } catch (e) {
        console.error('Failed to parse erp.auth:', e);
      }
    }
    return localStorage.getItem('token'); // Fallback
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Basic validation for CSV
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Invalid file type. Please upload a .csv file.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
      return;
    }

    setFile(selectedFile);
    setError(null);
    setImportResults(null); // Reset results if a new file is selected
  };

  // Handle the import button click
  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import.');
      return;
    }
    if (!schoolCode) {
      setError('School code is missing. Cannot import.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Authentication token not found. Please log in again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImportResults(null);

    try {
      // **Call the correct API function with the selectedRole**
      const response = await schoolUserAPI.importUsers(schoolCode, file, selectedRole, token);

      // **Store the response data in state**
      // This will trigger the re-render to show the results view
      setImportResults(response.data);
      console.log('Import API response:', response.data);

    } catch (err: any) {
      console.error('Import failed:', err);
      // Display error message from backend if available
      setError(err.message || err.error || 'Failed to import users. Check console for details.');
      // Store partial results if the error object contains them (some backend errors might still include results)
      if (err.results) {
        setImportResults({
          success: false,
          message: err.message || 'Import failed with partial results.',
          results: err.results
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when closing or starting over
  const resetDialog = () => {
    setFile(null);
    setError(null);
    setIsLoading(false);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Close the dialog completely
  const handleClose = () => {
    resetDialog();
    onClose();
  };

  // Called when clicking "Done" on the results screen
  const handleDone = () => {
    onSuccess(); // Call the onSuccess prop (likely to refresh the user list)
    handleClose(); // Then close the dialog
  };

  // Generate and download the credentials CSV
  const handleDownloadCredentials = () => {
    if (!importResults || !importResults.results.successData.length) return;

    const headers = ['UserID', 'Name', 'Email', 'Password'];
    const rows = importResults.results.successData.map(user =>
      // Ensure values are properly escaped for CSV if they contain commas or quotes
      [
        `"${user.userId || ''}"`,
        `"${(user.name || '').replace(/"/g, '""')}"`,
        `"${user.email || ''}"`,
        `"${user.password || ''}"` // Include the temporary password from backend
      ]
    );

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${schoolCode}_${selectedRole}_credentials.csv`); // Use selectedRole in filename
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render Functions ---

  // Renders the initial view for file upload
  const renderUploadView = () => (
    <>
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">

          {/* --- ADD ROLE SELECTOR --- */}
          <div className="">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Role to Import:</label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={selectedRole === 'student'}
                  onChange={() => setSelectedRole('student')}
                  className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                />
                <span className="ml-2 text-sm text-gray-800">Student</span>
              </label>
              <label className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={selectedRole === 'teacher'}
                  onChange={() => setSelectedRole('teacher')}
                  className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                />
                <span className="ml-2 text-sm text-gray-800">Teacher</span>
              </label>
            </div>
          </div>
          {/* ------------------------- */}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv"
              className="hidden"
              id="csv-upload-input"
            />

            {!file ? (
              <label htmlFor="csv-upload-input" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">Drop your CSV file here or</p>
                <span className="mt-1 text-blue-600 hover:text-blue-700 font-medium text-sm">
                  browse files
                </span>
                <p className="text-xs text-gray-500 mt-2">Only .csv files are accepted</p>
              </label>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="h-6 w-6 text-green-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 text-sm truncate">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    setError(null); // Clear error when removing file
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-red-600 hover:text-red-700 flex-shrink-0"
                  aria-label="Remove file"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2 text-sm">Instructions:</h4>

            {/* --- MAKE INSTRUCTIONS DYNAMIC --- */}
            {selectedRole === 'student' ? (
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>Ensure your CSV has headers (e.g., `firstname`, `lastname`, `email`, `class`, `section`).</li>
                <li>Required fields: `firstname`, `lastname`, `email`, `primaryphone`, `dateofbirth`, `gender`, `currentclass`, `currentsection`, `fathername`, `mothername`.</li>
                <li>Date format should be `DD-MM-YYYY`, `DD/MM/YYYY`, or `YYYY-MM-DD`.</li>
                <li><a href="/api/public/templates/student_import_template.csv" download className="underline hover:text-blue-900">Download student template</a></li>
              </ul>
            ) : (
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>Ensure your CSV has headers (e.g., `firstName`, `lastName`, `email`, `primaryPhone`).</li>
                <li>Required fields: `firstName`, `lastName`, `email`, `primaryPhone`, `dateOfBirth`, `gender`, `joiningDate`, `highestQualification`, `totalExperience`.</li>
                <li>Recommended fields: `subjects` (comma-separated), `specialization`, `employeeId`.</li>
                <li>Date format should be `DD-MM-YYYY`, `DD/MM/YYYY`, or `YYYY-MM-DD`.</li>
                <li><a href="/api/public/templates/teacher_import_template.csv" download className="underline hover:text-blue-900">Download teacher template</a></li>
              </ul>
            )}
            {/* ------------------------------- */}
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t rounded-b-xl">
        <button
          onClick={handleClose}
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          type="button"
          disabled={!file || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] text-sm font-medium"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Import Users'
          )}
        </button>
      </div>
    </>
  );

  // Renders the results view after import attempt
  const renderResultsView = () => {
    if (!importResults) return null; // Should not happen if called correctly, but safety check

    const { successData = [], errors = [], totalRows = 0, insertedCount = 0 } = importResults.results || {};
    const successCount = successData.length;
    const errorCount = errors.length;

    return (
      <>
        <div className="p-6">
          <div className="text-center mb-6">
            {/* Icon based on overall success AND error count */}
            {importResults.success && errorCount === 0 ? (
              <Check className="h-12 w-12 mx-auto text-green-500 bg-green-100 rounded-full p-2" />
            ) : (
              <AlertTriangle className={`h-12 w-12 mx-auto rounded-full p-2 ${errorCount > 0 ? 'text-red-500 bg-red-100' : 'text-yellow-500 bg-yellow-100'}`} />
            )}
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Import Complete</h3>
            <p className={`mt-1 text-sm ${errorCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>{importResults.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
              <div className="text-3xl font-bold text-green-700">{successCount}</div>
              <div className="text-sm font-medium text-green-800 mt-1">Users Imported Successfully</div>
            </div>
            <div className={`p-4 rounded-lg text-center border ${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-3xl font-bold ${errorCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>{errorCount}</div>
              <div className={`text-sm font-medium mt-1 ${errorCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>Rows Failed</div>
            </div>
          </div>

          {errorCount > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-800 mb-2 text-sm">Error Details (showing first 5):</h4>
              <div className="max-h-32 overflow-y-auto bg-gray-100 border border-gray-300 rounded-lg p-3 text-xs space-y-2">
                {errors.slice(0, 5).map((err, index) => (
                  <div key={index} className="p-2 bg-red-100 border border-red-200 rounded">
                    <p className="font-semibold text-red-800">Row {err.row}:</p>
                    <p className="text-red-700 break-words">{err.error}</p>
                    {/* Optionally show row data if needed for debugging */}
                    {/* {err.data && <pre className="mt-1 text-xs text-red-600 bg-red-50 p-1 rounded overflow-x-auto">{JSON.stringify(err.data)}</pre>} */}
                  </div>
                ))}
                {errors.length > 5 && <p className="text-center text-gray-500 text-xs mt-2">... and {errors.length - 5} more errors.</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 border-t rounded-b-xl space-y-2 sm:space-y-0">
          <button
            onClick={handleDownloadCredentials}
            type="button"
            disabled={successCount === 0}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            <span>Download Credentials ({successCount})</span>
          </button>
          <button
            onClick={handleDone}
            type="button"
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Done
          </button>
        </div>
      </>
    );
  };

  // --- Main Return ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {importResults ? 'Import Results' : 'Import Users from CSV'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conditional Content: Upload Form or Results */}
        {importResults ? renderResultsView() : renderUploadView()}

      </div>
    </div>
  );
}