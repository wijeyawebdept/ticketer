import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import AdminLayout from './components/layout/AdminLayout';
import UserLayout from './components/layout/UserLayout';
import OrganizerLayout from './components/layout/OrganizerLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Users from './pages/Users';
import Venues from './pages/Venues';
import Bookings from './pages/Bookings';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import SeatManagement from './pages/SeatManagement';
import IntegrationTest from './pages/IntegrationTest';
import { UserRole } from './types';

// Lazy-loaded components
const AuthDebugPage = lazy(() => import('./pages/AuthDebug'));
const AuthTesterPage = lazy(() => import('./pages/AuthTester'));

// Create enhanced theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#e91e63',
      dark: '#b2003d',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public authentication routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/integration-test" element={<IntegrationTest />} />
            <Route path="/auth-debug" element={
              <Suspense fallback={<div>Loading debug tools...</div>}>
                <AuthDebugPage />
              </Suspense>
            } />
            <Route path="/auth-tester" element={
              <Suspense fallback={<div>Loading API tester...</div>}>
                <AuthTesterPage />
              </Suspense>
            } />
            
            {/* Admin routes - ONLY for ADMIN users */}
            <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/events" element={<Events />} />
                <Route path="/users" element={<Users />} />
                <Route path="/venues" element={<Venues />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/seats" element={<SeatManagement isAdmin={true} />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Organizer routes - ONLY for ORGANIZER users */}
            <Route element={<ProtectedRoute requiredRole={UserRole.ORGANIZER} />}>
              <Route element={<OrganizerLayout />}>
                <Route path="/organizer/*" element={<Navigate to="/organizer/dashboard" replace />} />
                <Route path="/organizer/dashboard" element={<Dashboard />} />
                <Route path="/organizer/events" element={<Events />} />
                <Route path="/organizer/venues" element={<Venues />} />
                <Route path="/organizer/bookings" element={<Bookings />} />
                <Route path="/organizer/seats" element={<SeatManagement isAdmin={false} />} />
                <Route path="/organizer/profile" element={<Profile />} />
                <Route path="/organizer/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* User routes - ONLY for USER users */}
            <Route element={<ProtectedRoute requiredRole={UserRole.USER} />}>
              <Route element={<UserLayout />}>
                <Route path="/user/*" element={<Navigate to="/user/home" replace />} />
                <Route path="/user/home" element={<Dashboard />} />
                <Route path="/user/events" element={<Events />} />
                <Route path="/user/bookings" element={<Bookings />} />
                <Route path="/user/seats" element={<SeatManagement isAdmin={false} />} />
                <Route path="/user/profile" element={<Profile />} />
                <Route path="/user/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Default redirect - use role-based routing */}
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;