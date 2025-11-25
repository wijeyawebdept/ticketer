import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SeatMap from '../../components/SeatMap';

/**
 * Event Seat Selection Page
 * Displays the seat map for users to select and book seats
 */
const EventSeatSelection: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!eventId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Event ID not found</Alert>
      </Container>
    );
  }

  const handleBookingComplete = (bookingReference: string) => {
    setSuccessMessage(`Booking confirmed! Reference: ${bookingReference}`);
    
    // Navigate to booking confirmation page after 2 seconds
    setTimeout(() => {
      navigate(`/bookings/${bookingReference}`);
    }, 2000);
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link
          color="inherit"
          href="/events"
          underline="hover"
        >
          Events
        </Link>
        <Link
          color="inherit"
          href={`/events/${eventId}`}
          underline="hover"
        >
          Event Details
        </Link>
        <Typography color="text.primary">Select Seats</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Select Your Seats
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose your preferred seats from the seating map below. 
          Available seats are shown in green. Click on seats to select them.
        </Typography>
      </Paper>

      {/* Seat Map Component */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <SeatMap 
          eventId={eventId} 
          onBookingComplete={handleBookingComplete}
        />
      </Paper>

      {/* Instructions */}
      <Paper elevation={1} sx={{ p: 2, mt: 3, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          Booking Instructions:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          <li>
            <Typography variant="body2">
              Click on available seats (green/blue/orange) to select them
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Selected seats will be highlighted in blue
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Click "Proceed to Payment" when you're ready
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Your seats will be held for 5 minutes during checkout
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Complete payment to confirm your booking
            </Typography>
          </li>
        </Box>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EventSeatSelection;
