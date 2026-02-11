import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance/Attendance';
import MarkAttendance from './components/Attendance/MarkAttendance';
import ViewAttendance from './components/Attendance/ViewAttendance';
import Assignments from './components/Assignments/Assignments';
import AddAssignments from './components/Assignments/AddAssignments';
import ViewAssignments from './components/Assignments/ViewAssignments';
import ViewResults from './components/Results/ViewResults';
import Messages from './components/Messages/Messages';
import LeaveRequestManagement from './components/LeaveRequest/LeaveRequestManagement';
import { PermissionProvider } from '../../hooks/usePermissions';
import { PermissionGuard } from '../../components/PermissionGuard';
import { AcademicYearProvider } from '../../contexts/AcademicYearContext';
import { useAuth } from '../../auth/AuthContext';

function App() {
  const { user } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'attendance':
        return <Attendance onNavigate={handleNavigate} />;
      case 'mark-attendance':
        return <MarkAttendance />;
      case 'view-attendance':
        return <ViewAttendance />;
      case 'assignments':
        return <Assignments onNavigate={handleNavigate} />;
      case 'add-assignments':
        return <AddAssignments />;
      case 'view-assignments':
        return <ViewAssignments />;
      case 'view-results':
        return <ViewResults />;
      case 'messages':
        return <Messages />;
      case 'leave-request':
        return (
          <PermissionGuard permission="viewLeaves" permissionName="Leave Management">
            <LeaveRequestManagement onNavigate={handleNavigate} />
          </PermissionGuard>
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <AcademicYearProvider schoolCode={user?.schoolCode}>
      <PermissionProvider>
        <Layout
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        >
          {renderPage()}
        </Layout>
      </PermissionProvider>
    </AcademicYearProvider>
  );
}

export default App;