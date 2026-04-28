import React, { useState, useEffect } from 'react';
import { Button, Container, Paper, Typography, Box, TextField, Divider, Grid, Chip } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import authDebugUtils from '../../utils/authDebug';
import { useNavigate } from 'react-router-dom';

const AuthDebugPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [tokenDisplay, setTokenDisplay] = useState<string>('');
  const [userDataDisplay, setUserDataDisplay] = useState<string>('');
  const [tokenExpired, setTokenExpired] = useState<boolean | null>(null);
  
  useEffect(() => {
    refreshAuthData();
  }, []);
  
  const refreshAuthData = () => {
    // Get token and user data from localStorage
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    setTokenDisplay(token || 'No token found');
    setUserDataDisplay(userData || 'No user data found');
    
    // Check if token is expired
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Date.now() / 1000;
          setTokenExpired(payload.exp < currentTime);
        }
      } catch (e) {
      }
    }
  };
  
  const handleClearAuth = () => {
    authDebugUtils.clearAuth();
    refreshAuthData();
  };
  
  const handleCreateTestAuth = () => {
    authDebugUtils.createTestAuthData();
    refreshAuthData();
  };
  
  const handleLogout = () => {
    logout();
    refreshAuthData();
  };
  
  const handleGoToDashboard = () => {
    navigate('/admin/dashboard');
  };
  
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Authentication Debug Panel</Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Authentication Status</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography sx={{ mr: 2 }}>
              Is Authenticated: 
            </Typography>
            <Chip 
              label={isAuthenticated() ? "Yes" : "No"} 
              color={isAuthenticated() ? "success" : "error"}
              variant="outlined"
            />
          </Box>
          
          {tokenExpired !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography sx={{ mr: 2 }}>
                Token Valid: 
              </Typography>
              <Chip 
                label={tokenExpired ? "Expired" : "Valid"} 
                color={tokenExpired ? "error" : "success"}
                variant="outlined"
              />
            </Box>
          )}
        </Box>
        
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="h6">Current User</Typography>
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mt: 1 }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
              {JSON.stringify(user, null, 2) || 'No user in context'}
            </pre>
          </Paper>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6">JWT Token</Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={tokenDisplay}
          variant="outlined"
          InputProps={{ readOnly: true }}
          sx={{ my: 2 }}
        />
        
        <Typography variant="h6">User Data in Local Storage</Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={userDataDisplay}
          variant="outlined"
          InputProps={{ readOnly: true }}
          sx={{ my: 2 }}
        />
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleClearAuth}
              fullWidth
            >
              Clear Auth Data
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              color="warning" 
              onClick={handleCreateTestAuth}
              fullWidth
            >
              Create Test Auth
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleLogout}
              fullWidth
            >
              Logout
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={refreshAuthData}
              fullWidth
            >
              Refresh Data
            </Button>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="outlined"  
            onClick={handleGoToLogin}
          >
            Go to Login
          </Button>
          
          <Button 
            variant="outlined"  
            onClick={handleGoToDashboard}
          >
            Try Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthDebugPage;