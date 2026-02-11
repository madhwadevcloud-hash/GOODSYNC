import React, { useState } from 'react';
import { FileText, Send, Eye } from 'lucide-react';
import LeaveRequest from './LeaveRequest';
import ViewLeaveRequests from './ViewLeaveRequests';

interface LeaveRequestManagementProps {
  onNavigate?: (page: string) => void;
}

const LeaveRequestManagement: React.FC<LeaveRequestManagementProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'request' | 'view'>('request');

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg">
          <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
        </div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Leave Request Management</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('request')}
              className={`flex items-center justify-center sm:justify-start space-x-2 py-3 sm:py-4 border-b-2 transition-colors w-full sm:w-auto ${
                activeTab === 'request'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium text-sm sm:text-base">Leave Request</span>
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex items-center justify-center sm:justify-start space-x-2 py-3 sm:py-4 border-b-2 transition-colors w-full sm:w-auto ${
                activeTab === 'view'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium text-sm sm:text-base">View Leaves</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'request' ? <LeaveRequest /> : <ViewLeaveRequests />}
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestManagement;
