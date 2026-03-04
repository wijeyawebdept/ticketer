import axios from './api';
import jwt_decode from 'jwt-decode';
import { UserRole } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  role: string | UserRole;
}

// Modified to match the getCurrentUser return type
export interface LoginResponse {
  id: string;
  role: string;
  email: string;
  token?: string;
  status?: string;
  message?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
}

export interface RegisterResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface DecodedToken {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

class AuthService {
  private storageType: 'localStorage' | 'sessionStorage' = 'localStorage';

  constructor() {
    // Auto-detect storage type based on current page URL
    this.detectStorageType();
  }

  private detectStorageType() {
    const currentPath = window.location.pathname;
    // If on admin, organizer, or employee routes, use sessionStorage
    // Otherwise use localStorage for customer routes
    if (currentPath.includes('/dashboard') || 
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
        currentPath.includes('/organizer-assignment') ||
        currentPath === '/restricted-login') {
      this.storageType = 'sessionStorage';
    } else {
      this.storageType = 'localStorage';
    }
  }

  setStorageType(type: 'localStorage' | 'sessionStorage') {
    this.storageType = type;
  }

  private getStorage(): Storage {
    return this.storageType === 'sessionStorage' ? sessionStorage : localStorage;
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      console.log('Registering user with endpoint: /api/auth/register');
      const response = await axios.post<RegisterResponse>('/api/auth/register', userData);
      console.log('Registration successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('Logging in user with endpoint: /api/auth/login');
      const response = await axios.post<LoginResponse>('/api/auth/login', credentials);
      console.log('Login response:', response.status, response.statusText);
      
      if (response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        console.log('Token stored in:', this.storageType);
        
        // Debug the JWT token and get role from it
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          console.log('JWT Token decoded:', decoded);
          console.log('User from API response:', response.data.user);
          console.log('Role from JWT:', decoded.role);
          userRole = decoded.role;
          if (response.data.user) {
            console.log('Role from API response:', response.data.user.role);
          }
        } catch (err) {
          console.error('Error decoding JWT token:', err);
        }
        
        // Store user data with role from JWT token
        if (response.data.user) {
          // Normalize the role by removing ROLE_ prefix if present
          const normalizedRole = (userRole || response.data.user.role).replace(/^ROLE_/, '');
          
          const userData = {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            role: normalizedRole // Use normalized role
          };
          storage.setItem('user_data', JSON.stringify({ email: userData.email }));
          storage.setItem('user', JSON.stringify(userData)); // Store for role-based redirect
          console.log('Stored user data in', this.storageType, ':', userData);
          console.log('Normalized role stored:', normalizedRole);
        }
      }
      
      // Return a compatible LoginResponse object
      if (response.data.user) {
        return {
          id: response.data.user.id,
          role: response.data.user.role,
          email: response.data.user.email,
          token: response.data.token,
          status: response.data.status,
          message: response.data.message,
          user: response.data.user
        };
      } else {
        // Fallback if user is not present in response
        return response.data;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      throw error;
    }
  }

  logout(): void {
    const storage = this.getStorage();
    storage.removeItem('auth_token');
    storage.removeItem('user_data');
    storage.removeItem('user');
    console.log('Logged out from', this.storageType);
  }

  getCurrentUser(): LoginResponse | null {
    try {
      // Auto-detect storage type based on current page
      this.detectStorageType();
      
      // Check current storage type first, then fallback to the other
      const storage = this.getStorage();
      let token = storage.getItem('auth_token');
      let userStorage: Storage = storage;
      
      // If not found in current storage, check the other one
      if (!token) {
        const alternateStorage = this.storageType === 'sessionStorage' ? localStorage : sessionStorage;
        token = alternateStorage.getItem('auth_token');
        if (token) {
          userStorage = alternateStorage;
        }
      }
      
      if (token) {
        const decoded = jwt_decode<DecodedToken>(token);
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          this.logout();
          return null;
        }
        
        // Try to get user details from storage
        let email = '';
        try {
          const userData = userStorage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            email = user.email || '';
          }
        } catch (e) {
          console.error('Error parsing user data from storage:', e);
        }

        // Normalize the role by removing ROLE_ prefix if present
        const normalizedRole = decoded.role.replace(/^ROLE_/, '');

        return {
          id: decoded.sub,
          role: normalizedRole,
          email: email
        };
      }
      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const storage = this.getStorage();
    let token = storage.getItem('auth_token');
    
    // Also check the alternate storage
    if (!token) {
      const alternateStorage = this.storageType === 'sessionStorage' ? localStorage : sessionStorage;
      token = alternateStorage.getItem('auth_token');
    }
    
    const user = this.getCurrentUser();
    
    // For debugging
    console.log('Auth check - token exists:', !!token, '(storage:', this.storageType, ')');
    console.log('Auth check - valid user object:', !!user);
    
    return token !== null && user !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    // Check for both formats: with and without the ROLE_ prefix
    return user !== null && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN');
  }

  async adminLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('Logging in admin with endpoint: /api/auth/admin/login');
      const response = await axios.post<LoginResponse>('/api/auth/admin/login', credentials);
      console.log('Admin login response:', response.status, response.statusText);
      console.log('Admin login response data:', JSON.stringify(response.data));
      
      if (response.data && response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        console.log('Token stored in:', this.storageType);
        
        // Debug the JWT token and get role from it
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          console.log('JWT Token decoded:', decoded);
          console.log('User from API response:', response.data.user);
          console.log('Role from JWT:', decoded.role);
          userRole = decoded.role;
          if (response.data.user) {
            console.log('Role from API response:', response.data.user.role);
          }
        } catch (err) {
          console.error('Error decoding JWT token:', err);
        }
        
        // Store user data with role from JWT token
        if (response.data.user && response.data.user.id) {
          // Normalize the role by removing ROLE_ prefix if present
          const normalizedRole = (userRole || response.data.user.role || '').replace(/^ROLE_/, '');
          
          const userData = {
            id: response.data.user.id,
            email: response.data.user.email || credentials.email,
            firstName: response.data.user.firstName || '',
            lastName: response.data.user.lastName || '',
            role: normalizedRole
          };
          storage.setItem('user_data', JSON.stringify({ email: userData.email }));
          storage.setItem('user', JSON.stringify(userData));
          console.log('Stored user data in', this.storageType, ':', userData);
          console.log('Normalized role stored:', normalizedRole);
        } else {
          console.warn('No user object in response, creating minimal user data from JWT');
          // If no user object, create one from JWT
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          const normalizedRole = (decoded.role || '').replace(/^ROLE_/, '');
          const userData = {
            id: decoded.sub || '',
            email: credentials.email,
            firstName: '',
            lastName: '',
            role: normalizedRole
          };
          storage.setItem('user_data', JSON.stringify({ email: userData.email }));
          storage.setItem('user', JSON.stringify(userData));
          console.log('Stored minimal user data from JWT in', this.storageType, ':', userData);
        }
      }
      
      return {
        id: response.data?.user?.id || '',
        role: response.data?.user?.role || '',
        email: response.data?.user?.email || credentials.email,
        token: response.data?.token || '',
        status: response.data?.status,
        message: response.data?.message,
        user: response.data?.user
      };
    } catch (error: any) {
      console.error('Admin login error:', error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error?.message) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }

  async organizerLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('Logging in organizer with endpoint: /api/auth/organizer/login');
      const response = await axios.post<LoginResponse>('/api/auth/organizer/login', credentials);
      console.log('Organizer login response:', response.status, response.statusText);
      
      if (response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        console.log('Token stored in:', this.storageType);
        
        // Debug the JWT token and get role from it
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          console.log('JWT Token decoded:', decoded);
          console.log('User from API response:', response.data.user);
          console.log('Role from JWT:', decoded.role);
          userRole = decoded.role;
          if (response.data.user) {
            console.log('Role from API response:', response.data.user.role);
          }
        } catch (err) {
          console.error('Error decoding JWT token:', err);
        }
        
        // Store user data with role from JWT token
        if (response.data.user) {
          // Normalize the role by removing ROLE_ prefix if present
          const normalizedRole = (userRole || response.data.user.role).replace(/^ROLE_/, '');
          
          const userData = {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            role: normalizedRole
          };
          storage.setItem('user_data', JSON.stringify({ email: userData.email }));
          storage.setItem('user', JSON.stringify(userData));
          console.log('Stored user data in', this.storageType, ':', userData);
          console.log('Normalized role stored:', normalizedRole);
        }
      }
      
      return {
        id: response.data.user?.id || '',
        role: response.data.user?.role || '',
        email: response.data.user?.email || '',
        token: response.data.token,
        status: response.data.status,
        message: response.data.message,
        user: response.data.user
      };
    } catch (error: any) {
      console.error('Organizer login error:', error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error?.message) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }

  async organizerEmployeeLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('Logging in organizer employee with endpoint: /api/auth/organizer-employee/login');
      const response = await axios.post<LoginResponse>('/api/auth/organizer-employee/login', credentials);
      console.log('Organizer employee login response:', response.status, response.statusText);
      
      if (response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        console.log('Token stored in:', this.storageType);
        
        // Debug the JWT token and get role from it
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          console.log('JWT Token decoded:', decoded);
          console.log('User from API response:', response.data.user);
          console.log('Role from JWT:', decoded.role);
          userRole = decoded.role;
          if (response.data.user) {
            console.log('Role from API response:', response.data.user.role);
          }
        } catch (err) {
          console.error('Error decoding JWT token:', err);
        }
        
        // Store user data with role from JWT token
        if (response.data.user) {
          // Normalize the role by removing ROLE_ prefix if present
          const normalizedRole = (userRole || response.data.user.role).replace(/^ROLE_/, '');
          
          const userData = {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            role: normalizedRole
          };
          storage.setItem('user_data', JSON.stringify({ email: userData.email }));
          storage.setItem('user', JSON.stringify(userData));
          console.log('Stored user data in', this.storageType, ':', userData);
          console.log('Normalized role stored:', normalizedRole);
        }
      }
      
      return {
        id: response.data.user?.id || '',
        role: response.data.user?.role || '',
        email: response.data.user?.email || '',
        token: response.data.token,
        status: response.data.status,
        message: response.data.message,
        user: response.data.user
      };
    } catch (error: any) {
      console.error('Organizer employee login error:', error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error?.message) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await axios.post<{ message: string }>('/api/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await axios.post<{ message: string }>('/api/auth/reset-password', { token, newPassword });
    return response.data;
  }

  async googleLogin(googleToken: string): Promise<LoginResponse> {
    try {
      console.log('Logging in with Google token');
      const response = await axios.post<LoginResponse>('/api/auth/google-login', {
        token: googleToken
      });
      
      console.log('Google login response:', response.status, response.statusText);
      
      if (response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        
        // Decode JWT token to get user role
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          console.log('JWT Token decoded:', decoded);
          userRole = decoded.role;
        } catch (err) {
          console.error('Error decoding JWT token:', err);
        }
        
        // Store user data
        if (response.data.user) {
          const userData = {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            role: userRole || response.data.user.role
          };
          storage.setItem('user', JSON.stringify(userData));
          console.log('User data stored in', this.storageType, ':', userData);
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Google login error:', error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
