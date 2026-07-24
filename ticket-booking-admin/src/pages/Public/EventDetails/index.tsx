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
  TextField,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useTranslation } from 'react-i18next';
import { calculateTimeRemaining, formatCountdown, getCountdownStatus } from '../../../utils/countdownFormatter';
import CheckoutModal from '../../../components/CheckoutModal';
import './EventDetails.css';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedShowtime, setSelectedShowtime] = useState('');
  const [ticketQuantities, setTicketQuantities] = useState<{ [key: string]: number }>({});
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [hasSeatingLayout, setHasSeatingLayout] = useState(false);

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
          // Set the first non-past schedule as default selected
          if (schedulesData.length > 0) {
            const firstFutureSchedule = schedulesData.find(schedule => {
              const scheduleDate = new Date(schedule.scheduleDate);
              const [hours, minutes] = schedule.endTime.split(':');
              scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              return scheduleDate >= new Date();
            });
            if (firstFutureSchedule) {
              // Intentionally not auto-selecting to force user choice
              // setSelectedShowtime(firstFutureSchedule.scheduleId);
            }
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

  const handleShowtimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedShowtime(event.target.value);
  };

  const handleQuantityChange = (categoryName: string, value: string) => {
    setTicketQuantities({
      ...ticketQuantities,
      [categoryName]: parseInt(value) || 0,
    });
  };

  const handleNextClick = () => {
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

    // Check if customer is logged in
    if (!isAuthenticated()) {
      setLoginModalOpen(true);
      return;
    }

    // If it's a seated event, redirect to seat selection page
    if (hasSeatingLayout) {
      // Find the selected schedule details
      const selectedSchedule = schedules.find((s: EventSchedule) => s.scheduleId === selectedShowtime);
      
      // Navigate to seat selection page with schedule ID and event details via state
      navigate(`/seat-selection/${selectedShowtime}`, {
        state: {
          eventTitle: event?.name || 'Event',
          venueName: event?.venue?.name || 'Venue',
          eventDate: selectedSchedule?.scheduleDate || '',
          eventTime: selectedSchedule?.startTime || '',
          eventId: id, // Pass the event ID
        }
      });
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
    });
    return total;
  };

  const handleConfirmBooking = async (paymentData: any) => {
    const { paymentMethod, deliveryMethod, customerInfo, acceptTerms, bookingForSomeoneElse } = paymentData;

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

      const sharedAreaTickets = ticketCategories
        .filter((cat: any) => (ticketQuantities[cat.categoryName || cat.name] || 0) > 0)
        .map((cat: any) => ({
          categoryId: cat.id,
          categoryName: cat.categoryName || cat.name,
          sharedAreaNumber: 1,
          ticketCount: ticketQuantities[cat.categoryName || cat.name],
          pricePerTicket: cat.price || 0
        }));

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
        totalAmount: finalAmount,
        currency: 'LKR',
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
                  <strong>{formatDate(selectedSchedule.scheduleDate)} • {formatTime(selectedSchedule.startTime)}</strong>
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
      }}
    >
      <PublicNavbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={0} sx={{ mt: 4, display: 'flex', alignItems: 'stretch' }}>
          {/* Left Column - Event Information */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', paddingRight: { md: '15px' } }}>
            <Box
              className="inner-side"
              sx={{
                marginTop: '70px',
                backgroundColor: 'rgba(47,55,66,0.9)',
                borderRadius: '13px',
                paddingTop: '20px',
                paddingBottom: '30px',
                paddingLeft: '30px',
                paddingRight: '30px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography
                component="h1"
                className="my-4 inner-text"
                sx={{
                  marginTop: '1.5rem',
                  marginBottom: '1.5rem',
                  fontWeight: 300,
                  fontFamily: 'Raleway, sans-serif',
                  color: '#ffffff',
                  fontSize: '30px',
                  lineHeight: 1.2,
                }}
              >
                Event Information
              </Typography>
              
              <Typography
                component="h2"
                sx={{
                  marginBottom: '1rem',
                  fontWeight: 700,
                  color: '#ff1955',
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: '24px',
                }}
              >
                {event.name}
              </Typography>

              {event.imageUrl && (
                <Typography
                  component="p"
                  sx={{
                    marginTop: 0,
                    marginBottom: '1rem',
                    color: '#fff',
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  <Box
                    component="img"
                    src={getAssetUrl(event.imageUrl)}
                    alt={event.name}
                    sx={{
                      display: 'block',
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                    }}
                  />
                </Typography>
              )}

              <Typography
                component="p"
                sx={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  color: '#fff',
                  fontFamily: 'Raleway, sans-serif',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {event.description || 'No description available for this event.'}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography sx={{ color: '#fcd0a5', fontWeight: 600, mb: 1 }}>
                  Event Details:
                </Typography>
                
                {/* Display schedules if available */}
                {schedules.length > 0 ? (
                  <>
                    <Typography sx={{ color: '#fff', fontWeight: 600, mb: 1, mt: 2 }}>
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
                            color: isPast ? 'rgba(255, 255, 255, 0.4)' : '#fff', 
                            mb: 0.5, 
                            pl: 2,
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
                    <Typography sx={{ color: '#fff', mb: 0.5 }}>
                      <strong>Date:</strong> {formatDate(event.startDateTime)}
                    </Typography>
                    <Typography sx={{ color: '#fff', mb: 0.5 }}>
                      <strong>Time:</strong> {formatTime(event.startDateTime)}
                    </Typography>
                  </>
                )}
                
                <Typography sx={{ color: '#fff', mb: 0.5, mt: 2 }}>
                  <strong>Venue:</strong> {event.venue?.name || 'TBA'}
                </Typography>

                {event.venue?.address && (
                  <Typography sx={{ color: '#fff', mb: 0.5 }}>
                    <strong>Address:</strong> {event.venue.address}, {event.venue.city}
                  </Typography>
                )}

              </Box>
            </Box>
          </Grid>

          {/* Right Column - Ticket Booking */}
          <Grid item xs={12} md={6} sx={{ marginTop: '70px', paddingLeft: { md: '15px' } }}>
            <Typography
              className="right-text hidden-xs"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 900,
                color: '#fff',
                fontSize: { xs: '30px', md: '60px' },
                lineHeight: 1.1,
                letterSpacing: '0px',
                marginBottom: 0,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {event.name}
            </Typography>

            <Box
              className="tk-price"
              sx={{
                marginTop: '10px',
                backgroundColor: '#ffffff',
                borderRadius: '13px',
                paddingTop: '20px',
                paddingBottom: '26px',
                paddingLeft: '30px',
                paddingRight: '30px',
              }}
            >
              {event.ticketCutoffTime && (
                <Box sx={{ 
                  mb: 3, 
                  p: 2, 
                  backgroundColor: 'rgba(255, 25, 85, 0.1)', 
                  borderLeft: '4px solid #ff1955',
                  borderRadius: '8px'
                }}>
                  <Typography sx={{ color: '#333', fontWeight: 600, fontSize: '16px', fontFamily: 'Raleway, sans-serif' }}>
                    <strong>Ticket Sales Close:</strong> {formatDate(event.ticketCutoffTime)} at {formatTime(event.ticketCutoffTime)}
                  </Typography>
                  {showCutoffCountdown && cutoffCountdownText && (
                    <Typography sx={{ color: '#ff1955', fontWeight: 700, fontSize: '15px', mt: 1, fontFamily: 'Raleway, sans-serif' }}>
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
                        gap: 1,
                        marginTop: '20px',
                        marginBottom: '20px',
                      }}
                      className={`event-countdown countdown-${countdownStatus}`}
                    >
                      <Typography sx={{ 
                        fontWeight: 800, 
                        fontSize: '22px', 
                        background: 'linear-gradient(135deg, #ff1955 0%, #ff4080 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        textShadow: '0 2px 4px rgba(255, 25, 85, 0.3)',
                        margin: 0,
                      }}>
                        Event starts in:
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '18px', 
                        color: '#250e2a5c', 
                        fontWeight: 600,
                        textShadow: '0 2px 8px rgba(255, 25, 85, 0.3)',
                      }}>
                        {countdownText}
                      </Typography>
                    </Box>
                  )}
                  <Box
                    sx={{
                      marginTop: '20px',
                      backgroundColor: '#eee',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      paddingLeft: '15px',
                      paddingRight: '15px',
                      marginBottom: '10px',
                    }}
                  >
                    <Typography
                      sx={{
                        marginTop: '15px',
                        marginBottom: '10px',
                        fontWeight: 700,
                        fontFamily: 'Raleway, sans-serif',
                        fontSize: '14px',
                      }}
                    >
                      Select Show Time:
                    </Typography>
                    <RadioGroup
                      value={selectedShowtime}
                      onChange={handleShowtimeChange}
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
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
                              backgroundColor: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #ff1955' : '1px solid #e0e0e0',
                              opacity: isAvailable ? 1 : 0.55,
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(255, 25, 85, 0.15)' : 'none',
                            }}
                          >
                            <FormControlLabel
                              value={schedule.scheduleId}
                              control={<Radio size="small" disabled={!isAvailable} />}
                              label={formatScheduleDisplay(schedule)}
                              disabled={!isAvailable}
                              sx={{ 
                                flexGrow: 1,
                                margin: 0,
                                '& .MuiFormControlLabel-label': { 
                                  fontSize: '14px',
                                  fontWeight: isSelected ? 600 : 500,
                                  textDecoration: !isAvailable ? 'line-through' : 'none',
                                  color: !isAvailable ? 'rgba(0, 0, 0, 0.45)' : '#222',
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
                                fontSize: '11px', 
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
                    marginTop: '20px',
                    backgroundColor: '#eee',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    paddingLeft: '15px',
                    paddingRight: '15px',
                    marginBottom: '10px',
                  }}
                >
                  <Typography
                    sx={{
                      marginTop: '15px',
                      fontWeight: 700,
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '14px',
                      color: '#666',
                    }}
                  >
                    Show times to be announced
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  p: { xs: 2, md: 3 },
                  mb: 3,
                  border: '1px solid #eaeaea',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                {/* Table Header */}
                <Grid
                  container
                  sx={{
                    borderBottom: '2px solid #ff1955',
                    pb: 1.5,
                    mb: 2,
                  }}
                >
                  <Grid item xs={hasSeatingLayout ? 6 : 4}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#555', letterSpacing: 1 }}>
                      SEAT TYPE
                    </Typography>
                  </Grid>
                  <Grid item xs={hasSeatingLayout ? 6 : 4}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#555', letterSpacing: 1 }}>
                      PRICE (RS.)
                    </Typography>
                  </Grid>
                  {!hasSeatingLayout && (
                    <Grid item xs={4}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#555', letterSpacing: 1 }}>
                        TICKETS
                      </Typography>
                    </Grid>
                  )}
                </Grid>

              {/* Ticket Categories */}
              {ticketCategories.length > 0 ? (
                ticketCategories.map((category: any, index: number) => {
                  const categoryName = category.categoryName || category.name;
                  const categoryPrice = category.price || 0;
                  const hasActiveDeal = Boolean(category.dealActive);
                  const isPctDeal = hasActiveDeal && (!category.dealType || category.dealType === 'PERCENTAGE_DISCOUNT') && category.dealDiscountPercentage > 0;
                  const isBuyGetDeal = hasActiveDeal && category.dealType === 'BUY_X_GET_Y_FREE';
                  const discountedPrice = isPctDeal
                    ? categoryPrice * (1 - (category.dealDiscountPercentage || 0) / 100)
                    : categoryPrice;
                  const maxCapacity = Math.min(category.capacity || 10, 10);
                  
                  // Build badge label
                  const badgeLabel = category.dealLabel
                    || (isPctDeal ? `${category.dealDiscountPercentage}% OFF`
                    : isBuyGetDeal ? `Buy ${category.dealBuyQuantity} Get ${category.dealFreeQuantity} Free`
                    : 'Deal');
                  const badgeColor = isBuyGetDeal ? '#7b1fa2' : '#00c853';
                  return (
                    <Grid
                      key={index}
                      container
                      sx={{
                        borderBottom: index !== ticketCategories.length - 1 ? '1px dashed #ccc' : 'none',
                        py: 2,
                        alignItems: 'center',
                      }}
                    >
                      <Grid item xs={hasSeatingLayout ? 6 : 4}>
                        <Typography variant="body2" fontWeight={600}>{categoryName}</Typography>
                        {hasActiveDeal && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              backgroundColor: badgeColor,
                              color: '#fff',
                              borderRadius: '4px',
                              px: 0.75,
                              py: 0.25,
                              mt: 0.5,
                              fontSize: '10px',
                              fontWeight: 700,
                              letterSpacing: '0.5px',
                            }}
                          >
                            🏷 {badgeLabel}
                          </Box>
                        )}
                      </Grid>
                      <Grid item xs={hasSeatingLayout ? 6 : 4}>
                        {isPctDeal ? (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{ textDecoration: 'line-through', color: '#999', display: 'block' }}
                            >
                              Rs.{Number(categoryPrice).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#e53935' }}>
                              Rs.{Number(discountedPrice).toFixed(2)}
                            </Typography>
                          </Box>
                        ) : isBuyGetDeal ? (
                          <Box>
                            <Typography variant="body2">Rs.{Number(categoryPrice).toFixed(2)}</Typography>
                            <Typography variant="caption" sx={{ color: '#7b1fa2', fontWeight: 600 }}>
                              {category.dealFreeQuantity} free with {category.dealBuyQuantity}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2">Rs.{Number(categoryPrice).toFixed(2)}</Typography>
                        )}
                      </Grid>
                      {!hasSeatingLayout && (
                        <Grid item xs={4}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={ticketQuantities[categoryName]?.toString() || '0'}
                              onChange={(e: SelectChangeEvent) => {
                                handleQuantityChange(categoryName, e.target.value);
                              }}
                              sx={{
                                '& .MuiSelect-select': {
                                  backgroundColor: 'white'
                                }
                              }}
                            >
                              {Array.from({ length: maxCapacity + 1 }, (_, i) => i).map((num) => (
                                <MenuItem key={num} value={num.toString()}>
                                  {num}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                    </Grid>
                  );
                })
              ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: '#666', fontStyle: 'italic' }}>
                    No ticket categories available for this event
                  </Typography>
                )
              }
              </Box>

              {/* Total Summary */}
              {!hasSeatingLayout && (
                <Box
                  sx={{
                    borderBottom: '2px solid #444',
                    pb: 2,
                    mb: 2,
                  }}
                >
                  {ticketCategories.map((category: any) => {
                    const categoryName = category.categoryName || category.name;
                    const categoryPrice = category.price || 0;
                    const qty = ticketQuantities[categoryName] || 0;
                    if (qty > 0) {
                      return (
                        <Typography key={categoryName} variant="body2">
                          {categoryName} {qty} x {categoryPrice}/=
                        </Typography>
                      );
                    }
                    return null;
                  })}
                  <Typography fontWeight="bold" variant="body1" sx={{ mt: 1 }}>
                    Total = {calculateTotal()}/=
                  </Typography>
                </Box>
              )}

              {/* Next Button */}
              <Button
                variant="contained"
                fullWidth
                onClick={handleNextClick}
                sx={{
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: '#ff1955',
                  borderColor: '#ff1955',
                  padding: '1px 27px 0',
                  lineHeight: '48px',
                  border: '1px solid',
                  borderRadius: '25px',
                  letterSpacing: '2px',
                  minWidth: '154px',
                  textTransform: 'uppercase',
                  '&:hover': {
                    backgroundColor: '#FFFFFF',
                    color: '#ff1955',
                    borderColor: '#ff1955',
                  },
                }}
              >
                {hasSeatingLayout ? 'NEXT' : 'PROCEED TO PAYMENT'}
              </Button>
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
            onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
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
    </Box>
  );
};

export default EventDetails;
