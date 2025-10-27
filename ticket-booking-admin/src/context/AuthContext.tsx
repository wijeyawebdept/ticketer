import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '../services';
import { UserRole } from '../types';

interface AuthContextType {
  user: { id: string; email: string; role: UserRole } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        setUser(currentUser ? { 
          id: currentUser.id, 
          email: currentUser.email || '',
          role: currentUser.role as UserRole 
        } : null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = React.useCallback(async (email: string, password: string): Promise<void> => {
    try {
      const response = await AuthService.login({ email, password });
      
      if (response.user) {
        setUser({ 
          id: response.user.id,
          email: response.user.email,
          role: response.user.role as UserRole 
        });
      } else if (response.id && response.role && response.email) {
        // Handle case where response itself has the user properties
        setUser({
          id: response.id,
          email: response.email,
          role: response.role as UserRole
        });
      } else {
        throw new Error('Invalid login response format');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const logout = React.useCallback((): void => {
    AuthService.logout();
    setUser(null);
  }, []);

  const isAuthenticated = React.useCallback((): boolean => {
    return user !== null;
  }, [user]);

  const isAdmin = React.useCallback((): boolean => {
    return user !== null && (
      user.role === UserRole.ADMIN || 
      user.role === 'ROLE_ADMIN' ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === 'ROLE_SUPER_ADMIN'
    );
  }, [user]);

  const isSuperAdmin = React.useCallback((): boolean => {
    return user !== null && (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === 'ROLE_SUPER_ADMIN'
    );
  }, [user]);

  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      isSuperAdmin,
    }),
    [user, loading, login, logout, isAuthenticated, isAdmin, isSuperAdmin]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};