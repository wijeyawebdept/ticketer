import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate(-1); // Go back to previous page
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleBrowseEvents = () => {
    navigate('/events');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <CancelIcon
            sx={{
              fontSize: 80,
              color: 'warning.main',
              mb: 2,
            }}
          />
          <Typography variant="h4" gutterBottom sx={{ color: 'warning.main' }}>
            Payment Cancelled
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your payment was cancelled. No charges have been made to your account.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Note:</strong> Your selected seats may no longer be reserved.
              If you wish to complete your booking, please try again soon.
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleTryAgain}
              size="large"
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              onClick={handleBrowseEvents}
              size="large"
            >
              Browse Events
            </Button>
            <Button
              variant="text"
              onClick={handleGoHome}
            >
              Back to Home
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default PaymentCancel;
