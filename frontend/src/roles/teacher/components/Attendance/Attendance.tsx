import React, { useState } from 'react';
import { Calendar, UserCheck, Eye, GraduationCap, AlertCircle } from 'lucide-react';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import MarkAttendance from './MarkAttendance';
import ViewAttendance from './ViewAttendance';

interface AttendanceProps {
  onNavigate?: (page: string) => void;
}

const Attendance: React.FC<AttendanceProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'mark' | 'view'>('mark');
  const { 
    currentAcademicYear, 
    viewingAcademicYear, 
    isViewingHistoricalYear, 
    setViewingYear, 
    availableYears, 
    loading: ayLoading 
  } = useAcademicYear();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        </div>
        
        {/* Academic Year Badge (Read-only) */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md">
          <GraduationCap className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="text-xs opacity-90">Academic Year</span>
            <span className="font-bold text-sm">
              {ayLoading ? 'Loading...' : currentAcademicYear || '2024-2025'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('mark')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === 'mark'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserCheck className="h-5 w-5" />
              <span className="font-medium">Mark Attendance</span>
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === 'view'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="h-5 w-5" />
              <span className="font-medium">View Attendance</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'mark' ? <MarkAttendance /> : <ViewAttendance />}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
