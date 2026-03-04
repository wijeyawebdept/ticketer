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
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { AuthService } from '../../services';
import { RegisterRequest } from '../../services/auth.service';
import { UserRole } from '../../types';
import PublicNavbar from '../../components/public/PublicNavbar';

// Extend the RegisterRequest interface to include new fields
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
  dateOfBirth: Yup.date()
    .nullable()
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'You must be at least 13 years old', function(value) {
      if (!value) return true; // Allow empty values
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 13;
      }
      return age >= 13;
    }),
});

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleCredentialSuccess = async (credentialResponse: any) => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const idToken = credentialResponse?.credential;
      if (!idToken) throw new Error('Google did not return an ID token.');
      AuthService.setStorageType('localStorage');
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

    // Real-time password validation
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
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
      
      // Ensure role is set to USER by default
      const formData = {
        ...values,
        role: UserRole.USER // Set default role to USER
      };
      
      await AuthService.register(formData);
      navigate('/login', { state: { message: 'Registration successful! You can now log in.' } });
    } catch (err: any) {
      console.error('Registration error details:', err);
      if (err.response?.data?.errors) {
        console.error('Validation errors:', err.response.data.errors);
      }
      
      let errorMessage = 'Registration failed. Please check your information and try again.';
      const responseMessage = err.response?.data?.message?.toLowerCase() || '';
      
      // Check if error is due to email already exists
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <PublicNavbar />
      <Container component="main" maxWidth="sm">
        <Paper elevation={6} sx={{ padding: 4, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 2 }}>
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
              mb: 1,
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              color: '#2c3e50',
            }}
          >
            Welcome to Ticketer.lk
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
            Join Us Today
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
              {error.includes('already registered') && (
                <Box sx={{ mt: 1 }}>
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
              dateOfBirth: '',
              role: UserRole.USER,
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
              <Form style={{ width: '100%' }} onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      id="firstName"
                      name="firstName"
                      label="First Name"
                      value={values.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.firstName && Boolean(errors.firstName)}
                      helperText={touched.firstName && errors.firstName as string}
                      margin="normal"
                      required
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      id="lastName"
                      name="lastName"
                      label="Last Name"
                      value={values.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.lastName && Boolean(errors.lastName)}
                      helperText={touched.lastName && errors.lastName as string}
                      margin="normal"
                      required
                    />
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email Address"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email as string}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePasswordChange(e, handleChange)}
                  onBlur={handleBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password as string}
                  margin="normal"
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

                {/* Password Requirements */}
                {values.password && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                      Password Requirements:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {passwordValidation.minLength ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        )}
                        <Typography variant="caption" sx={{ color: passwordValidation.minLength ? 'success.main' : 'text.secondary' }}>
                          Minimum 8 characters
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {passwordValidation.hasUppercase ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        )}
                        <Typography variant="caption" sx={{ color: passwordValidation.hasUppercase ? 'success.main' : 'text.secondary' }}>
                          At least 1 uppercase letter
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {passwordValidation.hasNumber ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        )}
                        <Typography variant="caption" sx={{ color: passwordValidation.hasNumber ? 'success.main' : 'text.secondary' }}>
                          At least 1 number
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {passwordValidation.hasSymbol ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        )}
                        <Typography variant="caption" sx={{ color: passwordValidation.hasSymbol ? 'success.main' : 'text.secondary' }}>
                          At least 1 special character (!@#$%^&*...)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                <TextField
                  fullWidth
                  id="phoneNumber"
                  name="phoneNumber"
                  label="Phone Number (10 digits)"
                  value={values.phoneNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.phoneNumber && Boolean(errors.phoneNumber)}
                  helperText={touched.phoneNumber && errors.phoneNumber as string}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  id="dateOfBirth"
                  name="dateOfBirth"
                  label="Date of Birth"
                  type="date"
                  value={values.dateOfBirth}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.dateOfBirth && Boolean(errors.dateOfBirth)}
                  helperText={touched.dateOfBirth && errors.dateOfBirth as string}
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ 
                    mt: 3, 
                    mb: 2, 
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
                  {isSubmitting ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Register'}
                </Button>

                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#666' }}>
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

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#2c3e50' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ textDecoration: 'none', color: '#ff1955', fontWeight: 600 }}>
                      Sign in
                    </Link>
                  </Typography>
                </Box>
              </Form>
            )}
          </Formik>
        </Box>
      </Paper>
    </Container>
    </Box>
  );
};

export default Register;