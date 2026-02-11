import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include token and school code
api.interceptors.request.use((config) => {
  let token;
  let schoolCode;

  // 1. Try to get auth data from the main 'erp.auth' storage
  const auth = localStorage.getItem('erp.auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      token = parsed.token;
      
      // 2. Try to get schoolCode from the logged-in user object first
      schoolCode = parsed.user?.schoolCode;
    } catch (error) {
      console.error('Error parsing auth data:', error);
    }
  }

  // 3. FALLBACK: Check for a separately-stored 'erp.schoolCode'
  // This is vital for superadmins managing other schools or if the user object is stale.
  if (!schoolCode) {
    schoolCode = localStorage.getItem('erp.schoolCode');
  }
  
  // 4. Fallback for token (if not in 'erp.auth')
  if (!token) {
    token = localStorage.getItem('token');
  }
  
  // 5. Set authorization header if token is available
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 6. Set school code header if available (using the lowercase standard)
  if (schoolCode) {
    // We use the lowercase 'x-school-code' as the standard
    config.headers['x-school-code'] = schoolCode;
  }
  
  return config;
});

export default api;
