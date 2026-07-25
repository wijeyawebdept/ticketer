import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Event as EventIcon,
  LocationOn as LocationOnIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../../../components/public/PublicNavbar';
import VenueSeatMap from '../../../components/VenueSeatMap/VenueSeatMap';
import { venueSeatService } from '../../../services/venueSeatService';
import axiosInstance from '../../../services/api';
import paymentService, { InitiatePaymentRequest } from '../../../services/payment.service';
import { useAuth } from '../../../context/AuthContext';
import { calculateTimeRemaining, formatCountdown, getCountdownStatus } from '../../../utils/countdownFormatter';
import { formatTimeString } from '../../../utils/formatters';
import CheckoutModal from '../../../components/CheckoutModal';
import { useCurrency } from '../../../context/CurrencyContext';
import './SeatSelection.css';

interface EventDetails {
  id: number;
  title: string;
  venue: string;
  venueAddress?: string;
  date: string;
  time: string;
  eventId?: string;
  ticketCutoffTime?: string;
}

const SeatSelectionPage: React.FC = () => {
  const { eventScheduleId } = useParams<{ eventScheduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency, currency, convertAmount } = useCurrency();
  const eventDetailsFromState = location.state as { eventTitle?: string; venueName?: string; venueAddress?: string; eventDate?: string; eventTime?: string; eventId?: string } | null;

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState<any[]>([]);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [isHolding, setIsHolding] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [isSalesClosed, setIsSalesClosed] = useState(false);
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
        ticketCutoffTime?: string;
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
          ticketCutoffTime: response.data.ticketCutoffTime,
        });
        
        if (response.data.ticketCutoffTime) {
          const cutoff = new Date(response.data.ticketCutoffTime);
          if (new Date() > cutoff) {
            setIsSalesClosed(true);
            showMessage('error', 'Online ticket sales for this event have closed.');
          }
        }
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
        ticketCutoffTime: undefined,
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
      
      // Do not collapse if clicking inside the summary panel itself
      if (summaryRef.current && summaryRef.current.contains(target)) {
        return;
      }
      
      // Do not collapse if clicking inside the actual seat map container (the dark box)
      if (target instanceof Element && target.closest('.venue-seat-map-container')) {
        return;
      }

      setIsCollapsed(true);
    };

    if (showBookingSummary) document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBookingSummary]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedSeats.length > 0 || sharedAreaSelections.length > 0) {
      setIsCollapsed(false);
    }
  }, [selectedSeats, sharedAreaSelections]);

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
    if (isSalesClosed) return;

    if (isHolding) {
      const deselectedSeat = selectedSeats.find(id => !seats.includes(id));
      if (deselectedSeat) {
        try {
          await venueSeatService.releaseHolds(eventScheduleId!, [deselectedSeat]);
          showMessage('success', `Released seat ${deselectedSeat}`);
        } catch {
          showMessage('error', `Failed to release seat ${deselectedSeat}`);
          return;
        }
      }

      if (seats.length === 0) {
        setIsHolding(false);
        setHoldTimer(0);
      }
    }

    setSelectedSeats(seats);
    await calculateTotalPrice(seats);
  };

  const handleRemoveSeat = (seatIdToRemove: string) => {
    const updatedSeats = selectedSeats.filter(id => id !== seatIdToRemove);
    handleSeatSelect(updatedSeats);
  };

  const handleSharedAreaSelect = (
    areaNumber: number,
    count: number,
    pricePerTicket: number,
    categoryName: string,
    dealProperties?: any
  ) => {
    if (isSalesClosed) return;
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
  const [discountInfoString, setDiscountInfoString] = useState<string | undefined>(undefined);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    let newTotal = 0;
    let newTotalDiscount = 0;
    const dealDescriptions = new Set<string>();

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
          dealDescriptions.add(sample.dealLabel || `${sample.dealDiscountPercentage}% Off`);
        } else if (sample.dealType === 'BUY_X_GET_Y_FREE' && sample.dealBuyQuantity && sample.dealFreeQuantity) {
          const groupSize = sample.dealBuyQuantity + sample.dealFreeQuantity;
          const freeItems = Math.floor(count / groupSize) * sample.dealFreeQuantity;
          newTotalDiscount += basePrice * freeItems;
          const payableItems = count - freeItems;
          newTotal += basePrice * payableItems;
          dealDescriptions.add(sample.dealLabel || `Buy ${sample.dealBuyQuantity} Get ${sample.dealFreeQuantity} Free`);
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
          dealDescriptions.add(deal.dealLabel || `${deal.dealDiscountPercentage}% Off`);
        } else if (deal.dealType === 'BUY_X_GET_Y_FREE' && deal.dealBuyQuantity && deal.dealFreeQuantity) {
          const groupSize = deal.dealBuyQuantity + deal.dealFreeQuantity;
          const freeItems = Math.floor(count / groupSize) * deal.dealFreeQuantity;
          newTotalDiscount += basePrice * freeItems;
          const payableItems = count - freeItems;
          newTotal += basePrice * payableItems;
          dealDescriptions.add(deal.dealLabel || `Buy ${deal.dealBuyQuantity} Get ${deal.dealFreeQuantity} Free`);
        } else {
          newTotal += basePrice * count;
        }
      } else {
        newTotal += basePrice * count;
      }
    });

    setTotalPrice(newTotal);
    setTotalDiscount(newTotalDiscount);
    setDiscountInfoString(dealDescriptions.size > 0 ? Array.from(dealDescriptions).join(', ') : undefined);
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
    if (isSalesClosed) return;
    if (selectedSeats.length === 0) {
      showMessage('error', 'Please select at least one seat');
      return;
    }

    setLoading(true);
    try {
      const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // from auth context or dummy guest uuid
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
      setIsCollapsed(true);
    }
  };
  const handleClosePaymentModal = () => setPaymentModalOpen(false);

  const handleConfirmBooking = async (paymentData: any) => {
    const { paymentMethod, customerInfo, acceptTerms } = paymentData;

    if (!paymentMethod) return showMessage('error', 'Please select a payment method');
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
          pricePerTicket: convertAmount(selection.pricePerTicket),
        })),
        totalAmount: convertAmount(finalAmount),
        amountInLkr: finalAmount,
        discountAmount: convertAmount(totalDiscount || 0),
        discountInfo: discountInfoString,
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
    return (
      <Box sx={{ backgroundColor: '#242a33', minHeight: '100vh' }}>
        <PublicNavbar />
        <Container maxWidth="xl" sx={{ pt: 16, pb: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress sx={{ color: '#ff1955' }} />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#242a33', minHeight: '100vh' }}>
      <PublicNavbar />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
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
                <strong>{formatCurrency(totalPrice + 100)}</strong>
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
          {/* Single-Line Event Details Strip */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#1b222c',
              border: '1px solid rgba(255, 25, 85, 0.25)',
              borderRadius: '12px',
              px: { xs: 2, md: 3 },
              py: 1.5,
              mb: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(12px)',
              width: '85%',
              maxWidth: '1100px',
              mx: 'auto',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, md: 3 },
                flexWrap: 'wrap',
                flex: 1,
              }}
            >
              {/* Back Arrow Button */}
              <IconButton
                onClick={() => navigate(-1)}
                size="small"
                sx={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  p: 0.8,
                  '&:hover': {
                    backgroundColor: '#ff1955',
                    color: '#ffffff',
                    transform: 'translateX(-2px)',
                  },
                  transition: 'all 0.2s ease',
                }}
                title="Back to Event"
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>

              {/* Event Title */}
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 800,
                  color: '#ffffff',
                  fontSize: { xs: '1.05rem', md: '1.2rem' },
                  whiteSpace: 'nowrap',
                }}
              >
                {eventDetails.title}
              </Typography>

              {/* Date & Time */}
              {(eventDetails.date || eventDetails.time) && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.875rem',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  <EventIcon sx={{ fontSize: 18, color: '#ff1955' }} />
                  <span>
                    {eventDetails.date}
                    {eventDetails.date && eventDetails.time ? ' • ' : ''}
                    {formatTimeString(eventDetails.time)}
                  </span>
                </Box>
              )}

              {/* Venue */}
              {eventDetails.venue && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.875rem',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  <LocationOnIcon sx={{ fontSize: 18, color: '#ff1955' }} />
                  <span>{eventDetails.venue}</span>
                </Box>
              )}
            </Box>

            {/* Countdown Badge on the Far Right */}
            {showCountdown && countdownText && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 0.5,
                  borderRadius: '20px',
                  backgroundColor:
                    countdownStatus === 'urgent'
                      ? 'rgba(244, 67, 54, 0.15)'
                      : countdownStatus === 'warning'
                      ? 'rgba(255, 193, 7, 0.15)'
                      : 'rgba(76, 175, 80, 0.15)',
                  border:
                    countdownStatus === 'urgent'
                      ? '1px solid rgba(244, 67, 54, 0.4)'
                      : countdownStatus === 'warning'
                      ? '1px solid rgba(255, 193, 7, 0.4)'
                      : '1px solid rgba(76, 175, 80, 0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 800,
                    color: 'rgba(255, 255, 255, 0.6)',
                    letterSpacing: '0.5px',
                    fontSize: '0.65rem',
                  }}
                >
                  STARTS IN:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color:
                      countdownStatus === 'urgent'
                        ? '#ef5350'
                        : countdownStatus === 'warning'
                        ? '#ffb74d'
                        : '#66bb6a',
                  }}
                >
                  {countdownText}
                </Typography>
              </Box>
            )}

            {isSalesClosed && (
              <Chip
                label="Sales Closed"
                color="error"
                size="small"
                sx={{ fontWeight: 700, fontFamily: 'Raleway, sans-serif' }}
              />
            )}
          </Box>

      <div className="seat-map-section" ref={seatMapRef}>
        <VenueSeatMap
          venueId={venueId}
          eventScheduleId={eventScheduleId!}
          onSeatSelect={handleSeatSelect}
          onSharedAreaSelect={handleSharedAreaSelect}
          selectedSeats={selectedSeats}
          bookedSeats={[]}
          isHolding={isHolding}
        />
      </div>

      {showBookingSummary && (selectedSeats.length > 0 || sharedAreaSelections.length > 0) && (
        <>
          {isCollapsed && (
            <button 
              className="floating-summary-btn floating-cart-btn"
              onClick={() => setIsCollapsed(false)}
              title={t('viewSummary', 'View Summary')}
            >
              <ShoppingCartIcon sx={{ fontSize: 24, color: '#ffffff' }} />
              <div className="badge">{selectedSeats.length + sharedAreaSelections.length}</div>
            </button>
          )}
          
          <div 
            className={`booking-summary ${isCollapsed ? 'collapsed' : ''}`} 
            ref={summaryRef}
          >
            <div className="summary-content">
              <div className="summary-header">
                <h3>{t('bookingSummary', 'Booking Summary')}</h3>
                <button 
                  className="close-panel-btn"
                  onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '0 8px' }}
                >
                  ×
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
                      <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ marginBottom: '8px' }}>{t('seatIdsLabel', 'Seat IDs:')}</span>
                        <div className="seat-badges">
                          {selectedSeats.map(seatId => (
                            <span 
                              key={seatId} 
                              className="seat-badge clickable"
                              onClick={() => handleRemoveSeat(seatId)}
                              title={t('clickToRemove', 'Click to remove')}
                            >
                              {seatId} <span className="remove-icon">×</span>
                            </span>
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
                        <strong>{formatCurrency(selection.ticketCount * selection.pricePerTicket)}</strong>
                      </div>
                    </React.Fragment>
                  ))}

                  {totalDiscount > 0 && (
                    <>
                      <div className="summary-row">
                        <span style={{ color: '#aaa' }}>{t('subtotalLabel', 'Subtotal:')}</span>
                        <strong style={{ color: '#aaa' }}>{formatCurrency(totalPrice + totalDiscount)}</strong>
                      </div>
                      <div className="summary-row" style={{ color: '#4caf50' }}>
                        <span>{discountInfoString ? `Discount (${discountInfoString}):` : t('discountLabel', 'Discount:')}</span>
                        <strong>-{formatCurrency(totalDiscount)}</strong>
                      </div>
                      <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
                    </>
                  )}
                  <div className="summary-row total">
                    <span>{t('totalPriceLabel', 'Total Price:')}</span>
                    <strong>{formatCurrency(totalPrice)}</strong>
                  </div>
                </div>

                <div className="summary-actions">
                  {!isHolding ? (
                    <>
                      <button onClick={handleHoldSeats} className="btn btn-primary" disabled={loading || selectedSeats.length === 0 || isSalesClosed}>
                        {loading ? t('processing', 'Processing...') : t('holdSeats', 'Hold Seats (5 min)')}
                      </button>
                      <button onClick={handleProceedToPayment} className="btn btn-success" disabled={(selectedSeats.length === 0 && sharedAreaSelections.length === 0) || isSalesClosed}>
                        {t('proceedToPayment', 'Proceed to Payment')}
                      </button>
                      <button onClick={() => { setSelectedSeats([]); setSharedAreaSelections([]); setTotalPrice(0); }} className="btn btn-secondary">
                        {t('clearSelection', 'Clear Selection')}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', marginRight: 'auto', fontWeight: 'bold', color: holdTimer < 60 ? '#d32f2f' : '#f57c00' }}>
                        {t('timeRemaining', 'Time Remaining:')} {Math.floor(holdTimer / 60)}:{(holdTimer % 60).toString().padStart(2, '0')}
                      </div>
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
        </>
      )}

      <CheckoutModal
        isOpen={paymentModalOpen}
        onClose={handleClosePaymentModal}
        loading={loading}
        onConfirmBooking={handleConfirmBooking}
        eventDetails={eventDetails}
        selectedSeatDetails={selectedSeatDetails}
        selectedSeats={selectedSeats}
        sharedAreaSelections={sharedAreaSelections}
        totalPrice={totalPrice}
        totalDiscount={totalDiscount}
        discountInfoString={discountInfoString}
        handlingFee={100}
      />

      {/* (Terms dialog unchanged) */}
        </>
      )}
        </div>
      </Container>
    </Box>
  );
};

export default SeatSelectionPage;
