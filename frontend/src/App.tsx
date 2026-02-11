import React from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleGuard from './auth/RoleGuard';
import { useAuth } from './auth/AuthContext';
import { AdminApp } from './roles/admin/AdminApp';
import { TeacherApp } from './roles/teacher/TeacherApp';
import { SuperAdminApp } from './roles/superadmin/SuperAdminApp';
import Login from './pages/Login';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/super-admin" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/login" replace />;
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  return (
    <div className="w-full bg-slate-100 border-b">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="text-sm text-slate-700">
          Signed in as <b>{user.name}</b> ({user.role})
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-blue-600 hover:underline" to="/">Home</Link>
          <button
            className="px-3 py-1 rounded-lg bg-slate-800 text-white hover:bg-black"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
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
      <TopBar />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

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
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
