import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import { seatBookingService } from '../../services/seatBooking.service';
import type { SeatWithStatus, SeatsGroupedByRow, SeatStatus } from '../../types/seat';

interface SeatMapProps {
  eventId: string;
  onBookingComplete?: (bookingReference: string) => void;
}

// Styled components
const SeatMapContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: '#f5f5f5',
  borderRadius: theme.spacing(1),
  overflowX: 'auto',
}));

const StageBox = styled(Box)(({ theme }) => ({
  backgroundColor: '#333',
  color: '#fff',
  padding: theme.spacing(2),
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  borderRadius: theme.spacing(1),
  fontWeight: 'bold',
  fontSize: '1.2rem',
}));

const RowContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  justifyContent: 'center',
}));

const RowLabel = styled(Typography)(({ theme }) => ({
  minWidth: '40px',
  fontWeight: 'bold',
  marginRight: theme.spacing(2),
  textAlign: 'center',
}));

interface SeatButtonProps {
  status: SeatStatus;
  seatType: string;
}

const SeatButton = styled(Button)<SeatButtonProps>(({ theme, status, seatType }) => {
  let backgroundColor = '#4CAF50'; // available - green
  let hoverColor = '#45a049';
  let cursor = 'pointer';

  if (status === 'selected') {
    backgroundColor = '#2196F3'; // blue
    hoverColor = '#1976D2';
  } else if (status === 'booked') {
    backgroundColor = '#f44336'; // red
    cursor = 'not-allowed';
  } else if (status === 'held') {
    backgroundColor = '#FF9800'; // orange
    cursor = 'not-allowed';
  } else if (status === 'blocked') {
    backgroundColor = '#9E9E9E'; // gray
    cursor = 'not-allowed';
  }

  // Adjust for seat type
  if (status === 'available') {
    if (seatType === 'PREMIUM') {
      backgroundColor = '#2196F3';
      hoverColor = '#1976D2';
    } else if (seatType === 'VIP') {
      backgroundColor = '#FF9800';
      hoverColor = '#F57C00';
    }
  }

  return {
    minWidth: '45px',
    width: '45px',
    height: '45px',
    margin: theme.spacing(0.5),
    padding: 0,
    fontSize: '0.75rem',
    backgroundColor,
    color: '#fff',
    cursor,
    '&:hover': {
      backgroundColor: cursor === 'pointer' ? hoverColor : backgroundColor,
    },
    '&:disabled': {
      backgroundColor,
      color: '#fff',
      opacity: 0.7,
    },
  };
});

const LegendContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(3),
  justifyContent: 'center',
  marginTop: theme.spacing(3),
  flexWrap: 'wrap',
}));

const LegendItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const LegendBox = styled(Box)<{ color: string }>(({ color }) => ({
  width: '24px',
  height: '24px',
  backgroundColor: color,
  borderRadius: '4px',
}));

const SeatMap: React.FC<SeatMapProps> = ({ eventId, onBookingComplete }) => {
  const [seats, setSeats] = useState<SeatWithStatus[]>([]);
  const [groupedSeats, setGroupedSeats] = useState<SeatsGroupedByRow>({});
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Fetch seats
  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedSeats = await seatBookingService.getEventSeats(eventId);
      const seatsWithStatus = seatBookingService.transformSeatsWithStatus(
        fetchedSeats,
        selectedSeatIds
      );
      
      setSeats(seatsWithStatus);
      setGroupedSeats(seatBookingService.groupSeatsByRow(seatsWithStatus));
    } catch (err: any) {
      setError(err.message || 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedSeatIds]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Calculate total price when selection changes
  useEffect(() => {
    const price = seatBookingService.calculateTotalPrice(seats, selectedSeatIds);
    setTotalPrice(price);
  }, [seats, selectedSeatIds]);

  // Handle seat click
  const handleSeatClick = (seat: SeatWithStatus) => {
    if (seat.status === 'booked' || seat.status === 'held' || seat.status === 'blocked') {
      return; // Can't select unavailable seats
    }

    const newSelectedSeats = new Set(selectedSeatIds);
    if (selectedSeatIds.has(seat.seatId)) {
      newSelectedSeats.delete(seat.seatId);
    } else {
      newSelectedSeats.add(seat.seatId);
    }

    setSelectedSeatIds(newSelectedSeats);
  };

  // Handle proceed to payment
  const handleProceedToPayment = async () => {
    if (selectedSeatIds.size === 0) {
      setError('Please select at least one seat');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // First, hold the seats
      await seatBookingService.holdSeats({
        eventId,
        seatIds: Array.from(selectedSeatIds),
        holdDurationMinutes: 5,
      });

      // Show confirmation dialog
      setConfirmDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to hold seats');
    } finally {
      setProcessing(false);
    }
  };

  // Handle payment confirmation
  const handleConfirmBooking = async () => {
    try {
      setProcessing(true);

      // TODO: Integrate with your payment gateway (Stripe, PayPal, etc.)
      // For now, simulate payment
      const paymentId = `PAYMENT_${Date.now()}`;

      // Confirm booking
      const result = await seatBookingService.confirmBooking({
        eventId,
        seatIds: Array.from(selectedSeatIds),
        paymentId,
        paymentMethod: 'STRIPE',
      });

      setConfirmDialogOpen(false);
      
      if (result.success && result.bookingReference) {
        onBookingComplete?.(result.bookingReference);
      }

      // Reset selection
      setSelectedSeatIds(new Set());
      
      // Refresh seats
      await fetchSeats();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm booking');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const rowOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'];

  return (
    <Box>
      <SeatMapContainer>
        <StageBox>STAGE</StageBox>

        {/* Seat grid */}
        {rowOrder.map((row) => {
          const rowSeats = groupedSeats[row];
          if (!rowSeats) return null;

          return (
            <RowContainer key={row}>
              <RowLabel variant="h6">{row}</RowLabel>
              <Box display="flex" flexWrap="nowrap">
                {rowSeats.map((seat) => (
                  <SeatButton
                    key={seat.seatId}
                    status={seat.status}
                    seatType={seat.seatType}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.status === 'booked' || seat.status === 'held' || seat.status === 'blocked'}
                    size="small"
                  >
                    {seat.seatNumber}
                  </SeatButton>
                ))}
              </Box>
            </RowContainer>
          );
        })}
      </SeatMapContainer>

      {/* Legend */}
      <LegendContainer>
        <LegendItem>
          <LegendBox color="#4CAF50" />
          <Typography variant="body2">Available (Regular)</Typography>
        </LegendItem>
        <LegendItem>
          <LegendBox color="#2196F3" />
          <Typography variant="body2">Premium / Selected</Typography>
        </LegendItem>
        <LegendItem>
          <LegendBox color="#FF9800" />
          <Typography variant="body2">VIP / Held</Typography>
        </LegendItem>
        <LegendItem>
          <LegendBox color="#f44336" />
          <Typography variant="body2">Booked</Typography>
        </LegendItem>
        <LegendItem>
          <LegendBox color="#9E9E9E" />
          <Typography variant="body2">Blocked</Typography>
        </LegendItem>
      </LegendContainer>

      {/* Selection summary */}
      <Paper elevation={3} sx={{ mt: 3, p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">
              Selected Seats: {selectedSeatIds.size}
            </Typography>
            <Typography variant="h5" color="primary">
              Total: Rs {totalPrice.toFixed(2)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} textAlign="right">
            <Button
              variant="contained"
              size="large"
              disabled={selectedSeatIds.size === 0 || processing}
              onClick={handleProceedToPayment}
              startIcon={processing ? <CircularProgress size={20} /> : <EventSeatIcon />}
            >
              {processing ? 'Processing...' : 'Proceed to Payment'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => !processing && setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Booking</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You have selected {selectedSeatIds.size} seat(s).
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom>
            Total Amount: Rs {totalPrice.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your seats are held for 5 minutes. Please complete the payment to confirm your booking.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmBooking}
            disabled={processing}
            startIcon={processing && <CircularProgress size={20} />}
          >
            {processing ? 'Processing...' : 'Confirm & Pay'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeatMap;
