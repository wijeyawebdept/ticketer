import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, allowedRoles, redirectTo }) => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();
  const [shouldLogout, setShouldLogout] = React.useState(false);

  // Determine fallback login route
  const isGateRoute = location.pathname.startsWith('/gate');
  const fallbackLogin = redirectTo || (isGateRoute ? '/login/gate' : '/login');

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
    return <Navigate to={fallbackLogin} state={{ from: location }} replace />;
  }

  // Helper to check if role matches
  const checkRoleMatch = (userRoleStr: string, targetRoleStr: string): boolean => {
    const isSuperAdmin = userRoleStr === 'SUPER_ADMIN' || userRoleStr === 'ROLE_SUPER_ADMIN';
    const isAdmin = userRoleStr === 'ADMIN' || userRoleStr === 'ROLE_ADMIN';
    const isOrganizer = userRoleStr === 'ORGANIZER' || userRoleStr === 'ROLE_ORGANIZER';
    const isOrganizerEmployee = userRoleStr === 'ORGANIZER_EMPLOYEE' || userRoleStr === 'ROLE_ORGANIZER_EMPLOYEE';
    const isGateStaff = userRoleStr === 'GATE_STAFF' || userRoleStr === 'ROLE_GATE_STAFF';
    const isUser = userRoleStr === 'USER' || userRoleStr === 'ROLE_USER';

    const requiringAdmin = targetRoleStr === 'ADMIN' || targetRoleStr === 'ROLE_ADMIN';
    const requiringOrganizer = targetRoleStr === 'ORGANIZER' || targetRoleStr === 'ROLE_ORGANIZER';
    const requiringOrganizerEmployee = targetRoleStr === 'ORGANIZER_EMPLOYEE' || targetRoleStr === 'ROLE_ORGANIZER_EMPLOYEE';
    const requiringGateStaff = targetRoleStr === 'GATE_STAFF' || targetRoleStr === 'ROLE_GATE_STAFF';
    const requiringUser = targetRoleStr === 'USER' || targetRoleStr === 'ROLE_USER';

    return (
      userRoleStr === targetRoleStr ||
      userRoleStr === `ROLE_${targetRoleStr}` ||
      `ROLE_${userRoleStr}` === targetRoleStr ||
      (isSuperAdmin && (requiringAdmin || requiringOrganizer || requiringGateStaff)) ||
      (isAdmin && (requiringAdmin || requiringOrganizer || requiringGateStaff)) ||
      (isOrganizer && (requiringOrganizer || requiringGateStaff)) ||
      (isOrganizerEmployee && (requiringOrganizerEmployee || requiringGateStaff)) ||
      (isGateStaff && requiringGateStaff) ||
      (isUser && requiringUser)
    );
  };

  // Check role authorization if specified
  if ((requiredRole || allowedRoles) && user) {
    const userRoleStr = String(user.role).replace(/ /g, '_');

    let isAuthorized = false;

    if (allowedRoles && allowedRoles.length > 0) {
      isAuthorized = allowedRoles.some(r => checkRoleMatch(userRoleStr, String(r).replace(/ /g, '_')));
    } else if (requiredRole) {
      isAuthorized = checkRoleMatch(userRoleStr, String(requiredRole).replace(/ /g, '_'));
    }

    if (!isAuthorized) {
      // Schedule logout to happen in useEffect
      if (!shouldLogout) {
        setShouldLogout(true);
      }

      return (
        <Navigate
          to={fallbackLogin}
          state={{
            from: location,
            error: 'Access denied. Insufficient privileges for this portal.',
          }}
          replace
        />
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
