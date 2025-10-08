import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { CircularProgress, Box } from '@mui/material';

const RoleBasedRedirect: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();

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

  if (!isAuthenticated() || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  const userRole = user.role;
  
  if (userRole === UserRole.ADMIN || userRole === UserRole.ROLE_ADMIN) {
    return <Navigate to="/dashboard" replace />;
  } else if (userRole === UserRole.ORGANIZER || userRole === UserRole.ROLE_ORGANIZER) {
    return <Navigate to="/organizer/dashboard" replace />;
  } else if (userRole === UserRole.USER || userRole === UserRole.ROLE_USER) {
    return <Navigate to="/user/home" replace />;
  } else {
    // Fallback - redirect to login if role is unrecognized
    return <Navigate to="/login" replace />;
  }
};

export default RoleBasedRedirect;