import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import { getAssetUrl } from '../../../utils/formatters';
import EventService from '../../../services/event.service';
import EventScheduleService from '../../../services/eventSchedule.service';
import { Event, EventSchedule, ScheduleStatus } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../services/api';
import paymentService, { InitiatePaymentRequest } from '../../../services/payment.service';
import '../SeatSelection/SeatSelection.css';
import { calculateTimeRemaining, formatCountdown, getCountdownStatus } from '../../../utils/countdownFormatter';
import CheckoutModal from '../../../components/CheckoutModal';
import { useCurrency } from '../../../context/CurrencyContext';
import './EventDetails.css';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { selectedShowtime?: string; ticketMode?: 'early_bird' | 'standard' } | null;
  const { isAuthenticated } = useAuth();
  const { formatCurrency, currency, convertAmount } = useCurrency();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedShowtime, setSelectedShowtime] = useState('');
  const [ticketQuantities, setTicketQuantities] = useState<{ [key: string]: number }>({});
  const [hasSeatingLayout, setHasSeatingLayout] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [ticketMode, setTicketMode] = useState<'early_bird' | 'standard' | ''>('early_bird');

  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [countdownText, setCountdownText] = useState<string>('');
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [countdownStatus, setCountdownStatus] = useState<'urgent' | 'warning' | 'normal' | 'expired'>('normal');
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cutoff countdown state
  const [cutoffCountdownText, setCutoffCountdownText] = useState<string>('');
  const [showCutoffCountdown, setShowCutoffCountdown] = useState<boolean>(false);
  const cutoffIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cutoff Countdown effect
  useEffect(() => {
    if (!event?.ticketCutoffTime) {
      setShowCutoffCountdown(false);
      return;
    }

    const cutoffTimeMs = new Date(event.ticketCutoffTime).getTime();

    const updateCutoffCountdown = () => {
      const now = new Date().getTime();
      const remaining = cutoffTimeMs - now;
      if (remaining > 0) {
        setCutoffCountdownText(formatCountdown(remaining));
        setShowCutoffCountdown(true);
      } else {
        setShowCutoffCountdown(false);
        if (cutoffIntervalRef.current) clearInterval(cutoffIntervalRef.current);
      }
    };

    updateCutoffCountdown();
    cutoffIntervalRef.current = setInterval(updateCutoffCountdown, 1000);

    return () => {
      if (cutoffIntervalRef.current) clearInterval(cutoffIntervalRef.current);
    };
  }, [event?.ticketCutoffTime]);

  // Check if venue has seating layout
  useEffect(() => {
    const checkVenueSeating = async () => {
      if (!event?.venue?.id) {
        setHasSeatingLayout(false);
        return;
      }

      // Check if seatingLayout is attached directly to venue object
      if (event.venue.seatingLayout && Object.keys(event.venue.seatingLayout).length > 0) {
        setHasSeatingLayout(true);
        return;
      }

      try {
        const response = await axiosInstance.get<any[]>(`/api/venue-seats/layout/${event.venue.id}`);
        const seats = response.data;
        const venueHasSeats: boolean = Boolean(seats && Array.isArray(seats) && seats.length > 0);
        setHasSeatingLayout(venueHasSeats);
      } catch (error: any) {
        // Secondary check: categories layout endpoint
        try {
          const catResponse = await axiosInstance.get<any[]>(`/api/venue-seats/layout/${event.venue.id}/categories`);
          const categoriesData = catResponse.data;
          if (categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0) {
            setHasSeatingLayout(true);
            return;
          }
        } catch (catError) {
          // Ignore
        }
        setHasSeatingLayout(false);
      }
    };

    checkVenueSeating();
  }, [event]);

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id || id === 'undefined') {
        setError('Event ID is missing or invalid');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const eventData = await EventService.getPublicEventById(id);
        setEvent(eventData);
        
        // Fetch bookable schedules for this event
        try {
          const schedulesData = await EventScheduleService.getPublicBookableSchedulesForEvent(eventData.id);
          setSchedules(schedulesData);

          // Restore previously selected showtime & ticketMode (from location state or sessionStorage)
          let savedShowtime = locationState?.selectedShowtime || '';
          let savedMode: 'early_bird' | 'standard' | '' = locationState?.ticketMode || '';

          if (!savedShowtime) {
            try {
              const saved = JSON.parse(sessionStorage.getItem(`event_selection_${id}`) || '{}');
              if (saved.selectedShowtime) savedShowtime = saved.selectedShowtime;
              if (saved.ticketMode) savedMode = saved.ticketMode;
              if (saved.ticketQuantities) setTicketQuantities(saved.ticketQuantities);
            } catch (err) {}
          }

          if (savedShowtime && schedulesData.some(s => s.scheduleId === savedShowtime)) {
            setSelectedShowtime(savedShowtime);
          } else if (schedulesData.length === 1) {
            const single = schedulesData[0];
            // Assuming getScheduleAvailability check is not required or handled elsewhere for this logic
            setSelectedShowtime(single.scheduleId);
          }

          if (savedMode === 'early_bird' || savedMode === 'standard') {
            setTicketMode(savedMode);
          }
        } catch (schedErr) {
          // Don't fail the whole page if schedules can't be loaded
          setSchedules([]);
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // Restore booking state after login
  useEffect(() => {
    const pendingBooking = sessionStorage.getItem('pendingBooking');
    
    if (pendingBooking && isAuthenticated()) {
      try {
        const bookingData = JSON.parse(pendingBooking);
        
        // Only restore if we're on the same event page
        if (bookingData.eventId === id) {
          // Restore booking selections
          if (bookingData.scheduleId) {
            setSelectedShowtime(bookingData.scheduleId);
          }
          if (bookingData.ticketQuantities) {
            setTicketQuantities(bookingData.ticketQuantities);
          }
          
          // Auto-open checkout modal
          setTimeout(() => {
            setCheckoutModalOpen(true);
          }, 500); // Small delay to ensure state is set
          
          // Clear the stored booking state
          sessionStorage.removeItem('pendingBooking');
        }
      } catch (error) {
        sessionStorage.removeItem('pendingBooking');
      }
    }
  }, [isAuthenticated, id]);

  // Countdown timer effect - Initialize countdown when event and selected showtime change
  useEffect(() => {
    if (!selectedShowtime || !schedules.length) {
      setShowCountdown(false);
      return;
    }

    const selected = schedules.find(s => s.scheduleId === selectedShowtime);
    if (!selected) {
      setShowCountdown(false);
      return;
    }

    // Calculate initial countdown
    const timeRemaining = calculateTimeRemaining(selected.scheduleDate, selected.startTime);

    if (timeRemaining > 0) {
      const formattedCountdown = formatCountdown(timeRemaining);
      const status = getCountdownStatus(timeRemaining);

      setCountdownText(formattedCountdown);
      setCountdownStatus(status);
      setShowCountdown(true);
    } else {
      setShowCountdown(false);
    }
  }, [selectedShowtime, schedules]);

  // Countdown timer effect - Update countdown every second
  useEffect(() => {
    if (!selectedShowtime || !schedules.length || !showCountdown) {
      return;
    }

    const selected = schedules.find(s => s.scheduleId === selectedShowtime);
    if (!selected) {
      return;
    }

    const interval = setInterval(() => {
      const timeRemaining = calculateTimeRemaining(selected.scheduleDate, selected.startTime);

      if (timeRemaining > 0) {
        const formattedCountdown = formatCountdown(timeRemaining);
        const status = getCountdownStatus(timeRemaining);

        setCountdownText(formattedCountdown);
        setCountdownStatus(status);
      } else {
        // Countdown expired - hide it
        setShowCountdown(false);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    }, 1000);

    countdownIntervalRef.current = interval;

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [selectedShowtime, schedules, showCountdown]);

  // Get ticket categories from event data
  const ticketCategories = event?.ticketCategories || [];

  const handleShowtimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const showtimeId = e.target.value;
    setSelectedShowtime(showtimeId);
    try {
      const existing = JSON.parse(sessionStorage.getItem(`event_selection_${id}`) || '{}');
      sessionStorage.setItem(`event_selection_${id}`, JSON.stringify({
        ...existing,
        selectedShowtime: showtimeId,
      }));
    } catch (err) {}
  };

  const handleTicketModeToggle = (mode: 'early_bird' | 'standard' | '') => {
    setTicketMode(mode);
    try {
      const existing = JSON.parse(sessionStorage.getItem(`event_selection_${id}`) || '{}');
      sessionStorage.setItem(`event_selection_${id}`, JSON.stringify({
        ...existing,
        ticketMode: mode,
      }));
    } catch (err) {}
  };

  const handleQuantityChange = (categoryName: string, value: string) => {
    const updated = {
      ...ticketQuantities,
      [categoryName]: parseInt(value) || 0,
    };
    setTicketQuantities(updated);
    try {
      const existing = JSON.parse(sessionStorage.getItem(`event_selection_${id}`) || '{}');
      sessionStorage.setItem(`event_selection_${id}`, JSON.stringify({
        ...existing,
        ticketQuantities: updated,
      }));
    } catch (err) {}
  };

  const handleNextClick = (overrideMode?: 'early_bird' | 'standard' | React.MouseEvent) => {
    // Validate that a showtime is selected if there are schedules
    if (schedules.length > 0 && !selectedShowtime) {
      setValidationModalOpen(true);
      return;
    }

    // For seatless events, ensure at least one ticket is selected
    const totalTicketsSelected = Object.values(ticketQuantities).reduce((total: number, count: number) => total + (count || 0), 0);
    if (!hasSeatingLayout && totalTicketsSelected === 0) {
      setSnackbarMessage('Please select at least one ticket to proceed.');
      setSnackbarOpen(true);
      return;
    }

    // If it's a seated event, redirect directly to seat selection page
    if (hasSeatingLayout) {
      // Find the selected schedule details
      const selectedSchedule = schedules.find((s: EventSchedule) => s.scheduleId === selectedShowtime);
      const effectiveMode = (typeof overrideMode === 'string') ? overrideMode : (ticketMode === 'early_bird' ? 'early_bird' : 'standard');
      
      // Save state in sessionStorage
      try {
        sessionStorage.setItem(`event_selection_${id}`, JSON.stringify({
          selectedShowtime: selectedShowtime,
          ticketMode: effectiveMode,
          ticketQuantities: ticketQuantities,
        }));
      } catch (err) {}

      // Navigate to seat selection page with schedule ID and event details via state
      navigate(`/seat-selection/${selectedShowtime}`, {
        state: {
          eventTitle: event?.name || 'Event',
          venueName: event?.venue?.name || 'Venue',
          eventDate: selectedSchedule?.scheduleDate || '',
          eventTime: selectedSchedule?.startTime || '',
          eventId: id, // Pass the event ID
          ticketMode: effectiveMode,
        }
      });
      return;
    }

    // For seatless events, check if customer is logged in
    if (!isAuthenticated()) {
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        eventId: id,
        scheduleId: selectedShowtime,
        ticketQuantities: ticketQuantities
      }));
      setLoginModalOpen(true);
      return;
    }

    // If it's a seatless event, open checkout modal directly
    setCheckoutModalOpen(true);
  };

  const handleCloseModal = () => {
    setCheckoutModalOpen(false);
  };

  const calculateTotal = () => {
    let total = 0;
    ticketCategories.forEach((category: any) => {
      const categoryName = category.categoryName || category.name;
      const categoryPrice = category.price || 0;
      total += categoryPrice * (ticketQuantities[categoryName] || 0);
      
      if (category.earlyBirdPrice) {
        total += category.earlyBirdPrice * (ticketQuantities[`${categoryName}_EB`] || 0);
      }
    });
    return total;
  };

  const handleConfirmBooking = async (paymentData: any) => {
    const { paymentMethod, customerInfo, acceptTerms } = paymentData;

    if (!paymentMethod) return alert('Please select a payment method');
    if (!acceptTerms) return alert('Please accept terms and conditions');
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone || !customerInfo.email) {
      return alert('Please fill all required fields');
    }

    if (!event?.id) {
      return alert('Event details are missing');
    }

    let targetScheduleId = selectedShowtime || (schedules.length > 0 ? schedules[0].scheduleId : '');

    const HANDLING_FEE = 100;
    const finalAmount = calculateTotal() + HANDLING_FEE;

    setIsRedirecting(true);
    setCheckoutModalOpen(false);

    try {
      const returnUrl = `${window.location.origin}/booking/payment-success`;
      const cancelUrl = `${window.location.origin}/booking/payment-cancel`;

      const sharedAreaTickets: any[] = [];
      ticketCategories.forEach((cat: any) => {
        const categoryName = cat.categoryName || cat.name;
        const regCount = ticketQuantities[categoryName] || 0;
        if (regCount > 0) {
          sharedAreaTickets.push({
            categoryId: cat.id,
            categoryName: categoryName,
            sharedAreaNumber: cat.sharedAreaNumber || 1,
            ticketCount: regCount,
            pricePerTicket: convertAmount(cat.price || 0)
          });
        }
        
        const ebCount = ticketQuantities[`${categoryName}_EB`] || 0;
        if (ebCount > 0) {
          sharedAreaTickets.push({
            categoryId: cat.id,
            categoryName: categoryName,
            sharedAreaNumber: cat.sharedAreaNumber || 1,
            ticketCount: ebCount,
            pricePerTicket: convertAmount(cat.earlyBirdPrice || 0)
          });
        }
      });

      if (sharedAreaTickets.length === 0) {
        setIsRedirecting(false);
        setCheckoutModalOpen(true);
        return alert('Please select at least one ticket');
      }

      const paymentRequest: InitiatePaymentRequest = {
        eventId: event.id,
        scheduleId: targetScheduleId,
        seatIds: [],
        sharedAreaTickets,
        totalAmount: convertAmount(finalAmount),
        amountInLkr: finalAmount,
        currency: currency,
        customerInfo: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          nic: customerInfo.nic,
        },
        returnUrl,
        cancelUrl,
      };

      const sessionResponse = await paymentService.initiatePayment(paymentRequest);

      localStorage.setItem('mpgs_sessionId', sessionResponse.sessionId);

      await paymentService.loadMPGSScript(sessionResponse.checkoutScriptUrl);

      paymentService.startCheckout(sessionResponse);

    } catch (error: any) {
      const detail = error.response?.data?.details || error.response?.data?.message || error.message || 'Failed to initiate payment.';
      alert(`Payment initiation failed: ${detail}`);
      setIsRedirecting(false);
      setCheckoutModalOpen(true);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Date TBA';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date TBA';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Time TBA';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Time TBA';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatScheduleTime = (timeString: string) => {
    // timeString is in format HH:mm:ss
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}.${minutes}${ampm}`;
  };

  const formatScheduleDisplay = (schedule: EventSchedule) => {
    const date = new Date(schedule.scheduleDate);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const startTime = formatScheduleTime(schedule.startTime);
    const endTime = formatScheduleTime(schedule.endTime);
    return `Show Time (${formattedDate}) ${startTime}-${endTime}`;
  };

  const isSchedulePast = (schedule: EventSchedule) => {
    // Combine date and end time to check if schedule has completely passed
    const scheduleDate = new Date(schedule.scheduleDate);
    const [hours, minutes] = schedule.endTime.split(':');
    scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return scheduleDate < new Date();
  };

  const getScheduleAvailability = (schedule: EventSchedule) => {
    const isPast = isSchedulePast(schedule);
    const isSoldOut = (schedule.availableSeats !== undefined && schedule.availableSeats <= 0) ||
                      schedule.status === ScheduleStatus.SOLD_OUT ||
                      (schedule.capacity > 0 && schedule.bookedSeats >= schedule.capacity);
    const isInactive = schedule.status === ScheduleStatus.CANCELLED || 
                       schedule.status === ScheduleStatus.COMPLETED ||
                       (schedule.status as string) === 'INACTIVE' || 
                       schedule.isBookable === false;

    if (isPast) return { isAvailable: false, label: 'PAST', color: '#666', bg: '#e0e0e0' };
    if (isSoldOut || isInactive) return { isAvailable: false, label: 'UNAVAILABLE', color: '#c62828', bg: '#ffebee' };

    return { isAvailable: true, label: 'AVAILABLE', color: '#2e7d32', bg: '#e8f5e9' };
  };

  if (isRedirecting) {
    const selectedSchedule = schedules.find((s: EventSchedule) => s.scheduleId === selectedShowtime);
    
    return (
      <div className="seat-selection-page">
        <div className="payment-redirection-view">
          <div className="redirection-content">
            <div className="secure-badge">
              <span className="lock-icon"></span>
              SECURE CHECKOUT
            </div>
            <h1>Initializing Secure Payment</h1>
            <p>Please do not refresh the page or click the back button.</p>
            <div className="loading-container">
              <div className="loading-text">Connecting to Payment Gateway...</div>
            </div>
            <div className="order-summary-mini">
              <div className="summary-item">
                <span>Event:</span>
                <strong>{event?.name}</strong>
              </div>
              {selectedSchedule && (
                <div className="summary-item">
                  <span>Time Slot:</span>
                  <strong>{formatDate(selectedSchedule.scheduleDate)} • {formatScheduleTime(selectedSchedule.startTime)}</strong>
                </div>
              )}
              <div className="summary-item">
                <span>Total Amount:</span>
                <strong>{(calculateTotal() + 100).toLocaleString()} LKR</strong>
              </div>
            </div>
            <button 
              className="redirection-back-btn" 
              onClick={() => {
                setIsRedirecting(false);
                setCheckoutModalOpen(true);
              }}
            >
              Cancel & Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          backgroundImage: 'url(/images/mt-0390-tickets-bg.jpg)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          backgroundSize: 'cover',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <PublicNavbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress sx={{ color: '#ff1955' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <Box
        sx={{
          backgroundImage: 'url(/images/mt-0390-tickets-bg.jpg)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          backgroundSize: 'cover',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <PublicNavbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ mt: 10 }}>
            <Alert severity="error">
              {error || 'Event not found'}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/events')}
              sx={{
                mt: 2,
                backgroundColor: '#ff1955',
                '&:hover': { backgroundColor: '#e01545' },
              }}
            >
              Back to Events
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundImage: 'url(/images/mt-0390-tickets-bg.jpg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundSize: 'cover',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0a0e16',
      }}
    >
      <PublicNavbar />

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Grid container spacing={{ xs: 2.5, md: 3 }} sx={{ mt: { xs: 0, md: 2 }, alignItems: 'stretch' }}>
          {/* Left Column - Event Information */}
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <Box
              className="inner-side"
              sx={{
                marginTop: { xs: 0, md: '70px' },
                backgroundColor: '#1b222c',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                p: { xs: 2, sm: 3, md: 4 },
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography
                component="h1"
                sx={{
                  mb: { xs: 1, md: 2 },
                  fontWeight: 800,
                  fontFamily: 'Raleway, sans-serif',
                  color: '#ffffff',
                  fontSize: { xs: '20px', sm: '24px', md: '30px' },
                  lineHeight: 1.2,
                }}
              >
                Event Information
              </Typography>
              
              <Typography
                component="h2"
                sx={{
                  mb: 1.5,
                  fontWeight: 700,
                  color: '#ff1955',
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: { xs: '18px', sm: '21px', md: '24px' },
                }}
              >
                {event.name}
              </Typography>

              {event.imageUrl && (
                <Box
                  sx={{
                    mb: 2,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    maxHeight: { xs: '200px', sm: '280px', md: '350px' },
                    width: '100%',
                    backgroundColor: '#0f131a',
                  }}
                >
                  <Box
                    component="img"
                    src={getAssetUrl(event.imageUrl)}
                    alt={event.name}
                    sx={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              )}

              <Typography
                component="p"
                sx={{
                  mb: 2,
                  color: '#cbd5e1',
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: { xs: '0.85rem', md: '0.95rem' },
                  lineHeight: 1.6,
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {event.description || 'No description available for this event.'}
              </Typography>

              <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Typography sx={{ color: '#fcd0a5', fontWeight: 700, mb: 1, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                  Event Details:
                </Typography>
                
                {/* Display schedules if available */}
                {schedules.length > 0 ? (
                  <>
                    <Typography sx={{ color: '#ffffff', fontWeight: 600, mb: 1, mt: 1, fontSize: { xs: '0.85rem', md: '0.95rem' } }}>
                      Show Times:
                    </Typography>
                    {schedules.map((schedule, index) => {
                      const date = new Date(schedule.scheduleDate);
                      const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const startTime = formatScheduleTime(schedule.startTime);
                      const endTime = formatScheduleTime(schedule.endTime);
                      const isPast = isSchedulePast(schedule);
                      
                      return (
                        <Typography 
                          key={schedule.scheduleId} 
                          sx={{ 
                            color: isPast ? 'rgba(255, 255, 255, 0.4)' : '#e2e8f0', 
                            mb: 0.5, 
                            pl: 1.5,
                            fontSize: { xs: '0.8rem', md: '0.9rem' },
                            textDecoration: isPast ? 'line-through' : 'none',
                            fontStyle: isPast ? 'italic' : 'normal'
                          }}
                        >
                          <strong>Schedule {index + 1}:</strong> {formattedDate} • {startTime} - {endTime}
                          {isPast && <span style={{ marginLeft: '8px', fontSize: '0.85em' }}>(Past)</span>}
                        </Typography>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <Typography sx={{ color: '#e2e8f0', mb: 0.5, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                      <strong>Date:</strong> {formatDate(event.startDateTime)}
                    </Typography>
                    <Typography sx={{ color: '#e2e8f0', mb: 0.5, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                      <strong>Time:</strong> {formatTime(event.startDateTime)}
                    </Typography>
                  </>
                )}
                
                <Typography sx={{ color: '#e2e8f0', mb: 0.5, mt: 1.5, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                  <strong>Venue:</strong> {event.venue?.name || 'TBA'}
                </Typography>

                {event.venue?.address && (
                  <Typography sx={{ color: '#e2e8f0', mb: 0.5, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                    <strong>Address:</strong> {event.venue.address}, {event.venue.city}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Right Column - Ticket Booking */}
          <Grid item xs={12} md={6} sx={{ marginTop: { xs: 0, md: '70px' } }}>
            <Typography
              className="right-text"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 900,
                color: '#fff',
                fontSize: { xs: '24px', md: '48px', lg: '56px' },
                lineHeight: 1.1,
                letterSpacing: '0px',
                marginBottom: { xs: 1, md: 2 },
                display: { xs: 'none', md: 'block' },
              }}
            >
              {event.name}
            </Typography>

            <Box
              className="tk-price"
              sx={{
                backgroundColor: '#1b222c',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                p: { xs: 2, sm: 3, md: 4 },
              }}
            >
              {event.ticketCutoffTime && (
                <Box sx={{ 
                  mb: 2.5, 
                  p: { xs: 1.5, md: 2 }, 
                  backgroundColor: 'rgba(255, 25, 85, 0.12)', 
                  borderLeft: '4px solid #ff1955',
                  borderRadius: '8px'
                }}>
                  <Typography sx={{ color: '#ffffff', fontWeight: 600, fontSize: { xs: '0.82rem', md: '0.95rem' }, fontFamily: 'Raleway, sans-serif' }}>
                    <strong>Ticket Sales Close:</strong> {formatDate(event.ticketCutoffTime)} at {formatTime(event.ticketCutoffTime)}
                  </Typography>
                  {showCutoffCountdown && cutoffCountdownText && (
                    <Typography sx={{ color: '#ff1955', fontWeight: 700, fontSize: { xs: '0.82rem', md: '0.9rem' }, mt: 0.5, fontFamily: 'Raleway, sans-serif' }}>
                      Closes in: {cutoffCountdownText}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Showtime Selection */}
              {schedules.length > 0 ? (
                <Box>
                  {showCountdown && countdownText && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 0.5,
                        my: 2,
                      }}
                      className={`event-countdown countdown-${countdownStatus}`}
                    >
                      <Typography sx={{ 
                        fontWeight: 800, 
                        fontSize: { xs: '16px', md: '20px' }, 
                        background: 'linear-gradient(135deg, #ff1955 0%, #ff4080 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        margin: 0,
                      }}>
                        Event starts in:
                      </Typography>
                      <Typography sx={{ 
                        fontSize: { xs: '14px', md: '17px' }, 
                        color: '#ff1955', 
                        fontWeight: 700,
                      }}>
                        {countdownText}
                      </Typography>
                    </Box>
                  )}
                  <Box
                    sx={{
                      my: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      p: { xs: 1.5, md: 2 },
                    }}
                  >
                    <Typography
                      sx={{
                        mb: 1.5,
                        fontWeight: 700,
                        fontFamily: 'Raleway, sans-serif',
                        fontSize: { xs: '0.85rem', md: '0.95rem' },
                        color: '#fcd0a5',
                      }}
                    >
                      Select Show Time:
                    </Typography>
                    <RadioGroup
                      value={selectedShowtime}
                      onChange={handleShowtimeChange}
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}
                    >
                      {schedules.map((schedule) => {
                        const { isAvailable, label, color, bg } = getScheduleAvailability(schedule);
                        const isSelected = selectedShowtime === schedule.scheduleId;

                        return (
                          <Box
                            key={schedule.scheduleId}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: '#121620',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #ff1955' : '1px solid rgba(255, 255, 255, 0.12)',
                              opacity: isAvailable ? 1 : 0.55,
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(255, 25, 85, 0.25)' : 'none',
                            }}
                          >
                            <FormControlLabel
                              value={schedule.scheduleId}
                              control={<Radio size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: '#ff1955' } }} disabled={!isAvailable} />}
                              label={formatScheduleDisplay(schedule)}
                              disabled={!isAvailable}
                              sx={{ 
                                flexGrow: 1,
                                margin: 0,
                                '& .MuiFormControlLabel-label': { 
                                  fontSize: { xs: '12px', sm: '14px' },
                                  fontWeight: isSelected ? 600 : 500,
                                  textDecoration: !isAvailable ? 'line-through' : 'none',
                                  color: !isAvailable ? 'rgba(255, 255, 255, 0.45)' : '#ffffff',
                                  fontStyle: !isAvailable ? 'italic' : 'normal'
                                },
                              }}
                            />
                            <Chip 
                              label={label} 
                              size="small" 
                              sx={{ 
                                bgcolor: bg, 
                                color: color, 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                height: 22,
                                borderRadius: '4px',
                                letterSpacing: '0.5px',
                                ml: 1
                              }} 
                            />
                          </Box>
                        );
                      })}
                    </RadioGroup>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    my: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    p: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    Show times to be announced
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  p: { xs: 1.5, md: 2.5 },
                  mb: 3,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Table Header - only shown for non-accordion layouts */}
                {!(hasSeatingLayout && ticketCategories.some((cat: any) => {
                  const now = new Date();
                  const salesStart = cat.salesStartDate ? new Date(cat.salesStartDate) : null;
                  const salesEnd = cat.salesEndDate ? new Date(cat.salesEndDate) : null;
                  return Boolean(cat.earlyBirdPrice) && (!salesStart || now >= salesStart) && (!salesEnd || now <= salesEnd);
                })) && (
                  <Grid
                    container
                    sx={{
                      borderBottom: '2px solid #ff1955',
                      pb: 1,
                      mb: 1.5,
                    }}
                  >
                    <Grid item xs={hasSeatingLayout ? 6 : 4}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd0a5', letterSpacing: 1, fontSize: { xs: '10px', md: '12px' } }}>
                        SEAT TYPE
                      </Typography>
                    </Grid>
                    <Grid item xs={hasSeatingLayout ? 6 : 4}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd0a5', letterSpacing: 1, fontSize: { xs: '10px', md: '12px' } }}>
                        PRICE (RS.)
                      </Typography>
                    </Grid>
                    {!hasSeatingLayout && (
                      <Grid item xs={4}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd0a5', letterSpacing: 1, fontSize: { xs: '10px', md: '12px' } }}>
                          TICKETS
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                )}

              {/* Ticket Categories */}
              {ticketCategories.length > 0 ? (
                ((): React.ReactNode => {
                  const now = new Date();
                  const hasAnyActiveEarlyBird = ticketCategories.some((cat: any) => {
                    const salesStart = cat.salesStartDate ? new Date(cat.salesStartDate) : null;
                    const salesEnd = cat.salesEndDate ? new Date(cat.salesEndDate) : null;
                    return Boolean(cat.earlyBirdPrice) && (!salesStart || now >= salesStart) && (!salesEnd || now <= salesEnd);
                  });

                  // If it's a seated event with early bird options, show the interactive Accordion sections
                  if (hasSeatingLayout && hasAnyActiveEarlyBird) {
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* EARLY BIRD SECTION */}
                        <Accordion 
                          expanded={ticketMode === 'early_bird'}
                          onChange={(e, isExpanded) => handleTicketModeToggle(isExpanded ? 'early_bird' : '')}
                          sx={{ 
                            backgroundColor: 'transparent', 
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px !important',
                            '&:before': { display: 'none' },
                            overflow: 'hidden'
                          }}
                        >
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon sx={{ color: ticketMode === 'early_bird' ? '#ff1955' : '#fff' }} />}
                            sx={{
                              backgroundColor: ticketMode === 'early_bird' ? 'rgba(255, 25, 85, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                              borderBottom: ticketMode === 'early_bird' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                              '& .MuiAccordionSummary-content': { my: 1.5 }
                            }}
                          >
                            <Typography sx={{ color: ticketMode === 'early_bird' ? '#ff1955' : '#fff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                              Early Bird Tickets
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0, backgroundColor: 'rgba(0,0,0,0.1)' }}>
                            <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
                              <Grid container sx={{ borderBottom: '2px solid #ff1955', pb: 1, mb: 1.5 }}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd0a5', letterSpacing: 1, fontSize: { xs: '10px', md: '12px' } }}>
                                    SEAT TYPE
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd0a5', letterSpacing: 1, fontSize: { xs: '10px', md: '12px' }, textAlign: 'right', display: 'block' }}>
                                    PRICE (RS.)
                                  </Typography>
                                </Grid>
                              </Grid>
                              {ticketCategories.filter((c: any) => Boolean(c.earlyBirdPrice)).map((category: any, index: number, arr: any[]) => {
                                const categoryName = category.categoryName || category.name;
                                return (
                                  <Grid container key={index} sx={{ borderBottom: index !== arr.length - 1 ? '1px dashed rgba(255, 255, 255, 0.1)' : 'none', py: 1.5, alignItems: 'center' }}>
                                    <Grid item xs={6}>
                                      <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}>
                                        {categoryName}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="body2" sx={{ color: '#00e676', fontWeight: 600, fontSize: { xs: '0.85rem', md: '0.95rem' }, textAlign: 'right' }}>
                                        {formatCurrency(category.earlyBirdPrice)}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                );
                              })}
                              <Button
                                variant="contained"
                                fullWidth
                                onClick={() => handleNextClick('early_bird')}
                                sx={{
                                  mt: 3, mb: 1,
                                  fontFamily: 'Raleway, sans-serif', fontWeight: 800, color: '#ffffff', backgroundColor: '#ff1955',
                                  borderRadius: '25px', py: 1.5, fontSize: '0.95rem', letterSpacing: '1px', textTransform: 'uppercase',
                                  boxShadow: '0 4px 14px rgba(255, 25, 85, 0.4)',
                                  transition: 'all 0.3s ease',
                                  '&:hover': { backgroundColor: '#e01545', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(255, 25, 85, 0.6)' },
                                }}
                              >
                                NEXT
                              </Button>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                        
                        {/* STANDARD SECTION */}
                        <Accordion 
                          expanded={ticketMode === 'standard'}
                          onChange={(e, isExpanded) => handleTicketModeToggle(isExpanded ? 'standard' : '')}
                          sx={{ 
                            backgroundColor: 'transparent', 
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px !important',
                            '&:before': { display: 'none' },
                            overflow: 'hidden'
                          }}
                        >
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon sx={{ color: ticketMode === 'standard' ? '#ff1955' : '#fff' }} />}
                            sx={{
                              backgroundColor: ticketMode === 'standard' ? 'rgba(255, 25, 85, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                              borderBottom: ticketMode === 'standard' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                              '& .MuiAccordionSummary-content': { my: 1.5 }
                            }}
                          >
                            <Typography sx={{ color: ticketMode === 'standard' ? '#ff1955' : '#fff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                              Standard Tickets
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0, backgroundColor: 'rgba(0,0,0,0.1)' }}>
                            <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
                              <Grid container sx={{ borderBottom: '2px solid #ff1955', pb: 1, mb: 1.5 }}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd0a5', letterSpacing: 1, fontSize: { xs: '10px', md: '12px' } }}>
                                    SEAT TYPE
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#fcd0a5', letterSpacing: 1, fontSize: { xs: '10px', md: '12px' }, textAlign: 'right', display: 'block' }}>
                                    PRICE (RS.)
                                  </Typography>
                                </Grid>
                              </Grid>
                              {ticketCategories.map((category: any, index: number, arr: any[]) => {
                                const categoryName = category.categoryName || category.name;
                                return (
                                  <Grid container key={index} sx={{ borderBottom: index !== arr.length - 1 ? '1px dashed rgba(255, 255, 255, 0.1)' : 'none', py: 1.5, alignItems: 'center' }}>
                                    <Grid item xs={6}>
                                      <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}>
                                        {categoryName}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="body2" sx={{ color: '#ffffff', fontSize: { xs: '0.85rem', md: '0.95rem' }, textAlign: 'right' }}>
                                        {formatCurrency(category.price || 0)}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                );
                              })}
                              <Button
                                variant="contained"
                                fullWidth
                                onClick={() => handleNextClick('standard')}
                                sx={{
                                  mt: 3, mb: 1,
                                  fontFamily: 'Raleway, sans-serif', fontWeight: 800, color: '#ffffff', backgroundColor: '#ff1955',
                                  borderRadius: '25px', py: 1.5, fontSize: '0.95rem', letterSpacing: '1px', textTransform: 'uppercase',
                                  boxShadow: '0 4px 14px rgba(255, 25, 85, 0.4)',
                                  transition: 'all 0.3s ease',
                                  '&:hover': { backgroundColor: '#e01545', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(255, 25, 85, 0.6)' },
                                }}
                              >
                                NEXT
                              </Button>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      </Box>
                    );
                  }

                  // Non-seated event OR seated event with no early bird
                  return ticketCategories.map((category: any, index: number) => {
                  const categoryName = category.categoryName || category.name;
                  const categoryPrice = category.price || 0;
                  const hasActiveDeal = Boolean(category.dealActive);
                  const now = new Date();
                  
                  // Early Bird phase logic
                  const hasEarlyBird = Boolean(category.earlyBirdPrice);
                  const salesStart = category.salesStartDate ? new Date(category.salesStartDate) : null;
                  const salesEnd = category.salesEndDate ? new Date(category.salesEndDate) : null;
                  const isFutureEBSales = salesStart && now < salesStart;
                  const isExpiredEBSales = salesEnd && now > salesEnd;
                  // TODO: in a real app, we'd also check if earlyBirdCapacity is reached via an API.
                  // For now, if capacity is present, we assume it's enforced by checkout backend.
                  const isEBSalesActive = hasEarlyBird && !isFutureEBSales && !isExpiredEBSales;
                  
                  const isPctDeal = hasActiveDeal && (!category.dealType || category.dealType === 'PERCENTAGE_DISCOUNT') && category.dealDiscountPercentage > 0;
                  const isBuyGetDeal = hasActiveDeal && category.dealType === 'BUY_X_GET_Y_FREE';
                  const discountedPrice = isPctDeal
                    ? categoryPrice * (1 - (category.dealDiscountPercentage || 0) / 100)
                    : categoryPrice;
                  
                  const badgeLabel = category.dealLabel || (isPctDeal ? `${category.dealDiscountPercentage}% OFF` : isBuyGetDeal ? `Buy ${category.dealBuyQuantity} Get ${category.dealFreeQuantity} Free` : 'Deal');
                  const badgeColor = isBuyGetDeal ? '#7b1fa2' : '#00c853';

                  return (
                    <React.Fragment key={index}>
                      {/* EARLY BIRD ROW */}
                      {hasEarlyBird && (
                        <Grid
                          container
                          sx={{
                            borderBottom: '1px dashed rgba(255, 255, 255, 0.1)',
                            py: 1.5,
                            alignItems: 'center',
                            opacity: isEBSalesActive ? 1 : 0.5,
                            filter: isEBSalesActive ? 'none' : 'grayscale(100%)',
                          }}
                        >
                          <Grid item xs={hasSeatingLayout ? 6 : 4}>
                            <Typography variant="body2" fontWeight={600} sx={{ 
                              color: '#ffffff', 
                              fontSize: { xs: '0.78rem', md: '0.88rem' },
                              textDecoration: isExpiredEBSales ? 'line-through' : 'none'
                            }}>
                              {categoryName} <span style={{ color: '#ff1955', marginLeft: '4px' }}>(Early Bird)</span>
                            </Typography>
                            {isFutureEBSales && (
                              <Box sx={{ color: '#ffb74d', fontSize: '0.7rem', fontWeight: 'bold', mt: 0.5 }}>Sales start: {salesStart?.toLocaleDateString()}</Box>
                            )}
                            {isExpiredEBSales && (
                              <Box sx={{ color: '#ef5350', fontSize: '0.7rem', fontWeight: 'bold', mt: 0.5 }}>Sales ended</Box>
                            )}
                          </Grid>
                          <Grid item xs={hasSeatingLayout ? 6 : 4}>
                            <Typography variant="body2" sx={{ color: '#ffffff', fontSize: { xs: '0.78rem', md: '0.88rem' } }}>{formatCurrency(category.earlyBirdPrice)}</Typography>
                          </Grid>
                          {!hasSeatingLayout && (
                            <Grid item xs={4}>
                              <FormControl fullWidth size="small">
                                <Select
                                  disabled={!isEBSalesActive}
                                  value={ticketQuantities[`${categoryName}_EB`]?.toString() || '0'}
                                  onChange={(e: SelectChangeEvent) => {
                                    handleQuantityChange(`${categoryName}_EB`, e.target.value);
                                  }}
                                  sx={{
                                    color: '#ffffff',
                                    backgroundColor: '#121620',
                                    '& .MuiSelect-select': { backgroundColor: '#121620', color: '#ffffff', py: '4px', fontSize: { xs: '0.78rem', md: '0.88rem' } },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff1955' },
                                    '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.5)' }
                                  }}
                                  MenuProps={{ PaperProps: { sx: { bgcolor: '#1a1f2e', border: '1px solid rgba(255, 255, 255, 0.1)', '& .MuiMenuItem-root': { color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', '&:hover': { bgcolor: 'rgba(255, 25, 85, 0.1)' }, '&.Mui-selected': { bgcolor: 'rgba(255, 25, 85, 0.2)', color: '#ff1955' } } } } }}
                                >
                                  {Array.from({ length: Math.min(category.earlyBirdCapacity || 10, 10) + 1 }, (_, i) => (
                                    <MenuItem key={i} value={i.toString()}>{i}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          )}
                        </Grid>
                      )}

                      {/* STANDARD ROW */}
                      <Grid
                        container
                        sx={{
                          borderBottom: index !== ticketCategories.length - 1 ? '1px dashed rgba(255, 255, 255, 0.1)' : 'none',
                          py: 1.5,
                          alignItems: 'center',
                        }}
                      >
                        <Grid item xs={hasSeatingLayout ? 6 : 4}>
                          <Typography variant="body2" fontWeight={600} sx={{ 
                            color: '#ffffff', 
                            fontSize: { xs: '0.78rem', md: '0.88rem' },
                          }}>
                            {categoryName} {hasEarlyBird && <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>(Standard)</span>}
                          </Typography>
                          {hasActiveDeal && (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, backgroundColor: badgeColor, color: '#fff', borderRadius: '4px', px: 0.75, py: 0.2, mt: 0.5, fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>
                              🏷 {badgeLabel}
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={hasSeatingLayout ? 6 : 4}>
                          {isPctDeal ? (
                            <Box>
                              <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'rgba(255, 255, 255, 0.4)', display: 'block', fontSize: '0.72rem' }}>
                                {formatCurrency(categoryPrice)}
                              </Typography>
                              <Typography variant="body2" fontWeight={700} sx={{ color: '#00e676', fontSize: { xs: '0.78rem', md: '0.88rem' } }}>
                                {formatCurrency(discountedPrice)}
                              </Typography>
                            </Box>
                          ) : isBuyGetDeal ? (
                            <Box>
                              <Typography variant="body2" sx={{ color: '#ffffff', fontSize: { xs: '0.78rem', md: '0.88rem' } }}>{formatCurrency(categoryPrice)}</Typography>
                              <Typography variant="caption" sx={{ color: '#b388ff', fontWeight: 600, fontSize: '0.72rem' }}>
                                {category.dealFreeQuantity} free with {category.dealBuyQuantity}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#ffffff', fontSize: { xs: '0.78rem', md: '0.88rem' } }}>{formatCurrency(categoryPrice)}</Typography>
                          )}
                        </Grid>
                        {!hasSeatingLayout && (
                          <Grid item xs={4}>
                            <FormControl fullWidth size="small">
                              <Select
                                value={ticketQuantities[categoryName]?.toString() || '0'}
                                onChange={(e: SelectChangeEvent) => handleQuantityChange(categoryName, e.target.value)}
                                sx={{
                                  color: '#ffffff',
                                  backgroundColor: '#121620',
                                  '& .MuiSelect-select': { backgroundColor: '#121620', color: '#ffffff', py: '4px', fontSize: { xs: '0.78rem', md: '0.88rem' } },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff1955' },
                                  '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.5)' }
                                }}
                                MenuProps={{ PaperProps: { sx: { bgcolor: '#1a1f2e', border: '1px solid rgba(255, 255, 255, 0.1)', '& .MuiMenuItem-root': { color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', '&:hover': { bgcolor: 'rgba(255, 25, 85, 0.1)' }, '&.Mui-selected': { bgcolor: 'rgba(255, 25, 85, 0.2)', color: '#ff1955' } } } } }}
                              >
                                {Array.from({ length: 11 }, (_, i) => (
                                  <MenuItem key={i} value={i.toString()}>{i}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}
                      </Grid>
                    </React.Fragment>
                  );
                });
                })()
              ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                    No ticket categories available for this event
                  </Typography>
                )
              }
              </Box>

              {/* Total Summary */}
              {!hasSeatingLayout && (
                <Box
                  sx={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    pb: 1.5,
                    mb: 2,
                  }}
                >
                  {ticketCategories.map((category: any) => {
                    const categoryName = category.categoryName || category.name;
                    const categoryPrice = category.price || 0;
                    const qty = ticketQuantities[categoryName] || 0;
                    if (qty > 0) {
                      return (
                        <Typography key={categoryName} variant="body2" sx={{ color: '#cbd5e1', fontSize: { xs: '0.8rem', md: '0.88rem' } }}>
                          {categoryName} {qty} x {formatCurrency(categoryPrice)}
                        </Typography>
                      );
                    }
                    return null;
                  })}
                  <Typography fontWeight="bold" variant="body1" sx={{ mt: 1, color: '#ffffff', fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
                    Total = {formatCurrency(calculateTotal())}
                  </Typography>
                </Box>
              )}

              {/* Next Button */}
              {!(hasSeatingLayout && ticketCategories.some((c: any) => Boolean(c.earlyBirdPrice))) && (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleNextClick}
                sx={{
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 800,
                  color: '#ffffff',
                  backgroundColor: '#ff1955',
                  borderRadius: '25px',
                  py: { xs: 1, md: 1.5 },
                  fontSize: { xs: '0.82rem', md: '0.95rem' },
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  boxShadow: '0 6px 18px rgba(255, 25, 85, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#e01545',
                    boxShadow: '0 8px 22px rgba(255, 25, 85, 0.65)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                  {hasSeatingLayout ? 'NEXT' : 'PROCEED TO PAYMENT'}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={handleCloseModal}
        loading={loading}
        onConfirmBooking={handleConfirmBooking}
        eventDetails={{
          title: event?.name || 'Event',
          date: formatDate(event?.startDateTime),
          time: formatTime(event?.startDateTime),
          venue: event?.venue?.name || 'Venue',
          venueAddress: event?.venue?.address || ''
        }}
        sharedAreaSelections={ticketCategories
          .filter((cat: any) => (ticketQuantities[cat.categoryName || cat.name] || 0) > 0)
          .map((cat: any) => ({
            categoryName: cat.categoryName || cat.name,
            ticketCount: ticketQuantities[cat.categoryName || cat.name],
            pricePerTicket: cat.price || 0
          }))}
        totalPrice={calculateTotal()}
        handlingFee={100}
        hideChangeSeats={true}
        ticketMode={ticketMode}
      />

      {/* Validation Modal */}
      <Dialog
        open={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1,
            textAlign: 'center'
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Raleway, sans-serif', fontWeight: 700, color: '#ff1955' }}>
          Action Required
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Please select a show time before proceeding to the next step.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setValidationModalOpen(false)}
            sx={{
              backgroundColor: '#ff1955',
              color: '#ffffff',
              borderRadius: '25px',
              px: 4,
              '&:hover': { backgroundColor: '#e01545' },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Login Required Modal */}
      <Dialog
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1.5,
            textAlign: 'center'
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Raleway, sans-serif', fontWeight: 800, color: '#ff1955', fontSize: '1.25rem' }}>
          Sign In Required
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontFamily: 'Raleway, sans-serif', color: '#4a5568', mt: 0.5 }}>
            Please sign in to your account before proceeding to ticket booking and payment.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 2, px: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setLoginModalOpen(false)}
            sx={{
              borderRadius: '25px',
              px: 3,
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 600,
              color: '#4a5568',
              borderColor: '#cbd5e0',
              textTransform: 'none',
              '&:hover': { borderColor: '#a0aec0', backgroundColor: '#f7fafc' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const redirectPath = (hasSeatingLayout && selectedShowtime)
                ? `/seat-selection/${selectedShowtime}`
                : window.location.pathname;
              navigate('/login', { state: { from: redirectPath } });
            }}
            sx={{
              backgroundColor: '#ff1955',
              color: '#ffffff',
              borderRadius: '25px',
              px: 3,
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(255, 25, 85, 0.4)',
              '&:hover': { backgroundColor: '#e01545' },
            }}
          >
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%', borderRadius: 2 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Public Footer */}
      <PublicFooter />
    </Box>
  );
};

export default EventDetails;
