import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import paymentService from '../../../services/payment.service';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCancelling, setIsCancelling] = useState(false);
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    const cancelBackendBooking = async () => {
      if (bookingId) {
        setIsCancelling(true);
        try {
          await paymentService.cancelPayment(bookingId);
          console.log(`Booking ${bookingId} cancelled successfully.`);
        } catch (error) {
          console.error("Failed to cancel booking on the backend", error);
        } finally {
          setIsCancelling(false);
        }
      }
    };
    
    cancelBackendBooking();
  }, [bookingId]);

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

          {isCancelling ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <CircularProgress size={30} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Releasing your reserved seats...
              </Typography>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Note:</strong> Your selected seats have been released.
                If you wish to complete your booking, please try again.
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleTryAgain}
              disabled={isCancelling}
              size="large"
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              onClick={handleBrowseEvents}
              disabled={isCancelling}
              size="large"
            >
              Browse Events
            </Button>
            <Button
              variant="text"
              onClick={handleGoHome}
              disabled={isCancelling}
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
