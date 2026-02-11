import api from './axios';

export async function getSchoolConfig() {
  const res = await api.get('/config/school');
  return res.data;
}

export async function getDashboardStats() {
  const res = await api.get('/config/dashboard/stats');
  return res.data;
}
