import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Users,
  Settings,
  Calendar,
  UserCheck,
  BookOpen,
  BarChart3,
  GraduationCap,
  MessageSquare,
  CreditCard,
  LogOut,
  Search,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Building,
  FileText
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { usePermissions, PermissionKey } from '../../../hooks/usePermissions';
import { PermissionDeniedModal } from '../../../components/PermissionDeniedModal';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { hasPermission, showPermissionDenied, setShowPermissionDenied, deniedPermissionName, checkAndNavigate } = usePermissions();

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
    navigate('/login', { replace: true });
  };

  // Define navigation with permission requirements
  const navigation = [
    { name: 'Dashboard', href: '/admin/', icon: Home },
    { name: 'Manage Users', href: '/admin/users', icon: Users },
    { name: 'School Settings', href: '/admin/settings', icon: Settings },
    { name: 'Academic Details', href: '/admin/academic-details', icon: GraduationCap },
    { name: 'Attendance', href: '/admin/attendance', icon: UserCheck },
    { name: 'Assignments', href: '/admin/assignments', icon: BookOpen },
    { name: 'Results', href: '/admin/results', icon: BarChart3 },
    { name: 'Teacher Assignments', href: '/admin/teacher-assignments', icon: UserCheck },
    { name: 'Leave Management', href: '/admin/leave-management', icon: Calendar },
    { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
    { name: 'Fees', href: '/admin/fees/structure', icon: CreditCard },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
  ];

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-[280px] bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between h-screen sticky top-0 overflow-hidden text-slate-700">
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="py-5 px-5 flex flex-col justify-center border-b border-slate-100 shrink-0 bg-gradient-to-b from-indigo-50/30 to-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-white p-2 rounded-xl flex items-center justify-center shadow-sm border border-slate-200/60 shrink-0 text-indigo-600">
                <Building className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className="flex flex-col overflow-hidden justify-center">
                <h1 className="text-[18px] font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-600 tracking-tight leading-none truncate pb-0.5" title={user?.schoolName || 'Vidyaniketan High School'}>
                  {user?.schoolName || 'Vidyaniketan High School'}
                </h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Admin Portal</span>
              </div>
            </div>
          </div>
          <nav className="mt-6 px-4 space-y-2 flex-1 pb-4">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-[15px] font-semibold rounded-xl transition-all duration-200 ${active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <item.icon className={`mr-4 h-[22px] w-[22px] ${active ? 'text-white' : 'text-slate-500'}`} strokeWidth={active ? 2.5 : 2} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto shrink-0 border-t border-slate-100 mb-2 space-y-2">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-[15px] font-semibold text-slate-600 rounded-xl hover:bg-slate-50 hover:text-red-600 transition-colors group"
            >
              <LogOut className="mr-4 h-[22px] w-[22px] text-slate-500 group-hover:text-red-500 transition-colors" strokeWidth={2} />
              Logout
            </button>
            <div className="px-2 pt-2 flex items-center gap-3">
              <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
              </div>
              <h1 className="text-[14px] font-bold text-slate-900 tracking-tight leading-tight">GOODSYNK ERP</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col justify-between h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
          <div className="py-4 px-5 flex items-center justify-between border-b border-slate-100 shrink-0 bg-gradient-to-b from-indigo-50/30 to-white">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl flex items-center justify-center shadow-sm border border-slate-200/60 shrink-0 text-indigo-600">
                <Building className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="flex flex-col overflow-hidden max-w-[150px] justify-center">
                <h1 className="text-[16px] font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-600 tracking-tight leading-none truncate pb-0.5">
                  {user?.schoolName || 'Vidyaniketan'}
                </h1>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Admin Portal</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:bg-slate-100 hover:text-slate-600 p-2 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="mt-4 px-4 space-y-2 flex-1 pb-4">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-[15px] font-semibold rounded-xl transition-all duration-200 ${active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <item.icon className={`mr-4 h-[22px] w-[22px] ${active ? 'text-white' : 'text-slate-500'}`} strokeWidth={active ? 2.5 : 2} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto shrink-0 border-t border-slate-100 mb-2 space-y-2">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-[15px] font-semibold text-slate-600 rounded-xl hover:bg-slate-50 hover:text-red-600 transition-colors group"
            >
              <LogOut className="mr-4 h-[22px] w-[22px] text-slate-500 group-hover:text-red-500 transition-colors" strokeWidth={2} />
              Logout
            </button>
            <div className="px-2 pt-2 flex items-center gap-3">
              <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
              </div>
              <h1 className="text-[14px] font-bold text-slate-900 tracking-tight leading-tight">GOODSYNK ERP</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Denied Modal */}
      <PermissionDeniedModal
        isOpen={showPermissionDenied}
        onClose={() => setShowPermissionDenied(false)}
        permissionName={deniedPermissionName}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between h-[72px] px-4 sm:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors mr-2"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 flex items-center justify-between overflow-hidden">
              {/* Left: School Details */}
              <div className={`flex items-center gap-3 group cursor-pointer rounded-xl hover:bg-slate-50/80 transition-all duration-500 ease-in-out overflow-hidden ${isSearchFocused ? 'max-w-0 opacity-0 invisible -translate-x-8 p-0 m-0' : 'max-w-2xl opacity-100 visible translate-x-0 p-1.5 -ml-1.5'}`}>
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100/80 rounded-xl hidden sm:flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-md group-hover:border-indigo-200 transition-all duration-300 ease-out">
                  <Building className="h-5 w-5 text-indigo-600 group-hover:text-indigo-700 transition-colors duration-300" />
                </div>
                <div className="flex flex-col justify-center min-w-0 shrink-0">
                  <h2 className="text-[15px] font-bold text-slate-800 leading-tight truncate group-hover:text-indigo-700 transition-colors duration-300 whitespace-nowrap">
                    {user?.schoolName || 'Vidyaniketan High School'}
                  </h2>
                  <div className="flex items-center text-[11px] font-medium text-slate-500 gap-3 mt-0.5 truncate hidden md:flex whitespace-nowrap">
                    <span className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-default">
                      <MapPin className="h-3 w-3" /> 123 Education Lane, City
                    </span>
                    <span className="flex items-center gap-1 hidden lg:flex hover:text-indigo-600 transition-colors cursor-default">
                      <Phone className="h-3 w-3" /> +91 98765 43210
                    </span>
                    <span className="flex items-center gap-1 hidden xl:flex hover:text-indigo-600 transition-colors cursor-default">
                      <Mail className="h-3 w-3" /> contact@school.edu
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Search + User Profile */}
              <div className={`flex items-center gap-3 sm:gap-4 shrink-0 transition-all duration-500 ease-in-out ${isSearchFocused ? 'w-full flex-1 ml-0' : 'ml-4'}`}>
                <div className={`relative text-slate-400 focus-within:text-indigo-600 hidden md:block group/search transition-all duration-500 ease-in-out ${isSearchFocused ? 'w-full max-w-full' : 'w-full max-w-[150px] lg:max-w-[200px] xl:max-w-xs'}`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors duration-300" aria-hidden="true" />
                  </div>
                  <input
                    id="search"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-full leading-5 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white text-[13px] transition-all duration-300 hover:bg-slate-50 hover:border-slate-300"
                    placeholder="Search anything..."
                    type="search"
                    name="search"
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                </div>

                <div className="h-8 w-px bg-slate-200 hidden md:block mx-1"></div>

                <div className="flex items-center space-x-3 cursor-pointer p-1.5 sm:p-2 -mr-2 rounded-xl transition-all duration-300 hover:bg-slate-50 group/profile">
                  <div className="h-9 w-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center shadow-sm text-white font-bold text-[15px] transform group-hover/profile:scale-105 group-hover/profile:shadow-md group-hover/profile:ring-2 group-hover/profile:ring-indigo-100 group-hover/profile:ring-offset-1 transition-all duration-300 ease-out">
                    {user?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-[13px] font-bold text-slate-700 leading-tight group-hover/profile:text-indigo-700 transition-colors">
                      {user?.name || 'Admin User'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 leading-tight capitalize">
                      {user?.role || 'Administrator'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block ml-1 group-hover/profile:translate-y-0.5 group-hover/profile:text-indigo-500 transition-all duration-300" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;