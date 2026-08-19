import React, { useState, useEffect, useMemo } from 'react';
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
  Link,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { profileService } from '../../services';
import PageContentService from '../../services/pageContent.service';
import { useCurrency } from '../../context/CurrencyContext';
import promoCodeService from '../../services/promoCodeService';
import { ValidatePromoCodeResponse } from '../../types';
import {
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  ConfirmationNumber as TicketIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  LocalOffer as LocalOfferIcon,
} from '@mui/icons-material';

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
    promoCode?: string;
    promoDiscountAmount?: number;
  }) => void;
  eventId?: string;
  eventDetails?: {
    eventId?: string;
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
  ticketMode?: string;
  children?: React.ReactNode;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  loading,
  onConfirmBooking,
  eventId,
  eventDetails,
  selectedSeatDetails = [],
  selectedSeats = [],
  sharedAreaSelections = [],
  totalPrice,
  totalDiscount = 0,
  discountInfoString = '',
  handlingFee = 0,
  hideChangeSeats = false,
  ticketMode,
  children,
}) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  
  const [selectedPaymentMethod] = useState('visa');
  const [deliveryMethod, setDeliveryMethod] = useState('online');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [termsTitle, setTermsTitle] = useState('Payment Terms & Conditions');
  const [termsLoading, setTermsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    phone: '',
    email: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  // Promo Code States
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<ValidatePromoCodeResponse | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const effectivePromoDiscount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discountAmount !== undefined && appliedPromo.discountAmount !== null && Number(appliedPromo.discountAmount) > 0) {
      return Number(appliedPromo.discountAmount);
    }
    const pct = appliedPromo.discountPercentage || 0;
    if (pct > 0 && totalPrice > 0) {
      return Number(((totalPrice * pct) / 100).toFixed(2));
    }
    return 0;
  }, [appliedPromo, totalPrice]);

  const handleOpenTerms = async () => {
    setTermsModalOpen(true);
    setTermsLoading(true);
    try {
      const data = await PageContentService.getPageContent('PAYMENT_TERMS');
      setTermsTitle(data.title || 'Payment Terms & Conditions');
      setTermsContent(data.content || '');
    } catch (err) {
      setTermsContent('');
    } finally {
      setTermsLoading(false);
    }
  };

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
      setPromoError(null);
      setAppliedPromo(null);
      setPromoInput('');
      loadProfileData();
    }
  }, [isOpen]);

  const handleCustomerInfoChange = (field: keyof typeof customerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPromo = async () => {
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError('Please enter a promo code');
      return;
    }

    const resolvedEventId = eventId || eventDetails?.eventId;
    if (!resolvedEventId) {
      setPromoError('Unable to identify event for promo validation');
      return;
    }

    setPromoLoading(true);
    setPromoError(null);

    try {
      const result = await promoCodeService.validatePromoCode({
        code: cleanCode,
        eventId: resolvedEventId,
        seats: selectedSeatDetails.map(s => ({
          seatId: s?.seatId || '',
          categoryId: s?.categoryId || s?.category_id || undefined,
          categoryName: s?.categoryName || s?.category || '',
          venueSeatCategoryName: s?.venueSeatCategoryName || s?.categoryName || '',
          price: (ticketMode === 'early_bird' && s?.earlyBirdPrice) ? s.earlyBirdPrice : (s?.currentPrice || s?.price || 0),
        })),
        sharedAreas: sharedAreaSelections.map(a => ({
          categoryId: a?.categoryId || a?.id || undefined,
          categoryName: a?.categoryName || a?.name || '',
          sharedAreaNumber: a?.areaNumber || a?.sharedAreaNumber || 1,
          ticketCount: a?.ticketCount || a?.count || 1,
          pricePerTicket: (ticketMode === 'early_bird' && a?.earlyBirdPrice) ? a.earlyBirdPrice : (a?.pricePerTicket || a?.price || 0),
        })),
        subTotal: totalPrice,
      });

      if (result.valid) {
        setAppliedPromo(result);
        setPromoError(null);
      } else {
        setAppliedPromo(null);
        setPromoError(result.message || 'Invalid promo code');
      }
    } catch (err: any) {
      setAppliedPromo(null);
      setPromoError(err?.response?.data?.message || 'Failed to validate promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
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
      bookingForSomeoneElse: false,
      promoCode: appliedPromo?.code,
      promoDiscountAmount: effectivePromoDiscount,
    });
  };

  return (
    <>
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
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          m: { xs: 0, sm: 2 },
          maxHeight: { xs: '100vh', sm: '90vh' },
          width: '100%',
          '& .MuiOutlinedInput-root': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.23) !important',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2c3e50 !important',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2c3e50 !important',
              borderWidth: '1.5px !important',
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2c3e50 !important',
            },
            '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2c3e50 !important',
            },
            '& input': {
              outline: 'none !important',
              boxShadow: 'none !important',
            },
          },
          '& .MuiFormLabel-root.Mui-focused, & .MuiInputLabel-root.Mui-focused, & .MuiFormLabel-root.Mui-error, & .MuiInputLabel-root.Mui-error': {
            color: '#2c3e50 !important',
          },
        }
      }}
    >
      <DialogTitle sx={{ position: 'relative', pb: { xs: 1, sm: 2 }, px: { xs: 2, sm: 3 }, borderBottom: '1px solid #f0f0f0' }}>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}>
          ×
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Grid container>
          <Grid item xs={12} md={7} order={{ xs: 2, md: 1 }} sx={{ p: { xs: 2, sm: 4 }, borderRight: { md: '1px solid #f0f0f0' } }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: { xs: 2, sm: 3 }, fontFamily: 'Raleway, sans-serif', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {t('checkout', 'Checkout')}
            </Typography>

            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {t('deliveryMethod', 'Delivery method')}
              </Typography>
              <FormControl fullWidth>
                <Select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} size="small">
                  <MenuItem value="online">{t('online', 'Online')}</MenuItem>
                  <MenuItem value="pickup">{t('pickup', 'Pick up')}</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block', fontSize: '0.75rem' }}>
                {handlingFee > 0
                  ? t('handlingFeeNotice', `Standard handling fee of ${formatCurrency(handlingFee)} applies per transaction.`)
                  : t('freeDelivery', 'No handling fee applies to this transaction.')}
              </Typography>
            </Box>

            {deliveryMethod === 'online' && (
              <Box sx={{ mb: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center' }}>
                <Box
                  component="img"
                  src="/images/new_payment_logos.jpg"
                  alt="Accepted Payment Methods"
                  sx={{
                    maxWidth: '100%',
                    height: { xs: '38px', sm: '48px' },
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    p: 0.5,
                    backgroundColor: '#ffffff',
                  }}
                />
              </Box>
            )}

            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
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

            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
              <FormControlLabel
                control={<input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ marginRight: '8px' }} />}
                label={
                  <Typography component="span" variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: '#334155' }}>
                    {t('acceptTermsText', 'I accept and agree to')}{' '}
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{t('termsAndConditions', 'Terms and Conditions')}</span>
                  </Typography>
                }
                sx={{ mr: 0.5, mb: 0 }}
              />
              <Link
                component="button"
                type="button"
                variant="caption"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenTerms();
                }}
                sx={{
                  color: '#ff1955',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  p: 0,
                  fontFamily: 'inherit',
                  '&:hover': { color: '#e0144c' },
                }}
              >
                (Read More)
              </Link>
            </Box>

            {localError && (
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography sx={{ color: '#d32f2f', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Raleway, sans-serif' }}>
                   {localError}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 2 }, mt: 2 }}>
              <Button variant="outlined" onClick={onClose} sx={{ width: { xs: '100%', sm: 'auto' }, borderColor: '#ff1955', color: '#ff1955', textTransform: 'none', fontWeight: 600, py: { xs: 1, sm: 1.2 } }}>
                {t('backToSelection', 'Back to selection')}
              </Button>
              <Button variant="contained" fullWidth onClick={handleConfirm} disabled={loading} sx={{ backgroundColor: '#ff1955', textTransform: 'none', fontWeight: 700, py: { xs: 1, sm: 1.2 } }}>
                {loading ? t('processing', 'Processing...') : t('confirmBooking', 'Confirm booking')}
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={5} order={{ xs: 1, md: 2 }} sx={{ p: { xs: 2, sm: 3 }, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TicketIcon sx={{ color: '#ff1955', fontSize: 22 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Raleway, sans-serif', color: '#0f172a', fontSize: '1.1rem' }}>
                  {t('ticketSummary', 'Ticket Summary')}
                </Typography>
              </Box>
              {!hideChangeSeats && (
                <Button 
                  size="small" 
                  onClick={onClose}
                  startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{ color: '#ff1955', textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,25,85,0.2)', px: 1.5, py: 0.3, '&:hover': { bgcolor: 'rgba(255,25,85,0.08)' } }}
                >
                  {t('changeSeats', 'Change Seats')}
                </Button>
              )}
            </Box>

            {/* Event Details Card */}
            <Box sx={{ p: 2, borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid #ff1955' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: '#0f172a', fontFamily: 'Raleway, sans-serif', fontSize: '1rem' }}>
                {eventDetails?.title}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {eventDetails?.date && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#475569', fontSize: '0.85rem' }}>
                    <EventIcon sx={{ fontSize: 16, color: '#ff1955' }} />
                    <span>{eventDetails.date}</span>
                  </Box>
                )}
                {eventDetails?.time && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#475569', fontSize: '0.85rem' }}>
                    <AccessTimeIcon sx={{ fontSize: 16, color: '#ff1955' }} />
                    <span>{eventDetails.time}</span>
                  </Box>
                )}
                {eventDetails?.venue && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, color: '#475569', fontSize: '0.85rem' }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: '#ff1955', mt: 0.2 }} />
                    <Box>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{eventDetails.venue}</span>
                      {eventDetails?.venueAddress && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>
                          {eventDetails.venueAddress}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Selected Tickets Card */}
            <Box sx={{ p: 2, borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                {t('selectedTickets', 'Selected Tickets')}
              </Typography>

              {/* Seated Tickets */}
              {selectedSeatDetails.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>{t('seatsLabelShort', 'Seats')} ({selectedSeatDetails.length})</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
                    {selectedSeatDetails.map((seat, index) => (
                      <Box
                        key={seat?.seatId || (selectedSeats.find((_, i) => i === index) || index)}
                        sx={{
                          px: 1.2,
                          py: 0.4,
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {seat?.seatId || selectedSeats.find((_, i) => i === index)}
                      </Box>
                    ))}
                  </Box>
                  {selectedSeatDetails.map((seat, index) => {
                    const isEarlyBird = ticketMode === 'early_bird' && Boolean(seat?.earlyBirdPrice);
                    const seatPrice = isEarlyBird ? seat.earlyBirdPrice : (seat?.currentPrice || seat?.price || 0);

                    return (
                      <Box key={seat?.seatId || (selectedSeats.find((_, i) => i === index) || index)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px dashed #f1f5f9' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                            {(seat?.seatId || selectedSeats.find((_, i) => i === index))} • {seat?.categoryName || t('standard', 'Standard')}
                          </Typography>
                          {isEarlyBird && (
                            <Box
                              component="span"
                              sx={{
                                backgroundColor: 'rgba(255, 25, 85, 0.1)',
                                color: '#ff1955',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                px: 0.8,
                                py: 0.1,
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 25, 85, 0.3)',
                                letterSpacing: '0.5px'
                              }}
                            >
                              EARLY BIRD
                            </Box>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(seatPrice)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Shared Area Tickets */}
              {sharedAreaSelections.length > 0 && sharedAreaSelections.map((selection) => {
                const isEarlyBird = Boolean(selection.isEarlyBird);
                return (
                  <Box key={`shared-${selection.areaNumber || selection.categoryName}`} sx={{ py: 0.6, borderBottom: '1px dashed #f1f5f9' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {selection.categoryName} <span style={{ color: '#64748b', fontWeight: 400 }}>× {selection.ticketCount}</span>
                        </Typography>
                        {isEarlyBird && (
                          <Box
                            component="span"
                            sx={{
                              backgroundColor: 'rgba(255, 25, 85, 0.1)',
                              color: '#ff1955',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              px: 0.8,
                              py: 0.1,
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 25, 85, 0.3)',
                              letterSpacing: '0.5px'
                            }}
                          >
                            EARLY BIRD
                          </Box>
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(selection.ticketCount * (selection.pricePerTicket || selection.price || 0))}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}

              {selectedSeatDetails.length === 0 && sharedAreaSelections.length === 0 && (
                <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  {t('noTicketsSelected', 'No tickets selected')}
                </Typography>
              )}
            </Box>

            {/* Promo Code Input Card */}
            <Box sx={{ mb: 2, p: 1.8, borderRadius: '12px', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.82rem' }}>
                  <LocalOfferIcon sx={{ fontSize: 18, color: '#ff1955' }} />
                  {t('havePromoCode', 'Have a Promo Code?')}
                </Typography>
                {appliedPromo && (
                  <Chip
                    label="Applied"
                    size="small"
                    color="success"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                  />
                )}
              </Box>

              {appliedPromo ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(34, 197, 94, 0.1)', p: 1, px: 1.5, borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#15803d', letterSpacing: '0.5px' }}>
                      {appliedPromo.code} ({appliedPromo.discountPercentage}% OFF)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#166534', display: 'block' }}>
                      {appliedPromo.appliedTarget ? `Applied on ${appliedPromo.appliedTarget}` : appliedPromo.message}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={handleRemovePromo}
                    sx={{ color: '#dc2626', textTransform: 'none', fontWeight: 700, minWidth: 'auto', p: 0.5 }}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t('enterPromoCode', 'Enter promo code')}
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyPromo();
                      }
                    }}
                    disabled={promoLoading}
                    sx={{
                      bgcolor: '#ffffff',
                      '& .MuiInputBase-input': {
                        fontWeight: 700,
                        letterSpacing: '1px',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        py: 0.9,
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    sx={{
                      bgcolor: '#0f172a',
                      '&:hover': { bgcolor: '#1e293b' },
                      color: '#ffffff',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 2.5,
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {promoLoading ? <CircularProgress size={16} color="inherit" /> : t('apply', 'Apply')}
                  </Button>
                </Box>
              )}

              {promoError && (
                <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600, mt: 0.8, display: 'block' }}>
                  {promoError}
                </Typography>
              )}
            </Box>

            {/* Total Payment Breakdown Card */}
            <Box sx={{ p: 2, borderRadius: '12px', background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                {t('amount', 'Amount Breakdown')}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, fontSize: '0.875rem', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>{t('subTotal', 'Sub Total')}</Typography>
                  {((ticketMode === 'early_bird' && selectedSeatDetails.some(s => Boolean(s?.earlyBirdPrice || s?.isEarlyBird))) || sharedAreaSelections.some(s => Boolean(s?.isEarlyBird))) && (
                    <Box
                      component="span"
                      sx={{
                        backgroundColor: 'rgba(255, 25, 85, 0.2)',
                        color: '#ff4d79',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        px: 0.8,
                        py: 0.1,
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 25, 85, 0.4)',
                        letterSpacing: '0.5px'
                      }}
                    >
                      EARLY BIRD
                    </Box>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffffff' }}>
                  {formatCurrency(totalDiscount > 0 ? totalPrice + totalDiscount : totalPrice)}
                </Typography>
              </Box>
              {totalDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, fontSize: '0.875rem' }}>
                  <Typography variant="body2" sx={{ color: '#4ade80' }}>
                    {discountInfoString ? `Discount (${discountInfoString})` : t('discount', 'Discount')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#4ade80' }}>
                    -{formatCurrency(totalDiscount)}
                  </Typography>
                </Box>
              )}
              {appliedPromo && effectivePromoDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, fontSize: '0.875rem' }}>
                  <Typography variant="body2" sx={{ color: '#4ade80' }}>
                    Promo ({appliedPromo.code} - {appliedPromo.discountPercentage}%)
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#4ade80' }}>
                    -{formatCurrency(effectivePromoDiscount)}
                  </Typography>
                </Box>
              )}
              {handlingFee > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>{t('handlingFee', 'Handling fee')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4ade80' }}>{formatCurrency(handlingFee)}</Typography>
                </Box>
              )}
              <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', pt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff', fontFamily: 'Raleway, sans-serif' }}>
                  {t('total', 'Total Pay')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#ff1955', fontFamily: 'Raleway, sans-serif', fontSize: '1.25rem' }}>
                  {formatCurrency(Math.max(0, totalPrice - effectivePromoDiscount + handlingFee))}
                </Typography>
              </Box>
            </Box>

            {children && (
              <Box sx={{ mt: 1, pt: 2, borderTop: '1px solid #e2e8f0' }}>
                {children}
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions />
    </Dialog>

    {/* Terms & Conditions Read More Modal */}
    <Dialog
      open={termsModalOpen}
      onClose={() => setTermsModalOpen(false)}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 1400,
        '& .MuiDialog-paper': {
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.3)',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: '#fff', py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Raleway, sans-serif', color: '#fcd0a5' }}>
          {termsTitle}
        </Typography>
        <IconButton onClick={() => setTermsModalOpen(false)} sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 }, backgroundColor: '#ffffff', minHeight: '280px', maxHeight: '65vh', overflowY: 'auto' }}>
        {termsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <CircularProgress sx={{ color: '#ff1955' }} />
          </Box>
        ) : (
          <Box
            sx={{
              color: '#334155',
              fontFamily: 'Raleway, sans-serif',
              lineHeight: 1.7,
              fontSize: '0.9rem',
              '& h4': {
                color: '#0f172a',
                fontWeight: 700,
                mt: 2.5,
                mb: 1,
                fontSize: '1.05rem',
              },
              '& p': {
                mb: 1.5,
              },
              '& ul': {
                pl: 2.5,
                mb: 1.5,
              },
              '& li': {
                mb: 0.5,
              },
            }}
            dangerouslySetInnerHTML={{ __html: termsContent }}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Button
          startIcon={<OpenInNewIcon sx={{ fontSize: '16px !important' }} />}
          onClick={() => window.open('/payment-terms-and-conditions', '_blank')}
          sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
        >
          Open in New Tab
        </Button>
        <Button
          variant="contained"
          onClick={() => setTermsModalOpen(false)}
          sx={{ backgroundColor: '#ff1955', textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { backgroundColor: '#e0144c' } }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default CheckoutModal;
