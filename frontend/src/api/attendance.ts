import api from './axios';

export async function markAttendance(data: any) {
  console.log('📝 Marking attendance:', data);
  const res = await api.post('/attendance/mark', data);
  console.log('✅ Attendance marked:', res.data);
  return res.data;
}

export async function markSessionAttendance(data: any) {
  console.log('📝 Marking session attendance:', data);
  const res = await api.post('/attendance/mark-session', data);
  console.log('✅ Session attendance marked:', res.data);
  return res.data;
}

export async function markBulkAttendance(data: any) {
  console.log('📝 Marking bulk attendance:', data);
  const res = await api.post('/attendance/mark-bulk', data);
  console.log('✅ Bulk attendance marked:', res.data);
  return res.data;
}

export async function getAttendance(params?: any) {
  console.log('📊 Getting attendance with params:', params);
  const res = await api.get('/attendance', { params });
  console.log('✅ Attendance retrieved:', res.data);
  return res.data;
}

export async function getClassAttendance(params?: any) {
  console.log('📊 Getting class attendance with params:', params);
  const res = await api.get('/attendance/class', { params });
  console.log('✅ Class attendance retrieved:', res.data);
  return res.data;
}

export async function getAttendanceStats(params?: any) {
  console.log('📈 Getting attendance stats with params:', params);
  const res = await api.get('/attendance/stats', { params });
  console.log('✅ Attendance stats retrieved:', res.data);
  return res.data;
}

export async function checkSessionStatus(params: {
  class: string;
  section: string;
  date: string;
  session: string;
}) {
  console.log('🔍 Checking session status with params:', params);
  const res = await api.get('/attendance/session-status', { params });
  console.log('✅ Session status checked:', res.data);
  return res.data;
}
