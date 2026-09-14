import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Container,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Visibility,
  VisibilityOff,
  QrCodeScanner as QrCodeScannerIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import PublicNavbar from '../../components/public/PublicNavbar';

export const GateLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gateLogin, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine redirect URL from query parameter or default to /gate
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/gate';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your Gate Staff email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await gateLogin(email.trim().toLowerCase(), password);

      // Verify the role after login
      const rawUserStr = localStorage.getItem('user');
      const loggedUser = rawUserStr ? JSON.parse(rawUserStr) : null;
      const role = loggedUser?.role;

      const allowedRoles = [
        UserRole.GATE_STAFF,
        UserRole.ROLE_GATE_STAFF,
        'GATE_STAFF',
        'ROLE_GATE_STAFF',
        UserRole.ORGANIZER_EMPLOYEE,
        UserRole.ROLE_ORGANIZER_EMPLOYEE,
        'ORGANIZER_EMPLOYEE',
        'ROLE_ORGANIZER_EMPLOYEE',
        UserRole.ORGANIZER,
        UserRole.ROLE_ORGANIZER,
        'ORGANIZER',
        'ROLE_ORGANIZER',
        UserRole.ADMIN,
        UserRole.ROLE_ADMIN,
        'ADMIN',
        'ROLE_ADMIN',
        UserRole.SUPER_ADMIN,
        UserRole.ROLE_SUPER_ADMIN,
        'SUPER_ADMIN',
        'ROLE_SUPER_ADMIN',
      ];

      if (role && !allowedRoles.includes(role)) {
        logout();
        setError('Access Denied: This portal is strictly for authorized Gate Staff and Event Administrators.');
        return;
      }

      // Navigate to gate scanner
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid email or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
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
          py: { xs: 0, sm: 2 },
        }}
      >
        <Container component="main" sx={{ p: 0, width: '100%', maxWidth: { xs: '100%', sm: '440px' } }}>
          <Paper
            elevation={6}
            sx={{
              padding: { xs: 2.5, sm: 4 },
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
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
                '& input': {
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
              },
              '& .MuiFormLabel-root.Mui-focused, & .MuiInputLabel-root.Mui-focused': {
                color: '#2c3e50 !important',
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 25, 85, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.5,
                  color: '#ff1955',
                }}
              >
                <SecurityIcon sx={{ fontSize: 26 }} />
              </Box>
              <Typography
                component="h1"
                variant="h5"
                sx={{
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 800,
                  color: '#2c3e50',
                  letterSpacing: '-0.3px',
                  fontSize: { xs: '1.25rem', sm: '1.4rem' },
                }}
              >
                Gate Staff Portal
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Raleway, sans-serif',
                  color: '#64748b',
                  mt: 0.5,
                  textAlign: 'center',
                  fontSize: '0.85rem',
                }}
              >
                QR Scanner & Ticket Verification Terminal
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Staff Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Staff Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QrCodeScannerIcon />}
                sx={{
                  py: 1.3,
                  fontFamily: 'Raleway, sans-serif',
                  bgcolor: '#ff1955',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(255, 25, 85, 0.25)',
                  '&:hover': {
                    bgcolor: '#e0144c',
                    boxShadow: '0 6px 16px rgba(255, 25, 85, 0.35)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255, 25, 85, 0.4)',
                    color: '#ffffff',
                  },
                }}
              >
                {loading ? 'Signing In...' : 'Sign In to Gate Terminal'}
              </Button>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                Protected system for authorized event staff only.
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default GateLogin;
