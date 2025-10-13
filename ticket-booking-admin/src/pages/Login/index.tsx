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
  Link as MuiLink
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

const Login: React.FC = () => {
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
      console.log('Attempting login with:', { email: values.email });
      
      // Clear any existing tokens before login attempt
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      await login(values.email, values.password);
      console.log('Login successful, token stored:', !!localStorage.getItem('auth_token'));
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Response status:', err.response?.status);
      console.error('Response data:', err.response?.data);
      
      let errorMessage = 'Login failed. Please try again.';
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Account not activated. Please contact administrator.';
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
      <Paper elevation={6} sx={{ marginTop: 8, padding: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Ticket Booking Admin
          </Typography>
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
                
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2">
                    Don't have an account?{' '}
                    <Link to="/register" style={{ textDecoration: 'none' }}>
                      Register here
                    </Link>
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <Link to="/auth-debug" style={{ textDecoration: 'none', color: 'inherit' }}>
                    </Link>
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    <Link to="/auth-tester" style={{ textDecoration: 'none', color: 'inherit' }}>
                    </Link>
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

export default Login;