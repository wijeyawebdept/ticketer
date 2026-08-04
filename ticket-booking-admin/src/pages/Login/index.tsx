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
  VisibilityOff as VisibilityOffIcon,
  ConfirmationNumber as TicketIcon
} from '@mui/icons-material';
import { GoogleLogin } from '@react-oauth/google';
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PublicNavbar from '../../components/public/PublicNavbar';
import AuthService from '../../services/auth.service';

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

  const [showVerifyStep, setShowVerifyStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async () => {
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await AuthService.verifyEmail(pendingEmail, verifyCode.trim());
      setShowVerifyStep(false);
      setVerifyCode('');
      setSuccessMessage('Email verified successfully! You can now sign in.');
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setVerifyError(null);
    try {
      await AuthService.sendVerificationCode(pendingEmail);
      setResendSuccess(true);
    } catch (err: any) {
      setVerifyError('Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    const state = location.state as { message?: string } | undefined;
    if (state?.message) {
      setSuccessMessage(state.message);
    }
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
      const idToken = credentialResponse?.credential;
      if (!idToken) throw new Error('Google did not return an ID token (credential).');

      const response = await AuthService.googleLogin(idToken);

      if (response.user) {
        const normalizedRole = response.user.role.replace('ROLE_', '');
        if (normalizedRole === 'USER' || response.user.role === 'ROLE_USER') {
          window.dispatchEvent(new Event('authRefresh'));

          const pendingBooking = sessionStorage.getItem('pendingBooking');
          const pendingSeatBookingStr = sessionStorage.getItem('pendingSeatBooking');
          let seatScheduleId: string | null = null;
          if (pendingSeatBookingStr) {
            try {
              const data = JSON.parse(pendingSeatBookingStr);
              if (data.eventScheduleId) seatScheduleId = data.eventScheduleId;
            } catch (e) {}
          }
          const from = (location.state as any)?.from;

          const targetPath = seatScheduleId ? `/seat-selection/${seatScheduleId}` : (from || '/events');
          const welcomeState = { googleWelcome: true, firstName: response.user.firstName };
          if (seatScheduleId || pendingBooking || from) navigate(targetPath, { state: welcomeState });
          else navigate('/events', { state: welcomeState });
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
      localStorage.setItem('rememberMe', rememberMe.toString());
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user');

      await login(values.email, values.password);

      const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const normalizedRole = user.role.replace('ROLE_', '');

        if (normalizedRole === 'USER' || user.role === 'ROLE_USER') {
          const pendingBooking = sessionStorage.getItem('pendingBooking');
          const pendingSeatBookingStr = sessionStorage.getItem('pendingSeatBooking');
          let seatScheduleId: string | null = null;
          if (pendingSeatBookingStr) {
            try {
              const data = JSON.parse(pendingSeatBookingStr);
              if (data.eventScheduleId) seatScheduleId = data.eventScheduleId;
            } catch (e) {}
          }
          const from = location.state?.from;

          if (seatScheduleId) {
            navigate(`/seat-selection/${seatScheduleId}`);
          } else if (pendingBooking || from) {
            navigate(from || '/events');
          } else {
            navigate('/events');
          }
        } else {
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('user_data');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('user_data');
          setError('Access denied. Please use the restricted login page for administrators and organizers.');
          return;
        }
      } else {
        setError('Unable to determine user role. Please try again.');
      }
    } catch (err: any) {
      let errorMessage = 'Login failed. Please try again.';
      if (err.response?.status === 401) {
        const responseMessage = err.response?.data?.message?.toLowerCase() || '';
        const errorCode = err.response?.data?.error_code || '';

        if (errorCode === 'INVALID_CREDENTIALS') {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorCode === 'USER_DISABLED') {
          errorMessage = 'Your account has been disabled. Please contact the administrator.';
        } else if (errorCode === 'EMAIL_NOT_VERIFIED') {
          setPendingEmail(values.email);
          setShowVerifyStep(true);
          return;
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
          height: { xs: 'auto', sm: '100vh' },
          maxHeight: { sm: '100vh' },
          overflowY: { xs: 'auto', sm: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <PublicNavbar />
        <Box
          sx={{
            flex: 1,
            mt: { xs: '56px', sm: '82px' },
            mb: { xs: 1, sm: '16px' },
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            px: { xs: 1.5, sm: 3 },
            py: { xs: 0, sm: 1 },
          }}
        >
          <Container component="main" sx={{ p: 0, width: '100%', maxWidth: { xs: '100%', sm: '450px' } }}>
            <Paper
              elevation={6}
              sx={{
                padding: { xs: 2, sm: 4 },
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 3,
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.3)',
                '& .MuiOutlinedInput-root': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.23) !important',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2c3e50 !important',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2c3e50 !important',
                    borderWidth: '1.5px !important',
                  },
                  '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2c3e50 !important',
                  },
                  '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2c3e50 !important',
                  },
                  '& input': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                },
                '& .MuiFormLabel-root.Mui-focused, & .MuiInputLabel-root.Mui-focused, & .MuiFormLabel-root.Mui-error, & .MuiInputLabel-root.Mui-error': {
                  color: '#2c3e50 !important',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: { xs: 0.5, sm: 1.5 },
                    userSelect: 'none',
                  }}
                >
                  <TicketIcon sx={{ fontSize: { xs: 22, md: 32 }, color: '#ff1955', transform: 'rotate(-10deg)', mr: 0.8 }} />
                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 800,
                      color: '#2c3e50',
                      letterSpacing: '-0.5px',
                      fontSize: { xs: '1.15rem', md: '1.75rem' },
                    }}
                  >
                    Ticketer<span style={{ color: '#ff1955' }}>.lk</span>
                  </Typography>
                </Box>

                <Typography
                  component="h1"
                  variant="h5"
                  sx={{
                    mb: { xs: 0, sm: 0.3 },
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 800,
                    color: '#2c3e50',
                    fontSize: { xs: '1rem', md: '1.45rem' },
                  }}
                >
                  Welcome Back!
                </Typography>

                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    mb: { xs: 1.5, sm: 2.5 },
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 600,
                    color: '#2c3e50',
                    fontSize: { xs: '0.8rem', md: '1rem' },
                  }}
                >
                  Sign in
                </Typography>

                {successMessage && (
                  <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                    {successMessage}
                  </Alert>
                )}

                {showVerifyStep ? (
                  <>
                    <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: '#555' }}>
                      Your email <strong>{pendingEmail}</strong> is not verified yet.<br />
                      Enter the 6-digit code we sent to your inbox.
                    </Typography>

                    {verifyError && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{verifyError}</Alert>}
                    {resendSuccess && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>A new code has been sent to your email.</Alert>}

                    <TextField
                      fullWidth
                      label="6-digit Verification Code"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      inputProps={{ maxLength: 6, style: { letterSpacing: '8px', fontSize: '20px', textAlign: 'center', fontWeight: 700 } }}
                      placeholder="------"
                      sx={{ mb: 2 }}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      disabled={verifyLoading || verifyCode.length !== 6}
                      onClick={handleVerify}
                      sx={{ py: 1.2, mb: 2, fontFamily: 'Raleway, sans-serif', fontWeight: 700, borderRadius: '25px', backgroundColor: '#ff1955', '&:hover': { backgroundColor: '#e01545' } }}
                    >
                      {verifyLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Verify Email'}
                    </Button>

                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Didn't receive a code?{' '}
                        <span
                          onClick={resendLoading ? undefined : handleResendCode}
                          style={{ color: '#ff1955', fontWeight: 600, cursor: resendLoading ? 'default' : 'pointer', textDecoration: 'underline' }}
                        >
                          {resendLoading ? 'Sending...' : 'Resend Code'}
                        </span>
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                        <span
                          onClick={() => { setShowVerifyStep(false); setVerifyCode(''); setVerifyError(null); }}
                          style={{ color: '#999', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Back to login
                        </span>
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <>
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
                        const { isSubmitting, errors, touched } = props;
                        return (
                          <Form style={{ width: '100%' }}>
                            <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                              <Field
                                as={TextField}
                                fullWidth
                                id="email"
                                name="email"
                                label="Email Address"
                                variant="outlined"
                                size="small"
                                error={touched.email && Boolean(errors.email)}
                                helperText={touched.email && errors.email}
                              />
                            </Box>

                            <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                              <Field
                                as={TextField}
                                fullWidth
                                id="password"
                                name="password"
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                variant="outlined"
                                size="small"
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

                            <Box sx={{ mb: { xs: 1.5, sm: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    size="small"
                                    sx={{
                                      color: '#ff1955',
                                      '&.Mui-checked': {
                                        color: '#ff1955',
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Typography sx={{ fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.78rem', md: '0.88rem' }, color: '#2c3e50' }}>
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
                                  fontSize: { xs: '0.78rem', md: '0.88rem' },
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
                                py: { xs: 1, md: 1.2 },
                                fontFamily: 'Raleway, sans-serif',
                                fontWeight: 700,
                                backgroundColor: '#ff1955',
                                color: '#fff',
                                borderRadius: '25px',
                                fontSize: { xs: '0.85rem', md: '0.95rem' },
                                letterSpacing: '0.5px',
                                boxShadow: '0 4px 14px rgba(255, 25, 85, 0.4)',
                                '&:hover': {
                                  backgroundColor: '#e01545',
                                },
                              }}
                            >
                              {isSubmitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign In'}
                            </Button>

                            <Divider sx={{ my: 2.5 }}>
                              <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#666', fontSize: '0.8rem' }}>
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
                                  use_fedcm_for_prompt={true}
                                />
                              </Box>

                              {isGoogleLoading && (
                                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                                  <CircularProgress size={24} />
                                </Box>
                              )}
                            </Box>

                            <Box sx={{ textAlign: 'center', mt: 2.5 }}>
                              <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#2c3e50', fontSize: { xs: '0.82rem', md: '0.9rem' } }}>
                                Don't have an account?{' '}
                                <Link to="/register" style={{ textDecoration: 'none', color: '#ff1955', fontWeight: 600 }}>
                                  Register here
                                </Link>
                              </Typography>
                            </Box>
                          </Form>
                        );
                      }}
                    </Formik>
                  </>
                )}
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default Login;
