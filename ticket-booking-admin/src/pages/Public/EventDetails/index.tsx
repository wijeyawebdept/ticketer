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
import EventService from '../../../services/event.service';
import EventScheduleService from '../../../services/eventSchedule.service';
import { Event, EventSchedule } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface TicketCategory {
  name: string;
  price: number;
  quantity: number;
}

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  console.log('EventDetails - URL param id:', id);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedShowtime, setSelectedShowtime] = useState('');
  const [ticketQuantities, setTicketQuantities] = useState<{ [key: string]: number }>({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('visa');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    nic: '',
  });

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      console.log('fetchEvent called with id:', id);
      
      if (!id || id === 'undefined') {
        console.error('Invalid event ID:', id);
        setError('Event ID is missing or invalid');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Calling getPublicEventById with:', id);
        const eventData = await EventService.getPublicEventById(id);
        console.log('Received event data:', eventData);
        setEvent(eventData);
        
        // Fetch bookable schedules for this event
        try {
          const schedulesData = await EventScheduleService.getPublicBookableSchedulesForEvent(id);
          console.log('Received schedules data:', schedulesData);
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
              setSelectedShowtime(firstFutureSchedule.scheduleId);
            }
          }
        } catch (schedErr) {
          console.error('Error fetching schedules:', schedErr);
          // Don't fail the whole page if schedules can't be loaded
          setSchedules([]);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching event:', err);
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
          console.log('Restoring booking state:', bookingData);
          
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
          
          // Auto-open payment modal
          setTimeout(() => {
            setPaymentModalOpen(true);
          }, 500); // Small delay to ensure state is set
          
          // Clear the stored booking state
          sessionStorage.removeItem('pendingBooking');
        }
      } catch (error) {
        console.error('Error restoring booking state:', error);
        sessionStorage.removeItem('pendingBooking');
      }
    }
  }, [isAuthenticated, id]);

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
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Save booking state before redirecting to login
      const bookingState = {
        eventId: id,
        scheduleId: selectedShowtime,
        ticketQuantities: ticketQuantities,
        customerInfo: customerInfo,
        returnUrl: window.location.pathname
      };
      
      console.log('Saving booking state before login:', bookingState);
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingState));
      
      // Redirect to login page
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    
    // If authenticated, open payment modal directly
    setPaymentModalOpen(true);
  };

  const handleCloseModal = () => {
    setPaymentModalOpen(false);
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

  const handlePaymentMethodChange = (
    event: React.MouseEvent<HTMLElement>,
    newMethod: string | null
  ) => {
    if (newMethod !== null) {
      setSelectedPaymentMethod(newMethod);
    }
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
                    src={`http://localhost:8081/${event.imageUrl}`}
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
                  <Typography fontWeight="bold">FULL(RS.)</Typography>
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
                  const maxCapacity = Math.min(category.capacity || 10, 10);
                  
                  return (
                    <Grid
                      key={index}
                      container
                      sx={{
                        borderBottom: '1px solid #444',
                        pb: 2,
                        mb: 2,
                      }}
                    >
                      <Grid item xs={4}>
                        <Typography variant="body2">{categoryName}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">Rs.{Number(categoryPrice).toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={ticketQuantities[categoryName]?.toString() || '0'}
                            onChange={(e: SelectChangeEvent) =>
                              handleQuantityChange(categoryName, e.target.value)
                            }
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

              {/* Total Summary */}
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

      {/* Payment Modal */}
      <Dialog
        open={paymentModalOpen}
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
              label="Name"
              placeholder="Name"
              value={customerInfo.name}
              onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
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
    </Box>
  );
};

export default EventDetails;
