import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleGuard from './auth/RoleGuard';
import { useAuth } from './auth/AuthContext';
import { AdminApp } from './roles/admin/AdminApp';
import { TeacherApp } from './roles/teacher/TeacherApp';
import { StudentApp } from './roles/student/StudentApp';
import { SuperAdminApp } from './roles/superadmin/SuperAdminApp';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/super-admin" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading, token } = useAuth();
  
  // Debug info in console
  console.log('[APP] Render state:', { 
    hasUser: !!user, 
    userRole: user?.role, 
    hasToken: !!token, 
    loading 
  });

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/student/reset-password" element={<ResetPassword />} />
        {/* Private: must be logged in */}
        <Route element={<ProtectedRoute />}>
          <Route index element={<RootRedirect />} />

          {/* Super Admin portal */}
          <Route element={<RoleGuard allow={['superadmin']} />}>
            <Route path="/super-admin/*" element={<SuperAdminApp />} />
          </Route>

          {/* Admin portal */}
          <Route element={<RoleGuard allow={['admin']} />}>
            <Route path="/admin/*" element={<AdminApp />} />
          </Route>

          {/* Teacher portal */}
          <Route element={<RoleGuard allow={['teacher']} />}>
            <Route path="/teacher/*" element={<TeacherApp />} />
          </Route>

          {/* Student portal */}
          <Route element={<RoleGuard allow={['student']} />}>
            <Route path="/student/*" element={<StudentApp />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}