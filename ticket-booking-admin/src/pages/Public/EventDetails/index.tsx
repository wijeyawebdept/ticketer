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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useParams, useNavigate } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import { getAssetUrl } from '../../../utils/formatters';
import EventService from '../../../services/event.service';
import EventScheduleService from '../../../services/eventSchedule.service';
import { Event, EventSchedule } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../services/api';
import { calculateTimeRemaining, formatCountdown, getCountdownStatus } from '../../../utils/countdownFormatter';
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('visa');
  const [deliveryMethod, setDeliveryMethod] = useState('online');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [bookingForSomeoneElse, setBookingForSomeoneElse] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    nic: '',
  });
  const [hasSeatingLayout, setHasSeatingLayout] = useState(false);
  const [showSeatingMessage, setShowSeatingMessage] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [countdownText, setCountdownText] = useState<string>('');
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [countdownStatus, setCountdownStatus] = useState<'urgent' | 'warning' | 'normal' | 'expired'>('normal');
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check if venue has seating layout
  useEffect(() => {
    const checkVenueSeating = async () => {
      if (!event?.venue?.id) {
        return;
      }

      try {
        
        // Try multiple approaches to check for seating
        try {
          // First try: Use authenticated axios instance
          const response = await axiosInstance.get<any[]>('/api/venue-seats/layout');
          const seats = response.data;
          
          const venueHasSeats: boolean = seats && Array.isArray(seats) && seats.length > 0;
          setHasSeatingLayout(venueHasSeats);
          return;
        } catch (authError: any) {
          
          // Second try: Direct fetch without auth (for CORS enabled endpoints)
          try {
            const response = await fetch('http://localhost:8081/api/venue-seats/layout', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const seats: any = await response.json();
              
              const venueHasSeats: boolean = seats && Array.isArray(seats) && seats.length > 0;
              setHasSeatingLayout(venueHasSeats);
              return;
            }
          } catch (fetchError) {
            // Silent fallback
          }
          
          // Third approach: Assume seating exists if venue has certain properties
          // This is a fallback - you might want to add a 'hasSeating' flag to the venue object
          setHasSeatingLayout(false);
        }
      } catch (error) {
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
          if (bookingData.customerInfo) {
            setCustomerInfo(bookingData.customerInfo);
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

    // If showtime is selected, redirect to seat selection page
    if (selectedShowtime) {
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

    // If no showtime selected, open checkout modal (for venues without seating)
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



  const handleCustomerInfoChange = (field: string, value: string) => {
    setCustomerInfo({
      ...customerInfo,
      [field]: value,
    });
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
              className="row tk-price"
              sx={{
                marginTop: '10px',
                backgroundColor: '#ffffff',
                borderRadius: '13px',
                paddingTop: '0px',
                paddingBottom: '26px',
                paddingLeft: '30px',
                paddingRight: '30px',
              }}
            >
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
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    {schedules.map((schedule) => {
                      const isPast = isSchedulePast(schedule);
                      return (
                        <FormControlLabel
                          key={schedule.scheduleId}
                          value={schedule.scheduleId}
                          control={<Radio size="small" />}
                          label={formatScheduleDisplay(schedule) + (isPast ? ' (Past)' : '')}
                          disabled={isPast}
                          sx={{ 
                            '& .MuiFormControlLabel-label': { 
                              fontSize: '14px',
                              fontWeight: 500,
                              textDecoration: isPast ? 'line-through' : 'none',
                              color: isPast ? 'rgba(0, 0, 0, 0.4)' : 'inherit',
                              fontStyle: isPast ? 'italic' : 'normal'
                            },
                            opacity: isPast ? 0.5 : 1
                          }}
                        />
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

              {/* Table Header */}
              <Grid
                container
                sx={{
                  borderBottom: '2px solid #444',
                  pb: 1,
                  mb: 2,
                }}
              >
                <Grid item xs={4}>
                  <Typography fontWeight="bold">SEAT TYPE</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography fontWeight="bold">PRICE (RS.)</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography fontWeight="bold">Tickets</Typography>
                </Grid>
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
                        borderBottom: '1px solid #444',
                        pb: 2,
                        mb: 2,
                        alignItems: 'center',
                      }}
                    >
                      <Grid item xs={4}>
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
                      <Grid item xs={4}>
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
                      <Grid item xs={4}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={ticketQuantities[categoryName]?.toString() || '0'}
                            onChange={(e: SelectChangeEvent) => {
                              if (hasSeatingLayout) {
                                setShowSeatingMessage(true);
                                setTimeout(() => setShowSeatingMessage(false), 3000);
                                return;
                              }
                              handleQuantityChange(categoryName, e.target.value);
                            }}
                            disabled={hasSeatingLayout}
                            sx={{
                              opacity: hasSeatingLayout ? 0.6 : 1,
                              cursor: hasSeatingLayout ? 'not-allowed' : 'pointer',
                              '& .MuiSelect-select': {
                                backgroundColor: hasSeatingLayout ? '#f5f5f5' : 'white'
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
                    </Grid>
                  );
                })
              ) : (
                <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: '#666' }}>
                  No ticket categories available for this event
                </Typography>
              )}

              {/* Seating Layout Message */}
              {hasSeatingLayout && showSeatingMessage && (
                <Box
                  sx={{
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196f3',
                    borderRadius: '8px',
                    padding: '16px',
                    mb: 2,
                    animation: 'pulse 0.5s ease-in-out',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.02)' },
                      '100%': { transform: 'scale(1)' }
                    }
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#1565c0',
                      fontWeight: 600,
                      textAlign: 'center',
                      mb: 1,
                      fontFamily: 'Raleway, sans-serif'
                    }}
                  >
                    This event uses seat-based booking
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#1976d2',
                      textAlign: 'center',
                      fontFamily: 'Raleway, sans-serif'
                    }}
                  >
                    Click "NEXT" to select your preferred seats from the venue
                  </Typography>
                </Box>
              )}

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
                  letterSpacing: '3.6px',
                  minWidth: '154px',
                  textTransform: 'uppercase',
                  '&:hover': {
                    backgroundColor: '#FFFFFF',
                    color: '#ff1955',
                    borderColor: '#ff1955',
                  },
                }}
              >
                NEXT
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Checkout Modal */}
      <Dialog
        open={checkoutModalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ position: 'relative', pb: 2, borderBottom: '1px solid #f0f0f0' }}>
          <IconButton
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'grey.500',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Grid container>
            {/* Left Side - Checkout Form */}
            <Grid item xs={12} md={7} sx={{ p: 4, borderRight: { md: '1px solid #f0f0f0' } }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, fontFamily: 'Raleway, sans-serif' }}>
                Checkout
              </Typography>

              {/* Delivery Method */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Delivery method
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="pickup">Pick up</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  Only the ticket prices will be charged. No any extra charges
                </Typography>
              </Box>

              {/* Payment Method */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Payment Method <span style={{ color: '#d32f2f' }}>(Select one)</span>
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {[
                    { value: 'visa', img: '/images/visa.jpg', alt: 'Visa' },
                    { value: 'master', img: '/images/master.jpg', alt: 'Mastercard' },
                    { value: 'amex', img: '/images/amex.jpg', alt: 'American Express' },
                    { value: 'ezcash', img: '/images/ezcash.jpg', alt: 'EZ Cash' },
                    { value: 'hnb', img: '/images/hnb.jpg', alt: 'HNB' },
                    { value: 'koko', img: '/images/koko.jpg', alt: 'Koko' },
                  ].map((method) => (
                    <Box
                      key={method.value}
                      onClick={() => setSelectedPaymentMethod(method.value)}
                      sx={{
                        width: '80px',
                        height: '50px',
                        border: selectedPaymentMethod === method.value ? '3px solid #ff1955' : '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        transition: 'all 0.3s',
                        '&:hover': {
                          borderColor: '#ff1955',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={method.img}
                        alt={method.alt}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: '8px',
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Customer Information */}
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      placeholder="First Name *"
                      value={customerInfo.firstName}
                      onChange={(e) => handleCustomerInfoChange('firstName', e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      placeholder="Last Name *"
                      value={customerInfo.lastName}
                      onChange={(e) => handleCustomerInfoChange('lastName', e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="NIC/Passport"
                      placeholder="NIC/Passport *"
                      value={customerInfo.nic}
                      onChange={(e) => handleCustomerInfoChange('nic', e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Contact Number"
                      placeholder="Contact Number *"
                      value={customerInfo.phone}
                      onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      placeholder="Email *"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Terms and Conditions */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <input
                      type="checkbox"
                      checked={bookingForSomeoneElse}
                      onChange={(e) => setBookingForSomeoneElse(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I am booking for someone else
                    </Typography>
                  }
                />
                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        I accept and agree to{' '}
                        <Typography
                          component="a"
                          href="#"
                          sx={{
                            color: '#ff1955',
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          Terms and Conditions
                        </Typography>
                      </Typography>
                    }
                  />
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={handleCloseModal}
                  sx={{
                    borderColor: '#ff1955',
                    color: '#ff1955',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#e01545',
                      backgroundColor: 'rgba(255, 25, 85, 0.04)',
                    },
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => alert('Confirming booking...')}
                  sx={{
                    backgroundColor: '#ff1955',
                    color: '#ffffff',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1rem',
                    py: 1.5,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(255, 25, 85, 0.3)',
                    '&:hover': {
                      backgroundColor: '#e01545',
                      boxShadow: '0 6px 16px rgba(255, 25, 85, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Confirm booking
                </Button>
              </Box>
            </Grid>

            {/* Right Side - Ticket Summary */}
            <Grid item xs={12} md={5} sx={{ p: 4, backgroundColor: '#fafafa' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, pb: 2, borderBottom: '2px solid #e0e0e0' }}>
                Ticket Summary
              </Typography>

              {/* Selected Tickets */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  Ticket
                </Typography>
                {ticketCategories.map((category: any) => {
                  const categoryName = category.categoryName || category.name;
                  const categoryPrice = category.price || 0;
                  const qty = ticketQuantities[categoryName] || 0;
                  if (qty > 0) {
                    return (
                      <Box key={categoryName} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {Number(categoryPrice).toFixed(0)} LKR {categoryName.toUpperCase()} SEATING
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          Seat: {qty > 0 ? `${qty} ticket${qty > 1 ? 's' : ''}` : 'B10'}
                        </Typography>
                      </Box>
                    );
                  }
                  return null;
                })}
                {calculateTotal() === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No tickets selected
                  </Typography>
                )}
              </Box>

              {/* Pricing Summary */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '2px solid #e0e0e0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  Amount
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Sub Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {calculateTotal().toLocaleString()} LKR
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Handeling fee</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    100 LKR
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {(calculateTotal() + 100).toLocaleString()} LKR
                  </Typography>
                </Box>
              </Box>

              {/* Show Time Selection */}
              {schedules.length > 0 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: '2px solid #e0e0e0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Select Show Time:
                  </Typography>
                  <RadioGroup
                    value={selectedShowtime}
                    onChange={handleShowtimeChange}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    {schedules.map((schedule) => {
                      const isPast = isSchedulePast(schedule);
                      return (
                        <FormControlLabel
                          key={schedule.scheduleId}
                          value={schedule.scheduleId}
                          control={<Radio size="small" />}
                          label={formatScheduleDisplay(schedule) + (isPast ? ' (Past)' : '')}
                          disabled={isPast}
                          sx={{ 
                            '& .MuiFormControlLabel-label': { 
                              fontSize: '13px',
                              fontWeight: 500,
                              textDecoration: isPast ? 'line-through' : 'none',
                              color: isPast ? 'rgba(0, 0, 0, 0.4)' : 'inherit',
                              fontStyle: isPast ? 'italic' : 'normal'
                            },
                            opacity: isPast ? 0.5 : 1
                          }}
                        />
                      );
                    })}
                  </RadioGroup>
                </Box>
              )}

            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Old Payment Modal - Keep for backward compatibility if needed */}
      <Dialog
        open={false}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            border: '4px solid #ff688f',
            borderRadius: 0,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Raleway, sans-serif',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Payment Details
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* Customer Information Form */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="First Name"
              placeholder="First Name"
              value={customerInfo.firstName}
              onChange={(e) => handleCustomerInfoChange('firstName', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Last Name"
              placeholder="Last Name"
              value={customerInfo.lastName}
              onChange={(e) => handleCustomerInfoChange('lastName', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone No"
              placeholder="phone number"
              value={customerInfo.phone}
              onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              placeholder="email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="NIC No"
              placeholder="NIC No"
              value={customerInfo.nic}
              onChange={(e) => handleCustomerInfoChange('nic', e.target.value)}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Payment Method Selection */}
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Select Your Payment Method
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0, maxWidth: '800px', margin: 'auto', p: 2.5 }}>
            {[
              { value: 'visa', img: '/images/visa.jpg', alt: 'Visa' },
              { value: 'master', img: '/images/master.jpg', alt: 'Mastercard' },
              { value: 'amex', img: '/images/amex.jpg', alt: 'Amex' },
              { value: 'hnb', img: '/images/hnb.jpg', alt: 'HNB' },
              { value: 'ezcash', img: '/images/ezcash.jpg', alt: 'eZ Cash' },
            ].map((method) => (
              <Box
                key={method.value}
                onClick={() => setSelectedPaymentMethod(method.value)}
                sx={{
                  flex: 1,
                  padding: '40px',
                  position: 'relative',
                  cursor: 'pointer',
                  boxShadow: 'none',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    right: '3px',
                    top: '3px',
                    bottom: '3px',
                    left: '3px',
                    backgroundImage: `url(${method.img})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    border: selectedPaymentMethod === method.value ? '2px solid #ff1955' : '2px solid transparent',
                    boxShadow: selectedPaymentMethod === method.value ? '0px 3px 22px 0px #7b7b7b' : 'none',
                    transition: 'all 0.5s',
                    '&:hover': {
                      borderColor: '#ff1955',
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseModal} variant="outlined">
            Back
          </Button>
          <Button variant="contained" onClick={() => alert('Payment Processing...')}>
            Payment
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
};

export default EventDetails;
