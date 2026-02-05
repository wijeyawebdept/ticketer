import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import paymentService from '../../../services/payment.service';

const PaymentError: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('Your payment could not be processed.');

  // Get session ID from URL params or location state for verification
  const sessionId = searchParams.get('sessionId') || (location.state as any)?.sessionId;
  const errorParam = searchParams.get('error');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (errorParam) {
        setErrorMessage(decodeURIComponent(errorParam));
        setLoading(false);
        return;
      }

      if (sessionId) {
        try {
          const result = await paymentService.verifyPayment(sessionId);
          if (!result.success && result.message) {
            setErrorMessage(result.message);
          }
        } catch (err: any) {
          console.error('Error checking payment status:', err);
        }
      }

      setLoading(false);
    };

    checkPaymentStatus();
  }, [sessionId, errorParam]);

  const handleTryAgain = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleContactSupport = () => {
    // Could navigate to a support page or open email
    window.location.href = 'mailto:support@ticketbooking.com?subject=Payment%20Issue';
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 2,
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Checking payment status...
          </Typography>
        </Box>
      </Container>
    );
  }

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
          <ErrorIcon
            sx={{
              fontSize: 80,
              color: 'error.main',
              mb: 2,
            }}
          />
          <Typography variant="h4" gutterBottom sx={{ color: 'error.main' }}>
            Payment Failed
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We couldn't process your payment. No charges have been made to your account.
          </Typography>

          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Error:</strong> {errorMessage}
            </Typography>
          </Alert>

          <Paper
            sx={{
              p: 2,
              mb: 3,
              backgroundColor: 'grey.100',
              textAlign: 'left',
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Common reasons for payment failure:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>Insufficient funds in your account</li>
              <li>Card details entered incorrectly</li>
              <li>Card expired or declined by bank</li>
              <li>3D Secure authentication failed</li>
              <li>Daily transaction limit exceeded</li>
            </ul>
          </Paper>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2">
              Please try again with a different payment method or contact your bank for assistance.
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
              color="secondary"
              onClick={handleContactSupport}
              size="large"
            >
              Contact Support
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

export default PaymentError;
