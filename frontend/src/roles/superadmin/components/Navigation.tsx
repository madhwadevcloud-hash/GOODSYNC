import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, School, TrendingUp, ShieldCheck, LogOut, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../../../auth/AuthContext';

interface NavigationProps {
  onClose?: () => void;
}

export function Navigation({ onClose }: NavigationProps) {
  const { currentView, setCurrentView, stats } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'add-school', label: 'Add New School', icon: Plus },
    { id: 'promotion', label: 'Promotion Requests', icon: TrendingUp },
  ];

  const handleLogout = () => {
    logout();
    navigate('/super-admin', { replace: true });
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SA';

  return (
    <div className="bg-white border-r border-gray-200 w-64 h-full flex flex-col overflow-y-auto">
      {/* Brand + close button (close only visible on mobile) */}
      <div className="p-5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">GoodSynk ERP</h1>
              <p className="text-xs text-gray-500">Super Admin</p>
            </div>
          </div>
          {/* Close button — only shown on mobile when used as a drawer */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li
                key={item.id}
                className="opacity-0 animate-slideInLeft"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <button
                  onClick={() => setCurrentView(item.id as any)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Quick stats */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Stats
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <School size={14} className="text-indigo-500" />
                Schools
              </span>
              <span className="text-sm font-bold text-gray-900">{stats.totalSchools}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Users</span>
              <span className="text-sm font-bold text-gray-900">{stats.totalUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signed-in-as + Logout */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name || 'Super Admin'}
            </p>
            <p className="text-xs text-gray-500">Signed in as Super Admin</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center justify-start space-x-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}