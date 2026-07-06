import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Home,
  UserCheck,
  Search,
  Bell
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { usePermissions, PermissionKey } from '../../../hooks/usePermissions';
import { PermissionDeniedModal } from '../../../components/PermissionDeniedModal';
import api from '../../../services/api';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface SchoolInfo {
  name?: string;
  code?: string;
  logoUrl?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, onLogout }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const { hasPermission, showPermissionDenied, setShowPermissionDenied, deniedPermissionName, checkAndNavigate } = usePermissions();

  // Fetch a lightweight notification count from recent messages
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/messages/teacher/messages?limit=10');
        const messages = res.data?.messages || res.data?.data || [];
        if (mounted) setNotificationCount(messages.length);
      } catch (err) {
        // Silently ignore - badge simply stays at 0
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch the school's name/code/logo for branding in the sidebar & top bar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/schools/database/school-info');
        const data = res.data?.data || res.data;
        if (mounted && data) {
          setSchoolInfo({ name: data.name, code: data.code, logoUrl: data.logoUrl });
        }
      } catch (err) {
        // Fall back to the code we already have from the logged-in user
        if (mounted) setSchoolInfo({ code: user?.schoolCode, name: user?.schoolName });
      }
    })();
    return () => { mounted = false; };
  }, [user?.schoolCode]);

  const getLogoUrl = (logoPath?: string): string => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      return `${baseUrl}${logoPath}`;
    }
    return logoPath;
  };

  const menuItems = [
    { name: 'Dashboard', icon: Home, page: 'dashboard', permission: null },
    { name: 'My Classes', icon: Users, page: 'student-details', permission: null },
    { name: 'Attendance', icon: UserCheck, page: 'attendance', permission: 'viewAttendance' as PermissionKey },
    { name: 'Assignments', icon: FileText, page: 'assignments', permission: 'viewAssignments' as PermissionKey },
    { name: 'Results', icon: BarChart3, page: 'view-results', permission: 'viewResults' as PermissionKey },
    { name: 'Messages', icon: MessageSquare, page: 'messages', permission: 'messageStudentsParents' as PermissionKey },
    { name: 'Leave Request', icon: Calendar, page: 'leave-request', permission: 'viewLeaves' as PermissionKey },
    { name: 'Settings', icon: Settings, page: 'settings', permission: null }
  ];

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.permission && !hasPermission(item.permission)) {
      checkAndNavigate(item.permission, item.name, () => {
        onNavigate(item.page);
        setSidebarOpen(false);
      });
    } else {
      onNavigate(item.page);
      setSidebarOpen(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const schoolLogoUrl = getLogoUrl(schoolInfo?.logoUrl);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
<div className="flex items-center justify-between h-20 px-5 border-b border-gray-100 flex-shrink-0"><div className="flex items-center gap-3 min-w-0">
              {schoolLogoUrl ? (
              <img
                src={schoolLogoUrl}
                alt={schoolInfo?.name || 'School logo'}
className="w-10 h-10 rounded-lg object-cover mr-3 flex-shrink-0"              />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl mr-2.5 shadow-sm shadow-violet-200 flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
  <h1 className="text-base font-medium text-gray-700 truncate">
    {schoolInfo?.name || "School"}
  </h1>

  <p className="text-base font-semibold text-violet-600">
    {schoolInfo?.code || user?.schoolCode || "—"}
  </p>
</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-4 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-200'
                      : 'text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                    }`}
                >
                  <Icon className={`h-4.5 w-4.5 mr-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer callout */}
          

          {/* Powered by */}
          <div className="px-4 pb-2 text-center">
            <p className="text-[11px] text-gray-400 font-medium">Powered by <span className="text-violet-500 font-semibold">GoodSync ERP</span></p>
          </div>

          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'T'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Teacher'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.userId || user?.email}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6 gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 flex-shrink-0"
              >
                <Menu className="h-5 w-5" />
              </button>

             

              <h2 className="text-base font-semibold text-gray-900 capitalize sm:hidden truncate">
                {currentPage.replace(/-/g, ' ')}
              </h2>

              {/* Expanding search */}
              {/* School name + Search */}
<div className="flex items-center ml-2 gap-3">

  <span className="text-base font-bold text-gray-900 whitespace-nowrap">
    {schoolInfo?.name || "School"}
  </span>

  <button
    onMouseDown={(e) => e.preventDefault()}
    onClick={() => setSearchOpen((o) => !o)}
    className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
    title="Search"
  >
    {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
  </button>

  <div
    className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
      searchOpen ? "w-56 sm:w-72 opacity-100" : "w-0 opacity-0"
    }`}
  >
    <input
      type="text"
      autoFocus={searchOpen}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onBlur={() => setSearchOpen(false)}
      placeholder="Search students, classes, assignments..."
      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
    />
  </div>

</div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleMenuClick(menuItems.find(m => m.page === 'messages')!)}
                className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                title="Messages"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleMenuClick(menuItems.find(m => m.page === 'leave-request')!)}
                className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors hidden sm:block"
                title="Leave Request"
              >
                <Calendar className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;