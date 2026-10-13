import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Tooltip,
  Divider,
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
  Shield as ShieldIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  CloudSync as CloudSyncIcon,
  MeetingRoom as GateIcon,
  ReportProblem as ThreatIcon,
  HowToReg as CheckInAllIcon,
} from '@mui/icons-material';
import QrScanner from '../../components/QrScanner/QrScanner';
import { VenueSeatMap } from '../../components/VenueSeatMap/VenueSeatMap';
import checkInService, {
  CheckInResponse,
  CheckInStatsResponse,
  CheckInAttendee,
  OfflineScanItem,
} from '../../services/checkInService';
import seatWebSocketService from '../../services/websocket.service';
import eventService from '../../services/event.service';
import eventScheduleService from '../../services/eventSchedule.service';
import gateStaffService from '../../services/gateStaff.service';
import { useAuth } from '../../context/AuthContext';

// Vibration Feedback via Web Vibration API
const triggerHaptic = (pattern: number[]) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration error on unsupported devices
    }
  }
};

// Web Audio API Sound Generator for Instant Gate Audio Chimes
const playAudioFeedback = (
  type: 'SUCCESS' | 'RE_ENTRY' | 'PASS_OUT' | 'WARNING' | 'ERROR',
  soundEnabled: boolean
) => {
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
    } else if (type === 'RE_ENTRY') {
      // Ascending triple tone for re-entry
      [700, 1000, 1300].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (idx + 1) * 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + (idx + 1) * 0.1);
      });
    } else if (type === 'PASS_OUT') {
      // Soft descending tone for exit/pass-out
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
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
      // ERROR
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

// Modern Glassmorphic Live Connectivity Indicator with Animated Pulse Beacon
const ConnectivityBadge: React.FC<{
  isOnline: boolean;
  isDark: boolean;
  tooltip?: string;
}> = ({ isOnline, isDark, tooltip }) => {
  const defaultTooltip = isOnline
    ? 'Online: Central Verification Active'
    : 'Offline: Operating on Local Cache';

  return (
    <Tooltip title={tooltip || defaultTooltip} arrow>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: { xs: 0.9, sm: 1.1 },
          py: 0.25,
          height: { xs: 24, sm: 26 },
          borderRadius: '9999px',
          bgcolor: isOnline
            ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)')
            : (isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)'),
          border: '1px solid',
          borderColor: isOnline
            ? (isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.35)')
            : (isDark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.35)'),
          boxShadow: isOnline
            ? (isDark ? '0 0 10px rgba(16, 185, 129, 0.15)' : 'none')
            : (isDark ? '0 0 10px rgba(239, 68, 68, 0.15)' : 'none'),
          cursor: 'default',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: isOnline
              ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.14)')
              : (isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.14)'),
          },
        }}
      >
        {/* Pulsing Beacon Dot */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 8,
            height: 8,
            flexShrink: 0,
          }}
        >
          {isOnline && (
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                bgcolor: '#10b981',
                opacity: 0.8,
                animation: 'beaconPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                '@keyframes beaconPulse': {
                  '0%': { transform: 'scale(1)', opacity: 0.8 },
                  '70%, 100%': { transform: 'scale(2.5)', opacity: 0 },
                },
              }}
            />
          )}
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: isOnline ? '#10b981' : '#ef4444',
              boxShadow: isOnline ? '0 0 6px #10b981' : '0 0 6px #ef4444',
            }}
          />
        </Box>

        {/* Live Status Label */}
        <Typography
          sx={{
            fontSize: { xs: '0.64rem', sm: '0.68rem' },
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: isOnline
              ? (isDark ? '#34d399' : '#059669')
              : (isDark ? '#f87171' : '#dc2626'),
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {isOnline ? 'Online' : 'Offline'}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export const GateScanner: React.FC = () => {
  const { eventId: routeEventId, scheduleId: routeScheduleId } = useParams<{ eventId?: string; scheduleId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dark Mode state for Gate Scanner terminal with layout sync & fallback
  const outletContext = useOutletContext<{ isDarkMode?: boolean; toggleDarkMode?: () => void }>() || {};
  const [localDarkMode, setLocalDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ticketer_gate_dark_mode') === 'true';
  });

  const isDarkMode = outletContext.isDarkMode !== undefined ? outletContext.isDarkMode : localDarkMode;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleDarkMode = outletContext.toggleDarkMode || (() => {
    setLocalDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('ticketer_gate_dark_mode', String(next));
      window.dispatchEvent(new CustomEvent('gate-dark-mode-change', { detail: next }));
      return next;
    });
  });

  useEffect(() => {
    const handleSync = (e: any) => {
      if (typeof e.detail === 'boolean') {
        setLocalDarkMode(e.detail);
      }
    };
    window.addEventListener('gate-dark-mode-change', handleSync);
    return () => window.removeEventListener('gate-dark-mode-change', handleSync);
  }, []);

  // High-contrast theme palette tokens for Gate Scanner
  const t = useMemo(() => {
    if (isDarkMode) {
      return {
        isDark: true,
        pageBg: '#090d16',
        cardBg: '#131d31',
        cardBorder: '1px solid rgba(255, 255, 255, 0.08)',
        innerBg: '#0b1120',
        innerBorder: '1px solid rgba(255, 255, 255, 0.08)',
        hoverBg: 'rgba(255, 255, 255, 0.04)',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        divider: 'rgba(255, 255, 255, 0.08)',
        tableHeadBg: '#0b1120',
        tableRowHover: 'rgba(255, 255, 255, 0.03)',
        inputBg: '#0b1120',
        inputBorder: 'rgba(255, 255, 255, 0.15)',
        accentBg: 'rgba(255, 25, 85, 0.15)',
        chipBg: 'rgba(255, 255, 255, 0.06)',
        dialogBg: '#131d31',
      };
    }
    return {
      isDark: false,
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      cardBorder: '1px solid #e2e8f0',
      innerBg: '#f8fafc',
      innerBorder: '1px solid #e2e8f0',
      hoverBg: '#f1f5f9',
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      divider: '#e2e8f0',
      tableHeadBg: '#f8fafc',
      tableRowHover: '#f8fafc',
      inputBg: '#ffffff',
      inputBorder: '#e2e8f0',
      accentBg: 'rgba(255, 25, 85, 0.08)',
      chipBg: '#f1f5f9',
      dialogBg: '#ffffff',
    };
  }, [isDarkMode]);

  // Reusable custom MenuProps for Select dropdown popovers in Dark & Light mode
  const selectMenuProps = useMemo(() => ({
    PaperProps: {
      sx: {
        bgcolor: t.isDark ? '#0f172a' : '#ffffff',
        color: t.textPrimary,
        border: t.cardBorder,
        boxShadow: t.isDark
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        '& .MuiMenuItem-root': {
          fontSize: '0.8rem',
          color: t.textPrimary,
          '&:hover': {
            bgcolor: t.hoverBg,
          },
          '&.Mui-selected': {
            bgcolor: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            fontWeight: 700,
            '&:hover': {
              bgcolor: 'rgba(59, 130, 246, 0.25)',
            },
          },
        },
      },
    },
  }), [t]);

  // Active View Tab: 0 = Scanner & Live Entry, 1 = Live Seat Map Attendance, 2 = Attendee Roster
  const [activeTab, setActiveTab] = useState(0);

  // Sound feedback toggle with persistence
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('ticketer_gate_sound_enabled') !== 'false');

  // Camera active toggle with persistence
  const [isCameraActive, setIsCameraActive] = useState<boolean>(() => localStorage.getItem('ticketer_gate_camera_active') !== 'false');

  // FEATURE 1: Full-Screen Visual Flash feedback
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // FEATURE 3: Pass-Out / Re-Entry Mode Toggle ('CHECK_IN' | 'CHECK_OUT')
  const [scanMode, setScanMode] = useState<'CHECK_IN' | 'CHECK_OUT'>(() => {
    return (localStorage.getItem('ticketer_gate_scan_mode') as 'CHECK_IN' | 'CHECK_OUT') || 'CHECK_IN';
  });

  // FEATURE 5: Gate Station Identifier
  const [gateName, setGateName] = useState<string>(() => {
    return localStorage.getItem('ticketer_gate_name') || 'Gate 1 - Main';
  });
  const [hasAssignedGate, setHasAssignedGate] = useState<boolean>(false);

  // FEATURE 7: Offline Mode & Low-Connectivity Sync
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // FEATURE 2: Group & Partial Check-In Modal State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupBookingData, setGroupBookingData] = useState<CheckInResponse | null>(null);
  const [selectedTicketCodes, setSelectedTicketCodes] = useState<string[]>([]);
  const [groupSubmitting, setGroupSubmitting] = useState(false);

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

  // Synchronize route param changes with state
  useEffect(() => {
    if (routeEventId && routeEventId !== selectedEventId) {
      setSelectedEventId(routeEventId);
    }
  }, [routeEventId, selectedEventId]);

  useEffect(() => {
    if (routeScheduleId && routeScheduleId !== selectedScheduleId) {
      setSelectedScheduleId(routeScheduleId);
    }
  }, [routeScheduleId, selectedScheduleId]);

  // Unified Event & Schedule Selection Handlers
  const handleEventChange = useCallback((newId: string) => {
    if (!newId || newId === selectedEventId) return;
    setSelectedEventId(newId);
    setSelectedScheduleId('');
    setSchedules([]);
    setStats(null);
    setAttendees([]);
    setLastScanResult(null);
    localStorage.setItem('ticketer_gate_event_id', newId);
    navigate(`/gate/${newId}`, { replace: true });
  }, [navigate, selectedEventId]);

  const handleScheduleChange = useCallback((newScheduleId: string) => {
    if (!newScheduleId || newScheduleId === selectedScheduleId) return;
    setSelectedScheduleId(newScheduleId);
    setStats(null);
    setAttendees([]);
    setLastScanResult(null);
    if (selectedEventId) {
      localStorage.setItem(`ticketer_gate_schedule_${selectedEventId}`, newScheduleId);
      navigate(`/gate/${selectedEventId}/${newScheduleId}`, { replace: true });
    }
  }, [navigate, selectedEventId, selectedScheduleId]);

  // Trigger Full-Screen Visual Flash
  const triggerVisualFlash = (color: string) => {
    setFlashColor(color);
    setTimeout(() => {
      setFlashColor(null);
    }, 750);
  };

  // Helper to load offline queue count
  const updateOfflineQueueCount = useCallback((scheduleId: string) => {
    if (!scheduleId) return;
    try {
      const raw = localStorage.getItem(`ticketer_offline_queue_${scheduleId}`);
      const items: OfflineScanItem[] = raw ? JSON.parse(raw) : [];
      setOfflineQueueCount(items.length);
    } catch {
      setOfflineQueueCount(0);
    }
  }, []);

  // Listen for online/offline status changes and sync offline queue
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (selectedScheduleId) {
        handleFlushOfflineQueue();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (selectedScheduleId) {
      updateOfflineQueueCount(selectedScheduleId);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScheduleId, updateOfflineQueueCount]);

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
          navigate(`/gate/${targetId}`, { replace: true });
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
  }, [navigate, routeEventId, user?.role, userRoleStr]);

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
          updateOfflineQueueCount(targetScheduleId);
          if (targetScheduleId && routeScheduleId !== targetScheduleId) {
            navigate(`/gate/${selectedEventId}/${targetScheduleId}`, { replace: true });
          }
        } else {
          setSelectedScheduleId('');
          setStats(null);
          setAttendees([]);
        }
      } catch (err) {
        console.error('Failed to load event schedules:', err);
      }
    };
    fetchSchedules();
  }, [navigate, selectedEventId, events, routeScheduleId, updateOfflineQueueCount]);

  // Load stats and attendees when schedule changes + Cache offline roster
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

      // FEATURE 7: Cache roster in localStorage for offline verification fallback
      if (rosterData && rosterData.length > 0 && !rosterSearch && rosterFilterCheckedIn === undefined) {
        try {
          localStorage.setItem(`ticketer_offline_roster_${selectedScheduleId}`, JSON.stringify(rosterData));
        } catch (e) {
          console.warn('Could not cache offline roster to localStorage (quota exceeded):', e);
        }
      }
    } catch (err) {
      console.error('Error loading attendees:', err);
      // If offline, attempt loading from cached roster
      if (!navigator.onLine) {
        try {
          const cached = localStorage.getItem(`ticketer_offline_roster_${selectedScheduleId}`);
          if (cached) {
            setAttendees(JSON.parse(cached));
          }
        } catch (cacheErr) {
          console.warn('Failed to load cached roster:', cacheErr);
        }
      }
    }
    updateOfflineQueueCount(selectedScheduleId);
  }, [selectedScheduleId, rosterSearch, rosterFilterCheckedIn, updateOfflineQueueCount]);

  useEffect(() => {
    refreshStatsAndRoster();
  }, [refreshStatsAndRoster]);

  // Fetch active gate assignment configured by admin for logged-in staff member
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchAssignmentDetails = async () => {
      try {
        const assignments = await gateStaffService.getMyAssignmentDetails({
          eventId: selectedEventId,
          scheduleId: selectedScheduleId || undefined,
        });

        if (Array.isArray(assignments) && assignments.length > 0) {
          const matched = assignments.find((a) => a.gateName && a.gateName.trim()) || assignments[0];
          if (matched && matched.gateName && matched.gateName.trim()) {
            setGateName(matched.gateName.trim());
            setHasAssignedGate(true);
            localStorage.setItem('ticketer_gate_name', matched.gateName.trim());
          }
        }
      } catch (e) {
        console.warn('Could not load staff assignment details:', e);
      }
    };

    fetchAssignmentDetails();
  }, [selectedEventId, selectedScheduleId]);

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

  // FEATURE 7: Handle Flushing Queued Offline Scans to Server
  const handleFlushOfflineQueue = async () => {
    if (!selectedScheduleId || syncingOffline) return;
    try {
      const raw = localStorage.getItem(`ticketer_offline_queue_${selectedScheduleId}`);
      const queue: OfflineScanItem[] = raw ? JSON.parse(raw) : [];
      if (queue.length === 0) {
        setSyncNotice('No pending offline scans to sync.');
        return;
      }

      setSyncingOffline(true);
      const res = await checkInService.syncOfflineScans({
        eventScheduleId: selectedScheduleId,
        eventId: selectedEventId,
        gateName,
        scans: queue,
      });

      // Clear synced queue
      localStorage.removeItem(`ticketer_offline_queue_${selectedScheduleId}`);
      setOfflineQueueCount(0);
      setSyncNotice(
        `Offline Sync Complete: ${res.successfullySynced} synchronized, ${res.duplicatesSkipped} already recorded.`
      );
      playAudioFeedback('SUCCESS', soundEnabled);
      refreshStatsAndRoster();
    } catch (err: any) {
      console.error('Failed to sync offline scans:', err);
      setSyncNotice('Could not sync offline queue. Server may still be unreachable.');
    } finally {
      setSyncingOffline(false);
    }
  };

  // FEATURE 7: Offline Local Verification Fallback Helper
  const processOfflineScan = (qrData: string): CheckInResponse => {
    try {
      const cachedRosterRaw = localStorage.getItem(`ticketer_offline_roster_${selectedScheduleId}`);
      const cachedRoster: CheckInAttendee[] = cachedRosterRaw ? JSON.parse(cachedRosterRaw) : attendees;

      let codeToFind = qrData.trim();
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.ticketCode) codeToFind = parsed.ticketCode;
        else if (parsed.bookingRef) codeToFind = parsed.bookingRef;
      } catch {
        // Plain string
      }

      const match = cachedRoster.find(
        (a) =>
          a.ticketCode?.toUpperCase() === codeToFind.toUpperCase() ||
          a.bookingReference?.toUpperCase() === codeToFind.toUpperCase() ||
          qrData.includes(a.ticketCode)
      );

      if (!match) {
        return {
          valid: false,
          alreadyCheckedIn: false,
          statusType: 'ERROR',
          message: 'Offline Verification: Ticket code not found in locally cached roster. Reconnect to verify online.',
        };
      }

      // Record in offline queue
      const rawQueue = localStorage.getItem(`ticketer_offline_queue_${selectedScheduleId}`);
      const currentQueue: OfflineScanItem[] = rawQueue ? JSON.parse(rawQueue) : [];
      const newQueueItem: OfflineScanItem = {
        qrData,
        ticketCode: match.ticketCode,
        offlineTimestamp: Date.now(),
        scanMode,
      };
      currentQueue.push(newQueueItem);
      localStorage.setItem(`ticketer_offline_queue_${selectedScheduleId}`, JSON.stringify(currentQueue));
      setOfflineQueueCount(currentQueue.length);

      // Update local memory roster
      setAttendees((prev) =>
        prev.map((a) =>
          a.bookingSeatId === match.bookingSeatId
            ? { ...a, checkedIn: scanMode === 'CHECK_IN', checkedInAt: new Date().toISOString() }
            : a
        )
      );

      return {
        valid: true,
        alreadyCheckedIn: match.checkedIn && scanMode === 'CHECK_IN',
        statusType: scanMode === 'CHECK_OUT' ? 'CHECKED_OUT' : match.checkedIn ? 'ALREADY_CHECKED_IN' : 'SUCCESS',
        message:
          scanMode === 'CHECK_OUT'
            ? 'OFFLINE PASS-OUT RECORDED: Queued for sync once reconnected.'
            : match.checkedIn
            ? 'OFFLINE WARNING: Ticket was already marked checked-in locally.'
            : 'OFFLINE ACCESS GRANTED: Verified against cached roster. Queued for server sync.',
        customerName: match.customerName,
        bookingReference: match.bookingReference,
        customerPhone: match.customerPhone,
        customerNic: match.customerNic,
        signatureValid: true,
        allTickets: [
          {
            bookingSeatId: match.bookingSeatId,
            ticketCode: match.ticketCode,
            venueSeatId: match.venueSeatId,
            seatNumber: match.seatNumber,
            rowLabel: match.rowLabel,
            isSharedAreaTicket: match.isSharedAreaTicket,
            sharedAreaNumber: match.sharedAreaNumber,
            categoryName: match.categoryName,
            checkedIn: true,
          },
        ],
      };
    } catch (e: any) {
      return {
        valid: false,
        alreadyCheckedIn: false,
        statusType: 'ERROR',
        message: 'Offline verification error: ' + (e?.message || 'Storage error'),
      };
    }
  };

  // Main Handle QR / Ticket Scan Logic
  const handleQrScan = async (decodedText: string, specificTicketCodes?: string[]) => {
    if (scanLoading) return;
    setScanLoading(true);

    if (!selectedEventId) {
      setLastScanResult({
        valid: false,
        alreadyCheckedIn: false,
        statusType: 'ERROR',
        message: 'Please select an event before scanning tickets.',
      });
      playAudioFeedback('ERROR', soundEnabled);
      setScanLoading(false);
      return;
    }

    // Offline check fallback
    if (!navigator.onLine) {
      const offlineRes = processOfflineScan(decodedText);
      setLastScanResult(offlineRes);
      if (offlineRes.valid) {
        if (offlineRes.statusType === 'CHECKED_OUT') {
          playAudioFeedback('PASS_OUT', soundEnabled);
          triggerHaptic([180]);
          triggerVisualFlash('rgba(168, 85, 247, 0.45)');
        } else if (offlineRes.alreadyCheckedIn) {
          playAudioFeedback('WARNING', soundEnabled);
          triggerHaptic([200, 100, 200]);
          triggerVisualFlash('rgba(245, 158, 11, 0.45)');
        } else {
          playAudioFeedback('SUCCESS', soundEnabled);
          triggerHaptic([100, 50, 100]);
          triggerVisualFlash('rgba(16, 185, 129, 0.45)');
        }
      } else {
        playAudioFeedback('ERROR', soundEnabled);
        triggerHaptic([400, 100, 400]);
        triggerVisualFlash('rgba(239, 68, 68, 0.55)');
      }
      setScanLoading(false);
      return;
    }

    try {
      const effectiveScheduleId =
        selectedScheduleId ||
        schedules[0]?.scheduleId ||
        schedules[0]?.id ||
        currentEvent?.eventSchedules?.[0]?.scheduleId ||
        undefined;

      const response = await checkInService.scanTicket({
        qrData: decodedText,
        eventScheduleId: effectiveScheduleId,
        eventId: selectedEventId || undefined,
        checkInAll: specificTicketCodes ? false : false,
        selectedTicketCodes: specificTicketCodes,
        scanMode: scanMode,
        gateName: gateName,
      });

      // FEATURE 2: Check if this booking requires Guest Selection Modal (e.g. party scanned, some or all unchecked)
      if (response.requiresGuestSelection && response.allTickets && response.allTickets.length > 1) {
        setGroupBookingData(response);
        // Pre-select tickets that are not yet checked in
        const pendingCodes = response.allTickets
          .filter((t) => !t.checkedIn)
          .map((t) => t.ticketCode);
        setSelectedTicketCodes(pendingCodes.length > 0 ? pendingCodes : response.allTickets.map((t) => t.ticketCode));
        setGroupModalOpen(true);
        setLastScanResult(response);
        playAudioFeedback('WARNING', soundEnabled);
        triggerHaptic([150, 50, 150]);
        setScanLoading(false);
        return;
      }

      setLastScanResult(response);

      // FEATURE 1, 3, 5, 6: Audio, Haptics & Full-Screen Flash Feedback based on status
      if (response.statusType === 'CLONED_SUSPECT') {
        // High alert cloned / velocity scan
        playAudioFeedback('ERROR', soundEnabled);
        triggerHaptic([400, 100, 400, 100, 400]);
        triggerVisualFlash('rgba(239, 68, 68, 0.6)');
      } else if (response.statusType === 'WRONG_GATE') {
        // Wrong gate / zone access restriction
        playAudioFeedback('ERROR', soundEnabled);
        triggerHaptic([300, 100, 300]);
        triggerVisualFlash('rgba(239, 68, 68, 0.55)');
      } else if (response.statusType === 'FORGED_SIGNATURE') {
        // Tampered QR code signature
        playAudioFeedback('ERROR', soundEnabled);
        triggerHaptic([500, 100, 500]);
        triggerVisualFlash('rgba(239, 68, 68, 0.6)');
      } else if (response.statusType === 'CHECKED_OUT') {
        // Pass-out recorded
        playAudioFeedback('PASS_OUT', soundEnabled);
        triggerHaptic([180]);
        triggerVisualFlash('rgba(168, 85, 247, 0.45)');
      } else if (response.statusType === 'RE_ENTRY_APPROVED') {
        // Re-entry approved
        playAudioFeedback('RE_ENTRY', soundEnabled);
        triggerHaptic([150, 50, 150, 50, 200]);
        triggerVisualFlash('rgba(6, 182, 212, 0.45)');
      } else if (response.valid) {
        if (response.alreadyCheckedIn) {
          playAudioFeedback('WARNING', soundEnabled);
          triggerHaptic([200, 100, 200]);
          triggerVisualFlash('rgba(245, 158, 11, 0.45)');
        } else {
          playAudioFeedback('SUCCESS', soundEnabled);
          triggerHaptic([100, 50, 100]);
          triggerVisualFlash('rgba(16, 185, 129, 0.45)');
        }
      } else {
        playAudioFeedback('ERROR', soundEnabled);
        triggerHaptic([400, 100, 400]);
        triggerVisualFlash('rgba(239, 68, 68, 0.55)');
      }
    } catch (err: any) {
      // If network failure occurred, attempt offline fallback
      if (!err.response) {
        const offlineRes = processOfflineScan(decodedText);
        setLastScanResult(offlineRes);
        playAudioFeedback(offlineRes.valid ? 'SUCCESS' : 'ERROR', soundEnabled);
        triggerVisualFlash(offlineRes.valid ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.55)');
      } else {
        playAudioFeedback('ERROR', soundEnabled);
        triggerHaptic([400, 100, 400]);
        triggerVisualFlash('rgba(239, 68, 68, 0.55)');
        setLastScanResult({
          valid: false,
          alreadyCheckedIn: false,
          statusType: 'ERROR',
          message: err?.response?.data?.message || 'Verification failed. Could not validate ticket.',
        });
      }
    } finally {
      setScanLoading(false);
      if (selectedScheduleId) {
        refreshStatsAndRoster();
      }
    }
  };

  // Submit Partial Group Check-In Selection
  const handleConfirmGroupCheckIn = async (checkInAll: boolean = false) => {
    if (!groupBookingData) return;
    setGroupSubmitting(true);
    try {
      const targetCodes = checkInAll
        ? groupBookingData.allTickets?.map((t) => t.ticketCode) || []
        : selectedTicketCodes;

      const response = await checkInService.scanTicket({
        qrData: groupBookingData.bookingReference || groupBookingData.bookingId || '',
        eventScheduleId: selectedScheduleId || undefined,
        eventId: selectedEventId || undefined,
        checkInAll: checkInAll,
        selectedTicketCodes: targetCodes,
        scanMode: scanMode,
        gateName: gateName,
      });

      setLastScanResult(response);
      setGroupModalOpen(false);
      setGroupBookingData(null);

      playAudioFeedback('SUCCESS', soundEnabled);
      triggerHaptic([100, 50, 100]);
      triggerVisualFlash('rgba(16, 185, 129, 0.45)');
      refreshStatsAndRoster();
    } catch (err: any) {
      playAudioFeedback('ERROR', soundEnabled);
      triggerHaptic([400, 100, 400]);
    } finally {
      setGroupSubmitting(false);
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
      triggerVisualFlash(newState ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)');
      refreshStatsAndRoster();
    } catch (err) {
      console.error('Error toggling seat check-in:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, position: 'relative' }}>
      {/* FEATURE 1: Full-Screen Visual Pulse Flash Overlay */}
      {flashColor && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            pointerEvents: 'none',
            bgcolor: flashColor,
            animation: 'gateScannerFlash 0.75s cubic-bezier(0.1, 0.9, 0.2, 1) forwards',
            '@keyframes gateScannerFlash': {
              '0%': { opacity: 0.95 },
              '100%': { opacity: 0 },
            },
          }}
        />
      )}

      {/* Sync Notice Alert */}
      {syncNotice && (
        <Alert
          severity="info"
          onClose={() => setSyncNotice(null)}
          sx={{ borderRadius: 2, border: '1px solid #bae6fd' }}
        >
          {syncNotice}
        </Alert>
      )}

      {/* No Assigned Events Warning Banner */}
      {!eventsLoading && events.length === 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>No Active Event Assignments</AlertTitle>
          There are currently no events or schedules assigned to your account. Please ask the event administrator or supervisor to assign you to an event schedule.
        </Alert>
      )}

      {/* Top Header Card: Assigned Event & Schedule + Controls */}
      <Card sx={{ bgcolor: t.cardBg, border: t.cardBorder, borderRadius: { xs: 2, sm: 3 }, boxShadow: t.isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.05)', mb: { xs: 1.5, sm: 2.5 } }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {isGateStaff ? (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 1.2, md: 2 }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
              {/* Event & Venue Info + Quick Tools Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%', minWidth: 0 }}>
                {/* Event Name & Venue Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      width: { xs: 34, sm: 38 },
                      height: { xs: 34, sm: 38 },
                      borderRadius: 1.5,
                      bgcolor: t.accentBg,
                      color: '#ff1955',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <EventIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#ff1955', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.5, display: 'block', lineHeight: 1 }}>
                      Assigned Event
                    </Typography>
                    <Typography variant="subtitle2" noWrap sx={{ color: t.textPrimary, fontWeight: 800, fontSize: { xs: '0.9rem', sm: '1rem' }, lineHeight: 1.2 }}>
                      {currentEvent ? (currentEvent.name || currentEvent.title) : eventsLoading ? 'Loading event...' : 'Assigned Event'}
                    </Typography>
                    {currentEvent?.venue?.name && (
                      <Typography variant="caption" noWrap sx={{ color: t.textSecondary, fontSize: '0.72rem', display: 'block', lineHeight: 1.1 }}>
                        {currentEvent.venue.name}
                      </Typography>
                    )}
                  </Box>

                  {/* Event Selector if assigned multiple events */}
                  {events.length > 1 && (
                    <FormControl size="small" sx={{ minWidth: 95, flexShrink: 0 }}>
                      <Select
                        value={selectedEventId || ''}
                        onChange={(e) => handleEventChange(String(e.target.value))}
                        MenuProps={selectMenuProps}
                        sx={{ height: 28, fontSize: '0.72rem', borderRadius: 1.5, bgcolor: t.innerBg, color: t.textPrimary, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider } }}
                      >
                        {events.map((ev) => (
                          <MenuItem key={ev.eventId || ev.id} value={String(ev.eventId || ev.id)}>
                            {ev.name || ev.title}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>

                {/* Sound, Theme & Offline Sync Controls */}
                <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', flexShrink: 0 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newVal = !soundEnabled;
                      setSoundEnabled(newVal);
                      localStorage.setItem('ticketer_gate_sound_enabled', String(newVal));
                    }}
                    sx={{
                      bgcolor: soundEnabled ? 'rgba(16, 185, 129, 0.15)' : t.chipBg,
                      color: soundEnabled ? '#10b981' : t.textSecondary,
                      border: t.cardBorder,
                      borderRadius: 1.5,
                      p: 0.6,
                    }}
                  >
                    {soundEnabled ? <VolumeUpIcon sx={{ fontSize: 17 }} /> : <VolumeOffIcon sx={{ fontSize: 17 }} />}
                  </IconButton>

                  {/* Modern Glassmorphic Connectivity Status Badge */}
                  <ConnectivityBadge isOnline={isOnline} isDark={t.isDark} />

                  {/* Offline Queue Sync Button */}
                  {offlineQueueCount > 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      color="warning"
                      startIcon={<CloudSyncIcon sx={{ fontSize: '0.95rem !important' }} />}
                      onClick={handleFlushOfflineQueue}
                      disabled={syncingOffline || !isOnline}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        py: 0.3,
                        px: 0.8,
                      }}
                    >
                      Sync ({offlineQueueCount})
                    </Button>
                  )}

                  <IconButton
                    size="small"
                    onClick={refreshStatsAndRoster}
                    sx={{
                      color: t.textPrimary,
                      border: t.cardBorder,
                      borderRadius: 1.5,
                      p: 0.6,
                      '&:hover': {
                        borderColor: '#ff1955',
                        color: '#ff1955',
                        bgcolor: t.accentBg,
                      },
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Schedule Info Box & Active Status */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  p: { xs: 0.8, sm: 1 },
                  bgcolor: t.innerBg,
                  borderRadius: 2,
                  border: t.innerBorder,
                  width: { xs: '100%', md: 'auto' },
                  minWidth: { md: 240 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: 1.2,
                      bgcolor: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <TimeIcon sx={{ fontSize: 15 }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.3, display: 'block', lineHeight: 1 }}>
                      Showtime
                    </Typography>
                    {schedules.length <= 1 && (
                      <Typography variant="body2" noWrap sx={{ color: t.textPrimary, fontWeight: 700, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                        {currentSchedule
                          ? `${currentSchedule.scheduleDate || currentSchedule.date || ''} (${String(currentSchedule.startTime || currentSchedule.scheduleStartTime || '').slice(0, 5)}${currentSchedule.endTime ? ' - ' + String(currentSchedule.endTime).slice(0, 5) : ''})`
                          : (schedules.length === 0 ? 'All Showtimes' : 'Showtime Assigned')}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Gate Active status badge or schedule dropdown */}
                {schedules.length > 1 ? (
                  <FormControl size="small" sx={{ minWidth: { xs: 170, sm: 160 }, flexShrink: 0 }}>
                    <Select
                      value={selectedScheduleId || ''}
                      onChange={(e) => handleScheduleChange(String(e.target.value))}
                      MenuProps={selectMenuProps}
                      sx={{
                        height: 28,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 1.5,
                        bgcolor: t.cardBg,
                        color: t.textPrimary,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider },
                      }}
                    >
                      {schedules.map((sc) => (
                        <MenuItem key={sc.scheduleId || sc.id} value={String(sc.scheduleId || sc.id)}>
                          {`${sc.scheduleDate || sc.date || ''} (${String(sc.startTime || '').slice(0, 5)})`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(16, 185, 129, 0.15)', px: 0.8, py: 0.2, borderRadius: 1.2, flexShrink: 0 }}>
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
              <Grid item xs={12} sm={4} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="gatescanner-event-label" sx={{ color: t.textSecondary }}>Event</InputLabel>
                  <Select
                    labelId="gatescanner-event-label"
                    value={selectedEventId || ''}
                    label="Event"
                    onChange={(e) => handleEventChange(String(e.target.value))}
                    MenuProps={selectMenuProps}
                    displayEmpty
                    sx={{ bgcolor: t.inputBg, color: t.textPrimary, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider } }}
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
                  <InputLabel id="gatescanner-schedule-label" sx={{ color: t.textSecondary }}>Schedule / Date</InputLabel>
                  <Select
                    labelId="gatescanner-schedule-label"
                    value={selectedScheduleId || ''}
                    label="Schedule / Date"
                    onChange={(e) => handleScheduleChange(String(e.target.value))}
                    MenuProps={selectMenuProps}
                    displayEmpty
                    sx={{ bgcolor: t.inputBg, color: t.textPrimary, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider } }}
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

              <Grid item xs={12} sm={4} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newVal = !soundEnabled;
                    setSoundEnabled(newVal);
                    localStorage.setItem('ticketer_gate_sound_enabled', String(newVal));
                  }}
                  sx={{
                    bgcolor: soundEnabled ? 'rgba(16, 185, 129, 0.15)' : t.chipBg,
                    color: soundEnabled ? '#10b981' : t.textSecondary,
                    border: t.cardBorder,
                    borderRadius: 1.5,
                  }}
                >
                  {soundEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                </IconButton>

                {/* Modern Glassmorphic Connectivity Status Badge */}
                <ConnectivityBadge isOnline={isOnline} isDark={t.isDark} />

                {offlineQueueCount > 0 && (
                  <Button
                    variant="contained"
                    size="small"
                    color="warning"
                    startIcon={<CloudSyncIcon sx={{ fontSize: '0.95rem !important' }} />}
                    onClick={handleFlushOfflineQueue}
                    disabled={syncingOffline || !isOnline}
                    sx={{
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      py: 0.3,
                      px: 1,
                    }}
                  >
                    Sync ({offlineQueueCount})
                  </Button>
                )}

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={refreshStatsAndRoster}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    color: t.textPrimary,
                    borderColor: t.divider,
                    '&:hover': {
                      borderColor: '#ff1955',
                      color: '#ff1955',
                      bgcolor: t.accentBg,
                    },
                  }}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          )}

          {/* FEATURE 3: Operational Gate Controls Bar (Mode Switcher & Assigned Gate Post) */}
          <Divider sx={{ my: 1.5, borderColor: t.divider }} />
          <Grid container rowSpacing={{ xs: 2, sm: 1.5 }} columnSpacing={2} alignItems="center">
            {/* Mode Switcher: Entry vs Pass-Out */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', bgcolor: t.innerBg, border: t.innerBorder, p: 0.35, borderRadius: 2, width: '100%' }}>
                <Button
                  size="small"
                  variant={scanMode === 'CHECK_IN' ? 'contained' : 'text'}
                  startIcon={<LoginIcon sx={{ fontSize: '15px !important' }} />}
                  onClick={() => {
                    setScanMode('CHECK_IN');
                    localStorage.setItem('ticketer_gate_scan_mode', 'CHECK_IN');
                  }}
                  sx={{
                    flex: 1,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    py: { xs: 0.6, sm: 0.5 },
                    px: { xs: 1, sm: 1.5 },
                    textTransform: 'none',
                    borderRadius: 1.5,
                    bgcolor: scanMode === 'CHECK_IN' ? '#10b981' : 'transparent',
                    color: scanMode === 'CHECK_IN' ? '#fff' : t.textSecondary,
                    boxShadow: scanMode === 'CHECK_IN' ? '0 1px 3px rgba(16,185,129,0.3)' : 'none',
                    '&:hover': {
                      bgcolor: scanMode === 'CHECK_IN' ? '#059669' : t.hoverBg,
                    },
                  }}
                >
                  Entry (Check-In)
                </Button>
                <Button
                  size="small"
                  variant={scanMode === 'CHECK_OUT' ? 'contained' : 'text'}
                  startIcon={<LogoutIcon sx={{ fontSize: '15px !important' }} />}
                  onClick={() => {
                    setScanMode('CHECK_OUT');
                    localStorage.setItem('ticketer_gate_scan_mode', 'CHECK_OUT');
                  }}
                  sx={{
                    flex: 1,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    py: { xs: 0.6, sm: 0.5 },
                    px: { xs: 1, sm: 1.5 },
                    textTransform: 'none',
                    borderRadius: 1.5,
                    bgcolor: scanMode === 'CHECK_OUT' ? '#8b5cf6' : 'transparent',
                    color: scanMode === 'CHECK_OUT' ? '#fff' : t.textSecondary,
                    boxShadow: scanMode === 'CHECK_OUT' ? '0 1px 3px rgba(139,92,246,0.3)' : 'none',
                    '&:hover': {
                      bgcolor: scanMode === 'CHECK_OUT' ? '#7c3aed' : t.hoverBg,
                    },
                  }}
                >
                  Pass-Out (Exit)
                </Button>
              </Box>
            </Grid>

            {/* Station / Gate Identifier */}
            <Grid item xs={12} sm={6}>
              {isGateStaff ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    minHeight: 40,
                    bgcolor: t.inputBg,
                    border: '1px solid',
                    borderColor: hasAssignedGate ? 'rgba(16, 185, 129, 0.4)' : t.divider,
                    borderRadius: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: t.textSecondary, fontSize: '0.65rem', display: 'block', lineHeight: 1 }}>
                      Station / Gate Name
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: t.textPrimary, fontSize: '0.84rem', mt: 0.2 }} noWrap>
                      {gateName || 'Default Gate'}
                    </Typography>
                  </Box>
                  <Tooltip title={hasAssignedGate ? "Station assigned by Event Administrator" : "Operating on assigned gate post"} arrow>
                    <Chip
                      label={hasAssignedGate ? "Assigned" : "Active"}
                      size="small"
                      color={hasAssignedGate ? "success" : "default"}
                      sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }}
                    />
                  </Tooltip>
                </Box>
              ) : (
                <TextField
                  fullWidth
                  size="small"
                  label="Station / Gate Name"
                  value={gateName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGateName(val);
                    localStorage.setItem('ticketer_gate_name', val);
                  }}
                  placeholder="e.g. Gate 1 - Main"
                  helperText={hasAssignedGate ? "Assigned by Admin (Override enabled for Admins)" : undefined}
                  sx={{
                    bgcolor: t.inputBg,
                    borderRadius: 1.5,
                    '& input': { fontSize: '0.8rem', py: 0.8, color: t.textPrimary },
                    '& label': { fontSize: '0.75rem', color: t.textSecondary },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider },
                  }}
                />
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KPI Attendance Metrics Grid - Perfectly Symmetrical CSS Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.2, sm: 2 },
          mb: { xs: 1.5, sm: 2.5 },
          width: '100%',
        }}
      >
        {/* Total Booked */}
        <Card
          sx={{
            bgcolor: t.cardBg,
            border: t.cardBorder,
            borderRadius: 2,
            boxShadow: t.isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardContent sx={{ p: { xs: 1.2, sm: 1.8 }, '&:last-child': { pb: { xs: 1.2, sm: 1.8 } }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' }, display: 'block' }}>
              Total Booked
            </Typography>
            <Typography sx={{ fontWeight: 800, color: t.textPrimary, mt: 0.3, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
              {stats?.totalBooked ?? 0}
            </Typography>
          </CardContent>
        </Card>

        {/* Checked In */}
        <Card
          sx={{
            bgcolor: t.cardBg,
            border: t.cardBorder,
            borderRadius: 2,
            boxShadow: t.isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardContent sx={{ p: { xs: 1.2, sm: 1.8 }, '&:last-child': { pb: { xs: 1.2, sm: 1.8 } }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#10b981', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' }, display: 'block' }}>
              Checked In
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#10b981', mt: 0.3, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
              {stats?.totalCheckedIn ?? 0}
            </Typography>
          </CardContent>
        </Card>

        {/* Pending Arrival */}
        <Card
          sx={{
            bgcolor: t.cardBg,
            border: t.cardBorder,
            borderRadius: 2,
            boxShadow: t.isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardContent sx={{ p: { xs: 1.2, sm: 1.8 }, '&:last-child': { pb: { xs: 1.2, sm: 1.8 } }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' }, display: 'block' }}>
              Pending Arrival
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.3, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
              {stats?.totalPendingArrival ?? 0}
            </Typography>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card
          sx={{
            bgcolor: t.cardBg,
            border: t.cardBorder,
            borderRadius: 2,
            boxShadow: t.isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardContent sx={{ p: { xs: 1.2, sm: 1.8 }, '&:last-child': { pb: { xs: 1.2, sm: 1.8 } }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#ff1955', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.3, fontSize: { xs: '0.62rem', sm: '0.72rem' }, display: 'block' }}>
              Progress
            </Typography>
            <Box>
              <Typography sx={{ fontWeight: 800, color: '#ff1955', mt: 0.3, fontSize: { xs: '1.2rem', sm: '1.5rem' }, lineHeight: 1.1 }}>
                {stats?.checkInPercentage ?? 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats?.checkInPercentage ?? 0}
                sx={{
                  mt: 0.6,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: t.innerBg,
                  '& .MuiLinearProgress-bar': { bgcolor: '#ff1955', borderRadius: 2 },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          bgcolor: t.cardBg,
          borderRadius: 2,
          p: 0.5,
          mb: { xs: 1.5, sm: 2.5 },
          border: t.cardBorder,
          boxShadow: t.isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
          minHeight: { xs: 38, sm: 44 },
          '& .MuiTab-root': {
            color: t.textSecondary,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
            borderRadius: 1.5,
            minHeight: { xs: 34, sm: 40 },
            py: 0.5,
            px: { xs: 1.2, sm: 2 },
            '&.Mui-selected': {
              color: '#ff1955',
              bgcolor: t.accentBg,
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
        <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
          {/* Left Column: QR Scanner & Manual Input */}
          <Grid item xs={12} md={5}>
            <Card
              sx={{
                bgcolor: t.cardBg,
                border: scanMode === 'CHECK_OUT' ? '2px solid #8b5cf6' : t.cardBorder,
                borderRadius: 2.5,
                boxShadow: t.isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.03)',
                p: { xs: 1.5, sm: 2.5 },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: t.textPrimary, fontSize: { xs: '0.92rem', sm: '1rem' }, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCodeScannerIcon sx={{ color: scanMode === 'CHECK_OUT' ? '#8b5cf6' : '#ff1955' }} />
                  {scanMode === 'CHECK_OUT' ? 'Pass-Out Scanner' : 'Gate Camera Scanner'}
                </Typography>
                <Chip
                  size="small"
                  label={scanMode === 'CHECK_OUT' ? 'PASS-OUT MODE' : 'ENTRY MODE'}
                  color={scanMode === 'CHECK_OUT' ? 'secondary' : 'success'}
                  sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                />
              </Box>

              {/* Camera Scanner Component - Kept mounted with resetScanTrigger so camera stream never flickers or restarts when changing events */}
              <QrScanner
                scannerId="gate-terminal-qr-scanner"
                isActive={isCameraActive}
                resetScanTrigger={`${selectedEventId}-${selectedScheduleId}`}
                onActiveChange={(active) => {
                  setIsCameraActive(active);
                  localStorage.setItem('ticketer_gate_camera_active', String(active));
                }}
                onScanSuccess={handleQrScan}
              />

              {/* Manual Ticket / Booking Code Input */}
              <Box component="form" onSubmit={handleManualSubmit} sx={{ mt: 2.5 }}>
                <Typography variant="caption" sx={{ color: t.textSecondary, fontWeight: 600, display: 'block', mb: 0.6 }}>
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
                          <SearchIcon sx={{ color: t.textSecondary, fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      bgcolor: t.inputBg,
                      borderRadius: 1.5,
                      '& input': { fontSize: '0.85rem', color: t.textPrimary },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!manualCode.trim() || scanLoading}
                    sx={{
                      bgcolor: scanMode === 'CHECK_OUT' ? '#8b5cf6' : '#ff1955',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      px: { xs: 2, sm: 2.5 },
                      fontSize: '0.85rem',
                      flexShrink: 0,
                      '&:hover': { bgcolor: scanMode === 'CHECK_OUT' ? '#7c3aed' : '#e0144c' },
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
                  bgcolor: t.isDark
                    ? lastScanResult.statusType === 'CLONED_SUSPECT' ||
                      lastScanResult.statusType === 'WRONG_GATE' ||
                      lastScanResult.statusType === 'FORGED_SIGNATURE' ||
                      !lastScanResult.valid
                      ? '#2a0c0e'
                      : lastScanResult.statusType === 'RE_ENTRY_APPROVED'
                      ? '#042630'
                      : lastScanResult.statusType === 'CHECKED_OUT'
                      ? '#1e0e38'
                      : lastScanResult.alreadyCheckedIn
                      ? '#2a1a05'
                      : '#042618'
                    : lastScanResult.statusType === 'CLONED_SUSPECT' ||
                      lastScanResult.statusType === 'WRONG_GATE' ||
                      lastScanResult.statusType === 'FORGED_SIGNATURE' ||
                      !lastScanResult.valid
                      ? '#fef2f2'
                      : lastScanResult.statusType === 'RE_ENTRY_APPROVED'
                      ? '#ecfeff'
                      : lastScanResult.statusType === 'CHECKED_OUT'
                      ? '#f5f3ff'
                      : lastScanResult.alreadyCheckedIn
                      ? '#fffbeb'
                      : '#ecfdf5',
                  border: `2px solid ${
                    lastScanResult.statusType === 'CLONED_SUSPECT' ||
                    lastScanResult.statusType === 'WRONG_GATE' ||
                    lastScanResult.statusType === 'FORGED_SIGNATURE' ||
                    !lastScanResult.valid
                      ? '#ef4444'
                      : lastScanResult.statusType === 'RE_ENTRY_APPROVED'
                      ? '#06b6d4'
                      : lastScanResult.statusType === 'CHECKED_OUT'
                      ? '#8b5cf6'
                      : lastScanResult.alreadyCheckedIn
                      ? '#f59e0b'
                      : '#10b981'
                  }`,
                  borderRadius: 2.5,
                  p: { xs: 1.5, sm: 2.5 },
                  mb: { xs: 1.5, sm: 2.5 },
                  boxShadow: t.isDark ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {/* Status Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  {lastScanResult.statusType === 'CLONED_SUSPECT' ? (
                    <ThreatIcon sx={{ color: '#ef4444', fontSize: { xs: 32, sm: 42 } }} />
                  ) : lastScanResult.statusType === 'WRONG_GATE' || lastScanResult.statusType === 'FORGED_SIGNATURE' ? (
                    <ErrorIcon sx={{ color: '#ef4444', fontSize: { xs: 32, sm: 42 } }} />
                  ) : lastScanResult.statusType === 'RE_ENTRY_APPROVED' ? (
                    <SuccessIcon sx={{ color: '#06b6d4', fontSize: { xs: 28, sm: 36 } }} />
                  ) : lastScanResult.statusType === 'CHECKED_OUT' ? (
                    <LogoutIcon sx={{ color: '#8b5cf6', fontSize: { xs: 28, sm: 36 } }} />
                  ) : lastScanResult.valid ? (
                    lastScanResult.alreadyCheckedIn ? (
                      <WarningIcon sx={{ color: '#f59e0b', fontSize: { xs: 28, sm: 36 } }} />
                    ) : (
                      <SuccessIcon sx={{ color: '#10b981', fontSize: { xs: 28, sm: 36 } }} />
                    )
                  ) : (
                    <ErrorIcon sx={{ color: '#ef4444', fontSize: { xs: 28, sm: 36 } }} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        fontSize: { xs: '0.92rem', sm: '1.05rem' },
                        color: t.isDark
                          ? lastScanResult.statusType === 'CLONED_SUSPECT' ||
                            lastScanResult.statusType === 'WRONG_GATE' ||
                            lastScanResult.statusType === 'FORGED_SIGNATURE' ||
                            !lastScanResult.valid
                            ? '#fca5a5'
                            : lastScanResult.statusType === 'RE_ENTRY_APPROVED'
                            ? '#67e8f9'
                            : lastScanResult.statusType === 'CHECKED_OUT'
                            ? '#c4b5fd'
                            : lastScanResult.alreadyCheckedIn
                            ? '#fcd34d'
                            : '#6ee7b7'
                          : lastScanResult.statusType === 'CLONED_SUSPECT' ||
                            lastScanResult.statusType === 'WRONG_GATE' ||
                            lastScanResult.statusType === 'FORGED_SIGNATURE' ||
                            !lastScanResult.valid
                            ? '#b91c1c'
                            : lastScanResult.statusType === 'RE_ENTRY_APPROVED'
                            ? '#0e7490'
                            : lastScanResult.statusType === 'CHECKED_OUT'
                            ? '#6d28d9'
                            : lastScanResult.alreadyCheckedIn
                            ? '#b45309'
                            : '#047857',
                        letterSpacing: 0.2,
                        lineHeight: 1.2,
                      }}
                    >
                      {lastScanResult.statusType === 'CLONED_SUSPECT'
                        ? 'SUSPECTED CLONED TICKET (SCAN VELOCITY WARNING)'
                        : lastScanResult.statusType === 'WRONG_GATE'
                        ? 'WRONG GATE / ZONE ACCESS RESTRICTED'
                        : lastScanResult.statusType === 'FORGED_SIGNATURE'
                        ? 'FORGED / ALTERED QR CODE DETECTED'
                        : lastScanResult.statusType === 'INVALID_EVENT'
                        ? 'TICKET IS FOR ANOTHER EVENT'
                        : lastScanResult.statusType === 'RE_ENTRY_APPROVED'
                        ? `RE-ENTRY APPROVED (Entry #${lastScanResult.entryCount || 2})`
                        : lastScanResult.statusType === 'CHECKED_OUT'
                        ? 'PASS-OUT RECORDED (GUEST EXITED)'
                        : lastScanResult.valid
                        ? lastScanResult.alreadyCheckedIn
                          ? 'ALREADY CHECKED IN (DUPLICATE PASS)'
                          : 'ACCESS GRANTED - VERIFIED TICKET'
                        : 'ACCESS DENIED - INVALID PASS'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: t.isDark ? '#cbd5e1' : '#475569', fontSize: '0.82rem', mt: 0.3 }}>
                      {lastScanResult.message}
                    </Typography>
                  </Box>
                </Box>

                {/* Quick-Switch for tickets belonging to another event */}
                {lastScanResult.statusType === 'INVALID_EVENT' && (
                  <Box
                    sx={{
                      bgcolor: t.isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid #3b82f6',
                      color: t.textPrimary,
                      p: 1.5,
                      borderRadius: 2,
                      mb: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.2,
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#3b82f6' }}>
                        Ticket Belongs To: {lastScanResult.eventName || 'Another Event'}
                      </Typography>
                      {lastScanResult.scheduleDate && (
                        <Typography variant="caption" sx={{ color: t.textSecondary, display: 'block', mt: 0.2 }}>
                          Scheduled Date: {lastScanResult.scheduleDate}
                        </Typography>
                      )}
                    </Box>
                    {(() => {
                      const matched = events.find(
                        (ev) =>
                          (ev.name || ev.title || '').trim().toLowerCase() ===
                          (lastScanResult.eventName || '').trim().toLowerCase()
                      );
                      if (matched) {
                        return (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleEventChange(String(matched.eventId || matched.id))}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRadius: 1.5,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Switch to this Event
                          </Button>
                        );
                      }
                      return null;
                    })()}
                  </Box>
                )}

                {/* FEATURE 6: Velocity Cloned Alert Box */}
                {lastScanResult.statusType === 'CLONED_SUSPECT' && (
                  <Box sx={{ bgcolor: '#7f1d1d', color: '#ffffff', p: 1.5, borderRadius: 2, mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                      SECURITY NOTICE: Rapid Multi-Scan Detected
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#fecaca', display: 'block', mt: 0.3 }}>
                      This ticket was already admitted at station <b>{lastScanResult.lastScanGate || 'Another Gate'}</b> only <b>{lastScanResult.secondsSinceLastScan ?? '< 90'} seconds ago</b>.
                      Inspect the physical pass or ID and retain ticket for supervisor review.
                    </Typography>
                  </Box>
                )}

                {/* FEATURE 4: Cryptographic HMAC Signature Indicator */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  {lastScanResult.signatureValid && (
                    <Chip
                      size="small"
                      icon={<ShieldIcon sx={{ fontSize: '14px !important', color: '#10b981' }} />}
                      label="HMAC-SHA256 Authenticity Verified"
                      sx={{
                        bgcolor: 'rgba(16, 185, 129, 0.15)',
                        color: t.isDark ? '#34d399' : '#047857',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    />
                  )}
                  {lastScanResult.lastScanGate && (
                    <Chip
                      size="small"
                      icon={<GateIcon sx={{ fontSize: '14px !important' }} />}
                      label={`Station: ${lastScanResult.lastScanGate}`}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', fontWeight: 600, color: t.textPrimary, borderColor: t.divider }}
                    />
                  )}
                  {lastScanResult.exitedAt && (
                    <Chip
                      size="small"
                      label={`Last Exit: ${new Date(lastScanResult.exitedAt).toLocaleTimeString()}`}
                      sx={{ bgcolor: 'rgba(139, 92, 246, 0.15)', color: t.isDark ? '#c4b5fd' : '#7c3aed', fontSize: '0.7rem', fontWeight: 600 }}
                    />
                  )}
                </Box>

                {/* Attendee Details Grid */}
                {lastScanResult.customerName && (
                  <Box sx={{ bgcolor: t.innerBg, p: 1.5, borderRadius: 2, mb: 1.5, border: t.innerBorder }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                          Attendee Name
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: t.textPrimary }}>
                          {lastScanResult.customerName}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                          Booking Ref
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: t.isDark ? '#38bdf8' : '#0284c7' }}>
                          {lastScanResult.bookingReference}
                        </Typography>
                      </Grid>
                      {lastScanResult.customerNic && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                            NIC Number
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
                            {lastScanResult.customerNic}
                          </Typography>
                        </Grid>
                      )}
                      {lastScanResult.customerPhone && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: t.textSecondary, textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>
                            Phone
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                      <Typography variant="caption" sx={{ color: t.textSecondary, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                        Verified Seats & Passes ({lastScanResult.allTickets.length}):
                      </Typography>
                      {lastScanResult.allTickets.length > 1 && (
                        <Button
                          size="small"
                          startIcon={<CheckInAllIcon sx={{ fontSize: '14px !important' }} />}
                          onClick={() => {
                            setGroupBookingData(lastScanResult);
                            setSelectedTicketCodes(lastScanResult.allTickets?.map((t) => t.ticketCode) || []);
                            setGroupModalOpen(true);
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700, py: 0.2 }}
                        >
                          Partial Group Selector
                        </Button>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {lastScanResult.allTickets.map((tkt, idx) => (
                        <Box
                          key={tkt.bookingSeatId || idx}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1,
                            bgcolor: t.innerBg,
                            borderRadius: 1.5,
                            border: t.innerBorder,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                            {tkt.isSharedAreaTicket ? <GroupsIcon sx={{ color: '#10b981', fontSize: 16 }} /> : <SeatIcon sx={{ color: '#ff1955', fontSize: 16 }} />}
                            <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '0.8rem' }}>
                              {tkt.isSharedAreaTicket
                                ? `Area #${tkt.sharedAreaNumber || 1} (${tkt.categoryName || 'General'})`
                                : `Seat ${tkt.seatNumber || tkt.venueSeatId}${tkt.rowLabel ? ` (Row ${tkt.rowLabel})` : ''} - ${tkt.categoryName || ''}`}
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: t.textSecondary, fontSize: '0.72rem', display: { xs: 'none', sm: 'inline' } }}>
                              ({tkt.ticketCode})
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center' }}>
                            {tkt.entryCount && tkt.entryCount > 1 ? (
                              <Chip
                                size="small"
                                label={`Entry #${tkt.entryCount}`}
                                sx={{ bgcolor: 'rgba(6, 182, 212, 0.15)', color: t.isDark ? '#67e8f9' : '#0e7490', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                              />
                            ) : null}
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
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Card>
            ) : (
              /* Awaiting Scan Placeholder */
              <Card sx={{ bgcolor: t.cardBg, border: t.isDark ? '1px dashed rgba(255,255,255,0.18)' : '1px dashed #cbd5e1', borderRadius: 2.5, p: { xs: 2.5, sm: 3.5 }, textAlign: 'center', mb: { xs: 1.5, sm: 2.5 } }}>
                <QrCodeScannerIcon sx={{ fontSize: { xs: 36, sm: 44 }, color: t.textSecondary, mb: 1 }} />
                <Typography variant="subtitle1" sx={{ color: t.textPrimary, fontWeight: 700, fontSize: { xs: '0.92rem', sm: '1rem' } }}>
                  {scanMode === 'CHECK_OUT' ? 'Ready for Pass-Out (Exit) Scans' : 'Ready to Scan Tickets for Entry'}
                </Typography>
                <Typography variant="caption" sx={{ color: t.textMuted, mt: 0.5, display: 'block' }}>
                  Point attendee QR codes towards the camera or enter their ticket code above.
                </Typography>
              </Card>
            )}

            {/* Live Entry Activity Stream */}
            <Card sx={{ bgcolor: t.cardBg, border: t.cardBorder, borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: t.textPrimary, fontSize: '0.88rem', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        bgcolor: t.innerBg,
                        borderRadius: 1.5,
                        border: t.innerBorder,
                        borderLeft: '3px solid #10b981',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '0.8rem' }}>
                          {item.customerName}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ color: t.textSecondary, fontFamily: 'monospace', fontSize: '0.72rem', display: 'block' }}>
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
                  <Typography variant="body2" sx={{ color: t.textMuted, textAlign: 'center', py: 2.5, fontSize: '0.82rem' }}>
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
        <Card sx={{ bgcolor: t.cardBg, border: t.cardBorder, borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: t.textPrimary, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                Live Attendance Seat Map
              </Typography>
              <Typography variant="caption" sx={{ color: t.textSecondary, fontSize: '0.75rem', display: 'block' }}>
                Real-time SVG visualization. Green seats represent checked-in attendees.
              </Typography>
            </Box>

            {/* Shared Areas Headcount Counters */}
            {stats?.sharedAreaBreakdown && Object.keys(stats.sharedAreaBreakdown).length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                {Object.values(stats.sharedAreaBreakdown).map((sa) => (
                  <Box
                    key={sa.sharedAreaNumber}
                    sx={{
                      p: 0.8,
                      px: 1.5,
                      bgcolor: t.innerBg,
                      border: t.innerBorder,
                      borderRadius: 1.5,
                      textAlign: 'center',
                      flex: { xs: 1, sm: 'none' },
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>
                      {sa.categoryName} (#{sa.sharedAreaNumber})
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: t.textPrimary, fontSize: '0.82rem' }}>
                      {sa.checkedIn} / {sa.booked} Checked In
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Typography variant="caption" sx={{ display: { xs: 'block', md: 'none' }, color: t.textSecondary, mb: 1, fontStyle: 'italic', fontSize: '0.68rem' }}>
            👉 Swipe & pan horizontally to view all seat sections
          </Typography>

          {selectedScheduleId && (
            <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', borderRadius: 2 }}>
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
        <Card sx={{ bgcolor: t.cardBg, border: t.cardBorder, borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
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
                    <SearchIcon sx={{ color: t.textSecondary, fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: '100%', sm: 320 },
                bgcolor: t.inputBg,
                borderRadius: 1.5,
                '& input': { fontSize: '0.85rem', color: t.textPrimary },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider },
              }}
            />

            <Box sx={{ display: 'flex', gap: 0.8, width: { xs: '100%', sm: 'auto' } }}>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === undefined ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(undefined)}
                sx={{
                  flex: { xs: 1, sm: 'none' },
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.5,
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
                sx={{ flex: { xs: 1, sm: 'none' }, borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', py: 0.5 }}
              >
                In ({attendees.filter((a) => a.checkedIn).length})
              </Button>
              <Button
                size="small"
                variant={rosterFilterCheckedIn === false ? 'contained' : 'outlined'}
                onClick={() => setRosterFilterCheckedIn(false)}
                color="warning"
                sx={{ flex: { xs: 1, sm: 'none' }, borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', py: 0.5 }}
              >
                Pending ({attendees.filter((a) => !a.checkedIn).length})
              </Button>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ display: { xs: 'block', md: 'none' }, color: t.textSecondary, mb: 1, fontStyle: 'italic', fontSize: '0.68rem' }}>
            👉 Swipe horizontally to view full guest details & check-in buttons
          </Typography>

          {/* Roster Table with Smooth Horizontal Scroll for Mobile */}
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 620 }}>
              <TableHead>
                <TableRow sx={{ '& th': { color: t.textSecondary, fontWeight: 700, borderColor: t.divider, fontSize: '0.78rem', bgcolor: t.tableHeadBg, whiteSpace: 'nowrap' } }}>
                  <TableCell>Customer</TableCell>
                  <TableCell>Booking Ref</TableCell>
                  <TableCell>Ticket Code</TableCell>
                  <TableCell>Seat / Area</TableCell>
                  <TableCell>Contact / NIC</TableCell>
                  <TableCell>Gate / Exits</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendees.map((att) => (
                  <TableRow key={att.bookingSeatId} hover sx={{ '& td': { color: t.textPrimary, borderColor: t.divider, fontSize: '0.8rem', whiteSpace: 'nowrap' }, '&:hover': { bgcolor: t.tableRowHover } }}>
                    <TableCell sx={{ fontWeight: 700 }}>{att.customerName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: t.isDark ? '#38bdf8' : '#0284c7', fontWeight: 600 }}>{att.bookingReference}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: t.textSecondary }}>{att.ticketCode}</TableCell>
                    <TableCell>
                      {att.isSharedAreaTicket
                        ? `Area #${att.sharedAreaNumber || 1}`
                        : `Seat ${att.seatNumber || att.venueSeatId}${att.rowLabel ? ` (Row ${att.rowLabel})` : ''}`}
                    </TableCell>
                    <TableCell sx={{ color: t.textSecondary, fontSize: '0.75rem' }}>
                      {att.customerPhone || att.customerNic || att.customerEmail || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: t.textSecondary }}>
                      {att.lastScanGate ? (
                        <span>{att.lastScanGate} {att.entryCount ? `(#${att.entryCount})` : ''}</span>
                      ) : (
                        '—'
                      )}
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

      {/* FEATURE 2: Group & Partial Check-In Modal / Selector */}
      <Dialog
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: t.dialogBg,
            color: t.textPrimary,
            border: t.cardBorder,
            borderRadius: { xs: 2.5, sm: 3 },
            p: { xs: 0.5, sm: 1 },
            m: { xs: 1.5, sm: 3 },
            maxHeight: { xs: '92vh', sm: '85vh' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: t.textPrimary, fontSize: { xs: '0.98rem', sm: '1.1rem' }, pb: 0.5, px: { xs: 2, sm: 3 } }}>
          Group Booking Arrival: {groupBookingData?.customerName}
        </DialogTitle>
        <DialogContent sx={{ pt: 1, px: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" sx={{ color: t.textSecondary, mb: 1.5, fontSize: '0.82rem' }}>
            Booking <b>{groupBookingData?.bookingReference}</b> contains {groupBookingData?.allTickets?.length} total seats/passes.
            Select the specific guests who are currently at the gate to check them in, or admit the whole party.
          </Typography>

          {/* Quick select controls */}
          <Box sx={{ display: 'flex', gap: 0.8, mb: 1.5, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const allCodes = groupBookingData?.allTickets?.map((t) => t.ticketCode) || [];
                setSelectedTicketCodes(allCodes);
              }}
              sx={{ textTransform: 'none', fontSize: '0.72rem', borderRadius: 1.5, borderColor: t.divider, color: t.textPrimary, flex: { xs: 1, sm: 'none' } }}
            >
              Select All ({groupBookingData?.allTickets?.length})
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const pendingCodes = groupBookingData?.allTickets?.filter((t) => !t.checkedIn).map((t) => t.ticketCode) || [];
                setSelectedTicketCodes(pendingCodes);
              }}
              sx={{ textTransform: 'none', fontSize: '0.72rem', borderRadius: 1.5, borderColor: t.divider, color: t.textPrimary, flex: { xs: 1, sm: 'none' } }}
            >
              Pending Only
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => setSelectedTicketCodes([])}
              sx={{ textTransform: 'none', fontSize: '0.72rem', color: t.textSecondary }}
            >
              Clear
            </Button>
          </Box>

          {/* Tickets list with checkboxes */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: { xs: 240, sm: 320 }, overflowY: 'auto' }}>
            {groupBookingData?.allTickets?.map((tkt) => {
              const isSelected = selectedTicketCodes.includes(tkt.ticketCode);
              return (
                <Box
                  key={tkt.ticketCode}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTicketCodes((prev) => prev.filter((c) => c !== tkt.ticketCode));
                    } else {
                      setSelectedTicketCodes((prev) => [...prev, tkt.ticketCode]);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.2,
                    borderRadius: 2,
                    border: isSelected ? '1.5px solid #10b981' : t.innerBorder,
                    bgcolor: isSelected ? (t.isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5') : t.innerBg,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: isSelected ? (t.isDark ? 'rgba(16, 185, 129, 0.25)' : '#d1fae5') : t.hoverBg },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Checkbox
                      checked={isSelected}
                      color="success"
                      size="small"
                      sx={{ p: 0 }}
                      onChange={() => {}} // Controlled by container onClick
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '0.82rem' }}>
                        {tkt.isSharedAreaTicket
                          ? `Area #${tkt.sharedAreaNumber || 1} (${tkt.categoryName || 'General Pass'})`
                          : `Seat ${tkt.seatNumber || tkt.venueSeatId}${tkt.rowLabel ? ` (Row ${tkt.rowLabel})` : ''} - ${tkt.categoryName || ''}`}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: t.textSecondary, fontSize: '0.72rem' }}>
                        {tkt.ticketCode}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    size="small"
                    label={tkt.checkedIn ? 'Already In' : 'Pending'}
                    color={tkt.checkedIn ? 'default' : 'warning'}
                    sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}
                  />
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
          <Button
            onClick={() => setGroupModalOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600, color: t.textSecondary, width: { xs: '100%', sm: 'auto' } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={selectedTicketCodes.length === 0 || groupSubmitting}
            onClick={() => handleConfirmGroupCheckIn(false)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {groupSubmitting
              ? 'Admitting...'
              : `Admit Selected (${selectedTicketCodes.length})`}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            disabled={groupSubmitting}
            onClick={() => handleConfirmGroupCheckIn(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Admit Entire Party ({groupBookingData?.allTickets?.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GateScanner;
