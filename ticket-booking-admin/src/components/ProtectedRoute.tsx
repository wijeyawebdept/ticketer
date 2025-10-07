import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { user, isAuthenticated, loading } = useAuth();
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

  // Check if user is authenticated and has required role (if specified)
  const isAuthorized = () => {
    if (!isAuthenticated()) {
      console.log('User is not authenticated, redirecting to login');
      return false;
    }
    
    if (!requiredRole || !user) {
      return true;
    }
    
    // Support both formats: with and without ROLE_ prefix
    return user.role === requiredRole || 
           user.role === `ROLE_${requiredRole}` ||
           `ROLE_${user.role}` === requiredRole;
  };
  
  return isAuthorized() ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;