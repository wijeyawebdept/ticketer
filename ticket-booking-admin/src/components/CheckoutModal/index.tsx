import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services';
import { useCurrency } from '../../context/CurrencyContext';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  onConfirmBooking: (paymentData: {
    paymentMethod: string;
    deliveryMethod: string;
    customerInfo: {
      firstName: string;
      lastName: string;
      nic: string;
      phone: string;
      email: string;
    };
    acceptTerms: boolean;
    bookingForSomeoneElse: boolean;
  }) => void;
  eventDetails?: {
    title: string;
    date: string;
    time: string;
    venue: string;
    venueAddress?: string;
  } | null;
  selectedSeatDetails?: any[];
  selectedSeats?: string[];
  sharedAreaSelections?: any[];
  totalPrice: number;
  totalDiscount?: number;
  discountInfoString?: string;
  handlingFee?: number;
  hideChangeSeats?: boolean;
  children?: React.ReactNode;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  loading,
  onConfirmBooking,
  eventDetails,
  selectedSeatDetails = [],
  selectedSeats = [],
  sharedAreaSelections = [],
  totalPrice,
  totalDiscount = 0,
  discountInfoString = '',
  handlingFee = 100,
  hideChangeSeats = false,
  children,
}) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  
  useAuth();
  
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
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      // First try to auto-fill using stored user as a synchronous fallback
      const storedUserStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          setCustomerInfo(prev => ({
            firstName: prev.firstName || storedUser.firstName || '',
            lastName: prev.lastName || storedUser.lastName || '',
            nic: prev.nic || storedUser.nic || '',
            phone: prev.phone || storedUser.phoneNumber || '',
            email: prev.email || storedUser.email || '',
          }));
        } catch {}
      }

      // Then fetch the fresh profile details asynchronously from backend
      try {
        const profile = await profileService.getProfile() as any;
        if (profile) {
          setCustomerInfo({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            nic: profile.nic || '',
            phone: profile.phoneNumber || '',
            email: profile.email || '',
          });
        }
      } catch (err) {
        // Ignored, fallback is already in place
      }
    };

    if (isOpen) {
      setLocalError(null);
      loadProfileData();
    }
  }, [isOpen]);

  const handleCustomerInfoChange = (field: keyof typeof customerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    setLocalError(null);
    if (!selectedPaymentMethod) {
      setLocalError(t('errSelectPayment', 'Please select a payment method'));
      return;
    }
    if (!acceptTerms) {
      setLocalError(t('errAcceptTerms', 'Please accept the terms and conditions'));
      return;
    }
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone || !customerInfo.email) {
      setLocalError(t('errRequiredFields', 'Please fill all required fields'));
      return;
    }

    onConfirmBooking({
      paymentMethod: selectedPaymentMethod,
      deliveryMethod,
      customerInfo,
      acceptTerms,
      bookingForSomeoneElse,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={(event, reason) => {
        if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
          return;
        }
        onClose();
      }}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ position: 'relative', pb: 2, borderBottom: '1px solid #f0f0f0' }}>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}>
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

            {localError && (
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography sx={{ color: '#d32f2f', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Raleway, sans-serif' }}>
                   {localError}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="outlined" onClick={onClose} sx={{ borderColor: '#ff1955', color: '#ff1955', textTransform: 'none', fontWeight: 600 }}>
                {t('backToSelection', 'Back to selection')}
              </Button>
              <Button variant="contained" fullWidth onClick={handleConfirm} disabled={loading} sx={{ backgroundColor: '#ff1955', textTransform: 'none', fontWeight: 700 }}>
                {loading ? t('processing', 'Processing...') : t('confirmBooking', 'Confirm booking')}
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={5} sx={{ p: 4, backgroundColor: '#fafafa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 2, borderBottom: '2px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('ticketSummary', 'Ticket Summary')}
              </Typography>
              {!hideChangeSeats && (
                <Button 
                  size="small" 
                  onClick={onClose}
                  sx={{ color: '#ff1955', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {t('changeSeats', 'Change Seats')}
                </Button>
              )}
            </Box>

            {/* Event Details Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#ff1955' }}>
                {eventDetails?.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                <Typography variant="body2">{eventDetails?.date}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                <Typography variant="body2">{eventDetails?.time}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5, gap: 1 }}>
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
                        {formatCurrency(seat?.currentPrice || seat?.price || 0)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Shared Area Tickets */}
              {sharedAreaSelections.length > 0 && sharedAreaSelections.map((selection) => (
                <Box key={`shared-${selection.areaNumber || selection.categoryName}`} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      {selection.categoryName} × {selection.ticketCount}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(selection.ticketCount * (selection.pricePerTicket || selection.price || 0))}
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
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(totalDiscount > 0 ? totalPrice + totalDiscount : totalPrice)}
                </Typography>
              </Box>
              {totalDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#4caf50' }}>
                    {discountInfoString ? `Discount (${discountInfoString})` : t('discount', 'Discount')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    -{formatCurrency(totalDiscount)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">{t('handlingFee', 'Handling fee')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>{formatCurrency(handlingFee)}</Typography>
              </Box>
              <Box sx={{ borderTop: '2px solid #e0e0e0', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('total', 'Total')}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(totalPrice + handlingFee)}</Typography>
              </Box>
            </Box>
            
            {/* Optional extra content (like Showtime Selector) */}
            {children && (
              <Box sx={{ mt: 3, pt: 3, borderTop: '2px solid #e0e0e0' }}>
                {children}
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions />
    </Dialog>
  );
};

export default CheckoutModal;
