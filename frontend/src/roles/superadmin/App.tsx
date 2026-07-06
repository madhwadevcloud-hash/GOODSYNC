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
import { TrendingUp } from 'lucide-react';

function AppContent() {
  console.log('[AppContent] Rendering AppContent');
  const { currentView, setCurrentView } = useApp();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Check if password change is required
  useEffect(() => {
    if (user && (user as any).passwordChangeRequired) {
      console.log('[SuperAdmin] Password change required for user');
      setShowPasswordDialog(true);
    }
  }, [user]);

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
              // Navigate to the appropriate dashboard based on role
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
    navigate('/login', { replace: true });
  };

  const handlePasswordDialogClose = () => {
    // Don't allow closing if password change is required
    if (user && (user as any).passwordChangeRequired) {
      alert('You must change your password to continue using the system.');
      return;
    }
    setShowPasswordDialog(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
      {currentView !== 'school-login' && <Navigation />}
      <main
        className={`flex-1 h-full overflow-y-auto ${
          currentView === 'school-login' ? 'w-full' : ''
        }`}
      >
        {renderCurrentView()}
      </main>
      
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