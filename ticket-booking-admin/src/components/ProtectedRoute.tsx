import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated()) {
    console.log('🚫 User is not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role (if specified)
  if (requiredRole && user) {
    const userRole = user.role;
    const isAuthorized = 
      userRole === requiredRole || 
      userRole === `ROLE_${requiredRole}` ||
      `ROLE_${userRole}` === requiredRole;
    
    if (!isAuthorized) {
      console.log(`🚫 User role '${userRole}' does not have permission to access admin panel. Required role: '${requiredRole}'`);
      console.log('🔄 Redirecting non-admin user back to login');
      
      // Clear authentication for non-admin users trying to access admin panel
      logout();
      
      return <Navigate to="/login" state={{ 
        from: location,
        error: 'Access denied. Admin privileges required.' 
      }} replace />;
    }
    
    console.log(`✅ User role '${userRole}' authorized for admin access`);
  }
  
  return <Outlet />;
};

export default ProtectedRoute;