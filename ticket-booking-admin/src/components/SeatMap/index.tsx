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
  TextField,
  Card,
  CardContent,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { seatBookingService } from '../../services/seatBooking.service';
import type { SeatWithStatus, SeatsGroupedByRow, SeatStatus, SharedAreaDTO } from '../../types/seat';

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

const SeatButton = styled(Button)<SeatButtonProps>(({ theme, status }) => {
  // Unified colour scheme
  let backgroundColor = '#FFFFFF'; // available – white
  let textColor = '#333333';
  let hoverColor = '#e0e0e0';
  let cursor = 'pointer';
  let border = '1px solid rgba(0,0,0,0.2)';

  if (status === 'selected') {
    backgroundColor = '#FF0000'; // red – selected
    textColor = '#fff';
    hoverColor = '#cc0000';
    border = 'none';
  } else if (status === 'booked') {
    backgroundColor = '#FF0000'; // red – sold (same as selected)
    textColor = '#fff';
    cursor = 'not-allowed';
    border = 'none';
  } else if (status === 'held') {
    backgroundColor = '#FFD700'; // yellow – temporarily held
    textColor = '#333';
    cursor = 'not-allowed';
    border = 'none';
  } else if (status === 'blocked') {
    backgroundColor = '#6c757d'; // grey – locked
    textColor = '#fff';
    cursor = 'not-allowed';
    border = 'none';
  }

  return {
    minWidth: '45px',
    width: '45px',
    height: '45px',
    margin: theme.spacing(0.5),
    padding: 0,
    fontSize: '0.75rem',
    backgroundColor,
    color: textColor,
    cursor,
    border,
    '&:hover': {
      backgroundColor: cursor === 'pointer' ? hoverColor : backgroundColor,
    },
    '&:disabled': {
      backgroundColor,
      color: textColor,
      opacity: 0.85,
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

// Standing area card styled component
const StandingAreaCard = styled(Card)<{ selected?: boolean }>(({ theme, selected }) => ({
  borderRadius: theme.spacing(2),
  border: selected ? '3px solid #9c27b0' : '2px solid #e0e0e0',
  backgroundColor: selected ? '#f3e5f5' : '#fff',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: '#9c27b0',
    boxShadow: theme.shadows[4],
  },
}));

// Selected standing area tickets state
interface StandingAreaSelection {
  categoryName: string;
  price: number;
  count: number;
  sharedAreaNumber: number;
  availableCapacity: number;
}

const SeatMap: React.FC<SeatMapProps> = ({ eventId, onBookingComplete }) => {
  const [seats, setSeats] = useState<SeatWithStatus[]>([]);
  const [groupedSeats, setGroupedSeats] = useState<SeatsGroupedByRow>({});
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Standing/shared area state - using SharedAreaDTO from backend
  const [standingAreas, setStandingAreas] = useState<SharedAreaDTO[]>([]);
  const [standingAreaSelections, setStandingAreaSelections] = useState<Map<number, StandingAreaSelection>>(new Map());

  // Fetch seats and shared areas from venue-seats availability endpoint
  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch full availability including shared areas (eventId here is actually scheduleId)
      const availability = await seatBookingService.getSeatAvailabilityWithSharedAreas(eventId);
      
      
      // Transform SeatDTOs to SeatWithStatus using the new method
      const seatsWithStatus = seatBookingService.transformSeatDTOsWithStatus(
        availability.seats || [],
        selectedSeatIds
      );
      
      setSeats(seatsWithStatus);
      setGroupedSeats(seatBookingService.groupSeatsByRow(seatsWithStatus));
      
      // Set shared/standing areas from availability response
      if (availability.sharedAreas && availability.sharedAreas.length > 0) {
        setStandingAreas(availability.sharedAreas);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedSeatIds]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Calculate total price when selection changes (seats + standing areas)
  useEffect(() => {
    // Seat prices
    const seatPrice = seatBookingService.calculateTotalPrice(seats, selectedSeatIds);
    
    // Standing area prices
    let standingPrice = 0;
    standingAreaSelections.forEach((selection) => {
      standingPrice += selection.price * selection.count;
    });
    
    setTotalPrice(seatPrice + standingPrice);
  }, [seats, selectedSeatIds, standingAreaSelections]);

  // Handle standing area ticket count change
  const handleStandingAreaChange = (area: SharedAreaDTO, change: number) => {
    const areaNumber = area.sharedAreaNumber || 0;
    const currentSelection = standingAreaSelections.get(areaNumber);
    const currentCount = currentSelection?.count || 0;
    // Use availableTickets instead of capacity to limit selection
    const maxAvailable = area.availableTickets || area.capacity;
    const newCount = Math.max(0, Math.min(maxAvailable, currentCount + change));
    
    const newSelections = new Map(standingAreaSelections);
    if (newCount > 0) {
      newSelections.set(areaNumber, {
        categoryName: area.categoryName,
        price: area.price,
        count: newCount,
        sharedAreaNumber: areaNumber,
        availableCapacity: maxAvailable
      });
    } else {
      newSelections.delete(areaNumber);
    }
    setStandingAreaSelections(newSelections);
  };

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

      {/* Legend – unified */}
      <LegendContainer>
        <LegendItem>
          <LegendBox color="#FFFFFF" sx={{ border: '1px solid rgba(0,0,0,0.2)' }} />
          <Typography variant="body2">Available</Typography>
        </LegendItem>
        <LegendItem>
          <LegendBox color="#FF0000" />
          <Typography variant="body2">Sold / Selected</Typography>
        </LegendItem>
        <LegendItem>
          <LegendBox color="#6c757d" />
          <Typography variant="body2">Locked</Typography>
        </LegendItem>
        <LegendItem>
          <LegendBox color="#FFD700" />
          <Typography variant="body2">Temporarily Hold</Typography>
        </LegendItem>
      </LegendContainer>

      {/* Standing/Common Areas Section */}
      {standingAreas.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="secondary" />
            Standing/Common Areas
            <Chip label={`${standingAreas.length} Area${standingAreas.length > 1 ? 's' : ''}`} color="secondary" size="small" />
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select the number of standing tickets you want for each area. These are non-seated areas.
          </Typography>
          
          <Grid container spacing={2}>
            {standingAreas.map((area) => {
              const areaNumber = area.sharedAreaNumber || 0;
              const selection = standingAreaSelections.get(areaNumber);
              const selectedCount = selection?.count || 0;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={areaNumber}>
                  <StandingAreaCard selected={selectedCount > 0}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {area.categoryName}
                        </Typography>
                        <Chip 
                          label={`Area ${areaNumber}`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Standing/common area - no assigned seats
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Typography variant="h6" color="secondary">
                          Rs {area.price.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Available: {area.availableTickets} / {area.capacity}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleStandingAreaChange(area, -1)}
                          disabled={selectedCount === 0}
                          sx={{ minWidth: 40 }}
                        >
                          <RemoveIcon />
                        </Button>
                        <TextField
                          value={selectedCount}
                          size="small"
                          inputProps={{ 
                            style: { textAlign: 'center', width: '50px' },
                            readOnly: true
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleStandingAreaChange(area, 1)}
                          disabled={selectedCount >= (area.availableTickets || 0)}
                          sx={{ minWidth: 40 }}
                        >
                          <AddIcon />
                        </Button>
                      </Box>
                      
                      {selectedCount > 0 && (
                        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'secondary.main', fontWeight: 'bold' }}>
                          Subtotal: Rs {(area.price * selectedCount).toFixed(2)}
                        </Typography>
                      )}
                    </CardContent>
                  </StandingAreaCard>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Selection summary */}
      <Paper elevation={3} sx={{ mt: 3, p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">
              Selected: {selectedSeatIds.size} seat(s)
              {Array.from(standingAreaSelections.values()).reduce((sum, s) => sum + s.count, 0) > 0 && (
                <span> + {Array.from(standingAreaSelections.values()).reduce((sum, s) => sum + s.count, 0)} standing</span>
              )}
            </Typography>
            <Typography variant="h5" color="primary">
              Total: Rs {totalPrice.toFixed(2)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} textAlign="right">
            <Button
              variant="contained"
              size="large"
              disabled={(selectedSeatIds.size === 0 && standingAreaSelections.size === 0) || processing}
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
          {selectedSeatIds.size > 0 && (
            <Typography gutterBottom>
               Seats: {selectedSeatIds.size} seat(s)
            </Typography>
          )}
          {standingAreaSelections.size > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography gutterBottom>
                 Standing Tickets:
              </Typography>
              {Array.from(standingAreaSelections.values()).map((selection) => (
                <Typography key={selection.sharedAreaNumber} variant="body2" sx={{ pl: 2 }}>
                  • {selection.categoryName}: {selection.count} ticket(s) @ Rs {selection.price.toFixed(2)}
                </Typography>
              ))}
            </Box>
          )}
          <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
            Total Amount: Rs {totalPrice.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your selection is held for 5 minutes. Please complete the payment to confirm your booking.
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
