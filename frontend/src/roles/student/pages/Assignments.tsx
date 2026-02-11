import React, { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Download, Upload, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react';
import * as assignmentAPI from '../../../api/assignment';
import api from '../../../api/axios';

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  class: string;
  section: string;
  teacher: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  instructions: string;
  attachments: Array<{
    filename: string;
    originalName: string;
    path: string;
    size: number;
  }>;
  maxMarks: number;
  status: 'active' | 'completed' | 'overdue';
  submittedCount: number;
  totalStudents: number;
}

interface Submission {
  _id: string;
  submissionText: string;
  attachments: Array<{
    filename: string;
    originalName: string;
    path: string;
    size: number;
  }>;
  submittedAt: string;
  isLateSubmission: boolean;
  status: 'submitted' | 'graded' | 'returned';
  grade?: number;
  maxMarks: number;
  feedback?: string;
  version: number;
}

const StudentAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'submitted' | 'graded'>('pending');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔍 Student: Fetching assignments...');
      
      let data;
      try {
        // Try the regular endpoint first
        data = await assignmentAPI.fetchAssignments();
        console.log('✅ Student: Assignments fetched from regular endpoint:', data);
      } catch (regularError) {
        console.error('❌ Student: Error with regular endpoint:', regularError);
        
        // If the regular endpoint fails, try the direct endpoint
        console.log('🔍 Student: Trying direct test endpoint...');
        
        // Get the user's school code from the auth context
        let userSchoolCode = '';
        try {
          const authData = localStorage.getItem('erp.auth');
          if (authData) {
            const parsedAuth = JSON.parse(authData);
            userSchoolCode = parsedAuth.user?.schoolCode || '';
            console.log(`🏫 Student: Using school code from auth: "${userSchoolCode}"`);
          }
        } catch (err) {
          console.error('Student: Error parsing auth data:', err);
        }
        
        // Try direct endpoint with the user's school code
        const response = await api.get(`/direct-test/assignments?schoolCode=${userSchoolCode}`);
        const data = response.data;
        console.log('✅ Student: Assignments fetched from direct endpoint:', data);
      }
      
      // Extract assignments array from response object
      const assignmentsArray = data.assignments || data || [];
      
      // Validate each assignment has required fields
      const validAssignments = assignmentsArray.filter((assignment: any) => 
        assignment && typeof assignment === 'object'
      );
      
      console.log(`✅ Student: Processed ${validAssignments.length} valid assignments`);
      setAssignments(validAssignments);
    } catch (err: any) {
      console.error('❌ Student: Error fetching assignments:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch assignments');
      // Set empty array to prevent filtering errors
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    try {
      const submissionData = await assignmentAPI.getStudentSubmission(assignment._id);
      setSubmission(submissionData);
    } catch (err) {
      setSubmission(null); // No submission yet
    }
    setShowSubmissionModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSubmissionFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('submissionText', submissionText);
      
      submissionFiles.forEach(file => {
        formData.append('attachments', file);
      });

      await assignmentAPI.submitAssignment(selectedAssignment._id, formData);
      
      setShowSubmissionModal(false);
      setSubmissionText('');
      setSubmissionFiles([]);
      fetchAssignments();
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Due soon';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    // Make sure assignment is valid
    if (!assignment) return false;
    
    // This would typically filter based on submission status
    // For now, showing all assignments in pending
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assignments</h1>
        <p className="text-gray-600">View and submit your assignments</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Pending ({filteredAssignments.length})
          </button>
          <button
            onClick={() => setSelectedTab('submitted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'submitted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Submitted (0)
          </button>
          <button
            onClick={() => setSelectedTab('graded')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'graded'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Graded (0)
          </button>
        </nav>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.map((assignment) => (
          <div
            key={assignment._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleViewAssignment(assignment)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{assignment.subject || 'Unknown Subject'}</h3>
                <p className="text-sm text-gray-600">
                  {assignment.class || 'Unknown Class'} • 
                  Section {assignment.section || 'A'}
                </p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(assignment.priority || 'medium')}`}>
                {assignment.priority || 'medium'}
              </span>
            </div>

            <p className="text-gray-700 mb-4 line-clamp-2">
              {assignment.instructions || assignment.title || 'No description available'}
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span className={new Date(assignment.dueDate) < new Date() ? 'text-red-600' : 'text-green-600'}>
                  {getTimeRemaining(assignment.dueDate)}
                </span>
              </div>
              {assignment.attachments.length > 0 && (
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="w-4 h-4 mr-2" />
                  {assignment.attachments.length} attachment{assignment.attachments.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">Max: {assignment.maxMarks} marks</span>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                View Assignment →
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
          <p className="text-gray-500">You don't have any assignments in this category.</p>
        </div>
      )}

      {/* Assignment Details Modal */}
      {showSubmissionModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowSubmissionModal(false)}></div>
            
            <div className="relative w-full max-w-4xl mx-auto bg-white rounded-lg shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedAssignment.subject}</h2>
                  <p className="text-gray-600">{selectedAssignment.class} • Section {selectedAssignment.section}</p>
                </div>
                <button 
                  onClick={() => setShowSubmissionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Assignment Instructions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Instructions</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedAssignment.instructions || 'No detailed instructions provided.'}
                    </p>
                  </div>
                </div>

                {/* Assignment Attachments */}
                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Files</h3>
                    <div className="space-y-2">
                      {selectedAssignment.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.originalName || `File ${index + 1}`}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size || 0)}</p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submission Section */}
                {!submission ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Submission</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Submission Text
                        </label>
                        <textarea
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Write your submission here..."
                          value={submissionText}
                          onChange={e => setSubmissionText(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Attach Files
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            id="submission-files"
                          />
                          <label
                            htmlFor="submission-files"
                            className="cursor-pointer flex flex-col items-center justify-center py-4"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Click to upload files</span>
                          </label>
                        </div>

                        {submissionFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {submissionFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => setShowSubmissionModal(false)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitAssignment}
                        disabled={!submissionText.trim() && submissionFiles.length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Assignment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Submission</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">Submitted</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                        {submission.isLateSubmission && ' (Late submission)'}
                      </p>
                      {submission.grade !== undefined && (
                        <p className="text-sm text-green-700 mt-1">
                          Grade: {submission.grade}/{submission.maxMarks}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
