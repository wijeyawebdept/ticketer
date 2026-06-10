import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip
} from '@mui/material';
import { EventSeat, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { SeatService } from '../../services/seat.service';
import seatWebSocketService from '../../services/websocket.service';

const IntegrationTest: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [wsStatus, setWsStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [apiResult, setApiResult] = useState<string>('');
  const [wsMessages, setWsMessages] = useState<string[]>([]);
  
  // Test API connectivity
  const testAPI = async () => {
    try {
      setApiStatus('testing');
      // Try to get stats for a test event ID
      const testEventId = '550e8400-e29b-41d4-a716-446655440001';
      await SeatService.getAvailabilityStats(testEventId);
      setApiResult(`API connected successfully on port 8081`);
      setApiStatus('success');
    } catch (error: any) {
      setApiResult(`API connection failed: ${error.message}`);
      setApiStatus('error');
    }
  };

  // Test WebSocket connectivity
  const testWebSocket = async () => {
    try {
      setWsStatus('testing');
      const testEventId = '550e8400-e29b-41d4-a716-446655440001';
      
      await seatWebSocketService.connect(testEventId, {
        onConnect: () => {
          setWsStatus('connected');
          setWsMessages(prev => [...prev, 'WebSocket connected successfully']);
        },
        onSeatUpdate: (update) => {
          setWsMessages(prev => [...prev, `Seat update: ${update.action} for seat ${update.seatNumber}`]);
        },
        onStatsUpdate: (stats) => {
          setWsMessages(prev => [...prev, `Stats: ${stats.availableSeats}/${stats.totalSeats} available`]);
        },
        onError: (error) => {
          setWsStatus('error');
          setWsMessages(prev => [...prev, `WebSocket error: ${error}`]);
        }
      });
    } catch (error: any) {
      setWsStatus('error');
      setWsMessages(prev => [...prev, `WebSocket connection failed: ${error.message}`]);
    }
  };

  // Run tests on component mount
  useEffect(() => {
    testAPI();
    testWebSocket();
    
    // Cleanup WebSocket on unmount
    return () => {
      seatWebSocketService.disconnect();
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <CircularProgress size={20} />;
      case 'success':
      case 'connected':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'connected':
        return 'success' as const;
      case 'error':
        return 'error' as const;
      default:
        return 'warning' as const;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Frontend-Backend Integration Test
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Testing connectivity between React frontend and Spring Boot backend
      </Typography>

      <Grid container spacing={3}>
        {/* API Test */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {getStatusIcon(apiStatus)}
                <Typography variant="h6">
                  REST API Test
                </Typography>
                <Chip 
                  label={apiStatus.toUpperCase()} 
                  color={getStatusColor(apiStatus)}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Testing connection to Spring Boot backend on port 8081
              </Typography>
              
              {apiResult && (
                <Alert severity={apiStatus === 'success' ? 'success' : 'error'}>
                  {apiResult}
                </Alert>
              )}
              
              <Button 
                variant="outlined" 
                onClick={testAPI}
                disabled={apiStatus === 'testing'}
                sx={{ mt: 2 }}
                fullWidth
              >
                Retry API Test
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* WebSocket Test */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {getStatusIcon(wsStatus)}
                <Typography variant="h6">
                  WebSocket Test
                </Typography>
                <Chip 
                  label={wsStatus.toUpperCase()} 
                  color={getStatusColor(wsStatus)}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Testing real-time WebSocket connection
              </Typography>
              
              <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
                {wsMessages.map((message, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    {message}
                  </Typography>
                ))}
              </Box>
              
              <Button 
                variant="outlined" 
                onClick={testWebSocket}
                disabled={wsStatus === 'testing'}
                fullWidth
              >
                Retry WebSocket Test
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Integration Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Integration Status
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item>
                  <Chip 
                    icon={<EventSeat />}
                    label="Backend Server" 
                    color={apiStatus === 'success' ? 'success' : 'error'}
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    icon={<EventSeat />}
                    label="WebSocket Connection" 
                    color={wsStatus === 'connected' ? 'success' : 'error'}
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    icon={<EventSeat />}
                    label="Real-time Updates" 
                    color={wsStatus === 'connected' ? 'success' : 'default'}
                  />
                </Grid>
              </Grid>
              
              {apiStatus === 'success' && wsStatus === 'connected' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <strong>Integration Successful!</strong> Your frontend is now connected to the backend with real-time capabilities.
                  <br />
                  <br />
                  <strong>Next Steps:</strong>
                  <br />
                  • Navigate to "Seat Management" to test the full seat booking interface
                  <br />
                  • Open multiple browser tabs to test real-time synchronization
                  <br />
                  • Try the WebSocket test page: <a href="http://localhost:8081/websocket-test.html" target="_blank" rel="noopener noreferrer">WebSocket Test</a>
                </Alert>
              )}
              
              {(apiStatus === 'error' || wsStatus === 'error') && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <strong>Integration Issues Detected</strong>
                  <br />
                  <br />
                  <strong>Troubleshooting:</strong>
                  <br />
                  • Ensure backend server is running on port 8081
                  <br />
                  • Check if PostgreSQL database is connected
                  <br />
                  • Verify CORS settings allow localhost:3000
                  <br />
                  • Check browser console for additional error details
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IntegrationTest;
