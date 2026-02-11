import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: { 'Content-Type': 'application/json' },
});

// Debug base URL once at startup
// eslint-disable-next-line no-console
console.log('[API] Base URL:', ENV.API_BASE_URL);

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('authToken');
  const schoolCode = await AsyncStorage.getItem('schoolCode');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (schoolCode) {
    config.headers = config.headers || {};
    config.headers['x-school-code'] = schoolCode;
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_INTERNET_DISCONNECTED') {
      console.error('[API] Network error:', error.message);
      // You could show a toast or notification here
    } else if (error.response?.status === 403) {
      console.error('[API] 403 Forbidden:', error.response.data);
    } else if (error.response?.status === 401) {
      console.error('[API] 401 Unauthorized:', error.response.data);
      // Could redirect to login here
    }
    return Promise.reject(error);
  }
);

export default api;


