import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
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
  Search as SearchIcon,
  Map as MapIcon,
  FormatListBulleted as ListIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import QrScanner from '../../components/QrScanner/QrScanner';
import { VenueSeatMap } from '../../components/VenueSeatMap/VenueSeatMap';
import checkInService, {
  CheckInResponse,
  CheckInStatsResponse,
  CheckInAttendee,
} from '../../services/checkInService';
import eventService from '../../services/event.service';
import eventScheduleService from '../../services/eventSchedule.service';
import seatWebSocketService from '../../services/websocket.service';

export const CheckInDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => localStorage.getItem('ticketer_checkin_event_id') || '');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(() => {
    const savedEvent = localStorage.getItem('ticketer_checkin_event_id');
    return savedEvent ? (localStorage.getItem(`ticketer_checkin_schedule_${savedEvent}`) || '') : '';
  });
  const [venueId, setVenueId] = useState<string>('');

  // Scanner modal
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<CheckInResponse | null>(null);

  // Statistics
  const [stats, setStats] = useState<CheckInStatsResponse | null>(null);

  // Roster
  const [attendees, setAttendees] = useState<CheckInAttendee[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilterCheckedIn, setRosterFilterCheckedIn] = useState<boolean | undefined>(undefined);

  // Load Events with localStorage persistence
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventService.getAllEvents();
        const list: any[] = res?.content || (Array.isArray(res) ? res : []);
        setEvents(list);
        if (list.length > 0) {
          const savedEventId = localStorage.getItem('ticketer_checkin_event_id');
          const matched = savedEventId ? list.find(e => String(e.eventId || e.id) === savedEventId) : null;
          const chosenId = matched ? String(matched.eventId || matched.id) : String(list[0].eventId || list[0].id || '');
          setSelectedEventId(chosenId);
          localStorage.setItem('ticketer_checkin_event_id', chosenId);
        }
      } catch (err) {
        console.error('Failed to load events via eventService, trying fallback:', err);
        try {
          const fallbackRes = await eventService.getUpcomingPublishedEvents(0, 50);
          const fallbackList: any[] = fallbackRes?.content || (Array.isArray(fallbackRes) ? fallbackRes : []);
          setEvents(fallbackList);
          if (fallbackList.length > 0) {
            const savedEventId = localStorage.getItem('ticketer_checkin_event_id');
            const matched = savedEventId ? fallbackList.find(e => String(e.eventId || e.id) === savedEventId) : null;
            const chosenId = matched ? String(matched.eventId || matched.id) : String(fallbackList[0].eventId || fallbackList[0].id || '');
            setSelectedEventId(chosenId);
            localStorage.setItem('ticketer_checkin_event_id', chosenId);
          }
        } catch (e2) {
          console.error('Failed to load events fallback:', e2);
        }
      }
    };
    fetchEvents();
  }, []);

  // Load Schedules with localStorage persistence
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
          const savedScheduleId = localStorage.getItem(`ticketer_checkin_schedule_${selectedEventId}`);
          const matched = savedScheduleId ? scheduleArray.find(s => String(s.scheduleId || s.id) === savedScheduleId) : null;
          const chosenId = matched ? String(matched.scheduleId || matched.id) : String(scheduleArray[0].scheduleId || scheduleArray[0].id || '');
          setSelectedScheduleId(chosenId);
          localStorage.setItem(`ticketer_checkin_schedule_${selectedEventId}`, chosenId);
        } else {
          setSelectedScheduleId('');
        }
      } catch (err) {
        console.error('Failed to load schedules:', err);
      }
    };
    fetchSchedules();
  }, [selectedEventId, events]);

  // Load Stats & Roster
  const refreshData = useCallback(async () => {
    if (!selectedScheduleId) return;
    try {
      const statsData = await checkInService.getScheduleStats(selectedScheduleId);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }

    try {
      const rosterData = await checkInService.getScheduleAttendees(
        selectedScheduleId,
        rosterSearch,
        rosterFilterCheckedIn
      );
      setAttendees(rosterData);
    } catch (err) {
      console.error('Failed to load attendees:', err);
    }
  }, [selectedScheduleId, rosterSearch, rosterFilterCheckedIn]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // WebSocket Live Real-Time Subscription
  useEffect(() => {
    if (!selectedScheduleId) return;

    const unsubscribe = seatWebSocketService.subscribeToSchedule(
      selectedScheduleId,
      (msg) => {
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
  }, [selectedScheduleId]);

  // Handle Scan
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
    } catch (err: any) {
      setLastScanResult({
        valid: false,
        alreadyCheckedIn: false,
        statusType: 'ERROR',
        message: err?.response?.data?.message || 'Verification error.',
      });
    } finally {
      setScanLoading(false);
      refreshData();
    }
  };

  // Toggle Roster Seat Check-In
  const handleToggleRosterSeat = async (bookingSeatId: string, currentState: boolean) => {
    try {
      const newState = !currentState;
      await checkInService.toggleSeatCheckIn(bookingSeatId, newState);
      setAttendees((prev) =>
        prev.map((a) => (a.bookingSeatId === bookingSeatId ? { ...a, checkedIn: newState } : a))
      );
      refreshData();
    } catch (err) {
      console.error('Error toggling seat check-in:', err);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!attendees || attendees.length === 0) return;
    const headers = ['Customer Name', 'Email', 'Phone', 'NIC', 'Booking Ref', 'Ticket Code', 'Seat/Area', 'Checked In', 'Check In Time'];
    const rows = attendees.map((a) => [
      `"${a.customerName || ''}"`,
      `"${a.customerEmail || ''}"`,
      `"${a.customerPhone || ''}"`,
      `"${a.customerNic || ''}"`,
      `"${a.bookingReference || ''}"`,
      `"${a.ticketCode || ''}"`,
      `"${a.isSharedAreaTicket ? `Shared Area #${a.sharedAreaNumber}` : a.seatNumber || a.venueSeatId || ''}"`,
      `"${a.checkedIn ? 'Yes' : 'No'}"`,
      `"${a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendees_${selectedScheduleId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: 0.5 }}>
            Live Attendance & Check-In
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Monitor real-time gate entry, verify QR tickets, and observe the live interactive venue map.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open(`/gate/${selectedEventId || ''}`, '_blank')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              color: 'text.primary',
              borderColor: 'divider',
            }}
          >
            Launch Standalone Gate Kiosk
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<QrCodeScannerIcon />}
            onClick={() => setScannerModalOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#ff1955',
              '&:hover': { bgcolor: '#e0144c' },
            }}
          >
            Open QR Scanner
          </Button>
        </Box>
      </Box>

      {/* Select Event & Schedule Controls */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="checkin-event-label">Event</InputLabel>
                <Select
                  labelId="checkin-event-label"
                  value={selectedEventId || ''}
                  label="Event"
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedEventId(newId);
                    localStorage.setItem('ticketer_checkin_event_id', newId);
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

            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="checkin-schedule-label">Event Schedule / Date</InputLabel>
                <Select
                  labelId="checkin-schedule-label"
                  value={selectedScheduleId || ''}
                  label="Event Schedule / Date"
                  onChange={(e) => {
                    const newScheduleId = e.target.value;
                    setSelectedScheduleId(newScheduleId);
                    if (selectedEventId) {
                      localStorage.setItem(`ticketer_checkin_schedule_${selectedEventId}`, newScheduleId);
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

            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={refreshData}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportCsv}
                disabled={attendees.length === 0}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Export CSV
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Real-time KPIs */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2.5, p: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Booked
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
              {stats?.totalBooked ?? 0}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2.5, p: 2, border: '1px solid rgba(16, 185, 129, 0.3)', bgcolor: 'rgba(16, 185, 129, 0.04)' }}>
            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
              Checked In (Arrived)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#10b981' }}>
              {stats?.totalCheckedIn ?? 0}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2.5, p: 2, border: '1px solid rgba(245, 158, 11, 0.3)', bgcolor: 'rgba(245, 158, 11, 0.04)' }}>
            <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
              Pending Arrival
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#f59e0b' }}>
              {stats?.totalPendingArrival ?? 0}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2.5, p: 2, border: '1px solid rgba(255, 25, 85, 0.3)', bgcolor: 'rgba(255, 25, 85, 0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#ff1955', fontWeight: 700, textTransform: 'uppercase' }}>
                Attendance Rate
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {stats?.checkInPercentage ?? 0}%
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#ff1955' }}>
              {stats?.checkInPercentage ?? 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stats?.checkInPercentage ?? 0}
              sx={{ mt: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#ff1955', borderRadius: 3 } }}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.9rem' },
        }}
      >
        <Tab icon={<MapIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Seat Map & Attendance" />
        <Tab icon={<ListIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Attendee Roster" />
      </Tabs>

      {/* TAB 0: Live Seat Map */}
      {activeTab === 0 && (
        <Card sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
          {selectedScheduleId ? (
            <VenueSeatMap
              eventScheduleId={selectedScheduleId}
              eventId={selectedEventId}
              venueId={venueId}
              mode="attendance"
              enableLiveCheckIn={true}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              Please select an event schedule to view live seat map.
            </Box>
          )}
        </Card>
      )}

      {/* TAB 1: Attendee Roster */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="Search by name, ref, ticket code, phone..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 320 } }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === undefined ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(undefined)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                All ({attendees.length})
              </Button>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === true ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(true)}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: rosterFilterCheckedIn === true ? '#10b981' : undefined }}
              >
                Checked In ({attendees.filter((a) => a.checkedIn).length})
              </Button>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === false ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(false)}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: rosterFilterCheckedIn === false ? '#f59e0b' : undefined }}
              >
                Pending ({attendees.filter((a) => !a.checkedIn).length})
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Booking Ref</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ticket Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Seat / Area</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact Info</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendees.map((att) => (
                  <TableRow key={att.bookingSeatId}>
                    <TableCell sx={{ fontWeight: 700 }}>{att.customerName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{att.bookingReference}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{att.ticketCode}</TableCell>
                    <TableCell>
                      {att.isSharedAreaTicket
                        ? `Shared Area #${att.sharedAreaNumber || 1}`
                        : `Seat ${att.seatNumber || att.venueSeatId}${att.rowLabel ? ` (Row ${att.rowLabel})` : ''}`}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
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

      {/* QR Scanner Popup Dialog */}
      <Dialog
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScannerIcon sx={{ color: '#ff1955' }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Quick QR Gate Scanner</Typography>
          </Box>
          <IconButton onClick={() => setScannerModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <QrScanner
            scannerId="dashboard-quick-scanner"
            isActive={scannerModalOpen}
            onScanSuccess={handleQrScan}
          />

          {lastScanResult && (
            <Box sx={{ mt: 2.5 }}>
              <Alert
                severity={lastScanResult.valid ? (lastScanResult.alreadyCheckedIn ? 'warning' : 'success') : 'error'}
                sx={{ borderRadius: 2 }}
              >
                <Typography sx={{ fontWeight: 800 }}>{lastScanResult.message}</Typography>
                {lastScanResult.customerName && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Attendee: <strong>{lastScanResult.customerName}</strong> ({lastScanResult.bookingReference})
                  </Typography>
                )}
              </Alert>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CheckInDashboard;
