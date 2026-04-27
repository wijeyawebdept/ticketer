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
  Divider,
  Chip,
  Badge,
  Paper,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  EventSeat,
  Block,
  CheckCircle,
  Schedule,
  LockOpen,
  Lock,
  Cancel,
  HighlightOff,
  Info,
  Star,
  StarBorder,
  Accessible,
  AccessibleForward,
  SelectAll,
  Refresh,
  ExpandMore,
  ExpandLess,
  Person,
  AccessTime,
  Wifi,
  WifiOff,
  NotificationsActive,
  Delete,
  RemoveCircle,
  BookmarkRemove
} from '@mui/icons-material';
import { Seat, SeatService } from '../../services/seat.service';
import { venueSeatService, VenueSeat, SeatDTO } from '../../services/venueSeatService';
import { useSeatWebSocket, SeatActivityLog } from '../../hooks/useSeatWebSocket';
import { Event, EventSchedule } from '../../types';
import EventDropdown from '../../components/EventDropdown';
import EventScheduleService from '../../services/eventSchedule.service';

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
  const [selectedSchedule, setSelectedSchedule] = useState<EventSchedule | null>(null);
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [venueSeats, setVenueSeats] = useState<VenueSeat[]>([]);
  const [seatAvailability, setSeatAvailability] = useState<SeatDTO[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [viewMode, setViewMode] = useState<'event' | 'venue'>('venue'); // Default to venue view
  const [, setLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seatActionDialog, setSeatActionDialog] = useState<{ open: boolean; seat: Seat | VenueSeat | SeatDTO | null }>({ open: false, seat: null });
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showActivityPanel, setShowActivityPanel] = useState(true);

  // Type guards for seat types
  const isVenueSeat = (seat: Seat | VenueSeat | SeatDTO): seat is VenueSeat => {
    return 'category' in seat && typeof seat.category === 'object' && !('status' in seat);
  };

  const isSeatDTO = (seat: Seat | VenueSeat | SeatDTO): seat is SeatDTO => {
    return 'status' in seat && 'categoryName' in seat;
  };

  const isSeat = (seat: Seat | VenueSeat | SeatDTO): seat is Seat => {
    return 'eventId' in seat && 'venueId' in seat && !('category' in seat);
  };

  // WebSocket integration with real-time activity
  const {
    isConnected: wsConnected,
    connectionError: wsError,
    seats: wsSeats,
    activityLog,
    stats: wsStats,
    clearActivityLog,
    reconnect: wsReconnect
  } = useSeatWebSocket(selectedSchedule?.scheduleId || eventId || '');

  // Load schedules when event is selected
  const loadSchedules = useCallback(async (event: Event) => {
    try {
      const eventSchedules = await EventScheduleService.getSchedulesForEvent(event.id);
      setSchedules(eventSchedules);
      // Auto-select first schedule if available
      if (eventSchedules.length > 0) {
        setSelectedSchedule(eventSchedules[0]);
      }
    } catch (err: any) {
      setSchedules([]);
    }
  }, []);

  // Load seat availability for a specific schedule
  const loadSeatAvailability = useCallback(async (scheduleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await venueSeatService.getSeatAvailability(scheduleId);
      setSeatAvailability(response.seats);
      setSuccess(`Loaded ${response.seats.length} seats (${response.bookedSeats} booked, ${response.heldSeats} held)`);
    } catch (err: any) {
      setError(err.message || 'Failed to load seat availability');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle event selection from dropdown
  const handleEventChange = async (event: Event | null) => {
    setSelectedEvent(event);
    setSelectedSeats([]);
    setSelectedSchedule(null);
    setSchedules([]);
    setSeatAvailability([]);
    if (event) {
      setEventId(event.id);
      loadVenueSeats(event);
      await loadSchedules(event);
    } else {
      setEventId('');
      setSeats([]);
      setVenueSeats([]);
    }
  };

  // Handle schedule selection
  const handleScheduleChange = (schedule: EventSchedule | null) => {
    setSelectedSchedule(schedule);
    if (schedule) {
      loadSeatAvailability(schedule.scheduleId);
    } else {
      setSeatAvailability([]);
    }
  };

  // Load venue seats for an event's venue
  const loadVenueSeats = useCallback(async (event: Event) => {
    if (!event.venue?.id) {
      setError('Event does not have a venue assigned');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const venueLayout = await venueSeatService.getVenueLayoutByVenueId(event.venue.id);
      setVenueSeats(venueLayout);
      setSuccess(`Loaded ${venueLayout.length} venue seats for ${event.venue.name}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load venue seats');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load event-specific seats (legacy method)
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

  // Get seat availability info for a venue seat (when schedule is selected)
  const getSeatAvailabilityInfo = (seatId: string): SeatDTO | undefined => {
    if (!selectedSchedule || seatAvailability.length === 0) return undefined;
    return seatAvailability.find(s => s.seatId === seatId);
  };

  // Admin action to release a seat hold
  const handleAdminReleaseHold = async (seatId: string) => {
    if (!selectedSchedule) return;
    try {
      await venueSeatService.adminReleaseHold(selectedSchedule.scheduleId, seatId);
      setSuccess(`Hold released for seat ${seatId}`);
      closeSeatActionDialog();
      loadSeatAvailability(selectedSchedule.scheduleId);
    } catch (err: any) {
      setError(err.message || 'Failed to release hold');
    }
  };

  // Admin action to unreserve a booked seat
  const handleAdminUnreserveSeat = async (seatId: string) => {
    if (!selectedSchedule) return;
    try {
      await venueSeatService.adminUnreserveSeat(selectedSchedule.scheduleId, seatId);
      setSuccess(`Booking removed for seat ${seatId}`);
      closeSeatActionDialog();
      loadSeatAvailability(selectedSchedule.scheduleId);
    } catch (err: any) {
      setError(err.message || 'Failed to unreserve seat');
    }
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
          isAvailable: wsSeat.isAvailable,
          isBlocked: wsSeat.isBlocked
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Seat Management
        </Typography>
        {eventId && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={wsConnected ? <Wifi /> : <WifiOff />}
              label={wsConnected ? 'Live' : 'Offline'}
              color={wsConnected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
            {!wsConnected && (
              <Button size="small" startIcon={<Refresh />} onClick={wsReconnect}>
                Reconnect
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Connection Error Alert */}
      {wsError && eventId && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={wsReconnect}>
            Retry
          </Button>
        }>
          {wsError}
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

          {/* Schedule Selector */}
          {selectedEvent && schedules.length > 0 && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="schedule-select-label">Select Schedule</InputLabel>
              <Select
                labelId="schedule-select-label"
                value={selectedSchedule?.scheduleId || ''}
                label="Select Schedule"
                onChange={(e) => {
                  const schedule = schedules.find(s => s.scheduleId === e.target.value);
                  handleScheduleChange(schedule || null);
                }}
              >
                {schedules.map((schedule) => (
                  <MenuItem key={schedule.scheduleId} value={schedule.scheduleId}>
                    {schedule.scheduleDate} at {schedule.startTime} - {schedule.endTime}
                    {' '}({schedule.status}) - {schedule.availableSeats}/{schedule.capacity} available
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </CardContent>
      </Card>

      {/* Live Monitoring Banner (when schedule is selected) */}
      {selectedSchedule && (
        <Alert 
          severity="info" 
          icon={<NotificationsActive />}
          sx={{ 
            mb: 3, 
            backgroundColor: '#e3f2fd',
            border: '2px solid #2196f3',
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              startIcon={<Refresh />}
              onClick={() => {
                if (selectedSchedule) {
                  loadSeatAvailability(selectedSchedule.scheduleId);
                  setSuccess('Refreshed seat availability');
                }
              }}
            >
              Refresh
            </Button>
          }
        >
          <Typography variant="body2" fontWeight="bold" gutterBottom>
             LIVE MONITORING: Real-time Customer Seat Selection
          </Typography>
          <Typography variant="body2">
            You are viewing live seat availability for this schedule. Orange seats with  icon are being held by customers during their booking process. 
            Red seats ✓ are confirmed bookings (sold tickets).
          </Typography>
        </Alert>
      )}

      {/* Venue Information */}
      {selectedEvent && selectedEvent.venue && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Venue: {selectedEvent.venue.name}
              {selectedSchedule && (
                <Chip 
                  label={`${selectedSchedule.scheduleDate} ${selectedSchedule.startTime}`}
                  color="primary"
                  size="small"
                  sx={{ ml: 2 }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedEvent.venue.address}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Total Venue Seats: {venueSeats.length}
              {selectedSchedule && seatAvailability.length > 0 && (
                <> | Schedule Seats: {seatAvailability.length}</>
              )}
            </Typography>
            {/* Comprehensive Seat Statistics (when schedule is selected) */}
            {selectedSchedule && seatAvailability.length > 0 && (
              <Paper elevation={2} sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                   Seat Statistics for This Schedule
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight="bold" color="success.main">
                        {seatAvailability.filter(s => s.status === 'AVAILABLE').length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Available
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight="bold" color="error.main">
                        {seatAvailability.filter(s => s.status === 'BOOKED').length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sold (Booked)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight="bold" color="warning.main">
                        {seatAvailability.filter(s => s.status === 'HELD').length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Held (Customers)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#9e9e9e' }}>
                        {seatAvailability.filter(s => s.status === 'LOCKED').length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Locked
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#ffc107' }}>
                        {seatAvailability.filter(s => s.status === 'VIP_RESERVED').length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        VIP Reserved
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight="bold" color="primary.main">
                        {seatAvailability.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Seats
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                {/* Customer Held Seats Details */}
                {seatAvailability.filter(s => s.status === 'HELD').length > 0 && (
                  <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
                    <Typography variant="body2" fontWeight="bold" color="warning.dark" gutterBottom>
                       Customer-Held Seats (In Booking Process):
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {seatAvailability
                        .filter(s => s.status === 'HELD')
                        .slice(0, 10)
                        .map(seat => (
                          <Chip
                            key={seat.seatId}
                            size="small"
                            label={`${seat.section}-${seat.rowLabel}${seat.seatNumber} (User #${seat.heldByUserId})`}
                            color="warning"
                            variant="outlined"
                            onClick={() => setSeatActionDialog({ open: true, seat })}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      {seatAvailability.filter(s => s.status === 'HELD').length > 10 && (
                        <Chip
                          size="small"
                          label={`+${seatAvailability.filter(s => s.status === 'HELD').length - 10} more`}
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                )}
              </Paper>
            )}
            {/* WebSocket Real-time Stats */}
            {wsStats && !selectedSchedule && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`Available: ${wsStats.availableSeats}`} color="success" size="small" />
                <Chip label={`Booked: ${wsStats.bookedSeats}`} color="default" size="small" />
                <Chip label={`Held: ${wsStats.heldSeats}`} color="warning" size="small" />
                <Chip label={`Blocked: ${wsStats.blockedSeats}`} color="error" size="small" />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Real-time Activity Panel */}
      {selectedEvent && wsConnected && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={activityLog.length} color="primary" max={99}>
                  <NotificationsActive color="action" />
                </Badge>
                <Typography variant="h6">
                  Real-time Activity
                </Typography>
              </Box>
              <Box>
                <IconButton size="small" onClick={() => setShowActivityPanel(!showActivityPanel)}>
                  {showActivityPanel ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
                {activityLog.length > 0 && (
                  <IconButton size="small" onClick={clearActivityLog} title="Clear activity log">
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
            <Collapse in={showActivityPanel}>
              {activityLog.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No activity yet. Seat changes will appear here in real-time.
                </Typography>
              ) : (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    maxHeight: 200, 
                    overflow: 'auto', 
                    backgroundColor: '#fafafa',
                    '& > *:not(:last-child)': { borderBottom: '1px solid #eee' }
                  }}
                >
                  {activityLog.map((activity: SeatActivityLog) => (
                    <Box 
                      key={activity.id} 
                      sx={{ 
                        p: 1.5, 
                        display: 'flex', 
                        alignItems: 'flex-start',
                        gap: 1.5,
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                    >
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        mt: 0.75,
                        backgroundColor: 
                          activity.action === 'BOOKED' ? '#4caf50' :
                          activity.action === 'HELD' ? '#ff9800' :
                          activity.action === 'RELEASED' ? '#2196f3' :
                          '#9e9e9e'
                      }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {activity.message}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          {activity.userEmail && (
                            <Chip 
                              icon={<Person sx={{ fontSize: '0.875rem !important' }} />} 
                              label={activity.userEmail} 
                              size="small" 
                              variant="outlined"
                              sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: '0.75rem' }} />
                            {activity.timestamp.toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              )}
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Venue Seat Map */}
      {venueSeats.length > 0 && (
        <>
          {/* Multi-Select Mode Banner */}
          {multiSelectMode && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => setMultiSelectMode(false)}
                >
                  Exit Multi-Select
                </Button>
              }
            >
              <strong>Multi-Select Mode Active:</strong> Click on seats to select/deselect them, then use the bulk action buttons below.
            </Alert>
          )}

          {/* Venue Seat Legend */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Venue Seat Legend
                </Typography>
                {isAdmin && !multiSelectMode && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SelectAll />}
                    onClick={() => setMultiSelectMode(true)}
                  >
                    Enable Multi-Select
                  </Button>
                )}
              </Box>
              <Grid container spacing={2} alignItems="center">
                {Array.from(new Set(venueSeats.map(s => s.category.categoryName))).map(categoryName => {
                  const seat = venueSeats.find(s => s.category.categoryName === categoryName);
                  return (
                    <Grid item key={categoryName} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          backgroundColor: seat?.category.colorCode || '#4caf50',
                        }}
                      />
                      <Typography variant="body2">
                        {categoryName} - LKR {seat?.category.basePrice?.toLocaleString()}
                      </Typography>
                    </Grid>
                  );
                })}
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      border: '3px solid #2196f3',
                      backgroundColor: 'transparent',
                    }}
                  />
                  <Typography variant="body2">Selected</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: '#9e9e9e',
                    }}
                  />
                  <Typography variant="body2">Locked</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: '#ffc107',
                    }}
                  />
                  <Typography variant="body2">VIP Reserved</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: '#00bcd4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.8rem',
                    }}
                  >
                
                  </Box>
                  <Typography variant="body2">Accessible</Typography>
                </Grid>
                {/* Show HELD and BOOKED legend only when schedule is selected */}
                {selectedSchedule && (
                  <>
                    <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          backgroundColor: '#ff9800',
                          border: '2px dashed #e65100',
                          position: 'relative',
                          '&::after': {
                            content: '"👤"',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '10px',
                          }
                        }}
                      />
                      <Typography variant="body2" fontWeight="bold" color="warning.dark">
                        Held by Customer (In Booking)
                      </Typography>
                    </Grid>
                    <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          backgroundColor: '#f44336',
                          border: '2px solid #d32f2f',
                        }}
                      />
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        Booked (Sold)
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Venue Seat Grid by Section */}
          {Object.entries(
            venueSeats.reduce((acc, seat) => {
              if (!acc[seat.section]) {
                acc[seat.section] = {};
              }
              if (!acc[seat.section][seat.rowLabel]) {
                acc[seat.section][seat.rowLabel] = [];
              }
              acc[seat.section][seat.rowLabel].push(seat);
              return acc;
            }, {} as Record<string, Record<string, VenueSeat[]>>)
          ).map(([section, rows]) => (
            <Card key={section} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Section: {section}
                </Typography>
                {Object.entries(rows)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([rowLabel, rowSeats]) => (
                    <Box key={rowLabel} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Row {rowLabel}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {rowSeats
                          .sort((a, b) => a.seatNumber - b.seatNumber)
                          .map(seat => {
                            const isSelected = selectedSeats.includes(seat.seatId);
                            const isLocked = seat.notes?.toLowerCase().includes('[locked]');
                            const isVIP = seat.notes?.toLowerCase().includes('[vip]');
                            const availabilityInfo = getSeatAvailabilityInfo(seat.seatId);
                            const isHeld = availabilityInfo?.status === 'HELD';
                            const isBooked = availabilityInfo?.status === 'BOOKED';
                            
                            // Determine background color based on status
                            const getBackgroundColor = () => {
                              if (isBooked) return '#f44336'; // Red for booked
                              if (isHeld) return '#ff9800'; // Orange for held
                              if (isLocked || availabilityInfo?.status === 'LOCKED') return '#9e9e9e'; // Grey for locked
                              if (isVIP || availabilityInfo?.status === 'VIP_RESERVED') return '#ffc107'; // Gold for VIP
                              if (seat.isAccessible) return '#00bcd4'; // Cyan for accessible
                              return seat.category.colorCode || '#4caf50'; // Default category color
                            };
                            
                            return (
                              <Tooltip
                                key={seat.seatId}
                                title={
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {seat.seatId}
                                    </Typography>
                                    <Typography variant="body2">
                                      Category: {seat.category.categoryName}
                                    </Typography>
                                    <Typography variant="body2">
                                      Price: LKR {seat.category.basePrice?.toLocaleString()}
                                    </Typography>
                                    {/* Show availability status when schedule is selected */}
                                    {availabilityInfo && (
                                      <>
                                        <Typography
                                          variant="body2"
                                          fontWeight="bold"
                                          color={
                                            isBooked ? 'error.main' :
                                            isHeld ? 'warning.main' :
                                            'success.main'
                                          }
                                        >
                                          Status: {availabilityInfo.status}
                                        </Typography>
                                        {isHeld && availabilityInfo.heldByUserId && (
                                          <>
                                            <Typography variant="body2" fontWeight="bold" color="warning.main" sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,152,0,0.3)' }}>
                                              👤 CUSTOMER SELECTING THIS SEAT
                                            </Typography>
                                            <Typography variant="body2" color="warning.main">
                                              User #{availabilityInfo.heldByUserId}
                                              {availabilityInfo.heldByUserName && ` - ${availabilityInfo.heldByUserName}`}
                                              {availabilityInfo.heldByUserEmail && ` (${availabilityInfo.heldByUserEmail})`}
                                            </Typography>
                                            {availabilityInfo.holdExpiresAt && (
                                              <Typography variant="body2" color="warning.main">
                                                ⏱ Expires in: {getCountdown(availabilityInfo.holdExpiresAt)}
                                              </Typography>
                                            )}
                                            {availabilityInfo.isPermanentHold && (
                                              <Typography variant="body2" color="error.main">
                                                ⚠ Permanent Hold (Admin)
                                              </Typography>
                                            )}
                                          </>
                                        )}
                                        {isBooked && (
                                          <>
                                            <Typography variant="body2" fontWeight="bold" color="error.main" sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(244,67,54,0.3)' }}>
                                              ✓ SOLD - BOOKING CONFIRMED
                                            </Typography>
                                            {availabilityInfo.bookingReference && (
                                              <Typography variant="body2" color="error.main">
                                                Booking Ref: {availabilityInfo.bookingReference}
                                              </Typography>
                                            )}
                                            {availabilityInfo.bookedAt && (
                                              <Typography variant="body2" color="error.main">
                                                Booked: {new Date(availabilityInfo.bookedAt).toLocaleString()}
                                              </Typography>
                                            )}
                                            <Typography variant="body2" color="error.main">
                                              Cannot be modified by customers
                                            </Typography>
                                          </>
                                        )}
                                      </>
                                    )}
                                    {seat.isAccessible && (
                                      <Typography variant="body2" color="info.main">
                                         Wheelchair Accessible
                                      </Typography>
                                    )}
                                    {seat.isAisleSeat && (
                                      <Typography variant="body2">Aisle Seat</Typography>
                                    )}
                                    {isLocked && (
                                      <Typography variant="body2" color="error"> LOCKED</Typography>
                                    )}
                                    {isVIP && (
                                      <Typography variant="body2" color="secondary"> VIP Reserved</Typography>
                                    )}
                                    {seat.notes && !isLocked && !isVIP && (
                                      <Typography variant="body2" color="text.secondary">
                                        Note: {seat.notes}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              >
                                <IconButton
                                  onClick={() => {
                                    // In multi-select mode, just toggle selection
                                    if (multiSelectMode) {
                                      if (selectedSeats.includes(seat.seatId)) {
                                        setSelectedSeats(prev => prev.filter(id => id !== seat.seatId));
                                      } else {
                                        setSelectedSeats(prev => [...prev, seat.seatId]);
                                      }
                                      return;
                                    }
                                    // Normal mode: show action dialog (with availability info if schedule selected)
                                    if (availabilityInfo) {
                                      setSeatActionDialog({ open: true, seat: availabilityInfo });
                                    } else {
                                      setSeatActionDialog({ open: true, seat });
                                    }
                                  }}
                                  sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1,
                                    backgroundColor: getBackgroundColor(),
                                    border: isSelected 
                                      ? '3px solid #2196f3' 
                                      : isHeld 
                                        ? '2px dashed #ff9800'
                                        : isBooked
                                          ? '2px solid #f44336'
                                          : 'none',
                                    color: (isVIP || availabilityInfo?.status === 'VIP_RESERVED') ? '#000' : 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    position: 'relative',
                                    '&:hover': {
                                      opacity: 0.8,
                                    },
                                    // Show indicator for held/booked seats
                                    '&::after': (isHeld || isBooked) ? {
                                      content: isBooked ? '"✓"' : '"👤"',
                                      position: 'absolute',
                                      top: -4,
                                      right: -4,
                                      fontSize: isBooked ? '0.6rem' : '0.7rem',
                                      backgroundColor: isBooked ? '#d32f2f' : '#e65100',
                                      borderRadius: '50%',
                                      width: 16,
                                      height: 16,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid white',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    } : {},
                                  }}
                                >
                                  {seat.isAccessible ? '♿' : seat.seatNumber}
                                </IconButton>
                              </Tooltip>
                            );
                          })}
                      </Box>
                    </Box>
                  ))}
              </CardContent>
            </Card>
          ))}

          {/* Selected Seats Actions */}
          {selectedSeats.length > 0 && (
            <Card sx={{ mb: 3, position: 'sticky', bottom: 16, zIndex: 10 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selected Seats ({selectedSeats.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {selectedSeats.map(seatId => (
                    <Chip
                      key={seatId}
                      label={seatId}
                      onDelete={() => setSelectedSeats(prev => prev.filter(id => id !== seatId))}
                      color="primary"
                      size="small"
                    />
                  ))}
                </Box>
                <Grid container spacing={2}>
                  {isAdmin && (
                    <>
                      <Grid item>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={async () => {
                            try {
                              for (const seatId of selectedSeats) {
                                await venueSeatService.lockSeat(seatId);
                              }
                              setSuccess(`Locked ${selectedSeats.length} seats`);
                              setSelectedSeats([]);
                              setMultiSelectMode(false);
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to lock seats');
                            }
                          }}
                          startIcon={<Lock />}
                        >
                          Lock Seats
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={async () => {
                            try {
                              for (const seatId of selectedSeats) {
                                await venueSeatService.unlockSeat(seatId);
                              }
                              setSuccess(`Unlocked ${selectedSeats.length} seats`);
                              setSelectedSeats([]);
                              setMultiSelectMode(false);
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to unlock seats');
                            }
                          }}
                          startIcon={<LockOpen />}
                        >
                          Unlock Seats
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={async () => {
                            try {
                              for (const seatId of selectedSeats) {
                                await venueSeatService.reserveForVIP(seatId);
                              }
                              setSuccess(`Reserved ${selectedSeats.length} seats for VIP`);
                              setSelectedSeats([]);
                              setMultiSelectMode(false);
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to reserve for VIP');
                            }
                          }}
                          startIcon={<Star />}
                        >
                          Reserve VIP
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={async () => {
                            try {
                              for (const seatId of selectedSeats) {
                                await venueSeatService.removeVIPReservation(seatId);
                              }
                              setSuccess(`Removed VIP reservation from ${selectedSeats.length} seats`);
                              setSelectedSeats([]);
                              setMultiSelectMode(false);
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to remove VIP reservation');
                            }
                          }}
                          startIcon={<StarBorder />}
                        >
                          Remove VIP
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          variant="contained"
                          color="info"
                          onClick={async () => {
                            try {
                              for (const seatId of selectedSeats) {
                                await venueSeatService.markAccessible(seatId);
                              }
                              setSuccess(`Marked ${selectedSeats.length} seats as accessible`);
                              setSelectedSeats([]);
                              setMultiSelectMode(false);
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to mark as accessible');
                            }
                          }}
                          startIcon={<Accessible />}
                        >
                          Mark Accessible
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          variant="outlined"
                          color="info"
                          onClick={async () => {
                            try {
                              for (const seatId of selectedSeats) {
                                await venueSeatService.removeAccessible(seatId);
                              }
                              setSuccess(`Removed accessible marking from ${selectedSeats.length} seats`);
                              setSelectedSeats([]);
                              setMultiSelectMode(false);
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to remove accessible marking');
                            }
                          }}
                          startIcon={<AccessibleForward />}
                        >
                          Remove Accessible
                        </Button>
                      </Grid>
                    </>
                  )}
                  <Grid item>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSelectedSeats([]);
                        setMultiSelectMode(false);
                      }}
                    >
                      Clear Selection
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </>
      )}

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
              {isSeatDTO(seatActionDialog.seat) ? (
                // SeatDTO display (when schedule is selected)
                <>
                  <Typography variant="h6">
                    Seat {seatActionDialog.seat.section} - Row {seatActionDialog.seat.rowLabel} - {seatActionDialog.seat.seatNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {seatActionDialog.seat.categoryName} - LKR {seatActionDialog.seat.currentPrice?.toLocaleString()}
                  </Typography>
                  <Chip 
                    label={seatActionDialog.seat.status}
                    color={
                      seatActionDialog.seat.status === 'BOOKED' ? 'error' :
                      seatActionDialog.seat.status === 'HELD' ? 'warning' :
                      seatActionDialog.seat.status === 'LOCKED' ? 'default' :
                      seatActionDialog.seat.status === 'VIP_RESERVED' ? 'secondary' :
                      'success'
                    }
                    size="small"
                    sx={{ mt: 1 }}
                  />
                  {seatActionDialog.seat.status === 'HELD' && seatActionDialog.seat.heldByUserId && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block">
                        Held by: User #{seatActionDialog.seat.heldByUserId}
                        {seatActionDialog.seat.heldByUserName && ` (${seatActionDialog.seat.heldByUserName})`}
                      </Typography>
                      {seatActionDialog.seat.holdExpiresAt && (
                        <Typography variant="caption" display="block" color="warning.main">
                          Expires: {getCountdown(seatActionDialog.seat.holdExpiresAt)}
                        </Typography>
                      )}
                      {seatActionDialog.seat.isPermanentHold && (
                        <Typography variant="caption" display="block" color="error.main">
                          ⚠ Permanent Hold (Admin)
                        </Typography>
                      )}
                    </Box>
                  )}
                </>
              ) : isVenueSeat(seatActionDialog.seat) ? (
                // VenueSeat display
                <>
                  <Typography variant="h6">
                    Seat {seatActionDialog.seat.section} - Row {seatActionDialog.seat.rowLabel} - {seatActionDialog.seat.seatNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {seatActionDialog.seat.category.categoryName} - LKR {seatActionDialog.seat.category.basePrice?.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {seatActionDialog.seat.notes?.toLowerCase().includes('[locked]') && 'Status: LOCKED'}
                    {seatActionDialog.seat.notes?.toLowerCase().includes('[vip]') && 'Status: VIP RESERVED'}
                    {seatActionDialog.seat.isAccessible && ' ( Accessible)'}
                    {!seatActionDialog.seat.notes?.toLowerCase().includes('[locked]') && !seatActionDialog.seat.notes?.toLowerCase().includes('[vip]') && 'Status: AVAILABLE'}
                  </Typography>
                </>
              ) : (
                // Seat display
                <>
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
                </>
              )}
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {seatActionDialog.seat && (
            <List>
              {/* SeatDTO actions (when schedule is selected) */}
              {isSeatDTO(seatActionDialog.seat) && isAdmin && selectedSchedule && (
                <>
                  {/* Admin actions for held seats */}
                  {seatActionDialog.seat.status === 'HELD' && (
                    <>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => handleAdminReleaseHold(seatActionDialog.seat!.seatId)}>
                          <ListItemIcon sx={{ color: 'warning.main' }}>
                            <RemoveCircle />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Force Release Hold" 
                            secondary={`Release hold from User #${(seatActionDialog.seat as SeatDTO).heldByUserId}`}
                          />
                        </ListItemButton>
                      </ListItem>
                      <Divider />
                    </>
                  )}
                  {/* Admin actions for booked seats */}
                  {seatActionDialog.seat.status === 'BOOKED' && (
                    <>
                      <ListItem disablePadding>
                        <ListItemButton 
                          onClick={() => handleAdminUnreserveSeat(seatActionDialog.seat!.seatId)}
                          sx={{ color: 'error.main' }}
                        >
                          <ListItemIcon sx={{ color: 'error.main' }}>
                            <BookmarkRemove />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Unreserve Booked Seat" 
                            secondary="⚠ Warning: This will cancel the booking"
                          />
                        </ListItemButton>
                      </ListItem>
                      <Divider />
                    </>
                  )}
                  {/* View seat details */}
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => {
                      const seat = seatActionDialog.seat as SeatDTO;
                      alert(`Seat Details:\n\nSeat ID: ${seat.seatId}\nSection: ${seat.section}\nRow: ${seat.rowLabel}\nSeat #: ${seat.seatNumber}\n\nCategory: ${seat.categoryName}\nPrice: LKR ${seat.currentPrice?.toLocaleString()}\n\nStatus: ${seat.status}\n${seat.heldByUserId ? `\nHeld by: User #${seat.heldByUserId}${seat.heldByUserName ? ` (${seat.heldByUserName})` : ''}` : ''}${seat.holdExpiresAt ? `\nExpires: ${seat.holdExpiresAt}` : ''}${seat.isPermanentHold ? '\n⚠ Permanent Hold' : ''}`);
                    }}>
                      <ListItemIcon sx={{ color: 'info.main' }}>
                        <Info />
                      </ListItemIcon>
                      <ListItemText primary="View Seat Details" />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                  {/* Refresh seat data */}
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => {
                      if (selectedSchedule) {
                        loadSeatAvailability(selectedSchedule.scheduleId);
                      }
                      closeSeatActionDialog();
                    }}>
                      <ListItemIcon sx={{ color: 'primary.main' }}>
                        <Refresh />
                      </ListItemIcon>
                      <ListItemText primary="Refresh Seat Data" />
                    </ListItemButton>
                  </ListItem>
                </>
              )}

              {/* VenueSeat actions when no schedule selected */}
              {isVenueSeat(seatActionDialog.seat) ? (
                // VenueSeat actions - Full admin privileges
                <>
                  {isAdmin ? (
                    <>
                      {/* Select Multiple */}
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => {
                          setMultiSelectMode(true);
                          if (!selectedSeats.includes(seatActionDialog.seat!.seatId)) {
                            setSelectedSeats(prev => [...prev, seatActionDialog.seat!.seatId]);
                          }
                          setSuccess('Multi-select mode enabled. Click more seats to select them.');
                          closeSeatActionDialog();
                        }}>
                          <ListItemIcon sx={{ color: 'primary.main' }}>
                            <SelectAll />
                          </ListItemIcon>
                          <ListItemText primary="Select Multiple Seats" />
                        </ListItemButton>
                      </ListItem>
                      <Divider />

                      {/* View Seat Details */}
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => {
                          const seat = seatActionDialog.seat as VenueSeat;
                          alert(`Seat Details:\n\nSeat ID: ${seat.seatId}\nSection: ${seat.section}\nRow: ${seat.rowLabel}\nSeat #: ${seat.seatNumber}\n\nCategory: ${seat.category.categoryName}\nPrice: LKR ${seat.category.basePrice?.toLocaleString()}\n\nAccessible: ${seat.isAccessible ? 'Yes' : 'No'}\nAisle Seat: ${seat.isAisleSeat ? 'Yes' : 'No'}\n\nNotes: ${seat.notes || 'None'}`);
                        }}>
                          <ListItemIcon sx={{ color: 'info.main' }}>
                            <Info />
                          </ListItemIcon>
                          <ListItemText primary="View Seat Details" />
                        </ListItemButton>
                      </ListItem>
                      <Divider />

                      {/* Lock/Unlock Seat */}
                      {(seatActionDialog.seat as VenueSeat).notes?.toLowerCase().includes('[locked]') ? (
                        <ListItem disablePadding>
                          <ListItemButton onClick={async () => {
                            try {
                              await venueSeatService.unlockSeat(seatActionDialog.seat!.seatId);
                              setSuccess('Seat unlocked successfully');
                              closeSeatActionDialog();
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to unlock seat');
                            }
                          }}>
                            <ListItemIcon sx={{ color: 'success.main' }}>
                              <LockOpen />
                            </ListItemIcon>
                            <ListItemText primary="Unlock Seat" />
                          </ListItemButton>
                        </ListItem>
                      ) : (
                        <ListItem disablePadding>
                          <ListItemButton onClick={async () => {
                            try {
                              await venueSeatService.lockSeat(seatActionDialog.seat!.seatId);
                              setSuccess('Seat locked successfully');
                              closeSeatActionDialog();
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to lock seat');
                            }
                          }}>
                            <ListItemIcon sx={{ color: 'error.main' }}>
                              <Lock />
                            </ListItemIcon>
                            <ListItemText primary="Lock Seat" />
                          </ListItemButton>
                        </ListItem>
                      )}
                      <Divider />

                      {/* Reserve/Remove VIP */}
                      {(seatActionDialog.seat as VenueSeat).notes?.toLowerCase().includes('[vip]') ? (
                        <ListItem disablePadding>
                          <ListItemButton onClick={async () => {
                            try {
                              await venueSeatService.removeVIPReservation(seatActionDialog.seat!.seatId);
                              setSuccess('VIP reservation removed');
                              closeSeatActionDialog();
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to remove VIP reservation');
                            }
                          }}>
                            <ListItemIcon sx={{ color: 'warning.main' }}>
                              <StarBorder />
                            </ListItemIcon>
                            <ListItemText primary="Remove VIP Reservation" />
                          </ListItemButton>
                        </ListItem>
                      ) : (
                        <ListItem disablePadding>
                          <ListItemButton onClick={async () => {
                            try {
                              await venueSeatService.reserveForVIP(seatActionDialog.seat!.seatId);
                              setSuccess('Seat reserved for VIP');
                              closeSeatActionDialog();
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to reserve for VIP');
                            }
                          }}>
                            <ListItemIcon sx={{ color: 'secondary.main' }}>
                              <Star />
                            </ListItemIcon>
                            <ListItemText primary="Reserve for VIP" />
                          </ListItemButton>
                        </ListItem>
                      )}
                      <Divider />

                      {/* Mark/Remove Accessible */}
                      {(seatActionDialog.seat as VenueSeat).isAccessible ? (
                        <ListItem disablePadding>
                          <ListItemButton onClick={async () => {
                            try {
                              await venueSeatService.removeAccessible(seatActionDialog.seat!.seatId);
                              setSuccess('Accessible marking removed');
                              closeSeatActionDialog();
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to remove accessible marking');
                            }
                          }}>
                            <ListItemIcon sx={{ color: 'grey.500' }}>
                              <AccessibleForward />
                            </ListItemIcon>
                            <ListItemText primary="Remove Accessible Marking" />
                          </ListItemButton>
                        </ListItem>
                      ) : (
                        <ListItem disablePadding>
                          <ListItemButton onClick={async () => {
                            try {
                              await venueSeatService.markAccessible(seatActionDialog.seat!.seatId);
                              setSuccess('Seat marked as accessible');
                              closeSeatActionDialog();
                              if (selectedEvent) loadVenueSeats(selectedEvent);
                            } catch (err: any) {
                              setError(err.message || 'Failed to mark as accessible');
                            }
                          }}>
                            <ListItemIcon sx={{ color: 'info.main' }}>
                              <Accessible />
                            </ListItemIcon>
                            <ListItemText primary="Mark as Accessible" />
                          </ListItemButton>
                        </ListItem>
                      )}
                    </>
                  ) : (
                    <ListItem>
                      <ListItemText 
                        primary="Select this seat" 
                        secondary="Click to add to selection"
                      />
                    </ListItem>
                  )}
                </>
              ) : isSeat(seatActionDialog.seat) ? (
                // Seat actions (legacy Seat type)
                <>
                  {getSeatActions(seatActionDialog.seat).length > 0 ? (
                    getSeatActions(seatActionDialog.seat).map((actionItem, index) => (
                      <React.Fragment key={actionItem.action}>
                        <ListItem disablePadding>
                          <ListItemButton onClick={() => handleSeatAction(actionItem.action, seatActionDialog.seat as Seat)}>
                            <ListItemIcon sx={{ color: actionItem.color ? `${actionItem.color}.main` : 'inherit' }}>
                              {actionItem.icon}
                            </ListItemIcon>
                            <ListItemText primary={actionItem.label} />
                          </ListItemButton>
                        </ListItem>
                        {index < getSeatActions(seatActionDialog.seat as Seat).length - 1 && <Divider />}
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
                </>
              ) : null}
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