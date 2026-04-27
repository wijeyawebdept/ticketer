import axios from 'axios';

// Empty baseURL so all API calls use relative paths and are routed through
// the dev server proxy (setupProxy.js). This allows the site to work when
// shared via ngrok or any other tunnel without changing any URLs.
const API_URL = process.env.REACT_APP_API_URL ?? '';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    // Don't send tokens for login/register endpoints - we're trying to get a new token
    const isAuthEndpoint = config.url?.includes('/api/auth/login') || 
                          config.url?.includes('/api/auth/register') ||
                          config.url?.includes('/api/auth/admin/login') ||
                          config.url?.includes('/api/auth/organizer/login') ||
                          config.url?.includes('/api/auth/organizer-employee/login');
    
    if (isAuthEndpoint) {
      return config;
    }
    
    // Detect which storage to use based on current page
    const currentPath = window.location.pathname;
    const isRestrictedRoute = currentPath.includes('/dashboard') || 
                              currentPath.includes('/admin') || 
                              currentPath.includes('/organizer') || 
                              currentPath.includes('/employee') ||
                              currentPath.includes('/users') ||
                              currentPath.includes('/admins') ||
                              currentPath.includes('/venues') ||
                              currentPath.includes('/seats') ||
                              currentPath.includes('/recycle-bin') ||
                              currentPath.includes('/settings') ||
                              currentPath.includes('/event-assignments') ||
                              currentPath.includes('/organizer-assignment');
    
    // Check sessionStorage first for admin routes, localStorage first for customer routes
    let token = isRestrictedRoute ? sessionStorage.getItem('auth_token') : localStorage.getItem('auth_token');
    let storageType = isRestrictedRoute ? 'sessionStorage' : 'localStorage';
    
    // If not found, check the other storage as fallback
    if (!token) {
      token = isRestrictedRoute ? localStorage.getItem('auth_token') : sessionStorage.getItem('auth_token');
      storageType = isRestrictedRoute ? 'localStorage (fallback)' : 'sessionStorage (fallback)';
    }
    
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
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
    
    console.error('API Error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // If token is expired, redirect to login page
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Clear from both storage types
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_data');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('user_data');
      
      // Redirect based on which page they were on
      // If URL contains /admin, /organizer, or /employee, go to restricted login
      // Otherwise go to regular login
      const currentPath = window.location.pathname;
      if (currentPath.includes('/admin') || currentPath.includes('/organizer') || currentPath.includes('/employee')) {
        window.location.href = '/restricted-login';
      } else {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Authentication expired. Please login again.'));
    }
    
    if (error.response?.status === 403) {
    }

    const data = error.response?.data;
    const normalizedMessage =
      (typeof data === 'string' && data) ||
      (typeof data?.message === 'string' && data.message) ||
      (typeof error.message === 'string' && error.message) ||
      'Request failed';

    // Ensure error.message is always a string
    error.message = normalizedMessage;
    
    // Preserve the original error object so that status codes and response data are accessible
    return Promise.reject(error);
  }
);

export default axiosInstance;