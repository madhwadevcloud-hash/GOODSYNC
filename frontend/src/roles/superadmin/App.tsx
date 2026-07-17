import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AddSchoolForm } from './components/AddSchoolForm';
import { ViewAccess } from './components/ViewAccess';
import { AccountDetails } from './components/AccountDetails';
import SchoolDetails from './components/SchoolDetails';
import SchoolEditDetails from './components/SchoolEditDetails';
import { SchoolLogin } from '../../pages/SchoolLogin';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { useAuth } from '../../auth/AuthContext';
import { SuperAdminPromotionTab } from './components/PromotionTab';
import { TrendingUp, Menu, X } from 'lucide-react';

function AppContent() {
  console.log('[AppContent] Rendering AppContent');
  const { currentView, setCurrentView } = useApp();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if password change is required
  useEffect(() => {
    if (user && (user as any).passwordChangeRequired) {
      console.log('[SuperAdmin] Password change required for user');
      setShowPasswordDialog(true);
    }
  }, [user]);

  // Close sidebar on view change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentView]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-school':
        return <AddSchoolForm />;
      case 'view-access':
        return <ViewAccess />;
      case 'account-details':
        return <AccountDetails />;
      case 'school-details':
        return <SchoolDetails />;
      case 'edit-school':
        return <SchoolEditDetails />;
      case 'promotion':
        return (
          <div className="p-4 sm:p-6 animate-fadeIn">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 rounded-2xl p-5 sm:p-8 mb-4 sm:mb-6 opacity-0 animate-slideUp">
              <div className="relative z-10 flex items-center space-x-4">
                <div className="bg-white/15 p-3 rounded-2xl flex-shrink-0">
                  <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Student Promotion Management</h1>
                  <p className="text-indigo-100 mt-1 text-sm sm:text-base">
                    Global dashboard for managing student promotions across all registered schools.
                  </p>
                </div>
              </div>
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute right-16 bottom-[-3rem] w-28 h-28 rounded-full bg-white/10" />
            </div>
            <SuperAdminPromotionTab />
          </div>
        );
      case 'school-login':
        return (
          <SchoolLogin
            onLoginSuccess={(userInfo) => {
              console.log('[SuperAdmin] School login successful, navigating to school dashboard');
              if (userInfo.role === 'admin') {
                navigate('/admin', { replace: true });
              } else if (userInfo.role === 'teacher') {
                navigate('/teacher', { replace: true });
              } else {
                alert(`Login successful!\nWelcome ${userInfo.name}\nRole: ${userInfo.role}\nSchool: ${userInfo.schoolName}`);
                setCurrentView('dashboard');
              }
            }}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordDialog(false);
    alert('Password changed successfully! Please login again.');
    logout();
    navigate('/super-admin', { replace: true });
  };

  const handlePasswordDialogClose = () => {
    if (user && (user as any).passwordChangeRequired) {
      alert('You must change your password to continue using the system.');
      return;
    }
    setShowPasswordDialog(false);
  };

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden">
      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (always visible on lg+, drawer on mobile) ── */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 flex-shrink-0
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${currentView === 'school-login' ? 'hidden' : ''}
        `}
      >
        <Navigation onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        {currentView !== 'school-login' && (
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-1.5 rounded-lg">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-900">GoodSynk ERP</span>
              <span className="text-xs text-gray-400">· Super Admin</span>
            </div>
          </header>
        )}

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <ChangePasswordDialog
          onClose={handlePasswordDialogClose}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}
    </div>
  );
}

function App() {
  console.log('[App] Rendering App component');
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;