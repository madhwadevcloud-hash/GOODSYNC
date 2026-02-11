import api from '../api/axios';

export async function fetchAssignments(params?: { academicYear?: string }) {
  const res = await api.get('/assignments', { params });
  return res.data;
}

export async function addAssignment(data: any) {
  const res = await api.post('/assignments', data);
  return res.data;
}

export async function createAssignmentWithFiles(formData: FormData) {
  const res = await api.post('/assignments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function getAssignmentById(id: string) {
  const res = await api.get(`/assignments/${id}`);
  return res.data;
}

export async function updateAssignment(id: string, data: any) {
  // Check if data is FormData (for file uploads)
  const headers = data instanceof FormData ? {
    'Content-Type': 'multipart/form-data',
  } : {};
  
  const res = await api.put(`/assignments/${id}`, data, { headers });
  return res.data;
}

export async function deleteAssignment(id: string) {
  const res = await api.delete(`/assignments/${id}`);
  return res.data;
}

export async function submitAssignment(assignmentId: string, formData: FormData) {
  const res = await api.post(`/assignments/${assignmentId}/submit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function getStudentSubmission(assignmentId: string) {
  const res = await api.get(`/assignments/${assignmentId}/submission`);
  return res.data;
}

export async function getAssignmentSubmissions(assignmentId: string, params?: any) {
  const res = await api.get(`/assignments/${assignmentId}/submissions`, { params });
  return res.data;
}

export async function gradeSubmission(submissionId: string, data: { grade: number; feedback?: string; maxMarks?: number }) {
  const res = await api.put(`/assignments/submissions/${submissionId}/grade`, data);
  return res.data;
}

export async function getAssignmentStats() {
  const res = await api.get('/assignments/stats');
  return res.data;
}

// Add more as needed for attendance, results, etc.
