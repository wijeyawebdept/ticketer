import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Users from './pages/Users';
import Venues from './pages/Venues';
import Bookings from './pages/Bookings';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';

// Lazy-loaded components
const AuthDebugPage = lazy(() => import('./pages/AuthDebug'));
const AuthTesterPage = lazy(() => import('./pages/AuthTester'));

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
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
            
            {/* Admin routes with AdminLayout - no authentication required temporarily */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/events" element={<Events />} />
                <Route path="/users" element={<Users />} />
                <Route path="/venues" element={<Venues />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Default redirect - changed to go to login first */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;