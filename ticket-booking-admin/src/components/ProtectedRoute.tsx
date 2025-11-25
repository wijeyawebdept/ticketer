import React, { useEffect } from 'react';
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
  const [shouldLogout, setShouldLogout] = React.useState(false);

  // Handle logout in useEffect to avoid state updates during render
  useEffect(() => {
    if (shouldLogout) {
      logout();
      setShouldLogout(false);
    }
  }, [shouldLogout, logout]);

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
    console.log('User is not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role (if specified)
  if (requiredRole && user) {
    const userRole = user.role;
    
    console.log('ProtectedRoute - Checking authorization:');
    console.log('User Role:', userRole, typeof userRole);
    console.log('Required Role:', requiredRole, typeof requiredRole);
    
    // Convert to strings and normalize (replace spaces with underscores)
    const userRoleStr = String(userRole).replace(/ /g, '_');
    const requiredRoleStr = String(requiredRole).replace(/ /g, '_');
    
    console.log('  Normalized User Role:', userRoleStr);
    console.log('  Normalized Required Role:', requiredRoleStr);
    
    // Special role handling
    const isSuperAdmin = userRoleStr === 'SUPER_ADMIN' || userRoleStr === 'ROLE_SUPER_ADMIN';
    const isAdmin = userRoleStr === 'ADMIN' || userRoleStr === 'ROLE_ADMIN';
    const isOrganizer = userRoleStr === 'ORGANIZER' || userRoleStr === 'ROLE_ORGANIZER';
    const isOrganizerEmployee = userRoleStr === 'ORGANIZER_EMPLOYEE' || userRoleStr === 'ROLE_ORGANIZER_EMPLOYEE';
    const isUser = userRoleStr === 'USER' || userRoleStr === 'ROLE_USER';
    
    const requiringAdmin = requiredRoleStr === 'ADMIN' || requiredRoleStr === 'ROLE_ADMIN';
    const requiringOrganizer = requiredRoleStr === 'ORGANIZER' || requiredRoleStr === 'ROLE_ORGANIZER';
    const requiringOrganizerEmployee = requiredRoleStr === 'ORGANIZER_EMPLOYEE' || requiredRoleStr === 'ROLE_ORGANIZER_EMPLOYEE';
    const requiringUser = requiredRoleStr === 'USER' || requiredRoleStr === 'ROLE_USER';
    
    console.log('  Is Super Admin:', isSuperAdmin);
    console.log('  Is Admin:', isAdmin);
    console.log('  Is Organizer:', isOrganizer);
    console.log('  Is Organizer Employee:', isOrganizerEmployee);
    console.log('  Is User:', isUser);
    console.log('  Requiring Admin:', requiringAdmin);
    console.log('  Requiring Organizer:', requiringOrganizer);
    console.log('  Requiring Organizer Employee:', requiringOrganizerEmployee);
    console.log('  Requiring User:', requiringUser);
    
    const isAuthorized = 
      userRoleStr === requiredRoleStr || 
      userRoleStr === `ROLE_${requiredRoleStr}` ||
      `ROLE_${userRoleStr}` === requiredRoleStr ||
      (isSuperAdmin && requiringAdmin) || // Allow SUPER_ADMIN to access ADMIN routes
      (isAdmin && requiringAdmin) || // Allow ADMIN to access ADMIN routes
      (isOrganizer && requiringOrganizer) || // Allow ORGANIZER to access ORGANIZER routes
      (isOrganizerEmployee && requiringOrganizerEmployee) || // Allow ORGANIZER_EMPLOYEE to access ORGANIZER_EMPLOYEE routes
      (isUser && requiringUser); // Allow USER to access USER routes
    
    console.log('  Is Authorized:', isAuthorized);
    
    if (!isAuthorized) {
      console.log(`User role '${userRole}' does not have permission to access admin panel. Required role: '${requiredRole}'`);
      console.log('Redirecting non-admin user back to login');
      
      // Schedule logout to happen in useEffect
      if (!shouldLogout) {
        setShouldLogout(true);
      }
      
      return <Navigate to="/login" state={{ 
        from: location,
        error: 'Access denied. Admin privileges required.' 
      }} replace />;
    }
    
    console.log(`User role '${userRole}' authorized for admin access`);
  }
  
  return <Outlet />;
};

export default ProtectedRoute;