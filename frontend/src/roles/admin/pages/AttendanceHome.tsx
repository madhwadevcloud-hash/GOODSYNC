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
    <div className="space-y-6 relative">
      <div className="sticky top-[72px] z-20 flex flex-col gap-6 pt-4 pb-2 -mt-4 bg-[#f8fafc]">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden mx-2 sm:mx-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-3 rounded-xl flex items-center justify-center shadow-sm">
                <Calendar className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Mark daily attendance or view records</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100/80 p-1.5 rounded-2xl mx-2 sm:mx-0 overflow-x-auto custom-scrollbar border border-slate-200/60">
          <nav className="flex space-x-1 min-w-max">
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
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 3 : 2} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-2 sm:mx-0">
        <div className="bg-transparent">
          {activeTab === 'mark' && <MarkAttendance />}
          {activeTab === 'view' && <ViewAttendanceRecords />}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHome;
