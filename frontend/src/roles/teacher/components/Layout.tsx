import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Home,
  UserCheck,
  User,
  Search,
  Bell,
  MapPin,
  Phone,
  Mail
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

interface SchoolAddress {
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  taluka?: string;
  state?: string;
  stateId?: string;
  districtId?: string;
  talukaId?: string;
  country?: string;
  zipCode?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
}

interface SchoolInfo {
  name?: string;
  code?: string;
  logoUrl?: string;
  address?: SchoolAddress | string;
  phone?: string;
  email?: string;
}

const formatAddress = (address?: SchoolAddress | string): string => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  // Keep it short: just street, area, and city (skip district/state/zip)
  const parts = [address.street, address.area, address.city].filter(Boolean);
  return parts.join(', ');
};

// The backend response shape isn't always consistent — phone/email sometimes
// arrive at the top level, sometimes nested under `address`, and sometimes
// under a different key name entirely. Check the common variants so the
// header doesn't silently drop them.
const pickPhone = (data: any): string | undefined =>
  data?.phone ||
  data?.contact?.phone ||
  data?.contactNumber ||
  data?.mobile ||
  data?.address?.phone;

const pickEmail = (data: any): string | undefined =>
  data?.email ||
  data?.contact?.email ||
  data?.contactEmail ||
  data?.address?.email;

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, onLogout }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const { hasPermission, showPermissionDenied, setShowPermissionDenied, deniedPermissionName, checkAndNavigate } = usePermissions();

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/schools/database/school-info');
        const data = res.data?.data || res.data;
        if (mounted && data) {
          // eslint-disable-next-line no-console
          console.log('school-info response:', data); // TEMP: verify actual field names, remove once confirmed
          setSchoolInfo({
            name: data.name,
            code: data.code,
            logoUrl: data.logoUrl,
            address: data.address,
            phone: pickPhone(data),
            email: pickEmail(data)
          });
        }
      } catch (err) {
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
    { name: 'Student Details', icon: Users, page: 'student-details', permission: null },
    { name: 'Attendance', icon: UserCheck, page: 'attendance', permission: 'viewAttendance' as PermissionKey },
    { name: 'Assignments', icon: FileText, page: 'assignments', permission: 'viewAssignments' as PermissionKey },
    { name: 'Results', icon: BarChart3, page: 'view-results', permission: 'viewResults' as PermissionKey },
    { name: 'Messages', icon: MessageSquare, page: 'messages', permission: 'messageStudentsParents' as PermissionKey },
    { name: 'Calendar', icon: CalendarDays, page: 'calendar', permission: null },
    { name: 'Leave Request', icon: Calendar, page: 'leave-request', permission: 'viewLeaves' as PermissionKey },
    { name: 'Profile', icon: User, page: 'profile', permission: null },
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

  const schoolLogoUrl = getLogoUrl(schoolInfo?.logoUrl);
  const formattedAddress = formatAddress(schoolInfo?.address);

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
        <div className="flex items-center justify-between h-20 px-5 border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-violet-50/30 to-white relative overflow-hidden">
  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
  <div className="flex items-center min-w-0 relative z-10">
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
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
          <nav className="flex-1 px-4 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center px-3 py-2.5 text-base font-medium rounded-xl transition-colors ${isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-200'
                      : 'text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                    }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-3 text-center border-t border-gray-100">
            <p className="text-[11px] text-gray-400 font-medium">Powered by <span className="text-violet-500 font-semibold">GoodSync ERP</span></p>
          </div>

          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex flex-col gap-2">
              <button
                onClick={onLogout}
                title="Logout"
                className="w-full flex items-center px-3 py-2.5 rounded-xl text-base font-medium text-red-500 bg-red-50/60 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <PermissionDeniedModal
        isOpen={showPermissionDenied}
        onClose={() => setShowPermissionDenied(false)}
        permissionName={deniedPermissionName}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center h-[72px] px-4 lg:px-6 gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h2 className="text-base font-semibold text-gray-900 capitalize sm:hidden truncate">
              {currentPage.replace(/-/g, ' ')}
            </h2>

            <div className="flex-1 flex items-center justify-between overflow-hidden">
              {/* Left: School Details — collapses out of view while the search is focused */}
              <div
                className={`hidden sm:flex items-center gap-3 transition-all duration-500 ease-in-out overflow-hidden ${
                  isSearchFocused ? 'max-w-0 opacity-0 invisible -translate-x-8' : 'max-w-2xl opacity-100 visible translate-x-0'
                }`}
              >
                {schoolLogoUrl ? (
                  <img
                    src={schoolLogoUrl}
                    alt={schoolInfo?.name || 'School logo'}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg shadow-sm shadow-violet-200 flex-shrink-0">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                )}

                <div className="min-w-0 shrink-0">
                  <span className="block text-xl lg:text-2xl font-bold text-gray-900 truncate whitespace-nowrap">
                    {schoolInfo?.name || 'School'}
                  </span>
                  <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500 whitespace-nowrap">
                    {formattedAddress && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{formattedAddress}</span>
                      </span>
                    )}
                    {schoolInfo?.phone && (
                      <span className="hidden lg:flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        {schoolInfo.phone}
                      </span>
                    )}
                    {schoolInfo?.email && (
                      <span className="hidden xl:flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        {schoolInfo.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Search — grows to fill the space the school block just vacated */}
              <div
                className={`flex items-center gap-3 transition-all duration-500 ease-in-out ${
                  isSearchFocused ? 'w-full flex-1' : 'ml-auto'
                }`}
              >
                <div
                  className={`relative transition-all duration-500 ease-in-out ${
                    isSearchFocused ? 'w-full max-w-full' : 'w-full max-w-[180px] sm:max-w-[220px] lg:max-w-xs'
                  }`}
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search anything..."
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all duration-300"
                  />
                </div>

                <button
                  onClick={() => handleMenuClick(menuItems.find(m => m.page === 'messages')!)}
                  className="relative p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
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
                  className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors hidden sm:block flex-shrink-0"
                  title="Leave Request"
                >
                  <Calendar className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 lg:px-6 pb-4 lg:pb-6 pt-2 bg-gray-50 no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
