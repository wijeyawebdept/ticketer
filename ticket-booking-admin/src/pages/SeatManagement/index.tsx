import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Badge,
  Snackbar,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  EventSeat,
  Block,
  CheckCircle,
  Schedule,
  Wifi,
  WifiOff,
  Refresh,
  AdminPanelSettings
} from '@mui/icons-material';
import { Seat, SeatService } from '../../services/seat.service';
import { useSeatWebSocket } from '../../hooks/useSeatWebSocket';
import EventService from '../../services/event.service';
import { Event } from '../../types';
import EventDropdown from '../../components/EventDropdown';

interface SeatManagementProps {
  eventId?: string;
  isAdmin?: boolean;
}

const SeatManagement: React.FC<SeatManagementProps> = ({ 
  eventId: propEventId,
  isAdmin = false 
}) => {
  const [eventId, setEventId] = useState<string>(propEventId || '');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // WebSocket integration
  const {
    isConnected: wsConnected,
    seats: wsSeats
  } = useSeatWebSocket(eventId || '');

  // Handle event selection from dropdown
  const handleEventChange = (event: Event | null) => {
    setSelectedEvent(event);
    if (event) {
      setEventId(event.id);
      loadSeats(event.id);
    } else {
      setEventId('');
      setSeats([]);
    }
  };

  // Load seats for an event
  const loadSeats = useCallback(async (targetEventId: string) => {
    if (!targetEventId) {
      setError('Please select an event');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, try to get existing seats
      let eventSeats = await SeatService.getSeatsByEvent(targetEventId);
      
      // If no seats exist, generate them from the venue layout
      if (eventSeats.length === 0) {
        if (selectedEvent && selectedEvent.venue) {
          setSuccess('No seats found. Generating seats from venue layout...');
          await SeatService.generateSeatsForEvent(selectedEvent.venue.id, targetEventId);
          // Fetch the newly generated seats
          eventSeats = await SeatService.getSeatsByEvent(targetEventId);
        } else {
          setError('Cannot generate seats: Event does not have a venue assigned');
          return;
        }
      }
      
      setSeats(eventSeats);
      setSuccess(`Loaded ${eventSeats.length} seats for event`);
    } catch (err: any) {
      setError(err.message || 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  // Hold selected seats
  const holdSeats = async () => {
    if (selectedSeats.length === 0) {
      setError('Please select seats to hold');
      return;
    }

    try {
      await SeatService.holdSeats({
        seatIds: selectedSeats,
        holdDurationMinutes: 15
      });
      setSuccess(`Held ${selectedSeats.length} seats for 15 minutes`);
      setSelectedSeats([]);
    } catch (err: any) {
      setError(err.message || 'Failed to hold seats');
    }
  };

  // Reserve selected seats
  const reserveSeats = async () => {
    if (selectedSeats.length === 0) {
      setError('Please select seats to reserve');
      return;
    }

    try {
      await SeatService.reserveSeats(selectedSeats);
      setSuccess(`Reserved ${selectedSeats.length} seats successfully`);
      setSelectedSeats([]);
    } catch (err: any) {
      setError(err.message || 'Failed to reserve seats');
    }
  };

  // Toggle seat blocking (admin only)
  const toggleSeatBlock = async (seatId: string, currentlyBlocked: boolean) => {
    if (!isAdmin) {
      setError('Admin privileges required');
      return;
    }

    try {
      await SeatService.toggleSeatBlock(seatId, !currentlyBlocked);
      setSuccess(`Seat ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle seat block');
    }
  };

  // Toggle seat selection
  const toggleSeatSelection = (seatId: string) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  // Get seat color based on status
  const getSeatColor = (seat: Seat): string => {
    if (seat.isBlocked) return '#f44336'; // Red for blocked
    if (!seat.isAvailable) return '#9e9e9e'; // Gray for booked
    if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) > new Date()) return '#ff9800'; // Orange for held
    if (selectedSeats.includes(seat.seatId)) return '#2196f3'; // Blue for selected
    return '#4caf50'; // Green for available
  };

  // Get seat icon based on status
  const getSeatIcon = (seat: Seat) => {
    if (seat.isBlocked) return <Block />;
    if (!seat.isAvailable) return <CheckCircle />;
    if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) > new Date()) return <Schedule />;
    return <EventSeat />;
  };

  // Group seats by section and row
  const groupedSeats = seats.reduce((acc, seat) => {
    const sectionKey = seat.section;
    if (!acc[sectionKey]) {
      acc[sectionKey] = {};
    }
    if (!acc[sectionKey][seat.rowNumber]) {
      acc[sectionKey][seat.rowNumber] = [];
    }
    acc[sectionKey][seat.rowNumber].push(seat);
    return acc;
  }, {} as Record<string, Record<string, Seat[]>>);

  // Use WebSocket seats if available
  const displaySeats = Object.keys(wsSeats).length > 0 ? 
    seats.map(seat => {
      const wsSeat = wsSeats[seat.seatId];
      if (wsSeat) {
        // Update seat status based on WebSocket data
        return {
          ...seat,
          isAvailable: wsSeat.status === 'available',
          isBlocked: wsSeat.status === 'unavailable'
        };
      }
      return seat;
    }) : seats;

  useEffect(() => {
    if (propEventId) {
      loadSeats(propEventId);
    }
  }, [propEventId]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Seat Management
      </Typography>

      {/* Connection Status */}
      {!wsConnected && eventId && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          WebSocket connection not established. Real-time updates unavailable.
        </Alert>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <AdminPanelSettings color="primary" />
              <Typography variant="h6">Admin Controls</Typography>
              <Typography variant="body2" color="text.secondary">
                Admin privileges are active. You can block/unblock seats by clicking on them.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Event Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Event
          </Typography>
          <EventDropdown
            value={selectedEvent}
            onChange={handleEventChange}
            placeholder="Search and select an event to manage seats..."
            showRefreshButton={true}
            onRefresh={() => {
              // The EventDropdown handles its own refresh
            }}
          />
        </CardContent>
      </Card>

      {/* Seat Map */}
      {displaySeats.length > 0 && (
        <>
          {/* Action Buttons */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions ({selectedSeats.length} seats selected)
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={holdSeats}
                    disabled={selectedSeats.length === 0}
                    startIcon={<Schedule />}
                  >
                    Hold Seats (15 min)
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={reserveSeats}
                    disabled={selectedSeats.length === 0}
                    startIcon={<CheckCircle />}
                  >
                    Reserve Seats
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    onClick={() => setSelectedSeats([])}
                    disabled={selectedSeats.length === 0}
                  >
                    Clear Selection
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {Object.keys(groupedSeats).map(section => (
            <Card key={section} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Section {section}
                </Typography>
                {Object.keys(groupedSeats[section])
                  .sort()
                  .map(row => (
                    <Box key={row} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Row {row}
                      </Typography>
                      <Grid container spacing={1}>
                        {groupedSeats[section][row]
                          .sort((a, b) => parseInt(a.seatNumber) - parseInt(b.seatNumber))
                          .map(seat => (
                            <Grid item key={seat.seatId}>
                              <Tooltip
                                title={`
                                  Seat ${seat.seatNumber} - LKR ${seat.price}
                                  ${seat.isBlocked ? ' (BLOCKED)' : ''}
                                  ${!seat.isAvailable ? ' (BOOKED)' : ''}
                                  ${seat.holdExpiresAt ? ` (HELD until ${new Date(seat.holdExpiresAt).toLocaleTimeString()})` : ''}
                                `}
                              >
                                <IconButton
                                  onClick={() => {
                                    if (isAdmin && (seat.isBlocked || seat.isAvailable)) {
                                      toggleSeatBlock(seat.seatId, seat.isBlocked);
                                    } else if (seat.isAvailable && !seat.isBlocked) {
                                      toggleSeatSelection(seat.seatId);
                                    }
                                  }}
                                  sx={{
                                    color: getSeatColor(seat),
                                    border: selectedSeats.includes(seat.seatId) ? '2px solid #2196f3' : 'none',
                                    '&:hover': {
                                      backgroundColor: 'rgba(0,0,0,0.1)'
                                    }
                                  }}
                                  disabled={
                                    Boolean((!seat.isAvailable && !seat.isBlocked) || 
                                    (seat.holdExpiresAt && new Date(seat.holdExpiresAt) > new Date() && !selectedSeats.includes(seat.seatId)))
                                  }
                                >
                                  {getSeatIcon(seat)}
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          ))}
                      </Grid>
                    </Box>
                  ))}
              </CardContent>
            </Card>
          ))}

          {/* Legend */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Legend
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EventSeat sx={{ color: '#4caf50' }} />
                    <Typography>Available</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EventSeat sx={{ color: '#2196f3' }} />
                    <Typography>Selected</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Schedule sx={{ color: '#ff9800' }} />
                    <Typography>Held</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle sx={{ color: '#9e9e9e' }} />
                    <Typography>Booked</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Block sx={{ color: '#f44336' }} />
                    <Typography>Blocked</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      {/* Success/Error Messages */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SeatManagement;