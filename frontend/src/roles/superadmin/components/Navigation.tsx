import React from 'react';
import { Home, Plus, School } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Navigation() {
  const { currentView, setCurrentView, stats } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'add-school', label: 'Add New School', icon: Plus },
  ];

  return (
    <div className="bg-white border-r border-gray-200 w-full lg:w-64 lg:min-h-screen flex flex-col">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <School className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Super Admin</h1>
        </div>
      </div>

      <nav className="flex-1 p-3 sm:p-4">
        <ul className="space-y-1 sm:space-y-2 lg:block flex lg:flex-col">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex-1 lg:flex-none">
                <button
                  onClick={() => setCurrentView(item.id as any)}
                  className={`w-full flex items-center justify-center lg:justify-start space-x-2 lg:space-x-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors duration-200 text-sm lg:text-base ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                  <span className="font-medium hidden sm:inline lg:inline">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 sm:p-4 border-t border-gray-200 hidden lg:block">
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Schools</span>
              <span className="text-sm font-semibold text-gray-900">{stats.totalSchools}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Users</span>
              <span className="text-sm font-semibold text-gray-900">{stats.totalUsers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}