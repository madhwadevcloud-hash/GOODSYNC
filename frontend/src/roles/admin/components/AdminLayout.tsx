import React, { useState, useEffect } from 'react';
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
  FileText,
  CalendarDays,
  CalendarClock,
  Bell
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { usePermissions, PermissionKey } from '../../../hooks/usePermissions';
import { PermissionDeniedModal } from '../../../components/PermissionDeniedModal';
import api from '../../../services/api';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { hasPermission, showPermissionDenied, setShowPermissionDenied, deniedPermissionName, checkAndNavigate } = usePermissions();
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const response = await api.get('/schools/database/school-info');
        setSchoolDetails(response.data?.data || response.data);
      } catch (err) {
        console.error('Failed to fetch school info for header', err);
      } finally {
        setSchoolLoading(false);
      }
    };
    if (user?.schoolCode || user?.schoolId) {
      fetchSchool();
    } else {
      setSchoolLoading(false);
    }
  }, [user?.schoolCode, user?.schoolId]);

  const getLogoUrl = (logoPath: string | undefined): string => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string);
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      return `${baseUrl}${logoPath}`;
    }
    return logoPath;
  };

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
    { name: 'Assign Teacher', href: '/admin/teacher-assignments', icon: UserCheck }, { name: 'Academic Calendar', href: '/admin/calendar', icon: CalendarDays },
    { name: 'Leave Management', href: '/admin/leave-management', icon: CalendarClock },
    { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
    { name: 'Fees', href: '/admin/fees/structure', icon: CreditCard },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
  ];

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-[280px] bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between h-screen sticky top-0 overflow-hidden text-slate-700">
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className="h-[72px] px-5 flex items-center border-b border-slate-100 shrink-0 bg-gradient-to-b from-indigo-50/30 to-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center gap-3 min-w-0 relative z-10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.userId || user?.email || 'Admin'}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 pt-1 pb-6 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2.5 text-[15px] font-semibold rounded-xl transition-all duration-200 ${active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-white' : 'text-slate-500'}`} strokeWidth={active ? 2.5 : 2} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 bg-white border-t border-slate-100 z-10">
          <div className="px-4 py-2 text-center border-b border-gray-100">
            <p className="text-[11px] text-gray-400 font-medium">Powered by <span className="text-violet-500 font-semibold">GoodSync ERP</span></p>
          </div>

          <div className="px-4 pt-2 pb-3 border-t border-gray-100 shrink-0">
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLogout}
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

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col justify-between h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className="h-[72px] px-5 flex items-center justify-between border-b border-slate-100 shrink-0 bg-gradient-to-b from-indigo-50/30 to-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.userId || user?.email || 'Admin'}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:bg-slate-100 hover:text-slate-600 p-2 rounded-xl transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 px-4 pt-1 pb-6 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2.5 text-[15px] font-semibold rounded-xl transition-all duration-200 ${active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-white' : 'text-slate-500'}`} strokeWidth={active ? 2.5 : 2} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 bg-white border-t border-slate-100 z-10">
          <div className="px-4 py-2 text-center border-b border-gray-100">
            <p className="text-[11px] text-gray-400 font-medium">Powered by <span className="text-violet-500 font-semibold">GoodSync ERP</span></p>
          </div>

          <div className="px-4 pt-2 pb-3 border-t border-gray-100 shrink-0">
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLogout}
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
                <div className="h-10 w-10 bg-white border border-indigo-100/80 rounded-xl hidden sm:flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-md group-hover:border-indigo-200 transition-all duration-300 ease-out overflow-hidden">
                  {schoolLoading ? (
                    <div className="h-5 w-5 rounded bg-slate-200 animate-pulse" />
                  ) : schoolDetails?.logoUrl ? (
                    <img 
                      src={getLogoUrl(schoolDetails.logoUrl)} 
                      alt="School Logo" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <Building className="h-5 w-5 text-indigo-600 group-hover:text-indigo-700 transition-colors duration-300" />
                  )}
                </div>
                <div className="flex flex-col justify-center min-w-0 shrink-0">
                  {schoolLoading ? (
                    <>
                      <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                      <div className="h-3 w-48 rounded bg-slate-100 animate-pulse mt-1.5 hidden md:block" />
                    </>
                  ) : (
                    <>
                      <h2 className="text-[15px] font-bold text-slate-800 leading-tight truncate group-hover:text-indigo-700 transition-colors duration-300 whitespace-nowrap">
                        {schoolDetails?.name || user?.schoolName || 'Vidyaniketan High School'}
                      </h2>
                      <div className="flex items-center text-[11px] font-medium text-slate-500 gap-3 mt-0.5 truncate hidden md:flex whitespace-nowrap">
                        {(schoolDetails?.address?.fullAddress || [schoolDetails?.address?.street, schoolDetails?.address?.area, schoolDetails?.address?.city].filter(Boolean).join(', ')) && (
                          <span 
                            className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-default"
                            title={schoolDetails?.address?.fullAddress || [schoolDetails?.address?.street, schoolDetails?.address?.area, schoolDetails?.address?.city].filter(Boolean).join(', ')}
                          >
                            <MapPin className="h-3 w-3" /> {schoolDetails?.address?.fullAddress || [schoolDetails?.address?.street, schoolDetails?.address?.area, schoolDetails?.address?.city].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {(schoolDetails?.contact?.phone || schoolDetails?.mobile) && (
                          <span className="flex items-center gap-1 hidden lg:flex hover:text-indigo-600 transition-colors cursor-default">
                            <Phone className="h-3 w-3" /> {schoolDetails?.contact?.phone || schoolDetails?.mobile}
                          </span>
                        )}
                        {schoolDetails?.contact?.email && (
                          <span className="flex items-center gap-1 hidden xl:flex hover:text-indigo-600 transition-colors cursor-default">
                            <Mail className="h-3 w-3" /> {schoolDetails.contact.email}
                          </span>
                        )}
                      </div>
                    </>
                  )}
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

                <div className="flex items-center gap-1 sm:gap-2 mx-1">
                  <Link to="/admin/calendar" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300 relative group/icon" title="Calendar">
                    <Calendar className="h-[22px] w-[22px] group-hover/icon:scale-110 transition-transform" />
                  </Link>
                  <Link to="/admin/messages" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300 relative group/icon" title="Messages">
                    <Bell className="h-[22px] w-[22px] group-hover/icon:scale-110 transition-transform" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  </Link>
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