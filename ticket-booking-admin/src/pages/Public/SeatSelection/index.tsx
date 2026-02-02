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
import { Close } from '@mui/icons-material';
import VenueSeatMap from '../../../components/VenueSeatMap/VenueSeatMap';
import { venueSeatService } from '../../../services/venueSeatService';
import axiosInstance from '../../../services/api';
import './SeatSelection.css';

interface EventDetails {
  id: number;
  title: string;
  venue: string;
  date: string;
  time: string;
  eventId?: string;
}

const SeatSelectionPage: React.FC = () => {
  const { eventScheduleId } = useParams<{ eventScheduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const eventDetailsFromState = location.state as { eventTitle?: string; venueName?: string; eventDate?: string; eventTime?: string; eventId?: string } | null;
  
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
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const seatMapRef = React.useRef<HTMLDivElement>(null);
  
  // Shared/Standing area ticket states (supports multiple areas)
  interface SharedAreaSelection {
    areaNumber: number;
    categoryName: string;
    ticketCount: number;
    pricePerTicket: number;
  }
  const [sharedAreaSelections, setSharedAreaSelections] = useState<SharedAreaSelection[]>([]);
  
  // Payment modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('visa');
  const [deliveryMethod, setDeliveryMethod] = useState('online');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [bookingForSomeoneElse, setBookingForSomeoneElse] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (eventScheduleId) {
      loadEventDetails(eventScheduleId);
    }
  }, [eventScheduleId]);

  // Show booking summary when seats are selected
  useEffect(() => {
    const hasSharedAreaTickets = sharedAreaSelections.reduce((sum, s) => sum + s.ticketCount, 0) > 0;
    setShowBookingSummary(selectedSeats.length > 0 || hasSharedAreaTickets);
  }, [selectedSeats, sharedAreaSelections]);

  // Handle click outside to collapse booking summary
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking on summary or seat map
      if (
        (summaryRef.current && summaryRef.current.contains(target)) ||
        (seatMapRef.current && seatMapRef.current.contains(target))
      ) {
        return;
      }
      setShowBookingSummary(false);
    };

    if (showBookingSummary) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBookingSummary]);

  useEffect(() => {
    // Hold timer countdown
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

  const loadEventDetails = async (scheduleId: string) => {
    try {
      // Try to fetch event schedule details from API to get venueId
      const response = await axiosInstance.get<{ venueId?: string; venueName?: string }>(`/api/public/events/schedules/${scheduleId}`);
      if (response.data) {
        const data = response.data;
        console.log('Event Schedule Data:', data);
        // Get venueId from the response
        const foundVenueId = data.venueId;
        console.log('Found venueId:', foundVenueId);
        setVenueId(foundVenueId);
      }
    } catch (error) {
      console.log('Could not fetch event schedule details:', error);
    }

    // Use data passed from navigation state
    // Event details are passed when navigating from EventDetails page
    if (eventDetailsFromState) {
      setEventDetails({
        id: 0,
        title: eventDetailsFromState.eventTitle || 'Event',
        venue: eventDetailsFromState.venueName || 'Kularathna Auditorium',
        date: eventDetailsFromState.eventDate || '',
        time: eventDetailsFromState.eventTime || '',
        eventId: eventDetailsFromState.eventId, // Store the event ID
      });
    } else {
      // No state available (direct URL access) - use placeholder
      setEventDetails({
        id: 0,
        title: 'Event',
        venue: 'Kularathna Auditorium',
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
      // Find if this area is already selected
      const existingIndex = prev.findIndex(s => s.areaNumber === areaNumber);
      
      if (count === 0) {
        // Remove this area selection
        return prev.filter(s => s.areaNumber !== areaNumber);
      }
      
      const newSelection: SharedAreaSelection = {
        areaNumber,
        categoryName,
        ticketCount: count,
        pricePerTicket
      };
      
      if (existingIndex >= 0) {
        // Update existing selection
        const newSelections = [...prev];
        newSelections[existingIndex] = newSelection;
        return newSelections;
      } else {
        // Add new selection
        return [...prev, newSelection];
      }
    });
    
    // Recalculate total price
    recalculateTotalPrice();
  };
  
  const recalculateTotalPrice = () => {
    const seatsTotal = selectedSeatDetails.reduce((sum, seat) => sum + (seat?.currentPrice || 0), 0);
    const sharedAreasTotal = sharedAreaSelections.reduce(
      (sum, selection) => sum + (selection.ticketCount * selection.pricePerTicket), 
      0
    );
    setTotalPrice(seatsTotal + sharedAreasTotal);
  };
  
  // Recalculate when shared area selections change
  useEffect(() => {
    const seatsTotal = selectedSeatDetails.reduce((sum, seat) => sum + (seat?.currentPrice || 0), 0);
    const sharedAreasTotal = sharedAreaSelections.reduce(
      (sum, selection) => sum + (selection.ticketCount * selection.pricePerTicket), 
      0
    );
    setTotalPrice(seatsTotal + sharedAreasTotal);
  }, [sharedAreaSelections, selectedSeatDetails]);

  const calculateTotalPrice = async (seatIds: string[]) => {
    try {
      const response = await venueSeatService.getSeatAvailability(eventScheduleId!);
      const selectedDetails = seatIds.map(seatId => {
        const seat = response.seats.find(s => s.seatId === seatId);
        return seat;
      }).filter(seat => seat !== undefined);
      
      setSelectedSeatDetails(selectedDetails);
      
      const seatsTotal = seatIds.reduce((sum, seatId) => {
        const seat = response.seats.find(s => s.seatId === seatId);
        return sum + (seat?.currentPrice || 0);
      }, 0);
      
      // Include shared area tickets in total
      const sharedAreasTotal = sharedAreaSelections.reduce(
        (sum, selection) => sum + (selection.ticketCount * selection.pricePerTicket), 
        0
      );
      setTotalPrice(seatsTotal + sharedAreasTotal);
    } catch (error) {
      console.error('Failed to calculate price:', error);
    }
  };

  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0) {
      showMessage('error', 'Please select at least one seat');
      return;
    }

    setLoading(true);
    try {
      const userId = 1; // Get from auth context
      
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
      console.error('Hold seats error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to hold seats. Please try again.';
      showMessage('error', errorMsg);
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
    } catch (error) {
      showMessage('error', 'Failed to release seats');
    }
  };

  const handleHoldExpired = () => {
    setIsHolding(false);
    setSelectedSeats([]);
    showMessage('error', 'Your seat hold has expired. Please select seats again.');
  };

  const handleProceedToPayment = () => {
    setPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
  };

  const handleCustomerInfoChange = (field: string, value: string) => {
    setCustomerInfo({
      ...customerInfo,
      [field]: value,
    });
  };

  const handleConfirmBooking = async () => {
    // Validate required fields
    if (!selectedPaymentMethod) {
      showMessage('error', 'Please select a payment method');
      return;
    }
    if (!acceptTerms) {
      showMessage('error', 'Please accept terms and conditions');
      return;
    }
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone || !customerInfo.email) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Build the booking confirmation request
      const bookingRequest = {
        eventId: eventDetails?.eventId,
        scheduleId: eventScheduleId,
        seatIds: selectedSeatDetails.map(seat => seat.seatId).filter((id: string) => id), // Only include valid seat IDs
        sharedAreaTickets: sharedAreaSelections.map(selection => ({
          categoryId: null, // Will be determined by backend based on shared area number
          categoryName: selection.categoryName,
          sharedAreaNumber: selection.areaNumber,
          ticketCount: selection.ticketCount,
          pricePerTicket: selection.pricePerTicket,
        })),
        paymentId: `PAY-${Date.now()}`, // This should come from actual payment gateway
        paymentMethod: selectedPaymentMethod.toUpperCase(),
        totalAmount: totalPrice,
      };

      console.log('Booking request:', bookingRequest);
      
      // Define response type
      interface BookingConfirmResponse {
        success: boolean;
        message?: string;
        bookingReference?: string;
        bookingId?: string;
        bookedSeats?: number;
        sharedAreaTickets?: number;
        totalTickets?: number;
        paymentId?: string;
      }
      
      // Make API call to confirm booking
      const response = await axiosInstance.post<BookingConfirmResponse>('/api/bookings/confirm', bookingRequest);
      
      if (response.data.success) {
        showMessage('success', `Booking confirmed! Reference: ${response.data.bookingReference}`);
        setPaymentModalOpen(false);
        
        // Navigate to bookings page or confirmation page
        setTimeout(() => {
          navigate('/bookings', { 
            state: { 
              bookingReference: response.data.bookingReference,
              message: 'Booking confirmed successfully!' 
            } 
          });
        }, 2000);
      } else {
        showMessage('error', response.data.message || 'Booking failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      showMessage('error', error.response?.data?.message || 'Booking failed. Please try again.');
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
      {/* Message notification */}
      {message && (
        <div className={`message-notification ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Event header */}
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-btn">
        ← Back
        </button>
        <div className="event-info">
          <h1>{eventDetails.title}</h1>
          <p className="event-meta">
            <span>{eventDetails.venue}</span>
            <span>{eventDetails.date}</span>
            <span>{eventDetails.time}</span>
          </p>
        </div>
      </div>

      {/* Seat map */}
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

      {/* Booking summary */}
      {showBookingSummary && (selectedSeats.length > 0 || sharedAreaSelections.length > 0) && (
        <div className={`booking-summary ${isCollapsed ? 'collapsed' : ''}`} ref={summaryRef}>
          <div className="summary-content">
            <div className="summary-header">
              <h3>Booking Summary</h3>
              <button 
                className="collapse-btn"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
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
                  <button 
                    onClick={handleHoldSeats} 
                    className="btn btn-primary"
                    disabled={loading || selectedSeats.length === 0}
                  >
                    {loading ? 'Processing...' : 'Hold Seats (5 min)'}
                  </button>
                  <button 
                    onClick={handleProceedToPayment} 
                    className="btn btn-success"
                    disabled={selectedSeats.length === 0 && sharedAreaSelections.length === 0}
                  >
                    Proceed to Payment
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedSeats([]);
                      setSharedAreaSelections([]);
                      setTotalPrice(0);
                    }} 
                    className="btn btn-secondary"
                  >
                    Clear Selection
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleProceedToPayment} 
                    className="btn btn-success"
                    disabled={loading}
                  >
                    Proceed to Payment
                  </button>
                  <button 
                    onClick={handleReleaseSeats} 
                    className="btn btn-danger"
                    disabled={loading}
                  >
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

      {/* Payment Modal */}
      <Dialog
        open={paymentModalOpen}
        onClose={handleClosePaymentModal}
        maxWidth="lg"
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
            onClick={handleClosePaymentModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'grey.500',
            }}
          >
            ×
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
                  Ha. Ha. Ha. we're gonna charge u more 100/=
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
                          onClick={(e) => {
                            e.preventDefault();
                            setTermsDialogOpen(true);
                          }}
                          sx={{
                            color: '#ff1955',
                            textDecoration: 'none',
                            cursor: 'pointer',
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
                  onClick={handleClosePaymentModal}
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
                  onClick={handleConfirmBooking}
                  disabled={loading}
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
                  {loading ? 'Processing...' : 'Confirm booking'}
                </Button>
              </Box>
            </Grid>

            {/* Right Side - Ticket Summary */}
            <Grid item xs={12} md={5} sx={{ p: 4, backgroundColor: '#fafafa' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, pb: 2, borderBottom: '2px solid #e0e0e0' }}>
                Ticket Summary
              </Typography>

              {/* Selected Seats */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  Selected Seats
                </Typography>
                {selectedSeatDetails.length > 0 ? (
                  selectedSeatDetails.map((seat: any) => (
                    <Box key={seat.seatId} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {seat.currentPrice?.toLocaleString() || 0} LKR - {seat.categoryName?.toUpperCase() || 'SEAT'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        Seat: {seat.seatNumber}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No seats selected
                  </Typography>
                )}
                
                {/* Shared Area Tickets */}
                {sharedAreaSelections.length > 0 && sharedAreaSelections.map((selection, index) => (
                  <Box key={`shared-area-${selection.areaNumber}`} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {(selection.ticketCount * selection.pricePerTicket).toLocaleString()} LKR - {selection.categoryName.toUpperCase()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {selection.ticketCount} ticket{selection.ticketCount > 1 ? 's' : ''} (Standing Area #{selection.areaNumber})
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Pricing Summary */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '2px solid #e0e0e0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  Amount
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Sub Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {totalPrice.toLocaleString()} LKR
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Handling fee</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    100 LKR
                  </Typography>
                </Box>
                <Box sx={{ borderTop: '2px solid #e0e0e0', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {(totalPrice + 100).toLocaleString()} LKR
                  </Typography>
                </Box>
              </Box>

              {/* Event Information */}
              {eventDetails && (
                <Box sx={{ mt: 3, pt: 3, borderTop: '2px solid #e0e0e0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Event Details
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Event:</strong> {eventDetails.title}
                  </Typography>
                  {eventDetails.venue && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Venue:</strong> {eventDetails.venue}
                    </Typography>
                  )}
                  {eventDetails.date && eventDetails.time && (
                    <Typography variant="body2">
                      <strong>Date & Time:</strong> {eventDetails.date} at {eventDetails.time}
                    </Typography>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Terms and Conditions Dialog */}
      <Dialog
        open={termsDialogOpen}
        onClose={() => setTermsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ 
          bgcolor: '#ff1955', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Terms and Conditions
          </Typography>
          <IconButton
            onClick={() => setTermsDialogOpen(false)}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955' }}>
              1. Acceptance of Terms
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              By purchasing tickets through our platform, you agree to be bound by these Terms and Conditions. 
              Please read them carefully before completing your booking.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              2. Ticket Purchase and Payment
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • All ticket sales are final and non-refundable unless the event is cancelled or postponed.
              <br />
              • Payment must be made in full at the time of booking.
              <br />
              • We accept various payment methods including credit/debit cards and online payment systems.
              <br />
              • A handling fee may be applied to each transaction.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              3. Ticket Delivery
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • E-tickets will be sent to the email address provided during booking.
              <br />
              • It is your responsibility to ensure the email address is correct.
              <br />
              • You must present a valid ticket (printed or on mobile device) for entry to the event.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              4. Event Cancellation or Postponement
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • If an event is cancelled, refunds will be issued to the original payment method.
              <br />
              • In case of postponement, your ticket will remain valid for the new date.
              <br />
              • We are not responsible for any additional costs incurred (travel, accommodation, etc.).
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              5. Entry Requirements
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • Entry is subject to venue terms and conditions.
              <br />
              • Age restrictions may apply for certain events.
              <br />
              • Management reserves the right to refuse entry without refund.
              <br />
              • Security checks may be conducted at the venue.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              6. Prohibited Items and Behavior
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • Recording devices, professional cameras, and unauthorized merchandise are prohibited.
              <br />
              • Disruptive or offensive behavior may result in removal from the venue.
              <br />
              • Smoking, alcohol, and illegal substances are strictly prohibited unless otherwise stated.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              7. Liability
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • We are not liable for any injury, loss, or damage at the event.
              <br />
              • Attendees participate at their own risk.
              <br />
              • Personal belongings are the responsibility of the ticket holder.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              8. Ticket Resale
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • Tickets may not be resold for commercial purposes or at a premium.
              <br />
              • Unauthorized resale may result in ticket cancellation without refund.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              9. Privacy and Data Protection
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              • Your personal information will be processed in accordance with our Privacy Policy.
              <br />
              • We may use your contact details to send event-related communications.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#ff1955', mt: 2 }}>
              10. Contact Information
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
              For any questions or concerns regarding these terms, please contact our customer support team.
            </Typography>

            <Typography variant="body2" sx={{ mt: 3, fontStyle: 'italic', color: 'text.secondary' }}>
              Last updated: February 2, 2026
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setAcceptTerms(true);
              setTermsDialogOpen(false);
            }}
            variant="contained"
            sx={{
              bgcolor: '#ff1955',
              '&:hover': { bgcolor: '#e01545' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Accept and Close
          </Button>
          <Button
            onClick={() => setTermsDialogOpen(false)}
            variant="outlined"
            sx={{
              borderColor: '#ff1955',
              color: '#ff1955',
              textTransform: 'none',
              '&:hover': { borderColor: '#e01545', bgcolor: 'rgba(255, 25, 85, 0.04)' },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SeatSelectionPage;
