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
  isRestrictedUser: () => boolean;
  isCustomerUser: () => boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = React.useCallback(() => {
    try {
      const currentUser = AuthService.getCurrentUser();
      console.log('AuthContext loading user:', currentUser);
      setUser(currentUser ? { 
        id: currentUser.id, 
        email: currentUser.email || '',
        role: currentUser.role as UserRole 
      } : null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for custom auth refresh events (triggered after login/logout)
  useEffect(() => {
    const handleAuthRefresh = () => {
      console.log('Auth refresh event received');
      loadUser();
    };

    window.addEventListener('authRefresh', handleAuthRefresh);
    return () => window.removeEventListener('authRefresh', handleAuthRefresh);
  }, [loadUser]);

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

  const refreshUser = React.useCallback((): void => {
    loadUser();
  }, [loadUser]);

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

  const isRestrictedUser = React.useCallback((): boolean => {
    if (user === null) return false;
    const normalizedRole = typeof user.role === 'string' ? user.role.replace('ROLE_', '') : user.role;
    return (
      normalizedRole === 'ADMIN' || 
      normalizedRole === 'SUPER_ADMIN' || 
      normalizedRole === 'ORGANIZER' || 
      normalizedRole === 'ORGANIZER_EMPLOYEE' ||
      user.role === 'ROLE_ADMIN' ||
      user.role === 'ROLE_SUPER_ADMIN' ||
      user.role === 'ROLE_ORGANIZER' ||
      user.role === 'ROLE_ORGANIZER_EMPLOYEE'
    );
  }, [user]);

  const isCustomerUser = React.useCallback((): boolean => {
    if (user === null) return false;
    const normalizedRole = typeof user.role === 'string' ? user.role.replace('ROLE_', '') : user.role;
    return normalizedRole === 'USER' || user.role === 'ROLE_USER';
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
      isRestrictedUser,
      isCustomerUser,
      refreshUser,
    }),
    [user, loading, login, logout, isAuthenticated, isAdmin, isSuperAdmin, isRestrictedUser, isCustomerUser, refreshUser]
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