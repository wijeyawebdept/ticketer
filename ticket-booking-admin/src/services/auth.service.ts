import axios from './api';
import jwt_decode from 'jwt-decode';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
}

interface DecodedToken {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>('/api/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      // Store user data in localStorage for later use
      localStorage.setItem('user_data', JSON.stringify({
        email: response.data.user.email
      }));
    }
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  getCurrentUser(): { id: string; role: string; email: string; } | null {
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
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user !== null && user.role === 'ADMIN';
  }
}

const authService = new AuthService();
export default authService;