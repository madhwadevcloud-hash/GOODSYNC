import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include school code
api.interceptors.request.use((config) => {
  let schoolCode;

  // Try to get auth data for schoolCode (useful for context)
  const auth = localStorage.getItem('erp.auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      schoolCode = parsed.user?.schoolCode;
    } catch (error) {
      console.error('Error parsing auth data:', error);
    }
  }

  if (!schoolCode) {
    schoolCode = localStorage.getItem('erp.schoolCode');
  }
  
  // Set school code header if available
  if (schoolCode) {
    config.headers['x-school-code'] = schoolCode;
  }
  
  return config;
});

export default api;
