import React, { useState } from 'react';
import { Save, Bell, BookOpen, Calendar, Users, Settings as SettingsIcon } from 'lucide-react';
import { currentUser } from '../../utils/mockData';

const SchoolSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      studentAbsences: true,
      assignmentDeadlines: true,
      parentMessages: true,
      systemUpdates: false
    },
    classPreferences: {
      defaultAttendanceView: 'weekly',
      autoSaveAttendance: true,
      showStudentPhotos: true,
      enableQuickActions: true
    },
    examSettings: {
      defaultPassingGrade: 40,
      gradeScale: 'percentage',
      allowReExamination: true,
      showClassRanking: true
    },
    subjectSettings: {
      Mathematics: {
        practicalMarks: 20,
        theoryMarks: 80,
        enableLab: false
      },
      Physics: {
        practicalMarks: 30,
        theoryMarks: 70,
        enableLab: true
      }
    }
  });

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    alert('Settings saved successfully!');
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handleClassPreferenceChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      classPreferences: {
        ...prev.classPreferences,
        [key]: value
      }
    }));
  };

  const handleExamSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      examSettings: {
        ...prev.examSettings,
        [key]: value
      }
    }));
  };

  const handleSubjectSettingChange = (subject: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      subjectSettings: {
        ...prev.subjectSettings,
        [subject]: {
          ...prev.subjectSettings[subject as keyof typeof prev.subjectSettings],
          [key]: value
        }
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">School Settings</h1>
          <p className="text-gray-600">Configure class-specific preferences and notifications</p>
        </div>
        
        <button
          onClick={handleSaveSettings}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4 sm:mt-0"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </button>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Bell className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <p className="text-sm text-gray-600">
                  {key === 'emailNotifications' && 'Receive email notifications for important updates'}
                  {key === 'studentAbsences' && 'Get notified when students are absent'}
                  {key === 'assignmentDeadlines' && 'Reminders for upcoming assignment deadlines'}
                  {key === 'parentMessages' && 'Notifications for new messages from parents'}
                  {key === 'systemUpdates' && 'System maintenance and update notifications'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleNotificationChange(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Class Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Users className="h-5 w-5 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Class Preferences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Attendance View
            </label>
            <select
              value={settings.classPreferences.defaultAttendanceView}
              onChange={(e) => handleClassPreferenceChange('defaultAttendanceView', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily View</option>
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
            </select>
          </div>

          <div className="space-y-4">
            {Object.entries(settings.classPreferences)
              .filter(([key]) => key !== 'defaultAttendanceView')
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="flex-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <p className="text-xs text-gray-600">
                      {key === 'autoSaveAttendance' && 'Automatically save attendance as you mark it'}
                      {key === 'showStudentPhotos' && 'Display student photos in attendance lists'}
                      {key === 'enableQuickActions' && 'Enable quick action buttons in the interface'}
                    </p>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => handleClassPreferenceChange(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exam Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Calendar className="h-5 w-5 text-orange-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Exam & Grading Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Passing Grade (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.examSettings.defaultPassingGrade}
              onChange={(e) => handleExamSettingChange('defaultPassingGrade', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade Scale
            </label>
            <select
              value={settings.examSettings.gradeScale}
              onChange={(e) => handleExamSettingChange('gradeScale', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="percentage">Percentage</option>
              <option value="gpa">GPA (4.0 Scale)</option>
              <option value="letter">Letter Grades</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-4">
            {Object.entries(settings.examSettings)
              .filter(([key]) => !['defaultPassingGrade', 'gradeScale'].includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="flex-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <p className="text-xs text-gray-600">
                      {key === 'allowReExamination' && 'Allow students to retake failed examinations'}
                      {key === 'showClassRanking' && 'Display class ranking in result reports'}
                    </p>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => handleExamSettingChange(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <BookOpen className="h-5 w-5 text-purple-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Subject Configuration</h2>
        </div>

        <div className="space-y-6">
          {currentUser.subjects.map(subject => (
            <div key={subject} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">{subject}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theory Marks (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.subjectSettings[subject as keyof typeof settings.subjectSettings]?.theoryMarks || 80}
                    onChange={(e) => handleSubjectSettingChange(subject, 'theoryMarks', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practical Marks (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.subjectSettings[subject as keyof typeof settings.subjectSettings]?.practicalMarks || 20}
                    onChange={(e) => handleSubjectSettingChange(subject, 'practicalMarks', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.subjectSettings[subject as keyof typeof settings.subjectSettings]?.enableLab || false}
                      onChange={(e) => handleSubjectSettingChange(subject, 'enableLab', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">Enable Lab</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <SettingsIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Teacher Information</h3>
            <div className="space-y-1 text-gray-600">
              <p><span className="font-medium">Name:</span> {currentUser.name}</p>
              <p><span className="font-medium">Employee ID:</span> {currentUser.employeeId}</p>
              <p><span className="font-medium">Email:</span> {currentUser.email}</p>
              <p><span className="font-medium">Subjects:</span> {currentUser.subjects.join(', ')}</p>
              <p><span className="font-medium">Classes:</span> {currentUser.classes.join(', ')}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">System Status</h3>
            <div className="space-y-1 text-gray-600">
              <p><span className="font-medium">Version:</span> 2.1.0</p>
              <p><span className="font-medium">Last Updated:</span> January 15, 2025</p>
              <p><span className="font-medium">Data Backup:</span> Daily at 2:00 AM</p>
              <p><span className="font-medium">Server Status:</span> 
                <span className="inline-flex ml-2 items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolSettings;