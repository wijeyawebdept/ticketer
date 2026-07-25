import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

/**
 * PublicRoute component - Protects public routes from admin/organizer/employee access
 * Only allows unauthenticated users or users with USER role to access public pages
 * Redirects admins/organizers/employees to their respective dashboards
 */
const PublicRoute: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  useLocation();

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

  // Allow unauthenticated users to access public pages
  if (!isAuthenticated() || !user) {
    return <Outlet />;
  }

  // Get user role and normalize it
  const userRole = user.role;
  const userRoleStr = String(userRole).replace(/ /g, '_');
  
  // Check if user is admin, organizer, or employee
  const isAdmin = userRoleStr === 'ADMIN' || userRoleStr === 'ROLE_ADMIN' || 
                  userRoleStr === 'SUPER_ADMIN' || userRoleStr === 'ROLE_SUPER_ADMIN';
  const isOrganizer = userRoleStr === 'ORGANIZER' || userRoleStr === 'ROLE_ORGANIZER';
  const isOrganizerEmployee = userRoleStr === 'ORGANIZER_EMPLOYEE' || userRoleStr === 'ROLE_ORGANIZER_EMPLOYEE';
  const isUser = userRoleStr === 'USER' || userRoleStr === 'ROLE_USER';

  // Redirect admins to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Redirect organizers to organizer dashboard
  if (isOrganizer) {
    return <Navigate to="/organizer/dashboard" replace />;
  }

  // Redirect organizer employees to employee dashboard
  if (isOrganizerEmployee) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  // Allow regular users to access public pages
  if (isUser) {
    return <Outlet />;
  }

  // Fallback - if role is unrecognized, redirect to login
  return <Navigate to="/login" replace />;
};

export default PublicRoute;
