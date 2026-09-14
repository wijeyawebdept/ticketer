import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  EventSeat as SeatIcon,
  Groups as GroupsIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Map as MapIcon,
  FormatListBulleted as ListIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  EventNote as EventIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import QrScanner from '../../components/QrScanner/QrScanner';
import { VenueSeatMap } from '../../components/VenueSeatMap/VenueSeatMap';
import checkInService, {
  CheckInResponse,
  CheckInStatsResponse,
  CheckInAttendee,
} from '../../services/checkInService';
import seatWebSocketService from '../../services/websocket.service';
import eventService from '../../services/event.service';
import eventScheduleService from '../../services/eventSchedule.service';
import gateStaffService from '../../services/gateStaff.service';
import { useAuth } from '../../context/AuthContext';

// Web Audio API Sound Generator for Instant Gate Audio Chimes
const playAudioFeedback = (type: 'SUCCESS' | 'WARNING' | 'ERROR', soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'SUCCESS') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.3);
    } else if (type === 'WARNING') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
};

export const GateScanner: React.FC = () => {
  const { eventId: routeEventId, scheduleId: routeScheduleId } = useParams<{ eventId?: string; scheduleId?: string }>();
  const { user } = useAuth();

  // Active View Tab: 0 = Scanner & Live Entry, 1 = Live Seat Map Attendance, 2 = Attendee Roster
  const [activeTab, setActiveTab] = useState(0);

  // Sound feedback toggle with persistence
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('ticketer_gate_sound_enabled') !== 'false');

  // Camera active toggle with persistence
  const [isCameraActive, setIsCameraActive] = useState<boolean>(() => localStorage.getItem('ticketer_gate_camera_active') !== 'false');

  // Events & Schedules state
  const [events, setEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    return routeEventId || localStorage.getItem('ticketer_gate_event_id') || '';
  });
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(() => {
    const evId = routeEventId || localStorage.getItem('ticketer_gate_event_id');
    return routeScheduleId || (evId ? localStorage.getItem(`ticketer_gate_schedule_${evId}`) : null) || '';
  });
  const [venueId, setVenueId] = useState<string>('');

  // Scan states
  const [manualCode, setManualCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<CheckInResponse | null>(null);

  const userRoleStr = String(user?.role || '').toUpperCase();
  const isGateStaff = userRoleStr.includes('GATE_STAFF') || (!userRoleStr.includes('ADMIN') && !userRoleStr.includes('ORGANIZER'));
  const currentEvent = events.find((ev) => String(ev.eventId || ev.id || '').toLowerCase() === String(selectedEventId || '').toLowerCase()) || events[0] || null;
  const currentSchedule = schedules.find((sc) => String(sc.scheduleId || sc.id || '').toLowerCase() === String(selectedScheduleId || '').toLowerCase()) || schedules[0] || null;

  // Real-time Statistics
  const [stats, setStats] = useState<CheckInStatsResponse | null>(null);

  // Attendee Roster
  const [attendees, setAttendees] = useState<CheckInAttendee[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilterCheckedIn, setRosterFilterCheckedIn] = useState<boolean | undefined>(undefined);

  // Fetch Available Events with localStorage persistence and URL sync
  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        let list: any[] = [];
        try {
          const assignedRes = await gateStaffService.getMyAssignedEvents();
          list = Array.isArray(assignedRes) ? assignedRes : (assignedRes as any)?.content || [];
        } catch (assignErr) {
          console.warn('Could not fetch via gateStaffService, trying eventService fallback:', assignErr);
        }

        const isAdminOrOrganizer = userRoleStr.includes('ADMIN') || userRoleStr.includes('ORGANIZER');

        if (list.length === 0 && isAdminOrOrganizer) {
          try {
            const res = await eventService.getAllEvents();
            list = res?.content || (Array.isArray(res) ? res : []);
          } catch (err) {
            const fallbackRes = await eventService.getUpcomingPublishedEvents(0, 50);
            list = fallbackRes?.content || (Array.isArray(fallbackRes) ? fallbackRes : []);
          }
        }

        setEvents(list);
        if (list.length > 0) {
          const storedId = localStorage.getItem('ticketer_gate_event_id');
          const targetId =
            routeEventId && list.some((e) => String(e.eventId || e.id) === routeEventId)
              ? routeEventId
              : storedId && list.some((e) => String(e.eventId || e.id) === storedId)
              ? storedId
              : String(list[0].eventId || list[0].id || '');

          setSelectedEventId(targetId);
          localStorage.setItem('ticketer_gate_event_id', targetId);
          window.history.replaceState(null, '', `/gate/${targetId}`);
        } else {
          setSelectedEventId('');
          setSelectedScheduleId('');
        }
      } catch (err) {
        console.error('Failed to load events for GateScanner:', err);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, [routeEventId, user?.role, userRoleStr]);

  // Fetch Schedules for selected event with localStorage persistence
  useEffect(() => {
    if (!selectedEventId) {
      setSchedules([]);
      setSelectedScheduleId('');
      return;
    }
    const fetchSchedules = async () => {
      try {
        const ev = events.find((e) => String(e.eventId || e.id) === String(selectedEventId));
        if (ev?.venue?.venueId || ev?.venueId) {
          setVenueId(ev.venue?.venueId || ev.venueId);
        }

        let scheduleArray: any[] = [];

        if (ev?.eventSchedules && Array.isArray(ev.eventSchedules) && ev.eventSchedules.length > 0) {
          scheduleArray = ev.eventSchedules;
        } else if (ev?.schedules && Array.isArray(ev.schedules) && ev.schedules.length > 0) {
          scheduleArray = ev.schedules;
        } else {
          try {
            const list = await eventScheduleService.getSchedulesForEvent(selectedEventId);
            scheduleArray = Array.isArray(list) ? list : (list as any)?.content || [];
          } catch (e) {
            try {
              const list = await eventScheduleService.getBookableSchedulesForEvent(selectedEventId);
              scheduleArray = Array.isArray(list) ? list : (list as any)?.content || [];
            } catch (e2) {
              const list = await eventScheduleService.getPublicBookableSchedulesForEvent(selectedEventId);
              scheduleArray = Array.isArray(list) ? list : (list as any)?.content || [];
            }
          }
        }

        setSchedules(scheduleArray);
        if (scheduleArray.length > 0) {
          const storedScheduleId = localStorage.getItem(`ticketer_gate_schedule_${selectedEventId}`);
          const targetScheduleId =
            routeScheduleId &&
            scheduleArray.some((s: any) => String(s.scheduleId || s.id) === routeScheduleId)
              ? routeScheduleId
              : storedScheduleId &&
                scheduleArray.some((s: any) => String(s.scheduleId || s.id) === storedScheduleId)
              ? storedScheduleId
              : String(scheduleArray[0].scheduleId || scheduleArray[0].id || '');

          setSelectedScheduleId(targetScheduleId);
          localStorage.setItem(`ticketer_gate_schedule_${selectedEventId}`, targetScheduleId);
        } else {
          setSelectedScheduleId('');
        }
      } catch (err) {
        console.error('Failed to load event schedules:', err);
      }
    };
    fetchSchedules();
  }, [selectedEventId, events, routeScheduleId]);

  // Load stats and attendees when schedule changes
  const refreshStatsAndRoster = useCallback(async () => {
    if (!selectedScheduleId) return;
    try {
      const statsData = await checkInService.getScheduleStats(selectedScheduleId);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading check-in stats:', err);
    }

    try {
      const rosterData = await checkInService.getScheduleAttendees(
        selectedScheduleId,
        rosterSearch,
        rosterFilterCheckedIn
      );
      setAttendees(rosterData);
    } catch (err) {
      console.error('Error loading attendees:', err);
    }
  }, [selectedScheduleId, rosterSearch, rosterFilterCheckedIn]);

  useEffect(() => {
    refreshStatsAndRoster();
  }, [refreshStatsAndRoster]);

  // WebSocket Live Real-Time Check-In Subscription
  useEffect(() => {
    if (!selectedScheduleId) return;

    const unsubscribe = seatWebSocketService.subscribeToSchedule(
      selectedScheduleId,
      (msg) => {
        if (msg.action === 'CHECKED_IN') {
          playAudioFeedback('SUCCESS', soundEnabled);
        }

        setStats((prev) => {
          if (!prev) return prev;
          const newCheckedIn = Number(msg.totalScheduleCheckedIn);
          const newPending = Math.max(0, prev.totalBooked - newCheckedIn);
          const newPct = prev.totalBooked > 0 ? (newCheckedIn / prev.totalBooked) * 100 : 0;

          const newItem = {
            customerName: msg.customerName,
            bookingReference: msg.bookingReference,
            ticketCode: msg.ticketCodes[0] || '',
            seatIdentifier: msg.venueSeatIds[0] || (msg.sharedAreaNumbers[0] ? `Shared Area #${msg.sharedAreaNumbers[0]}` : 'Pass'),
            checkedInAtTime: new Date().toLocaleTimeString(),
            isSharedArea: msg.sharedAreaNumbers.length > 0,
          };

          return {
            ...prev,
            totalCheckedIn: newCheckedIn,
            totalPendingArrival: newPending,
            checkInPercentage: Math.round(newPct * 10) / 10,
            recentCheckIns: [newItem, ...(prev.recentCheckIns || []).slice(0, 24)],
          };
        });

        setAttendees((prev) =>
          prev.map((att) => {
            if (
              msg.ticketCodes.includes(att.ticketCode) ||
              msg.venueSeatIds.includes(att.venueSeatId || '')
            ) {
              return {
                ...att,
                checkedIn: msg.action === 'CHECKED_IN',
                checkedInAt: new Date().toISOString(),
              };
            }
            return att;
          })
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedScheduleId, soundEnabled]);

  // Handle QR Scan Success
  const handleQrScan = async (decodedText: string) => {
    if (scanLoading) return;
    setScanLoading(true);
    try {
      const response = await checkInService.scanTicket({
        qrData: decodedText,
        eventScheduleId: selectedScheduleId || undefined,
        eventId: selectedEventId || undefined,
        checkInAll: false,
      });

      setLastScanResult(response);

      if (response.valid) {
        if (response.alreadyCheckedIn) {
          playAudioFeedback('WARNING', soundEnabled);
        } else {
          playAudioFeedback('SUCCESS', soundEnabled);
        }
      } else {
        playAudioFeedback('ERROR', soundEnabled);
      }
    } catch (err: any) {
      playAudioFeedback('ERROR', soundEnabled);
      setLastScanResult({
        valid: false,
        alreadyCheckedIn: false,
        statusType: 'ERROR',
        message: err?.response?.data?.message || 'Verification failed. Could not validate ticket.',
      });
    } finally {
      setScanLoading(false);
      refreshStatsAndRoster();
    }
  };

  // Handle Manual Code Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleQrScan(manualCode.trim());
    setManualCode('');
  };

  // Toggle seat checkin directly from roster
  const handleToggleRosterSeat = async (bookingSeatId: string, currentState: boolean) => {
    try {
      const newState = !currentState;
      await checkInService.toggleSeatCheckIn(bookingSeatId, newState);
      setAttendees((prev) =>
        prev.map((a) => (a.bookingSeatId === bookingSeatId ? { ...a, checkedIn: newState } : a))
      );
      playAudioFeedback(newState ? 'SUCCESS' : 'WARNING', soundEnabled);
      refreshStatsAndRoster();
    } catch (err) {
      console.error('Error toggling seat check-in:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* No Assigned Events Warning Banner */}
      {!eventsLoading && events.length === 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>No Active Event Assignments</AlertTitle>
          There are currently no events or schedules assigned to your account. Please ask the event administrator or supervisor to assign you to an event schedule.
        </Alert>
      )}

      {/* Event and Schedule Display / Selector Bar */}
      {/* Top Header Card: Assigned Event & Schedule + Controls */}
      <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: { xs: 2, sm: 3 }, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', mb: { xs: 1.5, sm: 2.5 } }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {isGateStaff ? (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 1.2, md: 2 }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
              {/* Event & Venue Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: { xs: 32, sm: 38 },
                      height: { xs: 32, sm: 38 },
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255, 25, 85, 0.1)',
                      color: '#ff1955',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <EventIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: '#ff1955', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5, display: 'block', lineHeight: 1.1 }}>
                      Assigned Event
                    </Typography>
                    <Typography variant="subtitle2" noWrap sx={{ color: '#1e293b', fontWeight: 800, fontSize: { xs: '0.88rem', sm: '0.98rem' } }}>
                      {currentEvent ? (currentEvent.name || currentEvent.title) : eventsLoading ? 'Loading event...' : 'Assigned Event'}
                    </Typography>
                    {currentEvent?.venue?.name && (
                      <Typography variant="caption" noWrap sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block', lineHeight: 1.1 }}>
                        {currentEvent.venue.name}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Event Selector if assigned multiple events */}
                {events.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 90, flexShrink: 0 }}>
                    <Select
                      value={selectedEventId || ''}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedEventId(newId);
                        localStorage.setItem('ticketer_gate_event_id', newId);
                        window.history.replaceState(null, '', `/gate/${newId}`);
                      }}
                      sx={{ height: 28, fontSize: '0.72rem', borderRadius: 1.5 }}
                    >
                      {events.map((ev) => (
                        <MenuItem key={ev.eventId || ev.id} value={String(ev.eventId || ev.id)}>
                          {ev.name || ev.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Sound & Sync Controls */}
                <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexShrink: 0 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newVal = !soundEnabled;
                      setSoundEnabled(newVal);
                      localStorage.setItem('ticketer_gate_sound_enabled', String(newVal));
                    }}
                    sx={{
                      bgcolor: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : '#f1f5f9',
                      color: soundEnabled ? '#10b981' : '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: 1.5,
                      p: 0.7,
                    }}
                  >
                    {soundEnabled ? <VolumeUpIcon sx={{ fontSize: 18 }} /> : <VolumeOffIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon sx={{ fontSize: '0.95rem !important' }} />}
                    onClick={refreshStatsAndRoster}
                    sx={{
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#1e293b',
                      borderColor: '#e2e8f0',
                      py: 0.4,
                      px: 1,
                      minWidth: 'auto',
                      '&:hover': {
                        borderColor: '#ff1955',
                        color: '#ff1955',
                        bgcolor: 'rgba(255, 25, 85, 0.06)',
                      },
                    }}
                  >
                    Sync
                  </Button>
                </Box>
              </Box>

              {/* Schedule Info Box & Active Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: { xs: 1, sm: 1.2 }, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <TimeIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.5, display: 'block', lineHeight: 1.1 }}>
                      Schedule / Showtime
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ color: '#1e293b', fontWeight: 800, fontSize: { xs: '0.78rem', sm: '0.88rem' } }}>
                      {currentSchedule
                        ? `${currentSchedule.scheduleDate || currentSchedule.date || ''} (${String(currentSchedule.startTime || currentSchedule.scheduleStartTime || '').slice(0, 5)}${currentSchedule.endTime ? ' - ' + String(currentSchedule.endTime).slice(0, 5) : ''})`
                        : (schedules.length === 0 ? 'All Showtimes' : 'Showtime Assigned')}
                    </Typography>
                  </Box>
                </Box>

                {/* Gate Active status badge or schedule dropdown */}
                {schedules.length > 1 ? (
                  <FormControl size="small" sx={{ minWidth: 100, flexShrink: 0 }}>
                    <Select
                      value={selectedScheduleId || ''}
                      onChange={(e) => {
                        const newScheduleId = e.target.value;
                        setSelectedScheduleId(newScheduleId);
                        if (selectedEventId) {
                          localStorage.setItem(`ticketer_gate_schedule_${selectedEventId}`, newScheduleId);
                          window.history.replaceState(null, '', `/gate/${selectedEventId}/${newScheduleId}`);
                        }
                      }}
                      sx={{ height: 26, fontSize: '0.7rem', borderRadius: 1.5, bgcolor: '#ffffff' }}
                    >
                      {schedules.map((sc) => (
                        <MenuItem key={sc.scheduleId || sc.id} value={String(sc.scheduleId || sc.id)}>
                          {`${sc.scheduleDate || sc.date || ''} ${sc.startTime ? '(' + sc.startTime + ')' : ''}`.trim()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(16, 185, 129, 0.1)', px: 1, py: 0.3, borderRadius: 1.5, flexShrink: 0 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.68rem' }}>
                      Active
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            /* Admin/Organizer Dropdowns */
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={5} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="gatescanner-event-label">Event</InputLabel>
                  <Select
                    labelId="gatescanner-event-label"
                    value={selectedEventId || ''}
                    label="Event"
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedEventId(newId);
                      localStorage.setItem('ticketer_gate_event_id', newId);
                      window.history.replaceState(null, '', `/gate/${newId}`);
                    }}
                    displayEmpty
                  >
                    {selectedEventId && !events.some((ev) => String(ev.eventId || ev.id || '').toLowerCase() === selectedEventId.toLowerCase()) && (
                      <MenuItem value={selectedEventId} sx={{ display: 'none' }}>
                        <em>Loading selected event...</em>
                      </MenuItem>
                    )}
                    {events.length === 0 && !selectedEventId ? (
                      <MenuItem disabled value="">
                        <em>No events available</em>
                      </MenuItem>
                    ) : (
                      events.map((ev) => {
                        const id = String(ev.eventId || ev.id || '');
                        const name = ev.name || ev.title || `Event #${id}`;
                        return (
                          <MenuItem key={id} value={id}>
                            {name}
                          </MenuItem>
                        );
                      })
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="gatescanner-schedule-label">Schedule / Date</InputLabel>
                  <Select
                    labelId="gatescanner-schedule-label"
                    value={selectedScheduleId || ''}
                    label="Schedule / Date"
                    onChange={(e) => {
                      const newScheduleId = e.target.value;
                      setSelectedScheduleId(newScheduleId);
                      if (selectedEventId) {
                        localStorage.setItem(`ticketer_gate_schedule_${selectedEventId}`, newScheduleId);
                        window.history.replaceState(null, '', `/gate/${selectedEventId}/${newScheduleId}`);
                      }
                    }}
                    displayEmpty
                  >
                    {selectedScheduleId && !schedules.some((sc) => String(sc.scheduleId || sc.id || '').toLowerCase() === selectedScheduleId.toLowerCase()) && (
                      <MenuItem value={selectedScheduleId} sx={{ display: 'none' }}>
                        <em>Loading schedule...</em>
                      </MenuItem>
                    )}
                    {schedules.length === 0 && !selectedScheduleId ? (
                      <MenuItem disabled value="">
                        <em>{selectedEventId ? 'No schedules for this event' : 'Select an event first'}</em>
                      </MenuItem>
                    ) : (
                      schedules.map((sc) => {
                        const id = String(sc.scheduleId || sc.id || '');
                        const dateStr = sc.scheduleDate || sc.date || 'Date N/A';
                        const timeStr = sc.startTime || sc.scheduleStartTime ? `(${sc.startTime || sc.scheduleStartTime})` : '';
                        return (
                          <MenuItem key={id} value={id}>
                            {`${dateStr} ${timeStr}`.trim()}
                          </MenuItem>
                        );
                      })
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1, alignItems: 'center' }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newVal = !soundEnabled;
                    setSoundEnabled(newVal);
                    localStorage.setItem('ticketer_gate_sound_enabled', String(newVal));
                  }}
                  sx={{
                    bgcolor: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : '#f1f5f9',
                    color: soundEnabled ? '#10b981' : '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 1.5,
                  }}
                >
                  {soundEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                </IconButton>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={refreshStatsAndRoster}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    color: '#1e293b',
                    borderColor: '#e2e8f0',
                    '&:hover': {
                      borderColor: '#ff1955',
                      color: '#ff1955',
                      bgcolor: 'rgba(255, 25, 85, 0.06)',
                    },
                  }}
                >
                  Sync
                </Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* KPI Attendance Metrics Grid */}
      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2.5 } }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: { xs: 1.2, sm: 2 } }}>
              <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' }, display: 'block' }}>
                Total Booked
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#1e293b', mt: 0.2, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                {stats?.totalBooked ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: { xs: 1.2, sm: 2 } }}>
              <Typography variant="caption" sx={{ color: '#10b981', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' }, display: 'block' }}>
                Checked In
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#10b981', mt: 0.2, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                {stats?.totalCheckedIn ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: { xs: 1.2, sm: 2 } }}>
              <Typography variant="caption" sx={{ color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' }, display: 'block' }}>
                Pending
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.2, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                {stats?.totalPendingArrival ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: { xs: 1.2, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#ff1955', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' } }}>
                  Progress
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e293b', fontSize: { xs: '0.68rem', sm: '0.75rem' } }}>
                  {stats?.checkInPercentage ?? 0}%
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, color: '#ff1955', mt: 0.2, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                {stats?.checkInPercentage ?? 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats?.checkInPercentage ?? 0}
                sx={{
                  mt: 0.6,
                  height: { xs: 4, sm: 6 },
                  borderRadius: 2,
                  bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': { bgcolor: '#ff1955', borderRadius: 2 },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          bgcolor: '#ffffff',
          borderRadius: 2,
          p: 0.5,
          mb: { xs: 1.5, sm: 2.5 },
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          minHeight: { xs: 38, sm: 44 },
          '& .MuiTab-root': {
            color: '#64748b',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
            borderRadius: 1.5,
            minHeight: { xs: 34, sm: 40 },
            py: 0.5,
            px: { xs: 1.2, sm: 2 },
            '&.Mui-selected': {
              color: '#ff1955',
              bgcolor: 'rgba(255, 25, 85, 0.08)',
            },
          },
          '& .MuiTabs-indicator': { display: 'none' },
        }}
      >
        <Tab icon={<QrCodeScannerIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Camera Scanner" />
        <Tab icon={<MapIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Seat Map" />
        <Tab icon={<ListIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Attendee Roster" />
      </Tabs>

      {/* TAB 0: Scanner & Live Entry */}
      {activeTab === 0 && (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {/* Left Column: QR Scanner & Manual Input */}
          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', p: { xs: 1.5, sm: 2.5 } }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', fontSize: { xs: '0.92rem', sm: '1rem' }, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCodeScannerIcon sx={{ color: '#ff1955' }} />
                Gate Camera Scanner
              </Typography>

              {/* Camera Scanner Component */}
              <QrScanner
                scannerId="gate-terminal-qr-scanner"
                isActive={isCameraActive}
                onActiveChange={(active) => {
                  setIsCameraActive(active);
                  localStorage.setItem('ticketer_gate_camera_active', String(active));
                }}
                onScanSuccess={handleQrScan}
              />

              {/* Manual Ticket / Booking Code Input */}
              <Box component="form" onSubmit={handleManualSubmit} sx={{ mt: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.6 }}>
                  Manual Ticket Code / Reference Entry:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. BK-7F9A2B1C or TK-4D9E2F8A1B3C"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& input': { fontSize: '0.85rem' }
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!manualCode.trim() || scanLoading}
                    sx={{
                      bgcolor: '#ff1955',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      px: { xs: 2, sm: 2.5 },
                      fontSize: '0.85rem',
                      flexShrink: 0,
                      '&:hover': { bgcolor: '#e0144c' },
                    }}
                  >
                    Verify
                  </Button>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Right Column: Instant Verification Badge & Recent Feed */}
          <Grid item xs={12} md={7}>
            {/* Scan Status Badge Card */}
            {lastScanResult ? (
              <Card
                sx={{
                  bgcolor: lastScanResult.valid
                    ? lastScanResult.alreadyCheckedIn
                      ? '#fffbeb'
                      : '#ecfdf5'
                    : '#fef2f2',
                  border: `2px solid ${
                    lastScanResult.valid
                      ? lastScanResult.alreadyCheckedIn
                        ? '#f59e0b'
                        : '#10b981'
                      : '#ef4444'
                  }`,
                  borderRadius: 2.5,
                  p: { xs: 1.5, sm: 2.5 },
                  mb: { xs: 1.5, sm: 2.5 },
                }}
              >
                {/* Status Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  {lastScanResult.valid ? (
                    lastScanResult.alreadyCheckedIn ? (
                      <WarningIcon sx={{ color: '#f59e0b', fontSize: { xs: 28, sm: 36 } }} />
                    ) : (
                      <SuccessIcon sx={{ color: '#10b981', fontSize: { xs: 28, sm: 36 } }} />
                    )
                  ) : (
                    <ErrorIcon sx={{ color: '#ef4444', fontSize: { xs: 28, sm: 36 } }} />
                  )}
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        fontSize: { xs: '0.92rem', sm: '1.05rem' },
                        color: lastScanResult.valid
                          ? lastScanResult.alreadyCheckedIn
                            ? '#b45309'
                            : '#047857'
                          : '#b91c1c',
                        letterSpacing: 0.2,
                        lineHeight: 1.2,
                      }}
                    >
                      {lastScanResult.valid
                        ? lastScanResult.alreadyCheckedIn
                          ? 'ALREADY CHECKED IN (DUPLICATE)'
                          : 'ACCESS GRANTED - VERIFIED TICKET'
                        : 'ACCESS DENIED - INVALID PASS'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mt: 0.3 }}>
                      {lastScanResult.message}
                    </Typography>
                  </Box>
                </Box>

                {/* Attendee Details Grid */}
                {lastScanResult.customerName && (
                  <Box sx={{ bgcolor: '#ffffff', p: 1.5, borderRadius: 2, mb: 1.5, border: '1px solid #e2e8f0' }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                          Attendee Name
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                          {lastScanResult.customerName}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                          Booking Ref
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e293b' }}>
                          {lastScanResult.bookingReference}
                        </Typography>
                      </Grid>
                      {lastScanResult.customerNic && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                            NIC Number
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {lastScanResult.customerNic}
                          </Typography>
                        </Grid>
                      )}
                      {lastScanResult.customerPhone && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                            Phone
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {lastScanResult.customerPhone}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Ticket Details list */}
                {lastScanResult.allTickets && lastScanResult.allTickets.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', mb: 0.8, display: 'block', fontSize: '0.68rem' }}>
                      Verified Seats & Passes:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {lastScanResult.allTickets.map((tkt, idx) => (
                        <Box
                          key={tkt.bookingSeatId || idx}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1,
                            bgcolor: '#ffffff',
                            borderRadius: 1.5,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                            {tkt.isSharedAreaTicket ? <GroupsIcon sx={{ color: '#10b981', fontSize: 16 }} /> : <SeatIcon sx={{ color: '#ff1955', fontSize: 16 }} />}
                            <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }}>
                              {tkt.isSharedAreaTicket
                                ? `Area #${tkt.sharedAreaNumber || 1}`
                                : `Seat ${tkt.seatNumber || tkt.venueSeatId}${tkt.rowLabel ? ` (Row ${tkt.rowLabel})` : ''}`}
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.72rem', display: { xs: 'none', sm: 'inline' } }}>
                              ({tkt.ticketCode})
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={tkt.checkedIn ? 'Checked In' : 'Pending'}
                            color={tkt.checkedIn ? 'success' : 'warning'}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              height: 22,
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Card>
            ) : (
              /* Awaiting Scan Placeholder */
              <Card sx={{ bgcolor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 2.5, p: { xs: 2.5, sm: 3.5 }, textAlign: 'center', mb: { xs: 1.5, sm: 2.5 } }}>
                <QrCodeScannerIcon sx={{ fontSize: { xs: 36, sm: 44 }, color: '#94a3b8', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ color: '#475569', fontWeight: 700, fontSize: { xs: '0.92rem', sm: '1rem' } }}>
                  Ready to Scan Tickets
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block' }}>
                  Point customer QR codes towards the camera or enter their reference above.
                </Typography>
              </Card>
            )}

            {/* Live Entry Activity Stream */}
            <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                Live Gate Entry Stream
              </Typography>
              <Box sx={{ maxHeight: { xs: 200, sm: 260 }, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {stats?.recentCheckIns && stats.recentCheckIns.length > 0 ? (
                  stats.recentCheckIns.map((item, idx) => (
                    <Box
                      key={`${item.bookingReference}-${idx}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        bgcolor: '#f8fafc',
                        borderRadius: 1.5,
                        border: '1px solid #e2e8f0',
                        borderLeft: '3px solid #10b981',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }}>
                          {item.customerName}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.72rem', display: 'block' }}>
                          {item.seatIdentifier} • {item.bookingReference}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={item.checkedInAtTime || 'Just now'}
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.68rem', height: 20, flexShrink: 0 }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 2.5, fontSize: '0.82rem' }}>
                    No check-ins recorded yet for this session.
                  </Typography>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: Live Seat Map Attendance & Shared Areas */}
      {activeTab === 1 && (
        <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                Live Attendance Seat Map
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                Real-time SVG visualization. Green seats represent checked-in attendees.
              </Typography>
            </Box>

            {/* Shared Areas Headcount Counters */}
            {stats?.sharedAreaBreakdown && Object.keys(stats.sharedAreaBreakdown).length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.values(stats.sharedAreaBreakdown).map((sa) => (
                  <Box
                    key={sa.sharedAreaNumber}
                    sx={{
                      p: 0.8,
                      px: 1.5,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 1.5,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>
                      {sa.categoryName} (#{sa.sharedAreaNumber})
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.82rem' }}>
                      {sa.checkedIn} / {sa.booked} Checked In
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {selectedScheduleId && (
            <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <VenueSeatMap
                eventScheduleId={selectedScheduleId}
                eventId={selectedEventId}
                venueId={venueId}
                mode="attendance"
                enableLiveCheckIn={true}
              />
            </Box>
          )}
        </Card>
      )}

      {/* TAB 2: Attendee Roster & Manual Check-In */}
      {activeTab === 2 && (
        <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
          {/* Filter Bar */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 2, gap: 1.2 }}>
            <TextField
              size="small"
              placeholder="Search attendee, ref, seat, phone..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: '100%', sm: 320 },
                '& input': { fontSize: '0.85rem' },
              }}
            />

            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === undefined ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(undefined)}
                sx={{
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.4,
                  bgcolor: rosterFilterCheckedIn === undefined ? '#ff1955' : undefined,
                  '&:hover': { bgcolor: rosterFilterCheckedIn === undefined ? '#e0144c' : undefined },
                }}
              >
                All ({attendees.length})
              </Button>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === true ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(true)}
                color="success"
                sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
              >
                Checked In ({attendees.filter((a) => a.checkedIn).length})
              </Button>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === false ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(false)}
                color="warning"
                sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
              >
                Pending ({attendees.filter((a) => !a.checkedIn).length})
              </Button>
            </Box>
          </Box>

          {/* Roster Table with Smooth Horizontal Scroll for Mobile */}
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow sx={{ '& th': { color: '#64748b', fontWeight: 700, borderColor: '#e2e8f0', fontSize: '0.78rem' } }}>
                  <TableCell>Customer</TableCell>
                  <TableCell>Booking Ref</TableCell>
                  <TableCell>Ticket Code</TableCell>
                  <TableCell>Seat / Area</TableCell>
                  <TableCell>Contact / NIC</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendees.map((att) => (
                  <TableRow key={att.bookingSeatId} hover sx={{ '& td': { color: '#1e293b', borderColor: '#e2e8f0', fontSize: '0.8rem' } }}>
                    <TableCell sx={{ fontWeight: 700 }}>{att.customerName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>{att.bookingReference}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#64748b' }}>{att.ticketCode}</TableCell>
                    <TableCell>
                      {att.isSharedAreaTicket
                        ? `Area #${att.sharedAreaNumber || 1}`
                        : `Seat ${att.seatNumber || att.venueSeatId}${att.rowLabel ? ` (Row ${att.rowLabel})` : ''}`}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {att.customerPhone || att.customerNic || att.customerEmail || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={att.checkedIn ? 'Checked In' : 'Pending'}
                        color={att.checkedIn ? 'success' : 'warning'}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleToggleRosterSeat(att.bookingSeatId, att.checkedIn)}
                        startIcon={att.checkedIn ? <ClearIcon sx={{ fontSize: '0.9rem !important' }} /> : <CheckIcon sx={{ fontSize: '0.9rem !important' }} />}
                        color={att.checkedIn ? 'error' : 'success'}
                        sx={{
                          borderRadius: 1.5,
                          textTransform: 'none',
                          fontSize: '0.72rem',
                          py: 0.3,
                          px: 1,
                        }}
                      >
                        {att.checkedIn ? 'Undo' : 'Check In'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
};

export default GateScanner;
