import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  LocalOffer as LocalOfferIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  PauseCircle as PauseCircleIcon,
  PlayCircle as PlayCircleIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import dealService from '../../services/deal.service';
import eventService from '../../services/event.service';
import { TicketCategoryDeal, TicketDealRequest } from '../../types';

interface DealsManagementProps {
  role: 'admin' | 'organizer' | 'employee';
}

type DealType = 'PERCENTAGE_DISCOUNT' | 'BUY_X_GET_Y_FREE';

const DealsManagement: React.FC<DealsManagementProps> = ({ role }) => {
  const [deals, setDeals] = useState<TicketCategoryDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<TicketCategoryDeal | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventCategories, setEventCategories] = useState<TicketCategoryDeal[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [dealActive, setDealActive] = useState(true);
  const [dealType, setDealType] = useState<DealType>('PERCENTAGE_DISCOUNT');

  // PERCENTAGE_DISCOUNT fields
  const [discountPct, setDiscountPct] = useState<string>('');

  // BUY_X_GET_Y_FREE fields
  const [buyQty, setBuyQty] = useState<string>('');
  const [freeQty, setFreeQty] = useState<string>('');

  const [dealLabel, setDealLabel] = useState('');
  const [savingDeal, setSavingDeal] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        role === 'admin'
          ? await dealService.getAdminAllDeals()
          : await dealService.getOrganizerDeals();
      setDeals(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await eventService.getAllEvents();
        setEvents(response.content || response || []);
      } catch (err) {
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) { setEventCategories([]); setSelectedCategoryId(''); return; }
    const loadCats = async () => {
      setLoadingCategories(true);
      try {
        const cats = role === 'admin'
          ? await dealService.getAdminCategoriesForEvent(selectedEventId)
          : await dealService.getOrganizerCategoriesForEvent(selectedEventId);
        setEventCategories(cats);
      } catch { setEventCategories([]); }
      finally { setLoadingCategories(false); }
    };
    loadCats();
  }, [selectedEventId, role]);

  const resetDialog = () => {
    setEditDeal(null);
    setSelectedEventId('');
    setSelectedCategoryId('');
    setDealActive(true);
    setDealType('PERCENTAGE_DISCOUNT');
    setDiscountPct('');
    setBuyQty('');
    setFreeQty('');
    setDealLabel('');
  };

  const handleOpenCreate = () => { resetDialog(); setDialogOpen(true); };

  const handleOpenEdit = (deal: TicketCategoryDeal) => {
    setEditDeal(deal);
    setSelectedEventId(deal.eventId);
    setSelectedCategoryId(deal.categoryId);
    setDealActive(deal.dealActive);
    const type = (deal.dealType || 'PERCENTAGE_DISCOUNT') as DealType;
    setDealType(type);
    setDiscountPct(deal.dealDiscountPercentage?.toString() || '');
    setBuyQty(deal.dealBuyQuantity?.toString() || '');
    setFreeQty(deal.dealFreeQuantity?.toString() || '');
    setDealLabel(deal.dealLabel || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCategoryId) { toast.error('Please select a ticket category.'); return; }

    if (dealActive) {
      if (dealType === 'PERCENTAGE_DISCOUNT') {
        const pct = parseFloat(discountPct);
        if (isNaN(pct) || pct <= 0 || pct >= 100) {
          toast.error('Enter a valid discount percentage (1–99).');
          return;
        }
      } else {
        const bq = parseInt(buyQty, 10);
        const fq = parseInt(freeQty, 10);
        if (isNaN(bq) || bq < 1 || isNaN(fq) || fq < 1) {
          toast.error('Buy quantity and free quantity must be at least 1.');
          return;
        }
        if (fq >= bq) {
          toast.error('Free quantity must be less than buy quantity.');
          return;
        }
      }
    }

    setSavingDeal(true);
    try {
      const request: TicketDealRequest = {
        categoryId: selectedCategoryId,
        dealActive,
        dealType: dealActive ? dealType : undefined,
        dealDiscountPercentage: (dealActive && dealType === 'PERCENTAGE_DISCOUNT') ? parseFloat(discountPct) : undefined,
        dealBuyQuantity: (dealActive && dealType === 'BUY_X_GET_Y_FREE') ? parseInt(buyQty, 10) : undefined,
        dealFreeQuantity: (dealActive && dealType === 'BUY_X_GET_Y_FREE') ? parseInt(freeQty, 10) : undefined,
        dealLabel: dealLabel.trim() || undefined,
      };

      role === 'admin'
        ? await dealService.adminApplyDeal(request)
        : await dealService.organizerApplyDeal(request);

      toast.success(dealActive ? 'Deal applied successfully!' : 'Deal deactivated successfully!');
      setDialogOpen(false);
      fetchDeals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save deal');
    } finally {
      setSavingDeal(false);
    }
  };

  const handleRemoveDeal = async (categoryId: string, categoryName: string) => {
    if (!window.confirm(`Remove deal from "${categoryName}"?`)) return;
    try {
      role === 'admin'
        ? await dealService.adminRemoveDeal(categoryId)
        : await dealService.organizerRemoveDeal(categoryId);
      toast.success('Deal removed successfully!');
      fetchDeals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove deal');
    }
  };

  const formatPrice = (price: number) =>
    `LKR ${Number(price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const dealsByEvent: Record<string, TicketCategoryDeal[]> = deals.reduce((acc, d) => {
    if (!acc[d.eventId]) acc[d.eventId] = [];
    acc[d.eventId].push(d);
    return acc;
  }, {} as Record<string, TicketCategoryDeal[]>);

  const pctDeals = deals.filter(d => d.dealType === 'PERCENTAGE_DISCOUNT' || !d.dealType);
  const buyGetDeals = deals.filter(d => d.dealType === 'BUY_X_GET_Y_FREE');
  const activeDeals = deals.filter(d => d.dealActive);
  const inactiveDeals = deals.filter(d => !d.dealActive);

  const selectedCatPrice = eventCategories.find(c => c.categoryId === selectedCategoryId)?.originalPrice || 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocalOfferIcon sx={{ color: '#00c853', fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Deals Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Apply percentage discounts or Buy X Get Y Free offers to ticket categories
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDeals} size="small"><RefreshIcon /></IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ backgroundColor: '#00c853', '&:hover': { backgroundColor: '#00a844' }, fontWeight: 600, borderRadius: '8px' }}
          >
            Apply Deal
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #00c853 0%, #00a844 100%)', color: '#fff' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800}>{activeDeals.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>Active Deals</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #546e7a 0%, #37474f 100%)', color: '#fff' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800}>{inactiveDeals.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>Inactive Deals</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #ff6f00 0%, #e65100 100%)', color: '#fff' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800}>{pctDeals.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>% Discount Deals</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)', color: '#fff' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800}>{buyGetDeals.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>Buy X Get Y Free Deals</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Deals Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="success" />
        </Box>
      ) : deals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LocalOfferIcon sx={{ fontSize: 72, color: 'rgba(0,0,0,0.1)', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No active deals yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Apply a percentage discount or a Buy X Get Y Free deal to any ticket category.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}
            sx={{ backgroundColor: '#00c853', '&:hover': { backgroundColor: '#00a844' } }}>
            Apply First Deal
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ticket Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Deal Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Offer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deals.map((deal) => {
                const isPct = deal.dealType === 'PERCENTAGE_DISCOUNT' || !deal.dealType;
                return (
                  <TableRow key={deal.categoryId} sx={{ '&:hover': { backgroundColor: '#f8fffe' }, transition: 'background 0.2s' }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{deal.eventName}</Typography>
                      {deal.venueName && <Typography variant="caption" color="text.secondary">{deal.venueName}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{deal.categoryName}</Typography>
                    </TableCell>
                    <TableCell>
                      {isPct ? (
                        <>
                          <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#999', display: 'block' }}>
                            {formatPrice(deal.originalPrice)}
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color="error">
                            {formatPrice(deal.discountedPrice)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2">{formatPrice(deal.originalPrice)}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={isPct
                          ? <TrendingDownIcon sx={{ fontSize: '13px !important' }} />
                          : <ConfirmationNumberIcon sx={{ fontSize: '13px !important' }} />}
                        label={isPct ? '% Discount' : 'Buy X Get Y'}
                        size="small"
                        sx={{
                          backgroundColor: isPct ? 'rgba(255,111,0,0.1)' : 'rgba(123,31,162,0.1)',
                          color: isPct ? '#e65100' : '#7b1fa2',
                          fontWeight: 700,
                          border: `1px solid ${isPct ? 'rgba(255,111,0,0.3)' : 'rgba(123,31,162,0.3)'}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {isPct ? (
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#e65100' }}>
                          {deal.dealDiscountPercentage}% OFF
                        </Typography>
                      ) : (
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#7b1fa2' }}>
                          Buy {deal.dealBuyQuantity} → Get {deal.dealFreeQuantity} Free
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {deal.dealLabel
                        ? <Chip label={deal.dealLabel} size="small" variant="outlined" color="primary" />
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell>
                      {deal.dealActive ? (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                          label="Active" size="small"
                          sx={{ backgroundColor: 'rgba(0,200,83,0.1)', color: '#00a844', fontWeight: 700, border: '1px solid rgba(0,200,83,0.3)' }}
                        />
                      ) : (
                        <Chip
                          icon={<PauseCircleIcon sx={{ fontSize: '14px !important' }} />}
                          label="Inactive" size="small"
                          sx={{ backgroundColor: 'rgba(0,0,0,0.06)', color: '#666', fontWeight: 700, border: '1px solid rgba(0,0,0,0.15)' }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {!deal.dealActive && (
                        <Tooltip title="Reactivate deal">
                          <IconButton size="small" onClick={() => handleOpenEdit(deal)} sx={{ color: '#00a844' }}>
                            <PlayCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit deal">
                        <IconButton size="small" onClick={() => handleOpenEdit(deal)} sx={{ color: '#1976d2' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Permanently remove deal">
                        <IconButton size="small" onClick={() => handleRemoveDeal(deal.categoryId, deal.categoryName)} sx={{ color: '#d32f2f' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Apply / Edit Deal Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalOfferIcon sx={{ color: '#00c853' }} />
          {editDeal ? 'Edit Deal' : 'Apply New Deal'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>

            {/* Event */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Event</InputLabel>
                <Select value={selectedEventId} label="Select Event"
                  onChange={(e) => { setSelectedEventId(e.target.value); setSelectedCategoryId(''); }}
                  disabled={!!editDeal}>
                  {events.map((ev: any) => (
                    <MenuItem key={ev.eventId || ev.id} value={ev.eventId || ev.id}>{ev.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Ticket Category */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small" disabled={!selectedEventId || loadingCategories}>
                <InputLabel>{loadingCategories ? 'Loading categories…' : 'Select Ticket Category'}</InputLabel>
                <Select value={selectedCategoryId}
                  label={loadingCategories ? 'Loading categories…' : 'Select Ticket Category'}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={!!editDeal}>
                  {eventCategories.map((cat) => (
                    <MenuItem key={cat.categoryId} value={cat.categoryId}>
                      {cat.categoryName}{' '}
                      <span style={{ marginLeft: 8, color: '#999', fontSize: '0.8rem' }}>
                        (LKR {cat.originalPrice.toLocaleString()})
                      </span>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Deal Active Toggle */}
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={dealActive} onChange={(e) => setDealActive(e.target.checked)} color="success" />}
                label={<Typography fontWeight={600}>{dealActive ? 'Deal Active' : 'Deal Inactive'}</Typography>}
              />
            </Grid>

            {/* Deal Type Toggle */}
            {dealActive && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}>
                  DEAL TYPE
                </Typography>
                <ToggleButtonGroup
                  value={dealType}
                  exclusive
                  onChange={(_, val) => { if (val) setDealType(val); }}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="PERCENTAGE_DISCOUNT"
                    sx={{ fontWeight: 600, textTransform: 'none', gap: 0.5,
                      '&.Mui-selected': { backgroundColor: 'rgba(255,111,0,0.12)', color: '#e65100', borderColor: 'rgba(255,111,0,0.4)' } }}>
                    <TrendingDownIcon fontSize="small" />
                    Percentage Discount
                  </ToggleButton>
                  <ToggleButton value="BUY_X_GET_Y_FREE"
                    sx={{ fontWeight: 600, textTransform: 'none', gap: 0.5,
                      '&.Mui-selected': { backgroundColor: 'rgba(123,31,162,0.12)', color: '#7b1fa2', borderColor: 'rgba(123,31,162,0.4)' } }}>
                    <ConfirmationNumberIcon fontSize="small" />
                    Buy X Get Y Free
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            )}

            {/* PERCENTAGE_DISCOUNT fields */}
            {dealActive && dealType === 'PERCENTAGE_DISCOUNT' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Discount Percentage"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  type="number"
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { min: 1, max: 99 },
                  }}
                  helperText={
                    discountPct && selectedCategoryId
                      ? `Deal price: LKR ${(selectedCatPrice * (1 - parseFloat(discountPct) / 100)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
                      : ''
                  }
                />
              </Grid>
            )}

            {/* BUY_X_GET_Y_FREE fields */}
            {dealActive && dealType === 'BUY_X_GET_Y_FREE' && (
              <>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, backgroundColor: 'rgba(123,31,162,0.06)', borderRadius: 2, border: '1px solid rgba(123,31,162,0.2)', mb: 1 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#7b1fa2', mb: 1 }}>
                      🎟 Buy X Get Y Free Preview
                    </Typography>
                    {buyQty && freeQty ? (
                      <Typography variant="body1" fontWeight={800} sx={{ color: '#4a148c' }}>
                        Buy {buyQty} ticket{Number(buyQty) > 1 ? 's' : ''} → Get {freeQty} ticket{Number(freeQty) > 1 ? 's' : ''} free!
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Fill in the quantities below to preview the deal
                      </Typography>
                    )}
                    {buyQty && freeQty && selectedCatPrice > 0 && (
                      <Typography variant="caption" sx={{ color: '#7b1fa2', display: 'block', mt: 0.5 }}>
                        Effective saving: LKR {(selectedCatPrice * Number(freeQty)).toLocaleString('en-LK', { minimumFractionDigits: 2 })} per {buyQty} tickets purchased
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Buy Quantity (X)"
                    value={buyQty}
                    onChange={(e) => setBuyQty(e.target.value)}
                    type="number"
                    size="small"
                    fullWidth
                    InputProps={{ inputProps: { min: 2 } }}
                    helperText='e.g. "5" → Buy 5 tickets'
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Free Quantity (Y)"
                    value={freeQty}
                    onChange={(e) => setFreeQty(e.target.value)}
                    type="number"
                    size="small"
                    fullWidth
                    InputProps={{ inputProps: { min: 1 } }}
                    helperText='e.g. "1" → Get 1 free'
                  />
                </Grid>
              </>
            )}

            {/* Deal Label */}
            <Grid item xs={dealActive && dealType === 'PERCENTAGE_DISCOUNT' ? 6 : 12}>
              <TextField
                label="Deal Label (optional)"
                value={dealLabel}
                onChange={(e) => setDealLabel(e.target.value)}
                size="small"
                fullWidth
                disabled={!dealActive}
                placeholder={dealType === 'BUY_X_GET_Y_FREE' ? 'e.g. Group Saver, Family Pack' : 'e.g. Early Bird, Flash Sale'}
                helperText="Shown as a badge (auto-generated if left blank)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit" disabled={savingDeal}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={savingDeal}
            startIcon={savingDeal ? <CircularProgress size={16} color="inherit" /> : <LocalOfferIcon />}
            sx={{ backgroundColor: '#00c853', '&:hover': { backgroundColor: '#00a844' }, fontWeight: 600 }}
          >
            {savingDeal ? 'Saving…' : editDeal ? 'Update Deal' : 'Apply Deal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DealsManagement;
