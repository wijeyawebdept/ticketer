import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import paymentService, { PaymentVerificationResponse } from '../../../services/payment.service';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<PaymentVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get session ID from URL params or location state
  const sessionId =
    searchParams.get('sessionId') ||
    (location.state as any)?.sessionId ||
    localStorage.getItem('mpgs_sessionId');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No payment session found');
        setLoading(false);
        return;
      }

      try {
        // Verify payment with backend
        const result = await paymentService.verifyPayment(sessionId);
        setVerificationResult(result);

        // Clear stored sessionId after verification attempt
        localStorage.removeItem('mpgs_sessionId');

        if (!result.success) {
          setError(result.message || 'Payment verification failed');
        }
      } catch (err: any) {
        console.error('Payment verification error:', err);
        setError('Failed to verify payment. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  const handleViewBookings = () => {
    navigate('/my-bookings');
  };

  const handleGoHome = () => {
    navigate('/');
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
            Verifying your payment...
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
          {verificationResult?.success ? (
            <>
              <CheckCircleIcon
                sx={{
                  fontSize: 80,
                  color: 'success.main',
                  mb: 2,
                }}
              />
              <Typography variant="h4" gutterBottom sx={{ color: 'success.main' }}>
                Payment Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Thank you for your purchase. Your booking has been confirmed.
              </Typography>

              {verificationResult.bookingReference && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: 'success.light',
                    color: 'success.contrastText',
                  }}
                >
                  <Typography variant="subtitle2">Booking Reference</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', letterSpacing: 2 }}>
                    {verificationResult.bookingReference}
                  </Typography>
                </Paper>
              )}

              {verificationResult.amount && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Amount Paid: <strong>LKR {verificationResult.amount.toLocaleString()}</strong>
                </Typography>
              )}

              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                A confirmation email has been sent to your registered email address with your ticket details.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleViewBookings}
                  size="large"
                >
                  View My Bookings
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleGoHome}
                  size="large"
                >
                  Back to Home
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 3 }}>
                {error || 'Payment verification failed. Please check your booking status.'}
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleViewBookings}
                  size="large"
                >
                  Check Booking Status
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleGoHome}
                  size="large"
                >
                  Back to Home
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PaymentSuccess;
