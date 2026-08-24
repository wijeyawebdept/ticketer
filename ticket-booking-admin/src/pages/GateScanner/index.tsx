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

// Web Audio API Sound Generator for Instant Gate Audio Chimes
const playAudioFeedback = (type: 'SUCCESS' | 'WARNING' | 'ERROR', soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'SUCCESS') {
      // Pleasant high double beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.12); // E6
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.3);
    } else if (type === 'WARNING') {
      // Amber warning tone
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
      // Error low buzz
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

  // Active View Tab: 0 = Scanner & Live Entry, 1 = Live Seat Map Attendance, 2 = Attendee Roster
  const [activeTab, setActiveTab] = useState(0);

  // Sound feedback toggle with persistence
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('ticketer_gate_sound_enabled') !== 'false');

  // Camera active toggle with persistence
  const [isCameraActive, setIsCameraActive] = useState<boolean>(() => localStorage.getItem('ticketer_gate_camera_active') !== 'false');

  // Events & Schedules state
  const [events, setEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
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

  // Real-time Statistics
  const [stats, setStats] = useState<CheckInStatsResponse | null>(null);

  // Attendee Roster
  const [attendees, setAttendees] = useState<CheckInAttendee[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilterCheckedIn, setRosterFilterCheckedIn] = useState<boolean | undefined>(undefined);

  // Fetch Available Events with localStorage persistence and URL sync
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventService.getAllEvents();
        const list: any[] = res?.content || (Array.isArray(res) ? res : []);
        setEvents(list);
        if (list.length > 0) {
          const storedId = localStorage.getItem('ticketer_gate_event_id');
          const targetId = (routeEventId && list.some(e => String(e.eventId || e.id) === routeEventId))
            ? routeEventId
            : (storedId && list.some(e => String(e.eventId || e.id) === storedId))
              ? storedId
              : String(list[0].eventId || list[0].id || '');

          setSelectedEventId(targetId);
          localStorage.setItem('ticketer_gate_event_id', targetId);
          window.history.replaceState(null, '', `/gate/${targetId}`);
        }
      } catch (err) {
        console.error('Failed to load events via eventService, trying fallback:', err);
        try {
          const fallbackRes = await eventService.getUpcomingPublishedEvents(0, 50);
          const fallbackList: any[] = fallbackRes?.content || (Array.isArray(fallbackRes) ? fallbackRes : []);
          setEvents(fallbackList);
          if (fallbackList.length > 0) {
            const storedId = localStorage.getItem('ticketer_gate_event_id');
            const targetId = (routeEventId && fallbackList.some(e => String(e.eventId || e.id) === routeEventId))
              ? routeEventId
              : (storedId && fallbackList.some(e => String(e.eventId || e.id) === storedId))
                ? storedId
                : String(fallbackList[0].eventId || fallbackList[0].id || '');

            setSelectedEventId(targetId);
            localStorage.setItem('ticketer_gate_event_id', targetId);
            window.history.replaceState(null, '', `/gate/${targetId}`);
          }
        } catch (e2) {
          console.error('Failed to load events fallback:', e2);
        }
      }
    };
    fetchEvents();
  }, [routeEventId]);

  // Fetch Schedules for selected event with localStorage persistence
  useEffect(() => {
    if (!selectedEventId) {
      setSchedules([]);
      setSelectedScheduleId('');
      return;
    }
    const fetchSchedules = async () => {
      try {
        const ev = events.find(e => String(e.eventId || e.id) === String(selectedEventId));
        if (ev?.venue?.venueId || ev?.venueId) {
          setVenueId(ev.venue?.venueId || ev.venueId);
        }

        let list: any[] = [];
        try {
          list = await eventScheduleService.getSchedulesForEvent(selectedEventId);
        } catch (e) {
          try {
            list = await eventScheduleService.getBookableSchedulesForEvent(selectedEventId);
          } catch (e2) {
            list = await eventScheduleService.getPublicBookableSchedulesForEvent(selectedEventId);
          }
        }

        const scheduleArray: any[] = Array.isArray(list) ? list : (list as any)?.content || [];
        setSchedules(scheduleArray);
        if (scheduleArray.length > 0) {
          const storedScheduleId = localStorage.getItem(`ticketer_gate_schedule_${selectedEventId}`);
          const targetScheduleId = (routeScheduleId && scheduleArray.some((s: any) => String(s.scheduleId || s.id) === routeScheduleId))
            ? routeScheduleId
            : (storedScheduleId && scheduleArray.some((s: any) => String(s.scheduleId || s.id) === storedScheduleId))
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
        // Play audio if checked in
        if (msg.action === 'CHECKED_IN') {
          playAudioFeedback('SUCCESS', soundEnabled);
        }

        // Live update stats state
        setStats((prev) => {
          if (!prev) return prev;
          const newCheckedIn = Number(msg.totalScheduleCheckedIn);
          const newPending = Math.max(0, prev.totalBooked - newCheckedIn);
          const newPct = prev.totalBooked > 0 ? (newCheckedIn / prev.totalBooked) * 100 : 0;

          // Add to recent check-ins
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

        // Live update attendee roster state
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
      {/* Event and Schedule Selector Bar */}
      <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Grid container spacing={2} alignItems="center">
            {/* Event Select */}
            <Grid item xs={12} sm={5} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="gatescanner-event-label" sx={{ color: 'rgba(255,255,255,0.6)' }}>Event</InputLabel>
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
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.04)',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ff1955' },
                  }}
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

            {/* Schedule Select */}
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="gatescanner-schedule-label" sx={{ color: 'rgba(255,255,255,0.6)' }}>Schedule / Date</InputLabel>
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
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.04)',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ff1955' },
                  }}
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

            {/* Sound Mute & Refresh Button */}
            <Grid item xs={12} sm={3} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1.5, alignItems: 'center' }}>
              <IconButton
                onClick={() => {
                  const newVal = !soundEnabled;
                  setSoundEnabled(newVal);
                  localStorage.setItem('ticketer_gate_sound_enabled', String(newVal));
                }}
                sx={{
                  bgcolor: soundEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: soundEnabled ? '#10b981' : 'rgba(255, 255, 255, 0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                }}
              >
                {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={refreshStatsAndRoster}
                sx={{
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.8)',
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Sync
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KPI Attendance Metrics Bar */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                Total Booked
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', mt: 0.5 }}>
                {stats?.totalBooked ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: '#10b981', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                Checked In (Arrived)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981', mt: 0.5 }}>
                {stats?.totalCheckedIn ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                Pending Arrival
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.5 }}>
                {stats?.totalPendingArrival ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 25, 85, 0.3)', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#ff1955', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                  Arrival Progress
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#fff' }}>
                  {stats?.checkInPercentage ?? 0}%
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#ff1955', mt: 0.5 }}>
                {stats?.checkInPercentage ?? 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats?.checkInPercentage ?? 0}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#ff1955', borderRadius: 3 },
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
        sx={{
          bgcolor: '#111827',
          borderRadius: 2.5,
          p: 0.5,
          border: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTab-root': {
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            borderRadius: 2,
            minHeight: 42,
            '&.Mui-selected': {
              color: '#fff',
              bgcolor: 'rgba(255, 25, 85, 0.18)',
            },
          },
          '& .MuiTabs-indicator': { display: 'none' },
        }}
      >
        <Tab icon={<QrCodeScannerIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Camera Scanner & Entry" />
        <Tab icon={<MapIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Seat Map & Shared Areas" />
        <Tab icon={<ListIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Attendee Roster & Manual Check-In" />
      </Tabs>

      {/* TAB 0: Scanner & Live Entry */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Left Column: QR Scanner & Manual Input */}
          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', fontSize: '1rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
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
              <Box component="form" onSubmit={handleManualSubmit} sx={{ mt: 3 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'block', mb: 0.8 }}>
                  Manual Reference / Ticket Code Entry:
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
                          <SearchIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: '#fff',
                        borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                        '&:hover fieldset': { borderColor: '#ff1955' },
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!manualCode.trim() || scanLoading}
                    sx={{
                      bgcolor: '#ff1955',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      px: 2.5,
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
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `2px solid ${
                    lastScanResult.valid
                      ? lastScanResult.alreadyCheckedIn
                        ? '#f59e0b'
                        : '#10b981'
                      : '#ef4444'
                  }`,
                  borderRadius: 3,
                  p: { xs: 2.5, sm: 3 },
                  mb: 3,
                  boxShadow: `0 8px 32px ${
                    lastScanResult.valid
                      ? lastScanResult.alreadyCheckedIn
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)'
                  }`,
                }}
              >
                {/* Status Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  {lastScanResult.valid ? (
                    lastScanResult.alreadyCheckedIn ? (
                      <WarningIcon sx={{ color: '#f59e0b', fontSize: 36 }} />
                    ) : (
                      <SuccessIcon sx={{ color: '#10b981', fontSize: 36 }} />
                    )
                  ) : (
                    <ErrorIcon sx={{ color: '#ef4444', fontSize: 36 }} />
                  )}
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        color: lastScanResult.valid
                          ? lastScanResult.alreadyCheckedIn
                            ? '#f59e0b'
                            : '#10b981'
                          : '#ef4444',
                        letterSpacing: 0.5,
                      }}
                    >
                      {lastScanResult.valid
                        ? lastScanResult.alreadyCheckedIn
                          ? 'ALREADY CHECKED IN (DUPLICATE ATTEMPT)'
                          : 'ACCESS GRANTED - VERIFIED TICKET'
                        : 'ACCESS DENIED - INVALID PASS'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      {lastScanResult.message}
                    </Typography>
                  </Box>
                </Box>

                {/* Attendee Details Grid */}
                {lastScanResult.customerName && (
                  <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 2, borderRadius: 2, mb: 2 }}>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                          Attendee Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: '#fff' }}>
                          {lastScanResult.customerName}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                          Booking Ref
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#fcd0a5' }}>
                          {lastScanResult.bookingReference}
                        </Typography>
                      </Grid>
                      {lastScanResult.customerNic && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                            NIC Number
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                            {lastScanResult.customerNic}
                          </Typography>
                        </Grid>
                      )}
                      {lastScanResult.customerPhone && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                            Phone
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
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
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                      Verified Seats & Passes:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                      {lastScanResult.allTickets.map((tkt, idx) => (
                        <Box
                          key={tkt.bookingSeatId || idx}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1.2,
                            bgcolor: 'rgba(255,255,255,0.05)',
                            borderRadius: 1.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {tkt.isSharedAreaTicket ? <GroupsIcon sx={{ color: '#10b981', fontSize: 18 }} /> : <SeatIcon sx={{ color: '#ff1955', fontSize: 18 }} />}
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                              {tkt.isSharedAreaTicket
                                ? `Shared Area #${tkt.sharedAreaNumber || 1}`
                                : `Seat ${tkt.seatNumber || tkt.venueSeatId}${tkt.rowLabel ? ` (Row ${tkt.rowLabel})` : ''}`}
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                              ({tkt.ticketCode})
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={tkt.checkedIn ? 'Checked In' : 'Pending'}
                            sx={{
                              bgcolor: tkt.checkedIn ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                              color: tkt.checkedIn ? '#10b981' : '#f59e0b',
                              fontWeight: 700,
                              fontSize: '0.7rem',
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
              <Card sx={{ bgcolor: '#111827', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 3, p: 4, textAlign: 'center', mb: 3 }}>
                <QrCodeScannerIcon sx={{ fontSize: 54, color: 'rgba(255,255,255,0.2)', mb: 1 }} />
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                  Ready to Scan Tickets
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                  Point customer QR codes towards the camera or enter their reference above.
                </Typography>
              </Card>
            )}

            {/* Live Entry Activity Stream */}
            <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                Live Gate Entry Stream
              </Typography>
              <Box sx={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {stats?.recentCheckIns && stats.recentCheckIns.length > 0 ? (
                  stats.recentCheckIns.map((item, idx) => (
                    <Box
                      key={`${item.bookingReference}-${idx}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.2,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        borderRadius: 1.5,
                        borderLeft: '3px solid #10b981',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                          {item.customerName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                          {item.seatIdentifier} • {item.bookingReference}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={item.checkedInAtTime || 'Just now'}
                        sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 3 }}>
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
        <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
                Live Attendance Seat Map
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Real-time SVG visualization. Glowing Emerald Green seats represent checked-in attendees.
              </Typography>
            </Box>

            {/* Shared Areas Headcount Counters */}
            {stats?.sharedAreaBreakdown && Object.keys(stats.sharedAreaBreakdown).length > 0 && (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {Object.values(stats.sharedAreaBreakdown).map((sa) => (
                  <Box
                    key={sa.sharedAreaNumber}
                    sx={{
                      p: 1.2,
                      px: 2,
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, display: 'block' }}>
                      {sa.categoryName} (#{sa.sharedAreaNumber})
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff' }}>
                      {sa.checkedIn} / {sa.booked} Checked In
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {selectedScheduleId && (
            <VenueSeatMap
              eventScheduleId={selectedScheduleId}
              eventId={selectedEventId}
              venueId={venueId}
              mode="attendance"
              enableLiveCheckIn={true}
            />
          )}
        </Card>
      )}

      {/* TAB 2: Attendee Roster & Manual Check-In */}
      {activeTab === 2 && (
        <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, p: { xs: 2, sm: 3 } }}>
          {/* Filter Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="Search by name, reference, ticket code, NIC, phone..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: '100%', sm: 360 },
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  borderRadius: 2,
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === undefined ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(undefined)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', bgcolor: rosterFilterCheckedIn === undefined ? '#ff1955' : undefined }}
              >
                All ({attendees.length})
              </Button>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === true ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', bgcolor: rosterFilterCheckedIn === true ? '#10b981' : undefined }}
              >
                Checked In ({attendees.filter((a) => a.checkedIn).length})
              </Button>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === false ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(false)}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', bgcolor: rosterFilterCheckedIn === false ? '#f59e0b' : undefined }}
              >
                Pending ({attendees.filter((a) => !a.checkedIn).length})
              </Button>
            </Box>
          </Box>

          {/* Roster Table */}
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: 'rgba(255,255,255,0.5)', fontWeight: 700, borderColor: 'rgba(255,255,255,0.08)' } }}>
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
                  <TableRow key={att.bookingSeatId} sx={{ '& td': { color: '#fff', borderColor: 'rgba(255,255,255,0.06)' } }}>
                    <TableCell sx={{ fontWeight: 700 }}>{att.customerName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#fcd0a5' }}>{att.bookingReference}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>{att.ticketCode}</TableCell>
                    <TableCell>
                      {att.isSharedAreaTicket
                        ? `Shared Area #${att.sharedAreaNumber || 1}`
                        : `Seat ${att.seatNumber || att.venueSeatId}${att.rowLabel ? ` (Row ${att.rowLabel})` : ''}`}
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>
                      {att.customerPhone || att.customerNic || att.customerEmail || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={att.checkedIn ? 'Checked In' : 'Pending'}
                        sx={{
                          bgcolor: att.checkedIn ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: att.checkedIn ? '#10b981' : '#f59e0b',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleToggleRosterSeat(att.bookingSeatId, att.checkedIn)}
                        startIcon={att.checkedIn ? <ClearIcon /> : <CheckIcon />}
                        sx={{
                          borderColor: att.checkedIn ? 'rgba(239, 68, 68, 0.4)' : '#10b981',
                          color: att.checkedIn ? '#ef4444' : '#10b981',
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '0.75rem',
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
