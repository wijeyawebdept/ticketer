import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  BookmarkRemove,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong
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
  const { t } = useTranslation();
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

  // Zoom and Pan state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Shared areas for standing sections
  const [sharedAreas, setSharedAreas] = useState<any[]>([]);

  // Constant Kularathna Stadium ID
  const KULARATHNA_STADIUM_ID = '54fd37e5-5a1c-4834-af83-ad9c8bf1f300';

  // Zoom and Pan handlers
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetView = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target.closest('[data-clickable]') || target.tagName === 'circle' || target.tagName === 'rect') {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Helper functions for SVG stage and viewBox
  const getStageLayout = () => {
    if (venueSeats.length === 0) {
      return { x: 400, y: 50, width: 700, height: 65, centerX: 750, centerY: 90 };
    }
    const xPositions = venueSeats.map(s => Number(s.xPosition ?? (s as any).xposition) || 0).filter(x => x > 0);
    const yPositions = venueSeats.map(s => Number(s.yPosition ?? (s as any).yposition) || 0).filter(y => y > 0);
    if (xPositions.length === 0 || yPositions.length === 0) {
      return { x: 400, y: 50, width: 700, height: 65, centerX: 750, centerY: 90 };
    }
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const minY = Math.min(...yPositions);
    const seatingWidth = maxX - minX;
    const stageWidth = Math.max(400, Math.min(700, seatingWidth * 0.7));
    const stageHeight = 65;
    const stageGap = 50;
    const stageX = minX + (seatingWidth - stageWidth) / 2;
    const stageY = minY - stageHeight - stageGap;
    return {
      x: stageX,
      y: stageY,
      width: stageWidth,
      height: stageHeight,
      centerX: stageX + stageWidth / 2,
      centerY: stageY + stageHeight / 2 + 8
    };
  };

  const getViewBox = () => {
    if (venueSeats.length === 0) return "0 0 1200 800";
    const xPositions = venueSeats.map(s => Number(s.xPosition ?? (s as any).xposition) || 0).filter(x => x > 0);
    const yPositions = venueSeats.map(s => Number(s.yPosition ?? (s as any).yposition) || 0).filter(y => y > 0);
    if (xPositions.length === 0 || yPositions.length === 0) {
      return "0 0 1200 800";
    }
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const maxY = Math.max(...yPositions);
    const stage = getStageLayout();
    const padding = 60;
    const topPadding = 40;
    const minViewBoxX = minX - padding;
    const minViewBoxY = stage.y - topPadding;
    const width = maxX - minX + padding * 2;
    const height = maxY - minViewBoxY + padding;
    return `${minViewBoxX} ${minViewBoxY} ${width} ${height}`;
  };

  // Helper function to get status and color for rendering a circle
  const getSeatStatusAndColor = (seat: VenueSeat) => {
    const availabilityInfo = getSeatAvailabilityInfo(seat.seatId);
    const status = availabilityInfo?.status;
    const notes = (availabilityInfo?.notes || seat.notes || '').toLowerCase();
    const categoryName = (availabilityInfo?.categoryName || seat.category.categoryName || '').toLowerCase();
    const defaultColor = seat.category.colorCode || '#4caf50';

    if (status) {
      if (status === 'BOOKED') {
        return { status: 'Sold', color: '#f44336' }; // Red for sold
      }
      if (status === 'LOCKED') {
        return { status: 'Locked', color: '#6c757d' }; // Gray
      }
      if (status === 'VIP_RESERVED') {
        if (categoryName.includes('platinum') || notes.includes('platinum')) {
          return { status: 'VIP Platinum', color: '#8bc34a' }; // Light green
        } else if (categoryName.includes('gold') || notes.includes('gold')) {
          return { status: 'VIP Gold', color: '#9c27b0' }; // Purple
        } else if (categoryName.includes('silver') || notes.includes('silver')) {
          return { status: 'VIP Silver', color: '#2196f3' }; // Blue
        }
        return { status: 'VIP Reserved', color: '#dc3545' }; // Default red
      }
      if (status === 'HELD') {
        return { status: 'On Hold', color: '#ff9800' }; // Orange for customer hold
      }
    }

    // Fallback to checking notes (for layout-only view)
    if (notes.includes('[locked]')) {
      return { status: 'Locked', color: '#6c757d' }; // Gray
    }
    if (notes.includes('[vip]')) {
      if (categoryName.includes('platinum') || seat.category.categoryName === 'VIP Platinum') {
        return { status: 'VIP Platinum', color: '#8bc34a' }; // Light green
      } else if (categoryName.includes('gold') || seat.category.categoryName === 'VIP Gold') {
        return { status: 'VIP Gold', color: '#9c27b0' }; // Purple
      } else if (categoryName.includes('silver') || seat.category.categoryName === 'VIP Silver') {
        return { status: 'VIP Silver', color: '#2196f3' }; // Blue
      }
      return { status: 'VIP Reserved', color: '#dc3545' }; // Red
    }

    return { status: 'Available', color: defaultColor };
  };

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
        loadSeatAvailability(eventSchedules[0].scheduleId);
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
      let seats = response.seats;
      if (selectedEvent?.venue?.id === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898') {
        seats = seats.filter(
          (seat: any) => !(seat.status === 'LOCKED' || seat.notes?.toLowerCase().includes('[locked]'))
        );
      }
      setSeatAvailability(seats);
      if (response.sharedAreas) {
        setSharedAreas(response.sharedAreas);
      } else {
        setSharedAreas([]);
      }
      setSuccess(`Loaded ${seats.length} seats (${response.bookedSeats} booked, ${response.heldSeats} held)`);
    } catch (err: any) {
      setError(err.message || 'Failed to load seat availability');
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  // Handle event selection from dropdown
  const handleEventChange = async (event: Event | null) => {
    setSelectedEvent(event);
    setSelectedSeats([]);
    setSelectedSchedule(null);
    setSchedules([]);
    setSeatAvailability([]);
    setSharedAreas([]);
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
      setSharedAreas([]);
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
      let venueLayout = await venueSeatService.getVenueLayoutByVenueId(event.venue.id);
      if (event.venue.id === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898') {
        venueLayout = venueLayout.filter(
          (seat: any) => !(seat.status === 'LOCKED' || seat.notes?.toLowerCase().includes('[locked]'))
        );
      }
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

      if (selectedEvent?.venue?.id === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898') {
        eventSeats = eventSeats.filter(
          (seat: any) => !(seat.isBlocked || seat.notes?.toLowerCase().includes('[locked]'))
        );
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

  // Handle seat click - toggle selection directly
  const handleSeatClick = (seat: Seat | VenueSeat | SeatDTO, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // Toggle selection
    toggleSeatSelection(seat.seatId);
    
    // Auto-enable multi-select mode when clicking seats
    setMultiSelectMode(true);
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
    if (sectionKey === '__proto__' || sectionKey === 'constructor' || sectionKey === 'prototype') return acc;
    if (!Object.prototype.hasOwnProperty.call(acc, sectionKey)) {
      acc[sectionKey] = {};
    }
    const rowKey = seat.rowNumber;
    if (rowKey === '__proto__' || rowKey === 'constructor' || rowKey === 'prototype') return acc;
    const sectionObj = acc[sectionKey];
    if (!Object.prototype.hasOwnProperty.call(sectionObj, rowKey)) {
      sectionObj[rowKey] = [];
    }
    sectionObj[rowKey].push(seat);
    return acc;
  }, {} as Record<string, Record<string, Seat[]>>);

  // Use WebSocket seats if available
  const displaySeats = Object.keys(wsSeats).length > 0 ?
    seats.map(seat => {
      const wsSeat = (seat.seatId && !['__proto__', 'constructor', 'prototype'].includes(seat.seatId) && Object.prototype.hasOwnProperty.call(wsSeats, seat.seatId)) ? (wsSeats as any)[seat.seatId] : undefined;
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
              <InputLabel id="schedule-select-label">{t('seatManagement.selectSchedule', 'Select Schedule')}</InputLabel>
              <Select
                labelId="schedule-select-label"
                value={selectedSchedule?.scheduleId || ''}
                label={t('seatManagement.selectSchedule', 'Select Schedule')}
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
                  {t('seatManagement.exitMultiSelect', 'Exit Multi-Select')}
                </Button>
              }
            >
              <strong>{t('seatManagement.multiSelectModeActive', 'Multi-Select Mode Active:')}</strong> {t('seatManagement.multiSelectInstructions', 'Click on seats to select/deselect them, then use the bulk action buttons below.')}
            </Alert>
          )}

          {/* Venue Seat Legend */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('seatManagement.venueSeatLegend', 'Venue Seat Legend')}
                </Typography>
                {isAdmin && !multiSelectMode && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SelectAll />}
                    onClick={() => setMultiSelectMode(true)}
                  >
                    {t('seatManagement.enableMultiSelect', 'Enable Multi-Select')}
                  </Button>
                )}
              </Box>
              <Grid container spacing={2} alignItems="center">
                {Array.from(new Set(venueSeats.map(s => s.category.categoryName))).map(categoryName => {
                  const seat = venueSeats.find(s => s.category.categoryName === categoryName);
                  const seatDto = seatAvailability.find(s => s.categoryName === categoryName);
                  const displayPrice = seatDto?.currentPrice ?? seat?.category.basePrice;
                  return (
                    <Grid item key={categoryName} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          backgroundColor: categoryName?.includes('Platinum') || categoryName === 'VIP Platinum' ? '#8bc34a' : (seat?.category.colorCode || '#4caf50'),
                        }}
                      />
                      <Typography variant="body2">
                        {categoryName} - LKR {displayPrice?.toLocaleString()}
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
                      backgroundColor: '#9e9e9e',
                    }}
                  />
                  <Typography variant="body2">{t('seatManagement.locked', 'Locked')}</Typography>
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

          {/* Zoom & Pan Map View */}
          <Box sx={{ position: 'relative', mb: 3 }}>
            {/* Zoom Controls */}
            <Box sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 2,
              p: 1,
              boxShadow: 2
            }}>
              <Tooltip title="Zoom In" placement="left">
                <IconButton onClick={handleZoomIn} size="small" sx={{ bgcolor: 'white' }}>
                  <ZoomIn />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out" placement="left">
                <IconButton onClick={handleZoomOut} size="small" sx={{ bgcolor: 'white' }}>
                  <ZoomOut />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset View" placement="left">
                <IconButton onClick={handleResetView} size="small" sx={{ bgcolor: 'white' }}>
                  <CenterFocusStrong />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" sx={{ textAlign: 'center', px: 1, fontWeight: 600 }}>
                {Math.round(scale * 100)}%
              </Typography>
            </Box>

            <Box
              ref={svgContainerRef}
              sx={{
                border: '2px solid #ddd',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                cursor: isDragging ? 'grabbing' : 'grab',
                height: '700px',
                position: 'relative'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <Box
                sx={{
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <svg
                  width="100%"
                  height="700"
                  viewBox={getViewBox()}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ display: 'block', pointerEvents: isDragging ? 'none' : 'auto' }}
                >
                  <defs>
                    {/* Premium Drop Shadow for the Stage */}
                    <filter id="stageShadow" x="-10%" y="-10%" width="120%" height="130%">
                      <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.25" />
                    </filter>

                    {/* Modern slate gradient for the Stage */}
                    <linearGradient id="stageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>

                    {/* Glowing front edge gradient for the stage */}
                    <linearGradient id="stageGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                      <stop offset="15%" stopColor="#3b82f6" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                      <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <style>{`
                    .venue-seat {
                      transition: r 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                                  stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                                  stroke-width 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                                  filter 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .venue-seat:hover {
                      r: 9.5px !important;
                      stroke: #ffffff !important;
                      stroke-width: 2px !important;
                      opacity: 1 !important;
                      filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4)) !important;
                    }
                  `}</style>

                  {/* Stage Area */}
                  {venueSeats.length > 0 && (
                    <g filter="url(#stageShadow)">
                      <rect
                        x={getStageLayout().x}
                        y={getStageLayout().y}
                        width={getStageLayout().width}
                        height={getStageLayout().height}
                        fill="url(#stageGrad)"
                        stroke="#334155"
                        strokeWidth="2"
                        rx="10"
                      />
                      <rect
                        x={getStageLayout().x + 4}
                        y={getStageLayout().y + getStageLayout().height - 4}
                        width={getStageLayout().width - 8}
                        height="3"
                        fill="url(#stageGlow)"
                        rx="1.5"
                      />
                      <text
                        x={getStageLayout().centerX}
                        y={getStageLayout().centerY}
                        fontSize="20"
                        fontWeight="700"
                        fill="#f8fafc"
                        letterSpacing="5"
                        textAnchor="middle"
                        style={{ userSelect: 'none' }}
                      >
                        STAGE
                      </text>
                    </g>
                  )}

                  {/* Render all seats as circles */}
                  {venueSeats.map((seat) => {
                    const x = Number(seat.xPosition ?? (seat as any).xposition) || 0;
                    const y = Number(seat.yPosition ?? (seat as any).yposition) || 0;

                    if (x === 0 || y === 0) return null; // Skip invalid positions

                    const isSelected = selectedSeats.includes(seat.seatId);
                    const availabilityInfo = getSeatAvailabilityInfo(seat.seatId);
                    const { status, color } = getSeatStatusAndColor(seat);

                    // Override color if seat is selected
                    const finalColor = isSelected ? '#ffc107' : color;
                    const displayPrice = availabilityInfo?.currentPrice ?? seat.category.basePrice;

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
                              Price: LKR {displayPrice?.toLocaleString()}
                            </Typography>
                            {availabilityInfo && (
                              <>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  color={
                                    availabilityInfo.status === 'BOOKED' ? 'error.main' :
                                      availabilityInfo.status === 'HELD' ? 'warning.main' :
                                        'success.main'
                                  }
                                >
                                  Status: {availabilityInfo.status}
                                </Typography>
                                {availabilityInfo.status === 'HELD' && availabilityInfo.heldByUserId && (
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
                                  </>
                                )}
                                {availabilityInfo.status === 'BOOKED' && (
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
                              <Typography variant="body2">{t('seatManagement.aisleSeat', 'Aisle Seat')}</Typography>
                            )}
                            {seat.notes && (
                              <Typography variant="body2" color="text.secondary">
                                Note: {seat.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r="6"
                          className="venue-seat"
                          fill={finalColor}
                          stroke={isSelected ? '#2196f3' : '#333'}
                          strokeWidth={isSelected ? '3' : '1'}
                          opacity="0.9"
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => handleSeatClick(seat, e)}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    );
                  })}

                  {/* Balcony / Standing Area - Only for Kularathna Stadium */}
                  {selectedEvent?.venue?.id === KULARATHNA_STADIUM_ID && (
                    (() => {
                      const minX_balcony = venueSeats.length > 0 ? Math.min(...venueSeats.map(s => Number((s as any).xPosition ?? (s as any).xposition) || 0)) : 100;
                      const maxX_balcony = venueSeats.length > 0 ? Math.max(...venueSeats.map(s => Number((s as any).xPosition ?? (s as any).xposition) || 0)) : 1600;
                      const maxY_balcony = venueSeats.length > 0 ? Math.max(...venueSeats.map(s => Number((s as any).yPosition ?? (s as any).yposition) || 0)) : 500;
                      const totalWidth = maxX_balcony - minX_balcony;
                      const areaWidth = Math.min(700, totalWidth);
                      const areaX = minX_balcony + (totalWidth - areaWidth) / 2;
                      const areaY = maxY_balcony + 60;
                      
                      return (
                        <>
                          <rect
                            x={areaX}
                            y={areaY}
                            width={areaWidth}
                            height="80"
                            fill="#FFE082"
                            fillOpacity="0.25"
                            stroke="#FF8F00"
                            strokeWidth="2"
                            rx="8"
                            style={{ cursor: 'pointer', pointerEvents: 'auto', transition: 'all 0.2s ease' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (sharedAreas.length > 0) {
                                alert(`Shared Area Balcony:\n\nAvailable Tickets: ${sharedAreas[0].availableTickets}\nTotal Capacity: ${sharedAreas[0].capacity}\nPrice: LKR ${sharedAreas[0].price?.toLocaleString()}`);
                              } else {
                                alert('Balcony (Standing Area)');
                              }
                            }}
                            onMouseEnter={(e) => {
                              (e.target as SVGRectElement).style.fillOpacity = "0.4";
                              (e.target as SVGRectElement).style.strokeWidth = "3";
                            }}
                            onMouseLeave={(e) => {
                              (e.target as SVGRectElement).style.fillOpacity = "0.25";
                              (e.target as SVGRectElement).style.strokeWidth = "2";
                            }}
                          />
                          <text
                            x={areaX + areaWidth / 2}
                            y={areaY + 45}
                            textAnchor="middle"
                            fontSize="20"
                            fontWeight="700"
                            fill="#E65100"
                            style={{ cursor: 'pointer', pointerEvents: 'none', letterSpacing: '1px' }}
                          >
                            BALCONY (Standing Area)
                          </text>
                          {sharedAreas.length > 0 && (
                            <text
                              x={areaX + areaWidth / 2}
                              y={areaY + 65}
                              textAnchor="middle"
                              fontSize="14"
                              fontWeight="600"
                              fill="#E65100"
                              style={{ cursor: 'pointer', pointerEvents: 'none' }}
                            >
                              LKR {sharedAreas[0].price?.toLocaleString()} • {sharedAreas[0].capacity - sharedAreas[0].availableTickets} sold / {sharedAreas[0].capacity} total
                            </text>
                          )}
                        </>
                      );
                    })()
                  )}

                  {/* Shared Areas - Only for Nelum Pokuna Outdoor Arena */}
                  {selectedEvent?.venue?.id === 'f2ca9b05-b1c6-4cf5-9083-1194543d5898' && (
                    (() => {
                      const minX_shared = venueSeats.length > 0 ? Math.min(...venueSeats.map(s => Number((s as any).xPosition ?? (s as any).xposition) || 0)) : 200;
                      const maxX_shared = venueSeats.length > 0 ? Math.max(...venueSeats.map(s => Number((s as any).xPosition ?? (s as any).xposition) || 0)) : 1600;
                      const maxY_shared = venueSeats.length > 0 ? Math.max(...venueSeats.map(s => Number((s as any).yPosition ?? (s as any).yposition) || 0)) : 500;
                      const minY_shared = venueSeats.length > 0 ? Math.min(...venueSeats.map(s => Number((s as any).yPosition ?? (s as any).yposition) || 0)) : 100;

                      const gap = 30;
                      const areaWidth = 160;
                      const areaHeight = Math.max(maxY_shared - minY_shared, 100);
                      const areaY = minY_shared;
                      
                      const fillColors = ['#FFA000', '#0288D1', '#388E3C', '#C2185B'];
                      const borderColors = ['#FF6F00', '#01579B', '#1B5E20', '#880E4F'];
                      
                      return [1, 2, 3, 4].map((areaNum, index) => {
                        let areaX = minX_shared;
                        if (areaNum === 2) {
                          areaX = minX_shared - areaWidth * 2 - gap * 2;
                        } else if (areaNum === 1) {
                          areaX = minX_shared - areaWidth - gap;
                        } else if (areaNum === 3) {
                          areaX = maxX_shared + gap;
                        } else if (areaNum === 4) {
                          areaX = maxX_shared + areaWidth + gap * 2;
                        }
                        
                        const fillColor = fillColors[index % fillColors.length];
                        const borderColor = borderColors[index % borderColors.length];
                        
                        const eventSharedArea = sharedAreas.find(sa => sa.sharedAreaNumber === areaNum);

                        return (
                          <g key={`shared-area-npoa-${areaNum}`}>
                            <rect
                              x={areaX}
                              y={areaY}
                              width={areaWidth}
                              height={areaHeight}
                              fill={fillColor}
                              fillOpacity="0.15"
                              stroke={borderColor}
                              strokeWidth="2"
                              rx="8"
                              style={{ cursor: 'pointer', pointerEvents: 'auto', transition: 'all 0.2s ease' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (eventSharedArea) {
                                  alert(`Shared Area ${areaNum}:\n\nCategory: ${eventSharedArea.categoryName}\nSold Tickets: ${eventSharedArea.capacity - eventSharedArea.availableTickets}\nTotal Capacity: ${eventSharedArea.capacity}\nPrice: LKR ${eventSharedArea.price?.toLocaleString()}`);
                                } else {
                                  alert(`Standing Area ${areaNum}`);
                                }
                              }}
                              onMouseEnter={(e) => {
                                (e.target as SVGRectElement).style.fillOpacity = "0.25";
                                (e.target as SVGRectElement).style.strokeWidth = "3";
                              }}
                              onMouseLeave={(e) => {
                                (e.target as SVGRectElement).style.fillOpacity = "0.15";
                                (e.target as SVGRectElement).style.strokeWidth = "2";
                              }}
                            />
                            <text
                              x={areaX + areaWidth / 2}
                              y={areaY + areaHeight / 2 - 12}
                              textAnchor="middle"
                              fontSize="16"
                              fontWeight="700"
                              fill={borderColor}
                              style={{ cursor: 'pointer', pointerEvents: 'none', letterSpacing: '0.5px' }}
                            >
                              {eventSharedArea ? eventSharedArea.categoryName : `Standing Area ${areaNum}`}
                            </text>
                            {eventSharedArea && (
                              <>
                                <text
                                  x={areaX + areaWidth / 2}
                                  y={areaY + areaHeight / 2 + 16}
                                  textAnchor="middle"
                                  fontSize="13"
                                  fontWeight="700"
                                  fill={borderColor}
                                  style={{ cursor: 'pointer', pointerEvents: 'none' }}
                                >
                                  {eventSharedArea.capacity - eventSharedArea.availableTickets} sold / {eventSharedArea.capacity} total
                                </text>
                                <text
                                  x={areaX + areaWidth / 2}
                                  y={areaY + areaHeight / 2 + 36}
                                  textAnchor="middle"
                                  fontSize="12"
                                  fontWeight="600"
                                  fill={borderColor}
                                  style={{ cursor: 'pointer', pointerEvents: 'none' }}
                                >
                                  LKR {eventSharedArea.price?.toLocaleString()}
                                </text>
                              </>
                            )}
                          </g>
                        );
                      });
                    })()
                  )}
                </svg>
              </Box>
            </Box>
          </Box>
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
                {t('seatManagement.legend', 'Legend')}
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventSeat sx={{ color: '#4caf50' }} />
                  <Typography variant="body2">{t('seatManagement.available', 'Available')}</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventSeat sx={{ color: '#2196f3' }} />
                  <Typography variant="body2">{t('seatManagement.selected', 'Selected')}</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: '#ff9800' }} />
                  <Typography variant="body2">{t('seatManagement.heldCustomer', 'Held (Customer - 15min)')}</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: '#9c27b0' }} />
                  <Typography variant="body2">{t('seatManagement.heldAdmin', 'Held (Admin - Permanent)')}</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: '#9e9e9e' }} />
                  <Typography variant="body2">{t('seatManagement.booked', 'Booked')}</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#8bc34a' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#333' }}>VIP Platinum</Typography>
                </Grid>
                <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Block sx={{ color: '#f44336' }} />
                  <Typography variant="body2">{t('seatManagement.blocked', 'Blocked')}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {Object.keys(groupedSeats).map(section => {
            if (section === '__proto__' || section === 'constructor' || section === 'prototype') return null;
            const sectionObj = Object.prototype.hasOwnProperty.call(groupedSeats, section) ? (groupedSeats as any)[section] : {};
            return (
              <Card key={section} sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('seatManagement.section', 'Section')} {section}
                  </Typography>
                  {Object.keys(sectionObj)
                    .sort()
                    .map(row => {
                      if (row === '__proto__' || row === 'constructor' || row === 'prototype') return null;
                      const rowSeats = Object.prototype.hasOwnProperty.call(sectionObj, row) ? (sectionObj as any)[row] : [];
                      return (
                        <Box key={row} sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {t('seatManagement.row', 'Row')} {row}
                          </Typography>
                          <Grid container spacing={1}>
                            {rowSeats
                              .sort((a: any, b: any) => parseInt(a.seatNumber) - parseInt(b.seatNumber))
                              .map((seat: any) => (
                                <Grid item key={seat.seatId}>
                                  <Tooltip
                                    title={
                                      <Box>
                                        <Typography variant="body2">{t('seatManagement.seat', 'Seat')} {seat.seatNumber} - LKR {seat.price}</Typography>
                                        {seat.isBlocked && <Typography variant="body2" color="error">{t('seatManagement.statusBlocked', 'BLOCKED')}</Typography>}
                                        {seat.isPermanentHold && <Typography variant="body2" color="secondary">{t('seatManagement.statusPermanentlyHeld', 'PERMANENTLY HELD (Admin)')}</Typography>}
                                        {!seat.isAvailable && !seat.isPermanentHold && !seat.holdExpiresAt && <Typography variant="body2">{t('seatManagement.statusBooked', 'BOOKED')}</Typography>}
                                        {seat.holdExpiresAt && !seat.isPermanentHold && (
                                          <Typography variant="body2" color="warning.main">
                                            {t('seatManagement.statusHeld', 'HELD')} - {getCountdown(seat.holdExpiresAt)} {t('seatManagement.remaining', 'remaining')}
                                          </Typography>
                                        )}
                                        {seat.isAvailable && !seat.isBlocked && !seat.isPermanentHold && !seat.holdExpiresAt && (
                                          <Typography variant="body2" color="success.main">{t('seatManagement.statusAvailable', 'AVAILABLE')}</Typography>
                                        )}
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>{t('seatManagement.clickForActions', 'Click to see available actions')}</Typography>
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
                      );
                    })}
                </CardContent>
              </Card>
            );
          })}
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
          <Button onClick={closeSeatActionDialog}>{t('common.cancel', 'Cancel')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeatManagement;