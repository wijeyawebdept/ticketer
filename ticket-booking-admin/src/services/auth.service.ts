import axios from './api';
import jwt_decode from 'jwt-decode';
import { UserRole } from '../types';

// Development mode check
const isDev = process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_LOGS === 'true';

// Dev-only logger - logs sensitive data only in development with DEBUG flag enabled
const devLog = (message: string, data?: any) => {
  if (isDev) {
  }
};

// Error logger - always used for non-sensitive errors
const errorLog = (message: string, error?: any) => {
  if (error?.response?.status && error?.response?.status !== 401 && error?.response?.status !== 403) {
    // Only log non-auth errors to avoid exposing auth details
  }
};

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
  private storageType: 'localStorage' | 'sessionStorage' = 'sessionStorage';

  constructor() {
    // IMPORTANT: Always use sessionStorage to keep each tab's session independent
    // DO NOT use localStorage as it's shared across all tabs of the same domain
    this.storageType = 'sessionStorage';
  }

  private getStorage(): Storage {
    return this.storageType === 'sessionStorage' ? sessionStorage : localStorage;
  }

  private setSession(token: string, user: LoginResponse['user']): void {
    const storage = this.getStorage();
    storage.setItem('auth_token', token);
    
    let userRole = '';
    try {
      const decoded = jwt_decode<DecodedToken>(token);
      userRole = decoded.role;
    } catch (err) {
      devLog('Error decoding JWT token:', err);
    }
    
    if (user) {
      const normalizedRole = (userRole || user.role).replace(/^ROLE_/, '');
      
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: normalizedRole
      };
      storage.setItem('user_data', JSON.stringify({ email: userData.email }));
      storage.setItem('user', JSON.stringify(userData));
    }
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await axios.post<RegisterResponse>('/api/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async sendVerificationCode(email: string): Promise<void> {
    await axios.post('/api/auth/send-verification', { email });
  }

  async verifyEmail(email: string, code: string): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>('/api/auth/verify-email', { email, code });
      if (response.data.token) {
        this.setSession(response.data.token, response.data.user);
      }
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>('/api/auth/login', credentials);
      
      if (response.data.token) {
        this.setSession(response.data.token, response.data.user);
        devLog('User logged in successfully');
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
        return response.data;
      }
    } catch (error: any) {
      errorLog('Login error', error);
      throw error;
    }
  }

  logout(): void {
    const storage = this.getStorage();
    storage.removeItem('auth_token');
    storage.removeItem('user_data');
    storage.removeItem('user');
    devLog('User logged out');
  }

  getCurrentUser(): LoginResponse | null {
    try {
      // Always use sessionStorage (one storage type per tab)
      const storage = this.getStorage();
      const token = storage.getItem('auth_token');
      
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
          const userData = storage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            email = user.email || '';
          }
        } catch (e) {
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
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const storage = this.getStorage();
    const token = storage.getItem('auth_token');
    const user = this.getCurrentUser();
    
    return token !== null && user !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    // Check for both formats: with and without the ROLE_ prefix
    return user !== null && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN');
  }

  async adminLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>('/api/auth/admin/login', credentials);
      
      if (response.data && response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          userRole = decoded.role;
        } catch (err) {
          devLog('Error decoding JWT token:', err);
        }
        
        if (response.data.user && response.data.user.id) {
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
          devLog('Admin logged in successfully');
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
      errorLog('Admin login error', error);
      throw error;
    }
  }

  async organizerLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>('/api/auth/organizer/login', credentials);
      
      if (response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          userRole = decoded.role;
        } catch (err) {
          devLog('Error decoding JWT token:', err);
        }
        
        if (response.data.user) {
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
          devLog('Organizer logged in successfully');
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
      errorLog('Organizer login error', error);
      throw error;
    }
  }

  async organizerEmployeeLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>('/api/auth/organizer-employee/login', credentials);
      
      if (response.data.token) {
        const storage = this.getStorage();
        storage.setItem('auth_token', response.data.token);
        
        let userRole = '';
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          userRole = decoded.role;
        } catch (err) {
          devLog('Error decoding JWT token:', err);
        }
        
        if (response.data.user) {
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
          devLog('Organizer employee logged in successfully');
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
      errorLog('Organizer employee login error', error);
      throw error;
    }
  }

  async forgotPassword(email: string, roleHint?: string): Promise<{ message: string }> {
    const response = await axios.post<{ message: string }>('/api/auth/forgot-password', { email, roleHint });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await axios.post<{ message: string }>('/api/auth/reset-password', { token, newPassword });
    return response.data;
  }

  async googleLogin(googleToken: string): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>('/api/auth/google-login', {
        token: googleToken
      });
      
      if (response.data.token) {
        this.setSession(response.data.token, response.data.user);
        devLog('Google login successful');
      }
      
      return response.data;
    } catch (error: any) {
      errorLog('Google login error', error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
