import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
// @ts-ignore
import { ToastContainer } from 'react-toastify';
// @ts-ignore
import 'react-toastify/dist/ReactToastify.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import AdminLayout from './components/layout/AdminLayout';
import UserLayout from './components/layout/UserLayout';
import OrganizerLayout from './components/layout/OrganizerLayout';
import OrganizerEmployeeLayout from './components/layout/OrganizerEmployeeLayout';
import Login from './pages/Login';
import RestrictedLogin from './pages/RestrictedLogin';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Users from './pages/Users';
import Admins from './pages/Admins';
import Organizers from './pages/Organizers';
import OrganizerEmployees from './pages/OrganizerEmployees';
import Venues from './pages/Venues';
import SeatingArrangement from './pages/Venues/components/SeatingArrangement';
import Bookings from './pages/Bookings';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import SeatManagement from './pages/SeatManagement';
import IntegrationTest from './pages/IntegrationTest';
import RecycleBin from './pages/RecycleBin';
import Employees from './pages/Employees';
import EventSchedules from './pages/EventSchedules';
import EventAssignments from './pages/EventAssignments';
import AdminEventAssignments from './pages/AdminEventAssignments';
import OrganizerAssignment from './pages/OrganizerAssignment';
import EventCategories from './pages/EventCategories';
import Banners from './pages/Banners';
import GalleryManagement from './pages/GalleryManagement';
import BlogManagement from './pages/BlogManagement';
import PageContentManager from './pages/PageContentManager';
import { UserRole } from './types';

// Public pages
import Home from './pages/Public/Home';
import About from './pages/Public/About';
import Services from './pages/Public/Services';
import Contact from './pages/Public/Contact';
import EventDetails from './pages/Public/EventDetails';
import Gallery from './pages/Public/Gallery';
import Blog from './pages/Public/Blog';
import PostDetail from './pages/Public/Blog/PostDetail';
import PublicEvents from './pages/Public/Events';
import PrivacyPolicy from './pages/Public/PrivacyPolicy';
import CookiePolicy from './pages/Public/CookiePolicy';
import TermsAndConditions from './pages/Public/TermsAndConditions';
import FAQ from './pages/Public/FAQ';
import UserProfile from './pages/Public/UserProfile';
import UserBookings from './pages/Public/UserBookings';
import SeatSelectionPage from './pages/Public/SeatSelection';
import { PaymentSuccess, PaymentCancel, PaymentError } from './pages/Public/Payment';
import BookingPaymentReturn from './pages/Bookings/BookingPaymentReturn';
import PublicDeals from './pages/Public/Deals';
import AdminDeals from './pages/Deals';
import OrganizerDeals from './pages/OrganizerDeals';
import EmployeeDeals from './pages/EmployeeDeals';

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
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID!}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <CurrencyProvider>
            <Router>
            <Routes>
              {/* Public authentication routes - must come before protected routes */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/restricted" element={<RestrictedLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  <Route path="/admin/events" element={<Events />} />
                  <Route path="/admin/events/:eventId/schedules" element={<EventSchedules />} />
                  <Route path="/admin/event-categories" element={<EventCategories />} />
                  <Route path="/admin/gallery" element={<GalleryManagement />} />
                  <Route path="/admin/blog" element={<BlogManagement />} />
                  <Route path="/admin/banners" element={<Banners />} />
                  <Route path="/admin/page-content" element={<PageContentManager />} />
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/admins" element={<Admins />} />
                  <Route path="/admin/organizers" element={<Organizers />} />
                  <Route path="/admin/organizer-employees" element={<OrganizerEmployees />} />
                  <Route path="/admin/event-assignments" element={<AdminEventAssignments />} />
                  <Route path="/admin/organizer-assignment" element={<OrganizerAssignment />} />
                  <Route path="/admin/deals" element={<AdminDeals role="admin" />} />
                <Route path="/admin/venues" element={<Venues />} />
                <Route path="/admin/venues/:id/seating" element={<SeatingArrangement />} />
                <Route path="/admin/bookings" element={<Bookings />} />
                <Route path="/admin/transactions" element={<Transactions />} />
                <Route path="/admin/seats" element={<SeatManagement isAdmin={true} />} />
                <Route path="/admin/profile" element={<Profile />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/recycle-bin" element={<RecycleBin />} />
              </Route>
            </Route>

            {/* Organizer routes - ONLY for ORGANIZER users */}
            <Route element={<ProtectedRoute requiredRole={UserRole.ORGANIZER} />}>
              <Route element={<OrganizerLayout />}>
                <Route path="/organizer/*" element={<Navigate to="/organizer/dashboard" replace />} />
                <Route path="/organizer/dashboard" element={<Dashboard />} />
                <Route path="/organizer/events" element={<Events />} />
                <Route path="/organizer/events/:eventId/schedules" element={<EventSchedules />} />
                <Route path="/organizer/venues" element={<Venues />} />
                <Route path="/organizer/venues/:id/seating" element={<SeatingArrangement />} />
                <Route path="/organizer/deals" element={<OrganizerDeals />} />
                <Route path="/organizer/bookings" element={<Bookings />} />
                <Route path="/organizer/seats" element={<SeatManagement isAdmin={true} />} />
                <Route path="/organizer/employees" element={<Employees />} />
                <Route path="/organizer/event-assignments" element={<EventAssignments />} />
                <Route path="/organizer/recycle-bin" element={<RecycleBin />} />
                <Route path="/organizer/profile" element={<Profile />} />
                <Route path="/organizer/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Organizer Employee routes - ONLY for ORGANIZER_EMPLOYEE users */}
            <Route element={<ProtectedRoute requiredRole={UserRole.ORGANIZER_EMPLOYEE} />}>
              <Route element={<OrganizerEmployeeLayout />}>
                <Route path="/employee/*" element={<Navigate to="/employee/dashboard" replace />} />
                <Route path="/employee/dashboard" element={<Dashboard />} />
                <Route path="/employee/events" element={<Events />} />
                <Route path="/employee/events/:eventId/schedules" element={<EventSchedules />} />
                <Route path="/employee/venues" element={<Venues />} />
                <Route path="/employee/venues/:id/seating" element={<SeatingArrangement />} />
                <Route path="/employee/deals" element={<EmployeeDeals />} />
                <Route path="/employee/bookings" element={<Bookings />} />
                <Route path="/employee/seats" element={<SeatManagement isAdmin={true} />} />
                <Route path="/employee/recycle-bin" element={<RecycleBin />} />
                <Route path="/employee/profile" element={<Profile />} />
                <Route path="/employee/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* User routes - ONLY for USER users */}
            <Route element={<ProtectedRoute requiredRole={UserRole.USER} />}>
              <Route element={<UserLayout />}>
                <Route path="/user/*" element={<Navigate to="/events" replace />} />
                <Route path="/user/home" element={<Navigate to="/events" replace />} />
                <Route path="/user/events" element={<Navigate to="/events" replace />} />
                <Route path="/user/bookings" element={<Bookings />} />
                <Route path="/user/seats" element={<SeatManagement isAdmin={false} />} />
                <Route path="/user/profile" element={<Profile />} />
                <Route path="/user/settings" element={<Settings />} />
              </Route>
            </Route>
            
            {/* Simple user routes without layout - for public-facing user access */}
            <Route element={<ProtectedRoute requiredRole={UserRole.USER} />}>
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/bookings" element={<UserBookings />} />
            </Route>

            {/* Public routes - wrapped in PublicRoute to block admin/organizer/employee access
                MUST be at the END so protected routes match first */}
            <Route element={<PublicRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/events" element={<PublicEvents />} />
              <Route path="/event/:id" element={<EventDetails />} />
              <Route path="/seat-selection/:eventScheduleId" element={<SeatSelectionPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="/faq" element={<FAQ />} />
              {/* Payment Result Pages */}
              <Route path="/booking/payment-return" element={<BookingPaymentReturn />} />
              <Route path="/booking/payment-success" element={<PaymentSuccess />} />
              <Route path="/booking/payment-cancel" element={<PaymentCancel />} />
              <Route path="/booking/payment-error" element={<PaymentError />} />
            </Route>

            {/* Open public content routes - accessible by ALL roles including admin/organizer */}
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<PostDetail />} />
            <Route path="/deals" element={<PublicDeals />} />

            {/* Default redirect - use role-based routing */}
            <Route path="/admin-portal" element={<RoleBasedRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
          </CurrencyProvider>
        </AuthProvider>
        
        {/* Toast Container for notifications */}
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;