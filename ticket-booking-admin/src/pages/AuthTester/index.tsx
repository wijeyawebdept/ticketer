import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Container,
  TextField,
  Divider,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { testLoginEndpoint, testRegisterEndpoint } from '../../utils/apiTest';

interface TestResponse {
  success: boolean;
  endpoint?: string;
  response?: any;
  error?: string;
}

const AuthTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResponse | null>(null);
  const [showFullResponse, setShowFullResponse] = useState(false);
  
  const handleTestLogin = async () => {
    setLoading(true);
    try {
      const response = await testLoginEndpoint();
      setResult(response);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestRegister = async () => {
    setLoading(true);
    try {
      const response = await testRegisterEndpoint();
      setResult(response);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setResult({
      success: true,
      response: 'Authentication data cleared'
    });
  };
  
  const handleToggleResponseView = () => {
    setShowFullResponse(!showFullResponse);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>API Endpoint Tester</Typography>
        <Typography variant="body1" paragraph>
          This utility helps identify which authentication endpoints are working correctly.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleTestLogin}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Test Login Endpoint'}
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={handleTestRegister}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Test Register Endpoint'}
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={handleClearAuth}
              disabled={loading}
            >
              Clear Auth Data
            </Button>
          </Grid>
        </Grid>
        
        {result && (
          <Box sx={{ mt: 4 }}>
            <Alert severity={result.success ? 'success' : 'error'}>
              {result.success ? 'Endpoint test successful!' : 'Endpoint test failed!'}
              {result.endpoint && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Working endpoint: {result.endpoint}
                </Typography>
              )}
              {result.error && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Error: {result.error}
                </Typography>
              )}
            </Alert>
            
            {result.response && (
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="text" 
                  onClick={handleToggleResponseView}
                  size="small"
                >
                  {showFullResponse ? 'Hide Response' : 'Show Response'}
                </Button>
                
                {showFullResponse && (
                  <TextField
                    fullWidth
                    multiline
                    rows={10}
                    value={JSON.stringify(result.response, null, 2)}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ mt: 2, fontFamily: 'monospace' }}
                  />
                )}
              </Box>
            )}
          </Box>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" gutterBottom>API Endpoint Information</Typography>
        
        <Typography variant="h6">Login Endpoint</Typography>
        <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto' }}>
{`POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@ticketbooking.com",
  "password": "1234"
}`}
        </Box>
        
        <Typography variant="h6" sx={{ mt: 2 }}>Register Endpoint</Typography>
        <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto' }}>
{`POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "1234567890",
  "role": "USER"
}`}
        </Box>
        
        <Typography variant="h6" sx={{ mt: 2 }}>Using JWT Token</Typography>
        <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, overflow: 'auto' }}>
{`GET /api/admin/users
Authorization: Bearer YOUR_JWT_TOKEN_HERE`}
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthTester;
