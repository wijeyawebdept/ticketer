import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import paymentService from '../../services/payment.service';

const BookingPaymentReturn: React.FC = () => {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState('Verifying payment...');

  useEffect(() => {
    const run = async () => {
      try {
        const sessionId = localStorage.getItem('mpgs_sessionId');

        if (!sessionId) {
          setStatusText('Missing sessionId. Please check your bookings.');
          navigate('/booking/payment-error', { state: { error: 'Missing sessionId' } });
          return;
        }

        const result = await paymentService.verifyPayment(sessionId);

        if (result.success) {
          localStorage.removeItem('mpgs_sessionId');
          navigate('/booking/payment-success', {
            state: {
              sessionId,
              bookingReference: result.bookingReference,
            },
          });
        } else {
          navigate('/booking/payment-error', {
            state: {
              sessionId,
              error: result.message || 'Payment verification failed',
            },
          });
        }
      } catch (e: any) {
        navigate('/booking/payment-error', {
          state: {
            error: 'Verification request failed',
          },
        });
      }
    };

    run();
  }, [navigate]);

  return (
    <div style={{ padding: 24 }}>
      <h2>{statusText}</h2>
      <p>Please do not close this window.</p>
    </div>
  );
};

export default BookingPaymentReturn;
