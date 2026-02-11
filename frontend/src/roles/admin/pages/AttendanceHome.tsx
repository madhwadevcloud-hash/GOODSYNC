import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UserCheck, Eye, Calendar } from 'lucide-react';
import MarkAttendance from './MarkAttendance';
import ViewAttendanceRecords from './ViewAttendanceRecords';

const AttendanceHome: React.FC = () => {
  const location = useLocation();
  
  // Determine active tab based on URL
  const getActiveTab = () => {
    if (location.pathname.includes('/attendance/mark')) return 'mark';
    if (location.pathname.includes('/attendance/view')) return 'view';
    return 'mark'; // default
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const tabs = [
    {
      id: 'mark',
      name: 'Mark Attendance',
      icon: UserCheck,
      href: '/admin/attendance/mark',
      description: 'Mark daily attendance for students'
    },
    {
      id: 'view',
      name: 'View Attendance',
      icon: Eye,
      href: '/admin/attendance/view',
      description: 'View and analyze attendance records'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    window.history.pushState({}, '', tab.href);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'mark' && <MarkAttendance />}
          {activeTab === 'view' && <ViewAttendanceRecords />}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHome;
