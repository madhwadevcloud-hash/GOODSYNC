import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, FileText, Trash2 } from 'lucide-react';
import * as assignmentAPI from '../../../api/assignment';
import { useAuth } from '../../../auth/AuthContext';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';

interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignmentId: string;
}

interface FormData {
  title: string;
  subject: string;
  class: string;
  section: string;
  startDate: string;
  dueDate: string;
  instructions: string;
  attachments: File[];
  existingAttachments: any[];
}

const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignmentId
}) => {
  const { token } = useAuth();
  const {
    getClassOptions,
    getSectionsByClass
  } = useSchoolClasses();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    subject: '',
    class: '',
    section: '',
    startDate: '',
    dueDate: '',
    instructions: '',
    attachments: [],
    existingAttachments: []
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // Fetch assignment data when modal opens
  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchAssignmentData();
    }
  }, [isOpen, assignmentId]);

  // Fetch subjects when class changes
  useEffect(() => {
    if (isOpen && formData.class) {
      fetchSubjectsForClass(formData.class);
    }
  }, [isOpen, formData.class]);

  const fetchAssignmentData = async () => {
    setLoadingData(true);
    setErrors({});
    try {
      console.log('📥 Fetching assignment data for:', assignmentId);
      const assignment = await assignmentAPI.getAssignmentById(assignmentId);
      
      console.log('✅ Assignment data loaded:', assignment);
      
      // Format dates for input fields (YYYY-MM-DD)
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        title: assignment.title || '',
        subject: assignment.subject || '',
        class: assignment.class || '',
        section: assignment.section || '',
        startDate: formatDate(assignment.startDate),
        dueDate: formatDate(assignment.dueDate),
        instructions: assignment.instructions || assignment.description || '',
        attachments: [],
        existingAttachments: assignment.attachments || []
      });

      // Fetch subjects for the class
      if (assignment.class) {
        await fetchSubjectsForClass(assignment.class);
      }
    } catch (err: any) {
      console.error('❌ Error fetching assignment:', err);
      console.error('Error details:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load assignment data';
      setErrors({ submit: errorMessage });
      alert(`Error loading assignment: ${errorMessage}`);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSubjectsForClass = async (className: string) => {
    try {
      console.log(`🔍 Fetching subjects for class: ${className}`);
      
      const schoolCode = localStorage.getItem('erp.schoolCode') || '';
      const authData = localStorage.getItem('erp.auth');
      let token = '';
      
      if (authData) {
        const parsedAuth = JSON.parse(authData);
        token = parsedAuth.token || '';
      }
      
      const response = await fetch(`/api/class-subjects/class/${encodeURIComponent(className)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-school-code': schoolCode.toUpperCase(),
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const subjectNames = (data?.data?.subjects || [])
          .filter((s: any) => s.isActive !== false)
          .map((s: any) => s.name)
          .filter(Boolean);
        setAvailableSubjects(subjectNames);
        console.log('✅ Subjects loaded:', subjectNames);
      } else {
        console.warn('Failed to fetch subjects:', response.status);
        setAvailableSubjects([]);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setAvailableSubjects([]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.class) newErrors.class = 'Class is required';
    if (!formData.section) newErrors.section = 'Section is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';

    if (formData.startDate && formData.dueDate) {
      const start = new Date(formData.startDate);
      const due = new Date(formData.dueDate);
      if (due <= start) {
        newErrors.dueDate = 'Due date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFormData({ ...formData, attachments: filesArray });
    }
  };

  const removeExistingAttachment = (index: number) => {
    const updated = [...formData.existingAttachments];
    updated.splice(index, 1);
    setFormData({ ...formData, existingAttachments: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('class', formData.class);
      formDataToSend.append('section', formData.section);
      formDataToSend.append('startDate', formData.startDate);
      formDataToSend.append('dueDate', formData.dueDate);
      formDataToSend.append('instructions', formData.instructions);

      console.log('📤 Updating assignment:', {
        id: assignmentId,
        title: formData.title,
        subject: formData.subject,
        class: formData.class,
        section: formData.section
      });

      // Add new files if any
      formData.attachments.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      // Add existing attachments that weren't removed
      formDataToSend.append('existingAttachments', JSON.stringify(formData.existingAttachments));

      // Get school code
      let schoolCode = '';
      try {
        const authData = localStorage.getItem('erp.auth');
        if (authData) {
          const parsedAuth = JSON.parse(authData);
          schoolCode = parsedAuth.user?.schoolCode || '';
        }
      } catch (err) {
        console.error('Error parsing auth data:', err);
      }
      
      if (schoolCode) {
        formDataToSend.append('schoolCode', schoolCode);
      }

      const response = await assignmentAPI.updateAssignment(assignmentId, formDataToSend);
      
      console.log('✅ Assignment updated successfully:', response);
      setSuccessMessage('Assignment updated successfully!');
      
      // Show success for 2 seconds then close
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMessage('');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Error updating assignment:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update assignment';
      setErrors({ submit: errorMessage });
      
      // Show detailed error to user
      alert(`Failed to update assignment:\n${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Assignment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Loading State */}
        {loadingData ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading assignment data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {errors.submit}
              </div>
            )}

            {/* Assignment Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />Assignment Title *
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Math Homework - Chapter 5"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Class, Section, Subject */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.class ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.class}
                  onChange={e => {
                    const newClass = e.target.value;
                    setFormData({ ...formData, class: newClass, subject: '' });
                    if (newClass) {
                      fetchSubjectsForClass(newClass);
                    } else {
                      setAvailableSubjects([]);
                    }
                  }}
                >
                  <option value="">Select Class</option>
                  {getClassOptions().map(cls => (
                    <option key={cls.value} value={cls.value}>{cls.label}</option>
                  ))}
                </select>
                {errors.class && <p className="text-red-500 text-xs mt-1">{errors.class}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.section ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.section}
                  onChange={e => setFormData({ ...formData, section: e.target.value })}
                >
                  <option value="">Select Section</option>
                  {(formData.class ? getSectionsByClass(formData.class) : []).map(section => (
                    <option key={section.value} value={section.value}>{section.label}</option>
                  ))}
                </select>
                {errors.section && <p className="text-red-500 text-xs mt-1">{errors.section}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.subject ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  disabled={!formData.class}
                >
                  <option value="">{formData.class ? 'Select Subject' : 'Select Class First'}</option>
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
              </div>
            </div>

            {/* Start Date and Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />Start Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
                {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />Due Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.dueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                />
                {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={formData.instructions}
                onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Enter assignment instructions..."
              />
            </div>

            {/* Existing Attachments */}
            {formData.existingAttachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Attachments</label>
                <div className="space-y-2">
                  {formData.existingAttachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">{file.originalName || file.filename}</span>
                      <button
                        type="button"
                        onClick={() => removeExistingAttachment(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Upload className="w-4 h-4 inline mr-1" />Add New Attachments
              </label>
              <input
                type="file"
                multiple
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max 5 files, 10MB each. Supported: PDF, DOC, XLS, PPT, TXT, ZIP, Images
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Assignment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditAssignmentModal;
