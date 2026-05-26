import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    dealProperties?: {
      dealActive?: boolean;
      dealType?: string;
      dealDiscountPercentage?: number;
      dealBuyQuantity?: number;
      dealFreeQuantity?: number;
      dealLabel?: string;
    };
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

  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleHoldExpired = useCallback(() => {
    setIsHolding(false);
    setSelectedSeats([]);
    showMessage('error', 'Your seat hold has expired. Please select seats again.');
  }, []);

  const fetchEventDetails = useCallback(async (scheduleId: string) => {
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
  }, [eventDetailsFromState]);

  useEffect(() => {
    if (eventScheduleId) {
      fetchEventDetails(eventScheduleId);
    }
  }, [eventScheduleId, fetchEventDetails]);

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
  }, [holdTimer, handleHoldExpired]);

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

  const handleSeatSelect = async (seats: string[]) => {
    setSelectedSeats(seats);
    await calculateTotalPrice(seats);
  };

  const handleSharedAreaSelect = (
    areaNumber: number,
    count: number,
    pricePerTicket: number,
    categoryName: string,
    dealProperties?: any
  ) => {
    setSharedAreaSelections(prev => {
      const existingIndex = prev.findIndex(s => s.areaNumber === areaNumber);

      if (count === 0) return prev.filter(s => s.areaNumber !== areaNumber);

      const newSelection: SharedAreaSelection = { areaNumber, categoryName, ticketCount: count, pricePerTicket, dealProperties };

      if (existingIndex >= 0) {
        const newSelections = [...prev];
        newSelections[existingIndex] = newSelection;
        return newSelections;
      }
      return [...prev, newSelection];
    });
  };

  const [totalDiscount, setTotalDiscount] = useState(0);

  useEffect(() => {
    let newTotal = 0;
    let newTotalDiscount = 0;

    // Group selected seats by category using a Map to prevent CWE-94 Prototype Pollution
    const seatsByCategory = new Map<string, any[]>();
    selectedSeatDetails.forEach(seat => {
      if (!seat) return;
      const catName = seat.categoryName;
      if (!seatsByCategory.has(catName)) {
        seatsByCategory.set(catName, []);
      }
      seatsByCategory.get(catName)!.push(seat);
    });

    // Calculate seats
    Array.from(seatsByCategory.values()).forEach(categorySeats => {
      const count = categorySeats.length;
      if (count === 0) return;
      const sample = categorySeats[0];
      const basePrice = sample.currentPrice || 0;

      if (sample.dealActive) {
        if (sample.dealType === 'PERCENTAGE_DISCOUNT' && sample.dealDiscountPercentage) {
          const discountPerTicket = basePrice * (sample.dealDiscountPercentage / 100);
          newTotalDiscount += discountPerTicket * count;
          newTotal += (basePrice - discountPerTicket) * count;
        } else if (sample.dealType === 'BUY_X_GET_Y_FREE' && sample.dealBuyQuantity && sample.dealFreeQuantity) {
          const groupSize = sample.dealBuyQuantity + sample.dealFreeQuantity;
          const freeItems = Math.floor(count / groupSize) * sample.dealFreeQuantity;
          newTotalDiscount += basePrice * freeItems;
          const payableItems = count - freeItems;
          newTotal += basePrice * payableItems;
        } else {
          newTotal += basePrice * count;
        }
      } else {
        newTotal += basePrice * count;
      }
    });

    // Calculate shared areas
    sharedAreaSelections.forEach(selection => {
      const count = selection.ticketCount;
      const basePrice = selection.pricePerTicket;
      const deal = selection.dealProperties;

      if (deal?.dealActive) {
        if (deal.dealType === 'PERCENTAGE_DISCOUNT' && deal.dealDiscountPercentage) {
          const discountPerTicket = basePrice * (deal.dealDiscountPercentage / 100);
          newTotalDiscount += discountPerTicket * count;
          newTotal += (basePrice - discountPerTicket) * count;
        } else if (deal.dealType === 'BUY_X_GET_Y_FREE' && deal.dealBuyQuantity && deal.dealFreeQuantity) {
          const groupSize = deal.dealBuyQuantity + deal.dealFreeQuantity;
          const freeItems = Math.floor(count / groupSize) * deal.dealFreeQuantity;
          newTotalDiscount += basePrice * freeItems;
          const payableItems = count - freeItems;
          newTotal += basePrice * payableItems;
        } else {
          newTotal += basePrice * count;
        }
      } else {
        newTotal += basePrice * count;
      }
    });

    setTotalPrice(newTotal);
    setTotalDiscount(newTotalDiscount);
  }, [sharedAreaSelections, selectedSeatDetails]);

  const calculateTotalPrice = async (seatIds: string[]) => {
    try {
      const response = await venueSeatService.getSeatAvailability(eventScheduleId!);
      const selectedDetails = seatIds.map(seatId => response.seats.find(s => s.seatId === seatId)).filter(Boolean);
      setSelectedSeatDetails(selectedDetails);
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

    // Guard: eventId must be loaded before proceeding
    const resolvedEventId = eventDetails?.eventId;
    if (!resolvedEventId) {
      return showMessage('error', 'Event details are still loading. Please wait a moment and try again.');
    }

    const HANDLING_FEE = 100;
    const finalAmount = totalPrice + HANDLING_FEE;

    setLoading(true);

    try {
      const returnUrl = `${window.location.origin}/booking/payment-success`;
      const cancelUrl = `${window.location.origin}/booking/payment-cancel`;

      const paymentRequest: InitiatePaymentRequest = {
        eventId: resolvedEventId,
        scheduleId: eventScheduleId || '',
        seatIds: selectedSeatDetails.map(seat => seat.seatId).filter((id: string) => id),
        sharedAreaTickets: sharedAreaSelections.map(selection => ({
          categoryId: undefined,
          categoryName: selection.categoryName,
          sharedAreaNumber: selection.areaNumber,
          ticketCount: selection.ticketCount,
          pricePerTicket: selection.pricePerTicket,
        })),
        totalAmount: finalAmount,
        discountAmount: totalDiscount,
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

      // store sessionId so return page can verify
      localStorage.setItem('mpgs_sessionId', sessionResponse.sessionId);

      setIsRedirecting(true);
      await paymentService.loadMPGSScript(sessionResponse.checkoutScriptUrl);

      setPaymentModalOpen(false);
      paymentService.startCheckout(sessionResponse);

    } catch (error: any) {
      const detail = error.response?.data?.details || error.response?.data?.message || error.message || 'Failed to initiate payment. Please try again.';
      showMessage('error', `Payment initiation failed: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (!eventDetails) {
    return <div className="loading">{t('loadingEventDetails', 'Loading event details...')}</div>;
  }

  return (
    <div className="seat-selection-page">
      {isRedirecting ? (
        <div className="payment-redirection-view">
          <div className="redirection-content">
            <div className="secure-badge">
              <span className="lock-icon"></span>
              {t('secureCheckout', 'SECURE CHECKOUT')}
            </div>
            <h1>{t('initializingSecurePayment', 'Initializing Secure Payment')}</h1>
            <p>{t('doNotRefresh', 'Please do not refresh the page or click the back button.')}</p>
            <div className="loading-container">
              <CircularProgress sx={{ color: '#ff1955', mb: 2 }} />
              <div className="loading-text">{t('connectingToPayment', 'Connecting to Payment Gateway...')}</div>
            </div>
            <div className="order-summary-mini">
              <div className="summary-item">
                <span>{t('eventLabel', 'Event:')}</span>
                <strong>{eventDetails.title}</strong>
              </div>
              {eventDetails.date && eventDetails.time && (
                <div className="summary-item">
                  <span>{t('timeSlotLabel', 'Time Slot:')}</span>
                  <strong>{eventDetails.date} • {eventDetails.time}</strong>
                </div>
              )}
              {selectedSeats.length > 0 && (
                <div className="summary-item">
                  <span>{t('selectedSeatsLabel', 'Selected Seats:')}</span>
                  <strong>{selectedSeats.join(', ')}</strong>
                </div>
              )}
              {sharedAreaSelections.length > 0 && (
                <div className="summary-item">
                  <span>{t('ticketsLabel', 'Tickets:')}</span>
                  <strong>
                    {sharedAreaSelections.map(s => `${s.categoryName} (x${s.ticketCount})`).join(', ')}
                  </strong>
                </div>
              )}
              <div className="summary-item">
                <span>{t('totalAmountLabel', 'Total Amount:')}</span>
                <strong>{(totalPrice + 100).toLocaleString()} LKR</strong>
              </div>
            </div>
            <button 
              className="redirection-back-btn" 
              onClick={() => setIsRedirecting(false)}
            >
              {t('cancelReturn', 'Cancel & Return')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {message && <div className={`message-notification ${message.type}`}>{message.text}</div>}

          <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-btn">{t('back', '← Back')}</button>
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
                <strong>{t('eventStartsIn', 'Event starts in:')}</strong> {countdownText}
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
              <h3>{t('bookingSummary', 'Booking Summary')}</h3>
              <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                {isCollapsed ? '▲' : '▼'}
              </button>
            </div>

            {!isCollapsed && (
              <>
                <div className="summary-details">
                  {selectedSeats.length > 0 && (
                    <>
                      <div className="summary-row">
                        <span>{t('selectedSeatsLabelSummary', 'Selected Seats:')}</span>
                        <strong>{selectedSeats.length}</strong>
                      </div>
                      <div className="summary-row">
                        <span>{t('seatIdsLabel', 'Seat IDs:')}</span>
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
                        <strong>{selection.ticketCount} {selection.ticketCount > 1 ? t('ticketsPlural', 'tickets') : t('ticketSingular', 'ticket')}</strong>
                      </div>
                      <div className="summary-row">
                        <span>{t('priceLabel', 'Price')} ({selection.categoryName}):</span>
                        <strong>{(selection.ticketCount * selection.pricePerTicket).toLocaleString()} LKR</strong>
                      </div>
                    </React.Fragment>
                  ))}

                  <div className="summary-row total">
                    <span>{t('totalPriceLabel', 'Total Price:')}</span>
                    <strong>{totalPrice.toLocaleString()} LKR</strong>
                  </div>
                </div>

                <div className="summary-actions">
                  {!isHolding ? (
                    <>
                      <button onClick={handleHoldSeats} className="btn btn-primary" disabled={loading || selectedSeats.length === 0}>
                        {loading ? t('processing', 'Processing...') : t('holdSeats', 'Hold Seats (5 min)')}
                      </button>
                      <button onClick={handleProceedToPayment} className="btn btn-success" disabled={selectedSeats.length === 0 && sharedAreaSelections.length === 0}>
                        {t('proceedToPayment', 'Proceed to Payment')}
                      </button>
                      <button onClick={() => { setSelectedSeats([]); setSharedAreaSelections([]); setTotalPrice(0); }} className="btn btn-secondary">
                        {t('clearSelection', 'Clear Selection')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleProceedToPayment} className="btn btn-success" disabled={loading}>
                        {t('proceedToPayment', 'Proceed to Payment')}
                      </button>
                      <button onClick={handleReleaseSeats} className="btn btn-danger" disabled={loading}>
                        {t('releaseSeats', 'Release Seats')}
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
                {t('checkout', 'Checkout')}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {t('deliveryMethod', 'Delivery method')}
                </Typography>
                <FormControl fullWidth>
                  <Select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} size="small">
                    <MenuItem value="online">{t('online', 'Online')}</MenuItem>
                    <MenuItem value="pickup">{t('pickup', 'Pick up')}</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  {t('handlingFeeNotice', "Ha. Ha. Ha. we're gonna charge u more 100/=")}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {t('paymentMethodSelect', 'Payment Method')} <span style={{ color: '#d32f2f' }}>({t('selectOne', 'Select one')})</span>
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
                  label={<Typography variant="body2">{t('bookingForSomeoneElse', 'I am booking for someone else')}</Typography>}
                />
                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={<input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ marginRight: '8px' }} />}
                    label={<Typography variant="body2">{t('acceptTerms', 'I accept and agree to Terms and Conditions')}</Typography>}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button variant="outlined" onClick={handleClosePaymentModal} sx={{ borderColor: '#ff1955', color: '#ff1955', textTransform: 'none', fontWeight: 600 }}>
                  {t('backToSelection', 'Back to selection')}
                </Button>
                <Button variant="contained" fullWidth onClick={handleConfirmBooking} disabled={loading} sx={{ backgroundColor: '#ff1955', textTransform: 'none', fontWeight: 700 }}>
                  {loading ? t('processing', 'Processing...') : t('confirmBooking', 'Confirm booking')}
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={5} sx={{ p: 4, backgroundColor: '#fafafa' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 2, borderBottom: '2px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t('ticketSummary', 'Ticket Summary')}
                </Typography>
                <Button 
                  size="small" 
                  onClick={handleClosePaymentModal}
                  sx={{ color: '#ff1955', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {t('changeSeats', 'Change Seats')}
                </Button>
              </Box>

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
                  {t('selectedTickets', 'Selected Tickets')}
                </Typography>

                {/* Seated Tickets */}
                {selectedSeatDetails.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{t('seatsLabelShort', 'Seats')} ({selectedSeatDetails.length})</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {selectedSeatDetails.map((seat, index) => (
                        <Box
                          key={seat?.seatId || (selectedSeats.find((_, i) => i === index) || index)}
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
                          {seat?.seatId || selectedSeats.find((_, i) => i === index)}
                        </Box>
                      ))}
                    </Box>
                    {selectedSeatDetails.map((seat, index) => (
                      <Box key={seat?.seatId || (selectedSeats.find((_, i) => i === index) || index)} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {(seat?.seatId || selectedSeats.find((_, i) => i === index))} - {seat?.categoryName || t('standard', 'Standard')}
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
                    {t('noTicketsSelected', 'No tickets selected')}
                  </Typography>
                )}
              </Box>

              {/* Amount Section */}
              <Box sx={{ pt: 2, borderTop: '2px solid #e0e0e0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
                  {t('amount', 'Amount')}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{t('subTotal', 'Sub Total')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalPrice.toLocaleString()} LKR</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">{t('handlingFee', 'Handling fee')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>100 LKR</Typography>
                </Box>
                <Box sx={{ borderTop: '2px solid #e0e0e0', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('total', 'Total')}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{(totalPrice + 100).toLocaleString()} LKR</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions />
      </Dialog>

      {/* (Terms dialog unchanged) */}
        </>
      )}
    </div>
  );
};

export default SeatSelectionPage;
