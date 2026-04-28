import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Chip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import AuthService from '../../services/auth.service';

// Add this for better type checking
type FormikBag<V> = {
  isSubmitting: boolean;
  errors: { [K in keyof V]?: string };
  touched: { [K in keyof V]?: boolean };
};

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

interface LoginFormValues {
  email: string;
  password: string;
}

const RestrictedLogin: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Check for success message from registration
  useEffect(() => {
    const state = location.state as { message?: string } | undefined;
    if (state?.message) {
      setSuccessMessage(state.message);
    }
  }, [location]);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (
    values: LoginFormValues, 
    { setSubmitting }: FormikHelpers<LoginFormValues>
  ) => {
    try {
      setError(null);
      
      // Clear sessionStorage tokens
      // Note: Each tab maintains independent sessions using sessionStorage
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_data');
      sessionStorage.removeItem('user');
      
      // Try different login endpoints in order: admin -> organizer -> organizer-employee
      let loginResponse = null;
      let userRole = '';
      
      try {
        // Try admin login first
        loginResponse = await AuthService.adminLogin({ email: values.email, password: values.password });
        userRole = loginResponse.user?.role || loginResponse.role || '';
      } catch (adminError: any) {
        // Any 403 error means wrong role/insufficient privileges, try next login type
        if (adminError.response?.status === 403) {
          // Not an admin, try organizer
          try {
            loginResponse = await AuthService.organizerLogin({ email: values.email, password: values.password });
            userRole = loginResponse.user?.role || loginResponse.role || '';
          } catch (organizerError: any) {
            // Any 403 error means wrong role, try organizer employee
            if (organizerError.response?.status === 403) {
              // Not an organizer, try organizer employee
              try {
                loginResponse = await AuthService.organizerEmployeeLogin({ email: values.email, password: values.password });
                userRole = loginResponse.user?.role || loginResponse.role || '';
              } catch (employeeError: any) {
                // If all three failed, throw the last error
                throw employeeError;
              }
            } else {
              // If it's not a 403, it's a different error (401, 500, etc.), throw it
              throw organizerError;
            }
          }
        } else {
          // If it's not a 403, it's a different error (401, 500, etc.), throw it
          throw adminError;
        }
      }
      
      if (!loginResponse) {
        throw new Error('Login failed - no valid response received');
      }
      
      // Trigger auth refresh event to update AuthContext
      window.dispatchEvent(new Event('authRefresh'));
      
      // Redirect based on user role - only allow restricted roles
      const userData = sessionStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        
        const normalizedRole = user.role.replace('ROLE_', '');
        
        // Check if user has restricted access role
        if (normalizedRole === 'ORGANIZER' || user.role === 'ROLE_ORGANIZER') {
          navigate('/organizer/dashboard');
        } else if (normalizedRole === 'ORGANIZER_EMPLOYEE' || user.role === 'ROLE_ORGANIZER_EMPLOYEE') {
          navigate('/employee/dashboard');
        } else if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN' || 
                   user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN') {
          // Admin and Super Admin
          navigate('/admin/dashboard');
        } else {
          // If user is a regular USER, deny access
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('user_data');
          setError('Access denied. This login is only for administrators, organizers, and organizer employees.');
          return;
        }
      } else {
        // Fallback to dashboard if user data not found
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      let errorMessage = 'Login failed. Please try again.';
      
      // Handle specific error cases with detailed messages
      if (err.response?.status === 401) {
        const responseMessage = err.response?.data?.message?.toLowerCase() || '';
        const errorCode = err.response?.data?.error_code || '';
        
        // Check specific error codes from backend
        if (errorCode === 'INVALID_CREDENTIALS') {
          errorMessage = '❌ Invalid email or password. Please check your admin credentials and try again.';
        } else if (errorCode === 'USER_DISABLED') {
          errorMessage = '⚠️ Your account has been disabled. Please contact the system administrator.';
        } else if (responseMessage.includes('user not found') || responseMessage.includes('no user') || responseMessage.includes('does not exist')) {
          errorMessage = '📧 No admin account found with this email address.';
        } else {
          errorMessage = '❌ Invalid email or password. Please verify your admin login credentials.';
        }
      } else if (err.response?.status === 403) {
        errorMessage = '🔒 Access denied. Your account may not be activated or you lack the required permissions.';
      } else if (err.response?.status === 404) {
        errorMessage = '📧 No account found with this email address. Please verify your email.';
      } else if (err.response?.status === 500) {
        errorMessage = '⚠️ Server error occurred. Please try again later or contact support.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    // For now, we'll show an alert since we don't have a full implementation
    alert('Forgot password functionality would be implemented here. In a real application, this would send a password reset link to your email.');
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={6} 
        sx={{ 
          marginTop: 8, 
          padding: 4,
          border: '2px solid #1976d2',
          borderRadius: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
            Ticket Booking System
          </Typography>
          
          <Chip 
            label="Restricted Access" 
            color="primary" 
            sx={{ mb: 2, fontWeight: 'bold' }}
          />
          
          <Typography component="h2" variant="h6" sx={{ mb: 3 }}>
            Sign in
          </Typography>
          
          {successMessage && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Formik<LoginFormValues>
            initialValues={{ email: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {(props: FormikBag<LoginFormValues>) => {
              // Destructure here to avoid unused prop warnings
              const { isSubmitting, errors, touched } = props;
              return (
              <Form style={{ width: '100%' }}>
                <Box sx={{ mb: 2 }}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="email"
                    name="email"
                    label="Email Address"
                    variant="outlined"
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                  />
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="password"
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  sx={{ py: 1.5 }}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>
                
                <Box sx={{ textAlign: 'right', mt: 1 }}>
                  <MuiLink 
                    component="button" 
                    variant="body2" 
                    onClick={handleForgotPassword}
                    sx={{ cursor: 'pointer' }}
                  >
                    Forgot password?
                  </MuiLink>
                </Box>
                
                <Box sx={{ textAlign: 'center', mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="body2" color="text.secondary">
                    Looking for customer login?{' '}
                    <MuiLink 
                      onClick={() => navigate('/login')}
                      sx={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      Click here
                    </MuiLink>
                  </Typography>
                </Box>
              </Form>
              );
            }}
          </Formik>
        </Box>
      </Paper>
    </Container>
  );
};

export default RestrictedLogin;
