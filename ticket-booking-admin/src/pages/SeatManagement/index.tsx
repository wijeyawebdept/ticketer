import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Badge,
  Snackbar,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  EventSeat,
  Chair,
  Block,
  CheckCircle,
  Schedule,
  Wifi,
  WifiOff,
  Refresh,
  AdminPanelSettings
} from '@mui/icons-material';
import { Seat, SeatService, SeatAvailabilityStats } from '../../services/seat.service';
import { useSeatWebSocket } from '../../hooks/useSeatWebSocket';

interface SeatManagementProps {
  eventId?: string;
  isAdmin?: boolean;
}

const SeatManagement: React.FC<SeatManagementProps> = ({ 
  eventId: propEventId,
  isAdmin = false 
}) => {
  const [eventId, setEventId] = useState<string>(propEventId || '');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  // WebSocket integration
  const {
    isConnected: wsConnected,
    seats: wsSeats,
    stats,
    notifications,
    connect: connectWS,
    disconnect: disconnectWS,
    clearNotifications,
    connectionError
  } = useSeatWebSocket(seats);

  // Load seats for an event
  const loadSeats = async (targetEventId: string) => {
    if (!targetEventId) {
      setError('Please select an event');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const eventSeats = await SeatService.getSeatsByEvent(targetEventId);
      setSeats(eventSeats);
      
      // Connect to WebSocket for real-time updates
      if (!wsConnected) {
        await connectWS(targetEventId);
      }
      
      setSuccess(`Loaded ${eventSeats.length} seats for event`);
    } catch (err: any) {
      setError(err.message || 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

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
      await SeatService.reserveSeats({
        seatIds: selectedSeats
      });
      setSuccess(`Reserved ${selectedSeats.length} seats successfully`);
      setSelectedSeats([]);
    } catch (err: any) {
      setError(err.message || 'Failed to reserve seats');
    }
  };

  // Toggle seat blocking (admin only)
  const toggleSeatBlock = async (seatId: string, currentlyBlocked: boolean) => {
    if (!isAdmin && !adminMode) {
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
  const displaySeats = wsSeats.length > 0 ? wsSeats : seats;

  useEffect(() => {
    if (propEventId) {
      loadSeats(propEventId);
    }
  }, [propEventId]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎫 Seat Management
        <Badge color="secondary" variant="dot" invisible={!wsConnected}>
          <IconButton>
            {wsConnected ? <Wifi color="success" /> : <WifiOff color="error" />}
          </IconButton>
        </Badge>
      </Typography>

      {/* Connection Status */}
      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          WebSocket Error: {connectionError}
        </Alert>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <AdminPanelSettings color="primary" />
              <Typography variant="h6">Admin Controls</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={adminMode}
                    onChange={(e) => setAdminMode(e.target.checked)}
                  />
                }
                label="Admin Mode"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Event Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Event ID</InputLabel>
                <Select
                  value={eventId}
                  onChange={(e: SelectChangeEvent) => setEventId(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="">Select Event...</MenuItem>
                  {/* You can populate this with actual events */}
                  <MenuItem value="550e8400-e29b-41d4-a716-446655440001">Sample Event 1</MenuItem>
                  <MenuItem value="550e8400-e29b-41d4-a716-446655440002">Sample Event 2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                onClick={() => loadSeats(eventId)}
                disabled={loading || !eventId}
                startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                fullWidth
              >
                Load Seats
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Real-time Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Chip 
                  label={`Total: ${stats.totalSeats}`} 
                  icon={<Chair />} 
                  variant="outlined" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`Available: ${stats.availableSeats}`} 
                  icon={<EventSeat />} 
                  color="success" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`Booked: ${stats.bookedSeats}`} 
                  icon={<CheckCircle />} 
                  color="default" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`Held: ${stats.heldSeats}`} 
                  icon={<Schedule />} 
                  color="warning" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`Blocked: ${stats.blockedSeats}`} 
                  icon={<Block />} 
                  color="error" 
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {displaySeats.length > 0 && (
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
      )}

      {/* Seat Map */}
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
                                if (adminMode && (seat.isBlocked || seat.isAvailable)) {
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
      {displaySeats.length > 0 && (
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

      {/* Notifications */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={index}
          open={true}
          autoHideDuration={5000}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            severity={notification.type === 'HOLD_EXPIRED' ? 'warning' : 'info'}
            onClose={clearNotifications}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default SeatManagement;