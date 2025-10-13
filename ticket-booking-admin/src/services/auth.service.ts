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
        localStorage.setItem('auth_token', response.data.token);
        
        // Store user data in localStorage for later use
        if (response.data.user) {
          localStorage.setItem('user_data', JSON.stringify({
            email: response.data.user.email
          }));
        }
      
        // Debug the JWT token
        try {
          const decoded = jwt_decode<DecodedToken>(response.data.token);
          console.log('JWT Token decoded:', decoded);
          console.log('User from API response:', response.data.user);
          console.log('Role from JWT:', decoded.role);
          if (response.data.user) {
            console.log('Role from API response:', response.data.user.role);
          }
        } catch (err) {
          console.error('Error decoding JWT token:', err);
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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  getCurrentUser(): LoginResponse | null {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const decoded = jwt_decode<DecodedToken>(token);
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          this.logout();
          return null;
        }
        
        // Try to get user details from localStorage
        let email = '';
        try {
          const userData = localStorage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            email = user.email || '';
          }
        } catch (e) {
          // If we can't get email from localStorage, use a default or empty string
          console.error('Error parsing user data from localStorage:', e);
        }

        return {
          id: decoded.sub,
          role: decoded.role,
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
    const token = localStorage.getItem('auth_token');
    const user = this.getCurrentUser();
    
    // For debugging
    console.log('Auth check - token exists:', !!token);
    console.log('Auth check - valid user object:', !!user);
    
    return token !== null && user !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    // Check for both formats: with and without the ROLE_ prefix
    return user !== null && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN');
  }
}

const authService = new AuthService();
export default authService;
