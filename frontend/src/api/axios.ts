import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token and school code
api.interceptors.request.use((config) => {
  let token;
  let schoolCode;

  // Try to get auth data for token and schoolCode (check both localStorage and sessionStorage)
  const auth = localStorage.getItem('erp.auth') || sessionStorage.getItem('erp.auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      token = parsed.token;
      schoolCode = parsed.user?.schoolCode;
    } catch (error) {
      console.error('Error parsing auth data:', error);
    }
  }

  // Fallback to direct token and schoolCode storage (check both storages)
  if (!token) {
    token = localStorage.getItem('token') || sessionStorage.getItem('token') || 
            localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  if (!schoolCode) {
    schoolCode = localStorage.getItem('erp.schoolCode') || sessionStorage.getItem('erp.schoolCode');
  }
  
  // Set Authorization header if token is available
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Set school code header if available
  if (schoolCode) {
    config.headers['x-school-code'] = schoolCode;
  }
  
  return config;
});

export default api;
