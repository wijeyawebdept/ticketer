import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import paymentService, { PaymentVerificationResponse } from '../../../services/payment.service';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<PaymentVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bookingId = searchParams.get('bookingId');
  const resultIndicator = searchParams.get('resultIndicator') || undefined;
  const sessionId =
    searchParams.get('sessionId') ||
    (location.state as any)?.sessionId ||
    localStorage.getItem('mpgs_sessionId');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        let result;
        if (bookingId) {
          result = await paymentService.verifyPaymentByBooking(bookingId, resultIndicator);
        } else if (sessionId) {
          result = await paymentService.verifyPayment(sessionId);
          localStorage.removeItem('mpgs_sessionId');
        } else {
          setError('No payment session found. Please check your bookings.');
          setLoading(false);
          return;
        }

        setVerificationResult(result);
        if (!result.success) {
          setError(result.message || 'Payment verification failed');
        }
      } catch (err: any) {
        setError('Failed to verify payment. Please contact support.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [bookingId, resultIndicator, sessionId]);

  const handleDownloadReceipt = () => {
    window.print();
  };

  const handleViewBookings = () => navigate('/my-bookings');
  const handleGoHome = () => navigate('/');

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">Verifying your payment...</Typography>
        </Box>
      </Container>
    );
  }

  const r = verificationResult;

  return (
    <>
      {/* ── Print-only global styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-receipt, #print-receipt * { visibility: visible !important; }
          #print-receipt {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <Container maxWidth="sm">
        <Box sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            {r?.success ? (
              <>
                <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom sx={{ color: 'success.main' }}>
                  Payment Successful!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Thank you for your purchase. Your booking has been confirmed.
                </Typography>

                {/* ── Printable Receipt ── */}
                <div id="print-receipt" ref={receiptRef}>
                  <Box
                    sx={{
                      border: '2px solid #4caf50',
                      borderRadius: 2,
                      p: 3,
                      mb: 3,
                      textAlign: 'left',
                      background: '#fafff8',
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="h5" fontWeight={800} color="success.dark" letterSpacing={1}>
                        TICKETER
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Payment Receipt
                      </Typography>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Booking Reference */}
                    <Box sx={{ textAlign: 'center', bgcolor: '#e8f5e9', borderRadius: 1, p: 1.5, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        BOOKING REFERENCE
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="success.dark" letterSpacing={3}>
                        {r.bookingReference}
                      </Typography>
                    </Box>

                    {/* Event Details */}
                    {(r.eventName || r.eventDate || r.venueName) && (
                      <>
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Event Details
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          {r.eventName && <ReceiptRow label="Event" value={r.eventName} />}
                          {r.eventDate && <ReceiptRow label="Date" value={r.eventDate} />}
                          {r.eventTime && <ReceiptRow label="Time" value={r.eventTime} />}
                          {r.venueName && <ReceiptRow label="Venue" value={r.venueName} />}
                          {r.ticketCount != null && <ReceiptRow label="Tickets" value={String(r.ticketCount)} />}
                        </Box>
                      </>
                    )}

                    {/* Seat / Ticket Details */}
                    {r.seatDetails && (
                      <>
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Tickets
                        </Typography>
                        <Box sx={{ mb: 2, pl: 1 }}>
                          {r.seatDetails.split('\n').map((line, i) => (
                            <Typography key={i} variant="body2" sx={{ py: 0.3, borderBottom: '1px solid #f0f0f0' }}>
                              {line}
                            </Typography>
                          ))}
                        </Box>
                      </>
                    )}

                    <Divider sx={{ mb: 2 }} />

                    {/* Payment Details */}
                    <Typography variant="overline" color="text.secondary" fontWeight={700}>
                      Payment Details
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <ReceiptRow label="Amount Paid" value={`LKR ${r.amount?.toLocaleString()}`} bold />
                      <ReceiptRow label="Status" value="✓ PAID" />
                      {r.transactionId && <ReceiptRow label="Transaction ID" value={r.transactionId} />}
                      {r.paymentDate && <ReceiptRow label="Payment Date" value={r.paymentDate} />}
                    </Box>
                  </Box>
                </div>

                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }} className="no-print">
                  A confirmation email has been sent to your registered email address with your ticket details.
                </Alert>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 1 }} className="no-print">
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadReceipt}
                    size="large"
                  >
                    Download Receipt
                  </Button>
                  <Button variant="contained" color="primary" onClick={handleViewBookings} size="large">
                    View My Bookings
                  </Button>
                  <Button variant="outlined" onClick={handleGoHome} size="large">
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
                  <Button variant="contained" color="primary" onClick={handleViewBookings} size="large">
                    Check Booking Status
                  </Button>
                  <Button variant="outlined" onClick={handleGoHome} size="large">
                    Back to Home
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Box>
      </Container>
    </>
  );
};

/** Small helper row for the receipt */
const ReceiptRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #f0f0f0' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={bold ? 700 : 500} color={bold ? 'success.dark' : 'text.primary'}>
      {value}
    </Typography>
  </Box>
);

export default PaymentSuccess;

