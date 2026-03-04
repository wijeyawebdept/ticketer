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
  Divider,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { GoogleLogin } from '@react-oauth/google';
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PublicNavbar from '../../components/public/PublicNavbar';
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

const Login: React.FC = () => {
  console.log("CLIENT ID USED:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Check for success message from registration and load remember me preference
  useEffect(() => {
    const state = location.state as { message?: string } | undefined;
    if (state?.message) {
      setSuccessMessage(state.message);
    }

    // Load remember me preference
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRememberMe);
  }, [location]);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleGoogleCredentialSuccess = async (credentialResponse: any) => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const idToken = credentialResponse?.credential; // ID token JWT, starts with eyJ
      if (!idToken) throw new Error('Google did not return an ID token (credential).');

      // Set storage type to localStorage for customer logins
      AuthService.setStorageType('localStorage');

      // Exchange Google ID token for our backend JWT token
      const response = await AuthService.googleLogin(idToken);

      if (response.user) {
        const normalizedRole = response.user.role.replace('ROLE_', '');
        if (normalizedRole === 'USER' || response.user.role === 'ROLE_USER') {
          const pendingBooking = sessionStorage.getItem('pendingBooking');
          const from = (location.state as any)?.from;

          if (pendingBooking || from) navigate(from || '/events');
          else navigate('/events');
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('user_data');
          setError('Access denied. Please use the restricted login page for administrators and organizers.');
        }
      } else {
        setError('Google login succeeded but no user returned from server.');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (
    values: LoginFormValues,
    { setSubmitting }: FormikHelpers<LoginFormValues>
  ) => {
    try {
      setError(null);
      console.log('Attempting login with:', { email: values.email, rememberMe });

      // Set storage type to localStorage for customer logins (shared across tabs)
      AuthService.setStorageType('localStorage');

      // Save remember me preference
      localStorage.setItem('rememberMe', rememberMe.toString());

      // Clear only localStorage tokens (don't touch sessionStorage for admin sessions)
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user');

      await login(values.email, values.password);
      console.log('Login successful, token stored in localStorage:', !!localStorage.getItem('auth_token'));

      // Redirect based on user role
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('User role after login:', user.role);

        const normalizedRole = user.role.replace('ROLE_', '');

        // Only allow USER role on this login page
        if (normalizedRole === 'USER' || user.role === 'ROLE_USER') {
          // Check if there's a pending booking (user was redirected from event details)
          const pendingBooking = sessionStorage.getItem('pendingBooking');
          const from = location.state?.from;

          if (pendingBooking || from) {
            // Redirect back to the event details page to restore booking
            navigate(from || '/events');
          } else {
            // Normal login flow - go to events page
            navigate('/events');
          }
        } else {
          // If user is admin, organizer, or organizer employee, deny access
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('user_data');
          setError('Access denied. Please use the restricted login page for administrators and organizers.');
          return;
        }
      } else {
        // Fallback - try to determine from token
        setError('Unable to determine user role. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Response status:', err.response?.status);
      console.error('Response data:', err.response?.data);

      let errorMessage = 'Login failed. Please try again.';

      // Handle specific error cases with detailed messages
      if (err.response?.status === 401) {
        const responseMessage = err.response?.data?.message?.toLowerCase() || '';
        const errorCode = err.response?.data?.error_code || '';

        // Check specific error codes from backend
        if (errorCode === 'INVALID_CREDENTIALS') {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorCode === 'USER_DISABLED') {
          errorMessage = 'Your account has been disabled. Please contact the administrator.';
        } else if (responseMessage.includes('user not found') || responseMessage.includes('no user') || responseMessage.includes('does not exist')) {
          errorMessage = 'This email is not registered. Please create an account first.';
        } else {
          errorMessage = 'Invalid email or password. Please verify your login credentials.';
        }
      } else if (err.response?.status === 403) {
        errorMessage = 'Account not activated. Please contact the administrator.';
      } else if (err.response?.status === 404) {
        errorMessage = 'No account found with this email address. Please register first.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
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
    setForgotEmail('');
    setForgotError(null);
    setForgotSent(false);
    setForgotOpen(true);
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await AuthService.forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
    {/* Forgot Password Dialog */}
    <Dialog
      open={forgotOpen}
      onClose={() => !forgotLoading && setForgotOpen(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: 'Raleway, sans-serif', fontWeight: 700, color: '#2c3e50' }}>
        Reset Your Password
      </DialogTitle>
      <DialogContent>
        {forgotSent ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            If an account with that email exists, a password reset link has been sent. Please check your inbox.
          </Alert>
        ) : (
          <>
            <DialogContentText sx={{ fontFamily: 'Raleway, sans-serif', mb: 2, color: '#555' }}>
              Enter your registered email address and we'll send you a link to reset your password.
            </DialogContentText>
            {forgotError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {forgotError}
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              label="Email Address"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleForgotSubmit()}
              disabled={forgotLoading}
              variant="outlined"
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => setForgotOpen(false)}
          disabled={forgotLoading}
          sx={{ fontFamily: 'Raleway, sans-serif', color: '#666' }}
        >
          {forgotSent ? 'Close' : 'Cancel'}
        </Button>
        {!forgotSent && (
          <Button
            onClick={handleForgotSubmit}
            disabled={forgotLoading}
            variant="contained"
            sx={{
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              backgroundColor: '#ff1955',
              '&:hover': { backgroundColor: '#e01545' },
            }}
          >
            {forgotLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Send Reset Link'}
          </Button>
        )}
      </DialogActions>
    </Dialog>

    <Box
      sx={{
        backgroundColor: '#242a33',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <PublicNavbar />
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={6}
          sx={{
            padding: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
            <Typography
              component="h1"
              variant="h5"
              sx={{
                mb: 2,
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 700,
                color: '#2c3e50',
              }}
            >
              Welcome Back!
            </Typography>

            <Typography
              component="h2"
              variant="h6"
              sx={{
                mb: 3,
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 600,
                color: '#2c3e50',
              }}
            >
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
                {error.includes('not registered') && (
                  <Box sx={{ mt: 1 }}>
                    <Link to="/register" style={{ color: '#ff1955', fontWeight: 600, textDecoration: 'underline' }}>
                      Create an account here
                    </Link>
                  </Box>
                )}
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

                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            sx={{
                              color: '#ff1955',
                              '&.Mui-checked': {
                                color: '#ff1955',
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.9rem', color: '#2c3e50' }}>
                            Remember Me
                          </Typography>
                        }
                      />
                      <MuiLink
                        component="button"
                        type="button"
                        onClick={handleForgotPassword}
                        sx={{
                          fontFamily: 'Raleway, sans-serif',
                          fontSize: '0.9rem',
                          color: '#ff1955',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        Forgot Password?
                      </MuiLink>
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={isSubmitting}
                      sx={{
                        py: 1.5,
                        fontFamily: 'Raleway, sans-serif',
                        fontWeight: 700,
                        backgroundColor: '#ff1955',
                        color: '#fff',
                        fontSize: '1rem',
                        letterSpacing: '1px',
                        '&:hover': {
                          backgroundColor: '#e01545',
                        },
                      }}
                    >
                      {isSubmitting ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Sign In'}
                    </Button>

                    <Divider sx={{ my: 3 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#666' }}>
                        OR
                      </Typography>
                    </Divider>

                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ opacity: isGoogleLoading ? 0.6 : 1, pointerEvents: isGoogleLoading ? 'none' : 'auto' }}>
                        <GoogleLogin
                          onSuccess={handleGoogleCredentialSuccess}
                          onError={() => {
                            setError('Google sign-in failed. Please try again.');
                            setIsGoogleLoading(false);
                          }}
                        />
                      </Box>

                      {isGoogleLoading && (
                        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={24} />
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#2c3e50' }}>
                        Don't have an account?{' '}
                        <Link to="/register" style={{ textDecoration: 'none', color: '#ff1955', fontWeight: 600 }}>
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
    </Box>
  </>
  );
};

export default Login;