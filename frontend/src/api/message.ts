// frontend/src/api/message.ts
import api from '../api/axios';

export async function getMessages(params?: any) {
  const res = await api.get('/messages', { params });
  return res.data;
}

export async function sendMessage(data: any) {
  const res = await api.post('/messages/send', data);
  return res.data;
}

export async function previewMessageRecipients(data: any) {
  const res = await api.post('/messages/preview', data);
  return res.data;
}

export async function deleteMessage(id: string) {
  const res = await api.delete(`/messages/${id}`);
  return res.data;
}

// Optional: Get message details if needed
export async function getMessageDetails(id: string) {
  const res = await api.get(`/messages/${id}`);
  return res.data;
}

// Teacher composing: send a message to Students / Teachers / Admin (multi-select)
export async function sendTeacherMessage(data: any) {
  const res = await api.post('/messages/teacher/send', data);
  return res.data;
}

export async function previewTeacherMessageRecipients(data: any) {
  const res = await api.post('/messages/teacher/preview', data);
  return res.data;
}

// Admin: view messages sent by teachers ("Staff Messages")
export async function getStaffMessages(params?: any) {
  const res = await api.get('/messages/staff', { params });
  return res.data;
}