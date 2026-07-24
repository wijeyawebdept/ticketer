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
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LockReset as LockResetIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PublicNavbar from '../../components/public/PublicNavbar';
import AuthService from '../../services/auth.service';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPassword(token, newPassword);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successfully. You can now sign in with your new password.' } });
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    mb: 2,
    '& .MuiOutlinedInput-root': {
      '&.Mui-focused fieldset': { borderColor: '#ff1955' },
    },
    '& label.Mui-focused': { color: '#ff1955' },
  };

  return (
    <Box
      sx={{
        backgroundColor: '#242a33',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pt: 10,
        pb: 4,
      }}
    >
      <PublicNavbar />
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={6}
          sx={{
            padding: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LockResetIcon sx={{ fontSize: 48, color: '#ff1955', mb: 1 }} />

            <Typography
              component="h1"
              variant="h5"
              sx={{ mb: 1, fontFamily: 'Raleway, sans-serif', fontWeight: 700, color: '#2c3e50' }}
            >
              Reset Password
            </Typography>
            <Typography
              variant="body2"
              sx={{ mb: 3, fontFamily: 'Raleway, sans-serif', color: '#666', textAlign: 'center' }}
            >
              Enter your new password below.
            </Typography>

            {/* Render once: success state */}
            {success && (
              <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                Password reset successfully! Redirecting you to sign in...
              </Alert>
            )}

            {/* No token supplied */}
            {!token && !success && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                Invalid or missing reset link. Please{' '}
                <Link to="/login" style={{ color: '#ff1955', fontWeight: 600 }}>
                  request a new one
                </Link>
                .
              </Alert>
            )}

            {/* Error from API */}
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Form — only show when token is present and not yet succeeded */}
            {token && !success && (
              <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  sx={inputSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Minimum 8 characters"
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  sx={inputSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end">
                          {showConfirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    mt: 1,
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 700,
                    backgroundColor: '#ff1955',
                    fontSize: '1rem',
                    letterSpacing: '1px',
                    '&:hover': { backgroundColor: '#e01545' },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Reset Password'}
                </Button>
              </Box>
            )}

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" sx={{ fontFamily: 'Raleway, sans-serif', color: '#2c3e50' }}>
                Remember your password?{' '}
                <Link to="/login" style={{ textDecoration: 'none', color: '#ff1955', fontWeight: 600 }}>
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;
