import api from '../api/axios';
import { AuthUser } from '../auth/types';

export async function fetchUsers(): Promise<AuthUser[]> {
  const res = await api.get('/users');
  return res.data;
}

// Add more functions for assignments, attendance, results, etc. as needed
