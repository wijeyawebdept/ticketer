import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { loading } = useAuth();

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

  // TEMPORARY: Bypass authentication check completely
  // Original authentication logic is commented out
  // 
  // const isAuthorized = () => {
  //   if (!isAuthenticated()) {
  //     return false;
  //   }
  //   
  //   if (!requiredRole || !user) {
  //     return true;
  //   }
  //   
  //   return user.role === requiredRole;
  // };
  // 
  // return isAuthorized() ? <Outlet /> : <Navigate to="/login" replace />;

  // Always render the protected content
  return <Outlet />;
};

export default ProtectedRoute;