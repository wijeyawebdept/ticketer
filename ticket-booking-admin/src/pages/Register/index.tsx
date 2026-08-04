import React, { useState } from 'react';
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
  Divider
} from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ConfirmationNumber as TicketIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { AuthService } from '../../services';
import { RegisterRequest } from '../../services/auth.service';
import { UserRole } from '../../types';
import PublicNavbar from '../../components/public/PublicNavbar';

interface ExtendedRegisterRequest extends Omit<RegisterRequest, 'role'> {
  dateOfBirth?: string;
  profilePicture?: string;
  role?: string | UserRole;
}

const validationSchema = Yup.object({
  firstName: Yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: Yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'
    ),
  phoneNumber: Yup.string()
    .matches(/^\d{10}$/, 'Phone number must be 10 digits'),
});

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [verificationStep, setVerificationStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      const response = await AuthService.verifyEmail(registeredEmail, verificationCode.trim());
      const pendingSeatBookingStr = sessionStorage.getItem('pendingSeatBooking');
      let seatScheduleId: string | null = null;
      if (pendingSeatBookingStr) {
        try {
          const data = JSON.parse(pendingSeatBookingStr);
          if (data.eventScheduleId) seatScheduleId = data.eventScheduleId;
        } catch (e) {}
      }

      if (response.token) {
        if (seatScheduleId) {
          navigate(`/seat-selection/${seatScheduleId}`);
        } else {
          navigate('/events');
        }
      } else {
        navigate('/login', { state: { message: 'Email verified! You can now sign in.' } });
      }
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
      await AuthService.sendVerificationCode(registeredEmail);
      setResendSuccess(true);
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleCredentialSuccess = async (credentialResponse: any) => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const idToken = credentialResponse?.credential;
      if (!idToken) throw new Error('Google did not return an ID token.');
      const response = await AuthService.googleLogin(idToken);
      if (response.user) {
        const normalizedRole = response.user.role.replace('ROLE_', '');
        if (normalizedRole === 'USER' || response.user.role === 'ROLE_USER') {
          navigate('/events');
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('user_data');
          setError('Access denied. This login is for customers only.');
        }
      } else {
        setError('Google sign-in succeeded but no user was returned. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false
  });

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>, formikHandleChange: any) => {
    const password = e.target.value;
    formikHandleChange(e);

    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const handleSubmit = async (
    values: ExtendedRegisterRequest,
    { setSubmitting }: FormikHelpers<ExtendedRegisterRequest>
  ) => {
    try {
      setError(null);
      const formData = {
        ...values,
        role: UserRole.USER
      };

      await AuthService.register(formData);
      setRegisteredEmail(values.email);
      setVerificationStep(true);
    } catch (err: any) {
      let errorMessage = 'Registration failed. Please check your information and try again.';
      const responseMessage = err.response?.data?.message?.toLowerCase() || '';

      if (responseMessage.includes('email already') || responseMessage.includes('already exists') || responseMessage.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
        <Container component="main" sx={{ p: 0, width: '100%', maxWidth: { xs: '100%', sm: '520px' } }}>
          <Paper
            elevation={6}
            sx={{
              padding: { xs: 1.5, sm: 4 },
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
              {verificationStep ? (
                <>
                  <Typography component="h1" variant="h5" sx={{ mb: 1, fontFamily: 'Raleway, sans-serif', fontWeight: 700, color: '#2c3e50', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                    Verify Your Email
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: '#555' }}>
                    We sent a 6-digit verification code to <strong>{registeredEmail}</strong>.<br />
                    Please enter it below to activate your account.
                  </Typography>

                  {verifyError && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{verifyError}</Alert>}
                  {resendSuccess && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>A new code has been sent to your email.</Alert>}

                  <TextField
                    fullWidth
                    label="6-digit Verification Code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    inputProps={{ maxLength: 6, style: { letterSpacing: '8px', fontSize: '20px', textAlign: 'center', fontWeight: 700 } }}
                    placeholder="------"
                    sx={{ mb: 2 }}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    disabled={verifyLoading || verificationCode.length !== 6}
                    onClick={handleVerify}
                    sx={{ py: 1.1, mb: 2, fontFamily: 'Raleway, sans-serif', fontWeight: 700, borderRadius: '25px', backgroundColor: '#ff1955', '&:hover': { backgroundColor: '#e01545' } }}
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
                  </Box>
                </>
              ) : (
                <>
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
                    variant="h6"
                    sx={{
                      mb: { xs: 1.5, sm: 2.5 },
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 600,
                      color: '#2c3e50',
                      fontSize: { xs: '0.95rem', md: '1.4rem' },
                    }}
                  >
                    Join Us Today
                  </Typography>

                  {error && (
                    <Alert severity="error" sx={{ width: '100%', mb: 1.5 }}>
                      {error}
                      {error.includes('already registered') && (
                        <Box sx={{ mt: 0.5 }}>
                          <Link to="/login" style={{ color: '#ff1955', fontWeight: 600, textDecoration: 'underline' }}>
                            Sign in here
                          </Link>
                        </Box>
                      )}
                    </Alert>
                  )}

                  <Formik
                    initialValues={{
                      firstName: '',
                      lastName: '',
                      email: '',
                      password: '',
                      phoneNumber: '',
                      role: UserRole.USER,
                    }}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                  >
                    {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                      <Form style={{ width: '100%' }} onSubmit={handleSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
                          <Box sx={{ flex: 1 }}>
                            <TextField
                              fullWidth
                              id="firstName"
                              name="firstName"
                              label="First Name"
                              size="small"
                              value={values.firstName}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={touched.firstName && Boolean(errors.firstName)}
                              helperText={touched.firstName && errors.firstName as string}
                              required
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <TextField
                              fullWidth
                              id="lastName"
                              name="lastName"
                              label="Last Name"
                              size="small"
                              value={values.lastName}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              error={touched.lastName && Boolean(errors.lastName)}
                              helperText={touched.lastName && errors.lastName as string}
                              required
                            />
                          </Box>
                        </Box>

                        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                          <TextField
                            fullWidth
                            id="email"
                            name="email"
                            label="Email Address"
                            size="small"
                            value={values.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={touched.email && Boolean(errors.email)}
                            helperText={touched.email && errors.email as string}
                            required
                          />
                        </Box>

                        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                          <TextField
                            fullWidth
                            id="password"
                            name="password"
                            label="Password"
                            size="small"
                            type={showPassword ? 'text' : 'password'}
                            value={values.password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePasswordChange(e, handleChange)}
                            onBlur={handleBlur}
                            error={touched.password && Boolean(errors.password)}
                            helperText={touched.password && errors.password as string}
                            required
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

                        {/* Password Requirements */}
                        {values.password && (
                          <Box sx={{ mb: 1, p: 1, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.3, display: 'block', fontSize: '0.72rem' }}>
                              Password Requirements:
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                {passwordValidation.minLength ? (
                                  <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
                                ) : (
                                  <CancelIcon sx={{ fontSize: 13, color: 'error.main' }} />
                                )}
                                <Typography variant="caption" sx={{ color: passwordValidation.minLength ? 'success.main' : 'text.secondary', fontSize: '0.7rem' }}>
                                  Minimum 8 characters
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                {passwordValidation.hasUppercase ? (
                                  <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
                                ) : (
                                  <CancelIcon sx={{ fontSize: 13, color: 'error.main' }} />
                                )}
                                <Typography variant="caption" sx={{ color: passwordValidation.hasUppercase ? 'success.main' : 'text.secondary', fontSize: '0.7rem' }}>
                                  At least 1 uppercase letter
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                {passwordValidation.hasLowercase ? (
                                  <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
                                ) : (
                                  <CancelIcon sx={{ fontSize: 13, color: 'error.main' }} />
                                )}
                                <Typography variant="caption" sx={{ color: passwordValidation.hasLowercase ? 'success.main' : 'text.secondary', fontSize: '0.7rem' }}>
                                  At least 1 lowercase letter
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                {passwordValidation.hasNumber ? (
                                  <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
                                ) : (
                                  <CancelIcon sx={{ fontSize: 13, color: 'error.main' }} />
                                )}
                                <Typography variant="caption" sx={{ color: passwordValidation.hasNumber ? 'success.main' : 'text.secondary', fontSize: '0.7rem' }}>
                                  At least 1 number
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                {passwordValidation.hasSymbol ? (
                                  <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
                                ) : (
                                  <CancelIcon sx={{ fontSize: 13, color: 'error.main' }} />
                                )}
                                <Typography variant="caption" sx={{ color: passwordValidation.hasSymbol ? 'success.main' : 'text.secondary', fontSize: '0.7rem' }}>
                                  At least 1 special character (!@#$%^&*...)
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        )}

                        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                          <TextField
                            fullWidth
                            id="phoneNumber"
                            name="phoneNumber"
                            label="Phone Number (10 digits)"
                            size="small"
                            value={values.phoneNumber}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={touched.phoneNumber && Boolean(errors.phoneNumber)}
                            helperText={touched.phoneNumber && errors.phoneNumber as string}
                          />
                        </Box>

                        <Button
                          type="submit"
                          fullWidth
                          variant="contained"
                          disabled={isSubmitting}
                          sx={{
                            mt: 0.5,
                            mb: 1.2,
                            py: { xs: 0.8, md: 1 },
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
                          {isSubmitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Register'}
                        </Button>

                        <Divider sx={{ my: 1.2 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#666', fontSize: '0.8rem' }}>
                            OR
                          </Typography>
                        </Divider>

                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ opacity: isGoogleLoading ? 0.6 : 1, pointerEvents: isGoogleLoading ? 'none' : 'auto' }}>
                            <GoogleLogin
                              onSuccess={handleGoogleCredentialSuccess}
                              onError={() => {
                                setError('Google sign-in failed. Please try again.');
                                setIsGoogleLoading(false);
                              }}
                              text="continue_with"
                            />
                          </Box>
                          {isGoogleLoading && <CircularProgress size={24} />}
                        </Box>

                        <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                          <Typography variant="body2" sx={{ color: '#2c3e50', fontFamily: 'Raleway, sans-serif', fontSize: { xs: '0.82rem', md: '0.9rem' } }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ color: '#ff1955', fontWeight: 600, textDecoration: 'none' }}>
                              Sign in
                            </Link>
                          </Typography>
                        </Box>
                      </Form>
                    )}
                  </Formik>
                </>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default Register;
