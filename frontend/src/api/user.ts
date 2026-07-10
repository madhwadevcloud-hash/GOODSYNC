import api from '../api/axios';
import { AuthUser } from '../auth/types';

export async function fetchUsers(): Promise<AuthUser[]> {
  const res = await api.get('/users');
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await api.post('/users/change-password', { currentPassword, newPassword });
  return res.data;
}

// Add more functions for assignments, attendance, results, etc. as needed
