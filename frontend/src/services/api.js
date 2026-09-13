import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
});

// Request interceptor for injecting auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edueval_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth expiration handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if checking public endpoints or on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/student')) {
        localStorage.removeItem('edueval_token');
        localStorage.removeItem('edueval_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
