import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Auth token being sent:', token);
      
      // Decode JWT to see what's in it (for debugging only)
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        console.log('🔍 Decoded JWT payload:', JSON.parse(jsonPayload));
      } catch (e) {
        console.error('Error decoding JWT:', e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(new Error(error.message || 'Request failed'));
  }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    console.error('📡 API Error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // If token is expired, redirect to login page
    if (error.response?.status === 401 && !originalRequest._retry) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return Promise.reject(new Error('Authentication expired. Please login again.'));
    }
    
    if (error.response?.status === 403) {
      console.error('🔒 Authorization error: You do not have permission to access this resource.');
    }
    
    return Promise.reject(new Error(error.response?.data?.message || 'Request failed'));
  }
);

export default axiosInstance;