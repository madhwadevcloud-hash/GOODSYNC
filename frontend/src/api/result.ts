import api from '../api/axios';

export async function getResults(params?: any) {
  const res = await api.get('/results', { params });
  return res.data;
}

export async function addResult(data: any) {
  const res = await api.post('/results', data);
  return res.data;
}

export async function updateResult(id: string, data: any) {
  const res = await api.put(`/results/${id}`, data);
  return res.data;
}

export async function deleteResult(id: string) {
  const res = await api.delete(`/results/${id}`);
  return res.data;
}
