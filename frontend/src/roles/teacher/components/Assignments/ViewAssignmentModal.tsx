import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Download, User } from 'lucide-react';
import * as assignmentAPI from '../../../../api/assignment';

interface ViewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
}

const ViewAssignmentModal: React.FC<ViewAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignmentId
}) => {
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchAssignmentData();
    }
  }, [isOpen, assignmentId]);

  const fetchAssignmentData = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('📥 Fetching assignment data for teacher view:', assignmentId);
      const data = await assignmentAPI.getAssignmentById(assignmentId);
      console.log('✅ Assignment data loaded:', data);
      setAssignment(data);
    } catch (err: any) {
      console.error('❌ Error fetching assignment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Assignment Overview</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600/20 border-t-blue-600"></div>
              <p className="mt-4 text-gray-500 font-medium">Loading details...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <X className="h-5 w-5" />
              </div>
              <p className="font-medium">{error}</p>
            </div>
          ) : assignment ? (
            <>
              {/* Title & Status */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h3 className="text-2xl font-semibold text-gray-900 flex-1">{assignment.title}</h3>
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 bg-white border rounded-full text-[10px] font-medium uppercase tracking-wider ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority} Priority
                    </span>
                    <span className={`px-2.5 py-1 bg-white border rounded-full text-[10px] font-medium uppercase tracking-wider ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Class</p>
                    <p className="text-sm font-semibold text-gray-900">{assignment.class}-{assignment.section}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Subject</p>
                    <p className="text-sm font-semibold text-gray-900">{assignment.subject}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Assigned Date</p>
                    <p className="text-sm font-semibold text-gray-900">{new Date(assignment.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Due Date</p>
                    <p className="text-sm font-semibold text-gray-900">{new Date(assignment.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Teacher Info */}
              <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="bg-blue-600 p-2 rounded-full">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Assigned By</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {typeof assignment.teacher === 'object' ? assignment.teacher.name : assignment.teacher || 'Teacher'}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Instructions
                </h4>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 min-h-[100px]">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {assignment.instructions || assignment.description || 'No specific instructions provided for this assignment.'}
                  </p>
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Download className="h-4 w-4 text-gray-400" />
                  Attachments ({assignment.attachments?.length || 0})
                </h4>
                {assignment.attachments && assignment.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assignment.attachments.map((file: any, index: number) => {
                      const getFileUrl = (f: any) => {
                        const url = f.url || f.path;
                        if (!url) return '#';
                        if (typeof url !== 'string') return '#';
                        if (url.startsWith('http')) return url;
                        
                        // Handle relative paths
                        const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5050/api';
                        const baseUrl = apiBase.replace(/\/api\/?$/, '');
                        const cleanPath = url.startsWith('/') ? url : `/${url}`;
                        return `${baseUrl}${cleanPath}`;
                      };

                      const fileUrl = getFileUrl(file);
                      const isExternal = fileUrl.startsWith('http') && !fileUrl.includes(window.location.hostname);

                      const handleDownload = async (e: React.MouseEvent, file: any) => {
                        e.preventDefault();
                        const fileUrl = getFileUrl(file);
                        const fileName = file.originalName || file.filename;

                        try {
                          // For Cloudinary/External, we try to fetch as blob to force name
                          if (fileUrl.startsWith('http')) {
                            const response = await fetch(fileUrl);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } else {
                            // Fallback to simple link for relative paths
                            window.open(fileUrl, '_blank');
                          }
                        } catch (err) {
                          console.error('Download failed:', err);
                          window.open(fileUrl, '_blank');
                        }
                      };

                      return (
                        <button
                          key={index}
                          onClick={(e) => handleDownload(e, file)}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group w-full text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-blue-50 transition-colors">
                              <FileText className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 truncate">
                              {file.originalName || file.filename}
                            </span>
                          </div>
                          <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No attachments provided.</p>
                )}
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-gray-500">
              No data found for this assignment.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 active:scale-95 transition-all shadow-md"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewAssignmentModal;
