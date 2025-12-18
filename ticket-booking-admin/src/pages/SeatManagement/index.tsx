import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Snackbar,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  EventSeat,
  Block,
  CheckCircle,
  Schedule,
  LockOpen,
  Lock,
  Cancel,
  HighlightOff
} from '@mui/icons-material';
import { Seat, SeatService } from '../../services/seat.service';
import { useSeatWebSocket } from '../../hooks/useSeatWebSocket';
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
  const [, setLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seatActionDialog, setSeatActionDialog] = useState<{ open: boolean; seat: Seat | null }>({ open: false, seat: null });
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Hold selected seats (temporary - for customers)
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
      setMultiSelectMode(false); // Exit multi-select mode
      
      // Reload seats to show updated status
      if (eventId) {
        await loadSeats(eventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to hold seats');
    }
  };

  // Permanent hold selected seats (admin only - until event ends)
  const permanentHoldSeats = async () => {
    if (!isAdmin) {
      setError('Admin privileges required');
      return;
    }

    if (selectedSeats.length === 0) {
      setError('Please select seats to hold permanently');
      return;
    }

    try {
      // Update local state immediately
      setSeats(prevSeats => prevSeats.map(seat => 
        selectedSeats.includes(seat.seatId)
          ? { ...seat, isPermanentHold: true, isAvailable: false }
          : seat
      ));

      await SeatService.permanentHoldSeats(selectedSeats);
      setSuccess(`Permanently held ${selectedSeats.length} seats until event ends`);
      setSelectedSeats([]);
      setMultiSelectMode(false); // Exit multi-select mode
      
      // Reload seats to show updated status
      if (eventId) {
        await loadSeats(eventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to permanently hold seats');
      // Reload seats to revert the optimistic update on error
      if (eventId) {
        await loadSeats(eventId);
      }
    }
  };

  // Release permanent hold (admin only)
  const releasePermanentHold = async (seatId: string) => {
    if (!isAdmin) {
      setError('Admin privileges required');
      return;
    }

    try {
      // Update local state immediately
      setSeats(prevSeats => prevSeats.map(seat => 
        seat.seatId === seatId
          ? { ...seat, isPermanentHold: false, isAvailable: true }
          : seat
      ));

      await SeatService.releasePermanentHold([seatId]);
      setSuccess('Permanent hold released successfully');
      
      // Reload seats to show updated status
      if (eventId) {
        await loadSeats(eventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to release permanent hold');
      // Reload seats to revert the optimistic update on error
      if (eventId) {
        await loadSeats(eventId);
      }
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
      setMultiSelectMode(false); // Exit multi-select mode
      
      // Reload seats to show updated status
      if (eventId) {
        await loadSeats(eventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reserve seats');
    }
  };

  // Unreserve seats (admin only)
  const unreserveSeats = async (seatId: string) => {
    if (!isAdmin) {
      setError('Admin privileges required');
      return;
    }

    try {
      // Update local state immediately
      setSeats(prevSeats => prevSeats.map(seat => 
        seat.seatId === seatId
          ? { ...seat, isAvailable: true }
          : seat
      ));

      await SeatService.unreserveSeats([seatId]);
      setSuccess('Seat unreserved successfully');
      
      // Reload seats to show updated status
      if (eventId) {
        await loadSeats(eventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unreserve seat');
      // Reload seats to revert the optimistic update on error
      if (eventId) {
        await loadSeats(eventId);
      }
    }
  };

  // Release temporary hold (admin only)
  const releaseTemporaryHold = async (seatId: string) => {
    try {
      // Update local state immediately
      setSeats(prevSeats => prevSeats.map(seat => 
        seat.seatId === seatId
          ? { ...seat, holdExpiresAt: undefined, isAvailable: true }
          : seat
      ));

      // Note: You may need to add a specific endpoint for this
      // For now, we'll use the unreserve endpoint
      await SeatService.unreserveSeats([seatId]);
      setSuccess('Temporary hold released successfully');
      
      // Reload seats to show updated status
      if (eventId) {
        await loadSeats(eventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to release temporary hold');
      // Reload seats to revert the optimistic update on error
      if (eventId) {
        await loadSeats(eventId);
      }
    }
  };

  // Toggle seat blocking (admin only)
  const toggleSeatBlock = async (seatId: string, currentlyBlocked: boolean) => {
    if (!isAdmin) {
      setError('Admin privileges required');
      return;
    }

    try {
      // Update local state immediately for instant feedback
      setSeats(prevSeats => prevSeats.map(seat => 
        seat.seatId === seatId 
          ? { ...seat, isBlocked: !currentlyBlocked, isAvailable: currentlyBlocked }
          : seat
      ));

      await SeatService.toggleSeatBlock(seatId, !currentlyBlocked);
      setSuccess(`Seat ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully`);
      
      // Reload seats to ensure consistency with backend
      if (eventId) {
        await loadSeats(eventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle seat block');
      // Reload seats to revert the optimistic update on error
      if (eventId) {
        await loadSeats(eventId);
      }
    }
  };

  // Handle seat click - auto-select and show action dialog
  const handleSeatClick = (seat: Seat) => {
    // In multi-select mode, just toggle selection without showing dialog
    if (multiSelectMode) {
      toggleSeatSelection(seat.seatId);
      return;
    }

    // Normal mode: auto-select the seat and show dialog
    if (!selectedSeats.includes(seat.seatId)) {
      setSelectedSeats(prev => [...prev, seat.seatId]);
    }
    setSeatActionDialog({ open: true, seat });
  };

  // Close seat action dialog
  const closeSeatActionDialog = () => {
    setSeatActionDialog({ open: false, seat: null });
  };

  // Get countdown string for held seats
  const getCountdown = (holdExpiresAt: string | null): string => {
    if (!holdExpiresAt) return '';
    
    const expiryTime = new Date(holdExpiresAt);
    const diff = expiryTime.getTime() - currentTime.getTime();
    
    if (diff <= 0) {
      return 'EXPIRED';
    }
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Handle seat action from dialog
  const handleSeatAction = async (action: string, seat: Seat) => {
    closeSeatActionDialog();

    switch (action) {
      case 'select':
        // Seat is already selected from handleSeatClick, just close dialog
        setSuccess('Seat selected. Use action buttons above to perform operations.');
        break;
      case 'select-multiple':
        // Enter multi-select mode
        setMultiSelectMode(true);
        setSuccess('Multi-select mode enabled. Click more seats to select them, then use action buttons above.');
        break;
        break;
      case 'block':
        await toggleSeatBlock(seat.seatId, false);
        break;
      case 'unblock':
        await toggleSeatBlock(seat.seatId, true);
        break;
      case 'permanent-hold':
        setSelectedSeats([seat.seatId]);
        await permanentHoldSeats();
        break;
      case 'temp-hold':
        setSelectedSeats([seat.seatId]);
        await holdSeats();
        break;
      case 'reserve':
        setSelectedSeats([seat.seatId]);
        await reserveSeats();
        break;
      case 'release-permanent-hold':
        await releasePermanentHold(seat.seatId);
        break;
      case 'unreserve':
        await unreserveSeats(seat.seatId);
        break;
      case 'release-hold':
        await releaseTemporaryHold(seat.seatId);
        break;
      default:
        break;
    }
  };

  // Get available actions for a seat based on role and status
  const getSeatActions = (seat: Seat) => {
    const actions: Array<{ label: string; action: string; icon: React.ReactNode; color?: string }> = [];

    if (isAdmin) {
      // Admin actions
      if (seat.isBlocked) {
        actions.push({ label: 'Unblock Seat', action: 'unblock', icon: <LockOpen />, color: 'success' });
      } else if (seat.isPermanentHold) {
        actions.push({ label: 'Release Permanent Hold', action: 'release-permanent-hold', icon: <Cancel />, color: 'warning' });
      } else if (!seat.isAvailable) {
        actions.push({ label: 'Unreserve Seat', action: 'unreserve', icon: <HighlightOff />, color: 'error' });
      } else if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) > new Date()) {
        actions.push({ label: 'Release Temporary Hold', action: 'release-hold', icon: <Cancel />, color: 'warning' });
        actions.push({ label: 'Block Seat', action: 'block', icon: <Block />, color: 'error' });
      } else if (seat.isAvailable) {
        // Multi-select mode
        actions.push({ label: 'Select Multiple', action: 'select-multiple', icon: <EventSeat />, color: 'primary' });
        // Direct actions
        actions.push({ label: 'Hold Permanently (Until Event Ends)', action: 'permanent-hold', icon: <Lock />, color: 'secondary' });
        actions.push({ label: 'Hold Seat (15 minutes)', action: 'temp-hold', icon: <Schedule />, color: 'warning' });
        actions.push({ label: 'Reserve Seat', action: 'reserve', icon: <CheckCircle />, color: 'success' });
        actions.push({ label: 'Block Seat', action: 'block', icon: <Block />, color: 'error' });
      }
    } else {
      // Regular user actions
      if (seat.isAvailable && !seat.isBlocked && !seat.isPermanentHold) {
        actions.push({ label: 'Select for Booking', action: 'select', icon: <EventSeat />, color: 'primary' });
      }
    }

    return actions;
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
    if (seat.isPermanentHold) return '#9c27b0'; // Purple for permanent hold
    if (!seat.isAvailable) return '#9e9e9e'; // Gray for booked
    if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) > new Date()) return '#ff9800'; // Orange for temporary hold
    if (selectedSeats.includes(seat.seatId)) return '#2196f3'; // Blue for selected
    return '#4caf50'; // Green for available
  };

  // Get seat icon based on status
  const getSeatIcon = (seat: Seat) => {
    if (seat.isBlocked) return <Block />;
    if (seat.isPermanentHold) return <Schedule />;
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
  }, [propEventId, loadSeats]);

  // Update current time every second for countdown and check for expired holds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check for expired holds
      displaySeats.forEach(seat => {
        if (seat.holdExpiresAt && !seat.isPermanentHold) {
          const expiryTime = new Date(seat.holdExpiresAt);
          const timeDiff = expiryTime.getTime() - now.getTime();
          
          // If hold just expired (within last second)
          if (timeDiff <= 0 && timeDiff > -1000) {
            setSuccess(`Seat ${seat.section}-${seat.rowNumber}-${seat.seatNumber} hold expired - now available`);
            // Reload seats to get updated status
            if (eventId) {
              loadSeats(eventId);
            }
          }
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [displaySeats, eventId, loadSeats]);

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
                {isAdmin && (
                  <Grid item>
                    <Button
                      variant="contained"
                      sx={{ backgroundColor: '#9c27b0', '&:hover': { backgroundColor: '#7b1fa2' } }}
                      onClick={permanentHoldSeats}
                      disabled={selectedSeats.length === 0}
                      startIcon={<Schedule />}
                    >
                      Hold Permanently (Until Event Ends)
                    </Button>
                  </Grid>
                )}
                <Grid item>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={holdSeats}
                    disabled={selectedSeats.length === 0}
                    startIcon={<Schedule />}
                  >
                    Hold Seats (15 minutes)
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
                    onClick={() => {
                      setSelectedSeats([]);
                      setMultiSelectMode(false);
                    }}
                    disabled={selectedSeats.length === 0}
                  >
                    Clear Selection
                  </Button>
                </Grid>
                {multiSelectMode && (
                  <Grid item>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setMultiSelectMode(false)}
                    >
                      Exit Multi-Select Mode
                    </Button>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Legend
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventSeat sx={{ color: '#4caf50' }} />
                  <Typography variant="body2">Available</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventSeat sx={{ color: '#2196f3' }} />
                  <Typography variant="body2">Selected</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: '#ff9800' }} />
                  <Typography variant="body2">Held (Customer - 15min)</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: '#9c27b0' }} />
                  <Typography variant="body2">Held (Admin - Permanent)</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: '#9e9e9e' }} />
                  <Typography variant="body2">Booked</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Block sx={{ color: '#f44336' }} />
                  <Typography variant="body2">Blocked</Typography>
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
                                title={
                                  <Box>
                                    <Typography variant="body2">Seat {seat.seatNumber} - LKR {seat.price}</Typography>
                                    {seat.isBlocked && <Typography variant="body2" color="error">BLOCKED</Typography>}
                                    {seat.isPermanentHold && <Typography variant="body2" color="secondary">PERMANENTLY HELD (Admin)</Typography>}
                                    {!seat.isAvailable && !seat.isPermanentHold && !seat.holdExpiresAt && <Typography variant="body2">BOOKED</Typography>}
                                    {seat.holdExpiresAt && !seat.isPermanentHold && (
                                      <Typography variant="body2" color="warning.main">
                                        HELD - {getCountdown(seat.holdExpiresAt)} remaining
                                      </Typography>
                                    )}
                                    {seat.isAvailable && !seat.isBlocked && !seat.isPermanentHold && !seat.holdExpiresAt && (
                                      <Typography variant="body2" color="success.main">AVAILABLE</Typography>
                                    )}
                                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Click to see available actions</Typography>
                                  </Box>
                                }
                              >
                                <IconButton
                                  onClick={() => handleSeatClick(seat)}
                                  sx={{
                                    color: getSeatColor(seat),
                                    border: selectedSeats.includes(seat.seatId) ? '2px solid #2196f3' : 'none',
                                    '&:hover': {
                                      backgroundColor: 'rgba(0,0,0,0.1)'
                                    }
                                  }}
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

      {/* Seat Action Dialog */}
      <Dialog open={seatActionDialog.open} onClose={closeSeatActionDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {seatActionDialog.seat && (
            <Box>
              <Typography variant="h6">
                Seat {seatActionDialog.seat.section} - Row {seatActionDialog.seat.rowNumber} - {seatActionDialog.seat.seatNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                LKR {seatActionDialog.seat.price}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {seatActionDialog.seat.isBlocked && 'Status: BLOCKED'}
                {seatActionDialog.seat.isPermanentHold && 'Status: PERMANENTLY HELD (Admin)'}
                {!seatActionDialog.seat.isAvailable && !seatActionDialog.seat.isPermanentHold && !seatActionDialog.seat.isBlocked && !seatActionDialog.seat.holdExpiresAt && 'Status: BOOKED'}
                {seatActionDialog.seat.holdExpiresAt && !seatActionDialog.seat.isPermanentHold && (
                  <Box component="span" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                    Status: HELD - {getCountdown(seatActionDialog.seat.holdExpiresAt)} remaining
                  </Box>
                )}
                {seatActionDialog.seat.isAvailable && !seatActionDialog.seat.isBlocked && !seatActionDialog.seat.isPermanentHold && !seatActionDialog.seat.holdExpiresAt && 'Status: AVAILABLE'}
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {seatActionDialog.seat && (
            <List>
              {getSeatActions(seatActionDialog.seat).length > 0 ? (
                getSeatActions(seatActionDialog.seat).map((actionItem, index) => (
                  <React.Fragment key={actionItem.action}>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleSeatAction(actionItem.action, seatActionDialog.seat!)}>
                        <ListItemIcon sx={{ color: actionItem.color ? `${actionItem.color}.main` : 'inherit' }}>
                          {actionItem.icon}
                        </ListItemIcon>
                        <ListItemText primary={actionItem.label} />
                      </ListItemButton>
                    </ListItem>
                    {index < getSeatActions(seatActionDialog.seat!).length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText 
                    primary="No actions available" 
                    secondary="This seat cannot be modified in its current state"
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSeatActionDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeatManagement;