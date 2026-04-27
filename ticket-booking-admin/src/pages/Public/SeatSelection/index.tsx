import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Button,
  IconButton,
} from '@mui/material';
import VenueSeatMap from '../../../components/VenueSeatMap/VenueSeatMap';
import { venueSeatService } from '../../../services/venueSeatService';
import axiosInstance from '../../../services/api';
import paymentService, { InitiatePaymentRequest } from '../../../services/payment.service';
import { useAuth } from '../../../context/AuthContext';
import { calculateTimeRemaining, formatCountdown, getCountdownStatus } from '../../../utils/countdownFormatter';
import './SeatSelection.css';

interface EventDetails {
  id: number;
  title: string;
  venue: string;
  venueAddress: string;
  date: string;
  time: string;
  eventId?: string;
}

const SeatSelectionPage: React.FC = () => {
  const { eventScheduleId } = useParams<{ eventScheduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const eventDetailsFromState = location.state as { eventTitle?: string; venueName?: string; venueAddress?: string; eventDate?: string; eventTime?: string; eventId?: string } | null;

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState<any[]>([]);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [isHolding, setIsHolding] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [venueId, setVenueId] = useState<string | undefined>(undefined);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showBookingSummary, setShowBookingSummary] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [countdownText, setCountdownText] = useState<string>('');
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [countdownStatus, setCountdownStatus] = useState<'urgent' | 'warning' | 'normal' | 'expired'>('normal');
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const seatMapRef = React.useRef<HTMLDivElement>(null);

  interface SharedAreaSelection {
    areaNumber: number;
    categoryName: string;
    ticketCount: number;
    pricePerTicket: number;
  }
  const [sharedAreaSelections, setSharedAreaSelections] = useState<SharedAreaSelection[]>([]);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('visa');
  const [deliveryMethod, setDeliveryMethod] = useState('online');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [bookingForSomeoneElse, setBookingForSomeoneElse] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    phone: '',
    email: '',
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (eventScheduleId) {
      loadEventDetails(eventScheduleId);
    }
  }, [eventScheduleId]);

  useEffect(() => {
    const hasSharedAreaTickets = sharedAreaSelections.reduce((sum, s) => sum + s.ticketCount, 0) > 0;
    setShowBookingSummary(selectedSeats.length > 0 || hasSharedAreaTickets);
  }, [selectedSeats, sharedAreaSelections]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (summaryRef.current && summaryRef.current.contains(target)) ||
        (seatMapRef.current && seatMapRef.current.contains(target))
      ) return;

      setShowBookingSummary(false);
    };

    if (showBookingSummary) document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBookingSummary]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            handleHoldExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [holdTimer]);

  // Countdown timer effect - Initialize countdown when event details change
  useEffect(() => {
    if (!eventDetails || !eventDetails.date || !eventDetails.time) {
      setShowCountdown(false);
      return;
    }

    // Calculate initial countdown
    const timeRemaining = calculateTimeRemaining(eventDetails.date, eventDetails.time);

    if (timeRemaining > 0) {
      const formattedCountdown = formatCountdown(timeRemaining);
      const status = getCountdownStatus(timeRemaining);

      setCountdownText(formattedCountdown);
      setCountdownStatus(status);
      setShowCountdown(true);
    } else {
      setShowCountdown(false);
    }
  }, [eventDetails]);

  // Countdown timer effect - Update countdown every second
  useEffect(() => {
    if (!eventDetails || !eventDetails.date || !eventDetails.time || !showCountdown) {
      return;
    }

    const interval = setInterval(() => {
      const timeRemaining = calculateTimeRemaining(eventDetails.date, eventDetails.time);

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
  }, [eventDetails, showCountdown]);

  const loadEventDetails = async (scheduleId: string) => {
    try {
      const response = await axiosInstance.get<{ 
        venueId?: string; 
        venueName?: string; 
        venueAddress?: string;
        eventName?: string;
        scheduleDate?: string;
        startTime?: string;
        endTime?: string;
        eventId?: string;
      }>(`/api/public/events/schedules/${scheduleId}`);
      
      if (response.data) {
        setVenueId(response.data.venueId);
        // Use API response data, fallback to navigation state
        setEventDetails({
          id: 0,
          title: response.data.eventName || eventDetailsFromState?.eventTitle || 'Event',
          venue: response.data.venueName || eventDetailsFromState?.venueName || 'Venue',
          venueAddress: response.data.venueAddress || eventDetailsFromState?.venueAddress || '',
          date: response.data.scheduleDate || eventDetailsFromState?.eventDate || '',
          time: response.data.startTime 
            ? `${response.data.startTime}${response.data.endTime ? ` - ${response.data.endTime}` : ''}`
            : eventDetailsFromState?.eventTime || '',
          eventId: response.data.eventId || eventDetailsFromState?.eventId,
        });
        return;
      }
    } catch (error) {
      // Event schedule fetch failed silently
    }

    // Fallback to navigation state if API fails
    if (eventDetailsFromState) {
      setEventDetails({
        id: 0,
        title: eventDetailsFromState.eventTitle || 'Event',
        venue: eventDetailsFromState.venueName || 'Venue',
        venueAddress: eventDetailsFromState.venueAddress || '',
        date: eventDetailsFromState.eventDate || '',
        time: eventDetailsFromState.eventTime || '',
        eventId: eventDetailsFromState.eventId,
      });
    } else {
      setEventDetails({
        id: 0,
        title: 'Event',
        venue: 'Venue',
        venueAddress: '',
        date: '',
        time: '',
      });
    }
  };

  const handleSeatSelect = async (seats: string[]) => {
    setSelectedSeats(seats);
    await calculateTotalPrice(seats);
  };

  const handleSharedAreaSelect = (areaNumber: number, count: number, pricePerTicket: number, categoryName: string) => {
    setSharedAreaSelections(prev => {
      const existingIndex = prev.findIndex(s => s.areaNumber === areaNumber);

      if (count === 0) return prev.filter(s => s.areaNumber !== areaNumber);

      const newSelection: SharedAreaSelection = { areaNumber, categoryName, ticketCount: count, pricePerTicket };

      if (existingIndex >= 0) {
        const newSelections = [...prev];
        newSelections[existingIndex] = newSelection;
        return newSelections;
      }
      return [...prev, newSelection];
    });
  };

  useEffect(() => {
    const seatsTotal = selectedSeatDetails.reduce((sum, seat) => sum + (seat?.currentPrice || 0), 0);
    const sharedAreasTotal = sharedAreaSelections.reduce((sum, s) => sum + (s.ticketCount * s.pricePerTicket), 0);
    setTotalPrice(seatsTotal + sharedAreasTotal);
  }, [sharedAreaSelections, selectedSeatDetails]);

  const calculateTotalPrice = async (seatIds: string[]) => {
    try {
      const response = await venueSeatService.getSeatAvailability(eventScheduleId!);
      const selectedDetails = seatIds.map(seatId => response.seats.find(s => s.seatId === seatId)).filter(Boolean);
      setSelectedSeatDetails(selectedDetails);

      const seatsTotal = seatIds.reduce((sum, seatId) => {
        const seat = response.seats.find(s => s.seatId === seatId);
        return sum + (seat?.currentPrice || 0);
      }, 0);

      const sharedAreasTotal = sharedAreaSelections.reduce((sum, s) => sum + (s.ticketCount * s.pricePerTicket), 0);
      setTotalPrice(seatsTotal + sharedAreasTotal);
    } catch (error) {
    }
  };

  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0) {
      showMessage('error', 'Please select at least one seat');
      return;
    }

    setLoading(true);
    try {
      const userId = 1; // from auth context
      const response = await venueSeatService.holdSeats({
        eventScheduleId: eventScheduleId!,
        seatIds: selectedSeats,
        userId,
      });

      if (response.success) {
        setIsHolding(true);
        setHoldTimer(response.expiresIn || 300);
        showMessage('success', 'Seats held successfully! Complete booking within 5 minutes.');
      } else {
        showMessage('error', response.message);
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Failed to hold seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseSeats = async () => {
    try {
      await venueSeatService.releaseHolds(eventScheduleId!, selectedSeats);
      setSelectedSeats([]);
      setIsHolding(false);
      setHoldTimer(0);
      showMessage('success', 'Seats released');
    } catch {
      showMessage('error', 'Failed to release seats');
    }
  };

  const handleHoldExpired = () => {
    setIsHolding(false);
    setSelectedSeats([]);
    showMessage('error', 'Your seat hold has expired. Please select seats again.');
  };

  const handleProceedToPayment = () => {
    if (!isAuthenticated()) {
      // Redirect to login page and return here after login
      navigate('/login', {
        state: {
          from: `/seat-selection/${eventScheduleId}`,
          returnMessage: 'Please sign in to continue with your booking',
        },
      });
    } else {
      setPaymentModalOpen(true);
    }
  };
  const handleClosePaymentModal = () => setPaymentModalOpen(false);

  const handleCustomerInfoChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmBooking = async () => {
    if (!selectedPaymentMethod) return showMessage('error', 'Please select a payment method');
    if (!acceptTerms) return showMessage('error', 'Please accept terms and conditions');
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone || !customerInfo.email) {
      return showMessage('error', 'Please fill all required fields');
    }

    setLoading(true);

    try {
      const returnUrl = `${window.location.origin}/booking/payment-success`;
      const cancelUrl = `${window.location.origin}/booking/payment-cancel`;

      const paymentRequest: InitiatePaymentRequest = {
        eventId: eventDetails?.eventId || '',
        scheduleId: eventScheduleId || '',
        seatIds: selectedSeatDetails.map(seat => seat.seatId).filter((id: string) => id),
        sharedAreaTickets: sharedAreaSelections.map(selection => ({
          categoryId: undefined,
          categoryName: selection.categoryName,
          sharedAreaNumber: selection.areaNumber,
          ticketCount: selection.ticketCount,
          pricePerTicket: selection.pricePerTicket,
        })),
        totalAmount: totalPrice + 200,
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

      // MPGS session created

      // store sessionId so return page can verify
      localStorage.setItem('mpgs_sessionId', sessionResponse.sessionId);

      showMessage('success', 'Connecting to payment gateway...');
      await paymentService.loadMPGSScript(sessionResponse.checkoutScriptUrl);

      // Close modal, then open MPGS payment page
      setPaymentModalOpen(false);

      // Order details must be passed to Checkout.configure() - CBMPGS requires this
      paymentService.startCheckout(sessionResponse);

    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!eventDetails) {
    return <div className="loading">Loading event details...</div>;
  }

  return (
    <div className="seat-selection-page">
      {message && <div className={`message-notification ${message.type}`}>{message.text}</div>}

      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
        <div className="event-info">
          <h1>{eventDetails.title}</h1>
          <p className="event-meta">
            <span>{eventDetails.venue}</span>
            <span>{eventDetails.date}</span>
            <span>{eventDetails.time}</span>
          </p>
          {showCountdown && countdownText && (
            <div className={`event-countdown countdown-${countdownStatus}`}>
              <span className="countdown-text">
                <strong>Event starts in:</strong> {countdownText}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="seat-map-section" ref={seatMapRef}>
        <VenueSeatMap
          eventScheduleId={eventScheduleId!}
          venueId={venueId}
          onSeatSelect={handleSeatSelect}
          onSharedAreaSelect={handleSharedAreaSelect}
          maxSelection={10}
          selectedSeats={selectedSeats}
        />
      </div>

      {showBookingSummary && (selectedSeats.length > 0 || sharedAreaSelections.length > 0) && (
        <div className={`booking-summary ${isCollapsed ? 'collapsed' : ''}`} ref={summaryRef}>
          <div className="summary-content">
            <div className="summary-header">
              <h3>Booking Summary</h3>
              <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                {isCollapsed ? '▲' : '▼'}
              </button>
              {isHolding && !isCollapsed && (
                <div className="hold-timer">
                  Time remaining: <strong>{formatTime(holdTimer)}</strong>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <>
                <div className="summary-details">
                  {selectedSeats.length > 0 && (
                    <>
                      <div className="summary-row">
                        <span>Selected Seats:</span>
                        <strong>{selectedSeats.length}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Seat IDs:</span>
                        <div className="seat-badges">
                          {selectedSeats.map(seatId => (
                            <span key={seatId} className="seat-badge">{seatId}</span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {sharedAreaSelections.length > 0 && sharedAreaSelections.map((selection) => (
                    <React.Fragment key={`shared-area-${selection.areaNumber}`}>
                      <div className="summary-row">
                        <span>{selection.categoryName}:</span>
                        <strong>{selection.ticketCount} ticket{selection.ticketCount > 1 ? 's' : ''}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Price ({selection.categoryName}):</span>
                        <strong>{(selection.ticketCount * selection.pricePerTicket).toLocaleString()} LKR</strong>
                      </div>
                    </React.Fragment>
                  ))}

                  <div className="summary-row total">
                    <span>Total Price:</span>
                    <strong>{totalPrice.toLocaleString()} LKR</strong>
                  </div>
                </div>

                <div className="summary-actions">
                  {!isHolding ? (
                    <>
                      <button onClick={handleHoldSeats} className="btn btn-primary" disabled={loading || selectedSeats.length === 0}>
                        {loading ? 'Processing...' : 'Hold Seats (5 min)'}
                      </button>
                      <button onClick={handleProceedToPayment} className="btn btn-success" disabled={selectedSeats.length === 0 && sharedAreaSelections.length === 0}>
                        Proceed to Payment
                      </button>
                      <button onClick={() => { setSelectedSeats([]); setSharedAreaSelections([]); setTotalPrice(0); }} className="btn btn-secondary">
                        Clear Selection
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleProceedToPayment} className="btn btn-success" disabled={loading}>
                        Proceed to Payment
                      </button>
                      <button onClick={handleReleaseSeats} className="btn btn-danger" disabled={loading}>
                        Release Seats
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={paymentModalOpen}
        onClose={handleClosePaymentModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ position: 'relative', pb: 2, borderBottom: '1px solid #f0f0f0' }}>
          <IconButton onClick={handleClosePaymentModal} sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}>
            ×
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Grid container>
            <Grid item xs={12} md={7} sx={{ p: 4, borderRight: { md: '1px solid #f0f0f0' } }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, fontFamily: 'Raleway, sans-serif' }}>
                Checkout
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Delivery method
                </Typography>
                <FormControl fullWidth>
                  <Select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} size="small">
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="pickup">Pick up</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  Ha. Ha. Ha. we're gonna charge u more 100/=
                </Typography>
              </Box>

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
                    { value: 'koko', img: '/images/koko.jpeg', alt: 'Koko' },
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
                      }}
                    >
                      <Box component="img" src={method.img} alt={method.alt} sx={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="First Name" value={customerInfo.firstName} onChange={(e) => handleCustomerInfoChange('firstName', e.target.value)} size="small" required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Last Name" value={customerInfo.lastName} onChange={(e) => handleCustomerInfoChange('lastName', e.target.value)} size="small" required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="NIC/Passport" value={customerInfo.nic} onChange={(e) => handleCustomerInfoChange('nic', e.target.value)} size="small" required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Contact Number" value={customerInfo.phone} onChange={(e) => handleCustomerInfoChange('phone', e.target.value)} size="small" required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Email" type="email" value={customerInfo.email} onChange={(e) => handleCustomerInfoChange('email', e.target.value)} size="small" required />
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={<input type="checkbox" checked={bookingForSomeoneElse} onChange={(e) => setBookingForSomeoneElse(e.target.checked)} style={{ marginRight: '8px' }} />}
                  label={<Typography variant="body2">I am booking for someone else</Typography>}
                />
                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={<input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ marginRight: '8px' }} />}
                    label={<Typography variant="body2">I accept and agree to Terms and Conditions</Typography>}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button variant="outlined" onClick={handleClosePaymentModal} sx={{ borderColor: '#ff1955', color: '#ff1955', textTransform: 'none', fontWeight: 600 }}>
                  Back
                </Button>
                <Button variant="contained" fullWidth onClick={handleConfirmBooking} disabled={loading} sx={{ backgroundColor: '#ff1955', textTransform: 'none', fontWeight: 700 }}>
                  {loading ? 'Processing...' : 'Confirm booking'}
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={5} sx={{ p: 4, backgroundColor: '#fafafa' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, pb: 2, borderBottom: '2px solid #e0e0e0' }}>
                Ticket Summary
              </Typography>

              {/* Event Details Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#ff1955' }}>
                  {eventDetails?.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}></Typography>
                  <Typography variant="body2">{eventDetails?.date}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}></Typography>
                  <Typography variant="body2">{eventDetails?.time}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5, gap: 1 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}></Typography>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{eventDetails?.venue}</Typography>
                    {eventDetails?.venueAddress && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {eventDetails.venueAddress}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Selected Tickets Section */}
              <Box sx={{ mb: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  Selected Tickets
                </Typography>
                
                {/* Seated Tickets */}
                {selectedSeatDetails.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Seats ({selectedSeatDetails.length})</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {selectedSeatDetails.map((seat, index) => (
                        <Box 
                          key={seat?.seatId || index} 
                          sx={{ 
                            px: 1, 
                            py: 0.5, 
                            backgroundColor: '#fff', 
                            border: '1px solid #ddd', 
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}
                        >
                          {seat?.seatId || selectedSeats[index]}
                        </Box>
                      ))}
                    </Box>
                    {selectedSeatDetails.map((seat, index) => (
                      <Box key={seat?.seatId || index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {seat?.seatId || selectedSeats[index]} - {seat?.categoryName || 'Standard'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {(seat?.currentPrice || 0).toLocaleString()} LKR
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Shared Area Tickets */}
                {sharedAreaSelections.length > 0 && sharedAreaSelections.map((selection) => (
                  <Box key={`shared-${selection.areaNumber}`} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {selection.categoryName} × {selection.ticketCount}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(selection.ticketCount * selection.pricePerTicket).toLocaleString()} LKR
                      </Typography>
                    </Box>
                  </Box>
                ))}

                {/* Show message if no tickets selected */}
                {selectedSeatDetails.length === 0 && sharedAreaSelections.length === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No tickets selected
                  </Typography>
                )}
              </Box>

              {/* Amount Section */}
              <Box sx={{ pt: 2, borderTop: '2px solid #e0e0e0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  Amount
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Sub Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalPrice.toLocaleString()} LKR</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Handling fee</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>100 LKR</Typography>
                </Box>
                <Box sx={{ borderTop: '2px solid #e0e0e0', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{(totalPrice + 100).toLocaleString()} LKR</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions />
      </Dialog>

      {/* (Terms dialog unchanged) */}
    </div>
  );
};

export default SeatSelectionPage;
