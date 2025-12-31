import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';
console.log('API_URL:', process.env.REACT_APP_API_URL);
console.log('Final API_URL being used:', API_URL);


const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
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
      console.log('🔑 Auth token being sent from', storageType, ':', token);
      
      // Decode JWT to see what's in it (for debugging only)
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        console.log('Decoded JWT payload:', JSON.parse(jsonPayload));
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
      console.error('Authorization error: You do not have permission to access this resource.');
    }
    
    return Promise.reject(new Error(error.response?.data?.message || 'Request failed'));
  }
);

export default axiosInstance;