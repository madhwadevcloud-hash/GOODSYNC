import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Assignments from "./pages/Assignments";
import Results from "./pages/Results";
import Fees from "./pages/Fees";
import Profile from "./pages/Profile";
import Message from "./pages/Message";

export function StudentApp() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="results" element={<Results />} />
        <Route path="fees" element={<Fees />} />
        <Route path="profile" element={<Profile />} />
        <Route path="messages" element={<Message />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Layout>
  );
}

export default StudentApp;