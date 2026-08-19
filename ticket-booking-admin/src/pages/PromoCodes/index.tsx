import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalOffer as PromoIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
  ConfirmationNumber as TicketIcon,
  Event as EventIcon,
  Public as GlobalIcon,
} from '@mui/icons-material';

import { PromoCode, PromoCodeRequest, PromoCodeScope } from '../../types';
import promoCodeService from '../../services/promoCodeService';
import eventService from '../../services/event.service';
import dealService from '../../services/deal.service';

interface PromoCodesPageProps {
  role: 'admin' | 'organizer' | 'employee';
}

const PromoCodesPage: React.FC<PromoCodesPageProps> = ({ role }) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<PromoCode | null>(null);
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<string>('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [scope, setScope] = useState<PromoCodeScope>('EVENT');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  // Events & Categories dropdowns
  const [events, setEvents] = useState<any[]>([]);
  const [eventCategories, setEventCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toast feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchPromoCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        role === 'admin'
          ? await promoCodeService.getAllPromoCodes()
          : await promoCodeService.getOrganizerPromoCodes();
      setPromoCodes(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  // Load events for selection
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await eventService.getAllEvents();
        const eventList = response?.content || (Array.isArray(response) ? response : []);
        setEvents(eventList);
      } catch (err) {
        console.error('Failed to load events for promo dropdown', err);
      }
    };
    loadEvents();
  }, []);

  // Load categories when event is changed in dialog
  useEffect(() => {
    if (!selectedEventId || scope !== 'TICKET_CATEGORY') {
      setEventCategories([]);
      return;
    }

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const cats = await dealService.getAllCategoriesForEventPublic(selectedEventId);
        setEventCategories(cats || []);
      } catch (err) {
        try {
          const fallback = await eventService.getEventById(selectedEventId);
          setEventCategories(fallback?.ticketCategories || []);
        } catch (fErr) {
          setEventCategories([]);
        }
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [selectedEventId, scope]);

  const handleOpenCreate = () => {
    setEditPromo(null);
    setCode('');
    setDescription('');
    setDiscountPercentage('');
    setMaxDiscountAmount('');
    setScope(role === 'admin' ? 'EVENT' : 'EVENT');
    setSelectedEventId('');
    setSelectedCategoryId('');
    setStartDate('');
    setEndDate('');
    setUsageLimit('');
    setMinOrderAmount('');
    setIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (promo: PromoCode) => {
    setEditPromo(promo);
    setCode(promo.code);
    setDescription(promo.description || '');
    setDiscountPercentage(String(promo.discountPercentage));
    setMaxDiscountAmount(promo.maxDiscountAmount != null ? String(promo.maxDiscountAmount) : '');
    setScope(promo.scope);
    setSelectedEventId(promo.eventId || '');
    setSelectedCategoryId(promo.ticketCategoryId || '');
    setStartDate(promo.startDate ? promo.startDate.slice(0, 16) : '');
    setEndDate(promo.endDate ? promo.endDate.slice(0, 16) : '');
    setUsageLimit(promo.usageLimit != null ? String(promo.usageLimit) : '');
    setMinOrderAmount(promo.minOrderAmount != null ? String(promo.minOrderAmount) : '');
    setIsActive(promo.isActive);
    setDialogOpen(true);
  };

  const handleSavePromo = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please enter a promo code', 'error');
      return;
    }

    const pct = parseFloat(discountPercentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      showToast('Please enter a valid discount percentage (1 - 100%)', 'error');
      return;
    }

    if ((scope === 'EVENT' || scope === 'TICKET_CATEGORY') && !selectedEventId) {
      showToast('Please select an event for this promo code', 'error');
      return;
    }

    if (scope === 'TICKET_CATEGORY' && !selectedCategoryId) {
      showToast('Please select a specific ticket category', 'error');
      return;
    }

    const selectedCategoryObj = eventCategories.find(
      (c) => (c.categoryId || c.id) === selectedCategoryId
    );

    const payload: PromoCodeRequest = {
      code: cleanCode,
      description: description.trim() || undefined,
      discountPercentage: pct,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
      scope,
      eventId: (scope === 'EVENT' || scope === 'TICKET_CATEGORY') ? selectedEventId : undefined,
      ticketCategoryId: scope === 'TICKET_CATEGORY' ? selectedCategoryId : undefined,
      ticketCategoryName: scope === 'TICKET_CATEGORY' ? (selectedCategoryObj?.categoryName || undefined) : undefined,
      startDate: startDate ? startDate + ':00' : undefined,
      endDate: endDate ? endDate + ':00' : undefined,
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
      isActive,
    };

    setSaving(true);
    try {
      if (editPromo) {
        if (role === 'admin') {
          await promoCodeService.updateAdminPromoCode(editPromo.id, payload);
        } else {
          await promoCodeService.updateOrganizerPromoCode(editPromo.id, payload);
        }
        showToast(`Promo code "${cleanCode}" updated successfully!`);
      } else {
        if (role === 'admin') {
          await promoCodeService.createAdminPromoCode(payload);
        } else {
          await promoCodeService.createOrganizerPromoCode(payload);
        }
        showToast(`Promo code "${cleanCode}" created successfully!`);
      }
      setDialogOpen(false);
      fetchPromoCodes();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save promo code', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (promo: PromoCode) => {
    try {
      if (role === 'admin') {
        await promoCodeService.toggleAdminPromoCodeStatus(promo.id);
      } else {
        await promoCodeService.toggleOrganizerPromoCodeStatus(promo.id);
      }
      showToast(`Promo code "${promo.code}" ${promo.isActive ? 'deactivated' : 'activated'}`);
      fetchPromoCodes();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to toggle status', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!promoToDelete) return;
    try {
      if (role === 'admin') {
        await promoCodeService.deleteAdminPromoCode(promoToDelete.id);
      } else {
        await promoCodeService.deleteOrganizerPromoCode(promoToDelete.id);
      }
      showToast(`Promo code "${promoToDelete.code}" deleted`);
      setDeleteDialogOpen(false);
      setPromoToDelete(null);
      fetchPromoCodes();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete promo code', 'error');
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied code "${text}" to clipboard!`, 'info');
  };

  // Filtered List
  const filteredPromoCodes = promoCodes.filter((p) => {
    const matchSearch =
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.eventName && p.eventName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.ticketCategoryName && p.ticketCategoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchScope = scopeFilter === 'ALL' || p.scope === scopeFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && p.isActive) ||
      (statusFilter === 'INACTIVE' && !p.isActive);

    return matchSearch && matchScope && matchStatus;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PromoIcon sx={{ color: '#ff1955', fontSize: 36 }} />
            Promo Codes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage promotional percentage discount codes for events and ticket categories
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{
            bgcolor: '#ff1955',
            '&:hover': { bgcolor: '#e01545' },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            py: 1,
            boxShadow: '0 4px 12px rgba(255, 25, 85, 0.3)',
          }}
        >
          Create Promo Code
        </Button>
      </Box>

      {/* Filter Bar */}
      <Card sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search code, event, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Scope</InputLabel>
              <Select value={scopeFilter} label="Scope" onChange={(e) => setScopeFilter(e.target.value)}>
                <MenuItem value="ALL">All Scopes</MenuItem>
                {role === 'admin' && <MenuItem value="ALL_EVENTS">Global (All Events)</MenuItem>}
                <MenuItem value="EVENT">Event-wise</MenuItem>
                <MenuItem value="TICKET_CATEGORY">Ticket Category-wise</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All Status</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Showing <strong>{filteredPromoCodes.length}</strong> of {promoCodes.length}
            </Typography>
          </Grid>
        </Grid>
      </Card>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#ff1955' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Promo Code</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Discount</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Scope & Target</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Usage Limit</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Validity Period</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPromoCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <PromoIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body1" fontWeight={600}>No promo codes found</Typography>
                    <Typography variant="caption">Click "Create Promo Code" to get started</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPromoCodes.map((p) => {
                  return (
                    <TableRow key={p.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      {/* Code */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a' }}>
                            {p.code}
                          </Typography>
                          <Tooltip title="Copy code">
                            <IconButton size="small" onClick={() => handleCopyCode(p.code)} sx={{ color: '#64748b' }}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {p.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 220 }}>
                            {p.description}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Discount */}
                      <TableCell>
                        <Chip
                          label={`${p.discountPercentage}% OFF`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: 'rgba(255, 25, 85, 0.1)',
                            color: '#ff1955',
                            border: '1px solid rgba(255, 25, 85, 0.3)',
                          }}
                        />
                        {p.maxDiscountAmount && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                            Max: LKR {p.maxDiscountAmount.toLocaleString()}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Scope & Target */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
                          {p.scope === 'ALL_EVENTS' && <Chip icon={<GlobalIcon fontSize="small" />} label="All Events" size="small" variant="outlined" color="primary" />}
                          {p.scope === 'EVENT' && <Chip icon={<EventIcon fontSize="small" />} label="Event-wise" size="small" variant="outlined" color="secondary" />}
                          {p.scope === 'TICKET_CATEGORY' && <Chip icon={<TicketIcon fontSize="small" />} label="Ticket Category" size="small" variant="outlined" sx={{ borderColor: '#8b5cf6', color: '#8b5cf6' }} />}
                        </Box>
                        {p.eventName && (
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#334155', maxWidth: 200 }}>
                            {p.eventName}
                          </Typography>
                        )}
                        {p.ticketCategoryName && (
                          <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 600 }}>
                            Category: {p.ticketCategoryName}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Usage Limit */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {p.usageCount} {p.usageLimit ? `/ ${p.usageLimit}` : 'uses'}
                        </Typography>
                        {p.minOrderAmount && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Min spend: LKR {p.minOrderAmount}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Validity Period */}
                      <TableCell>
                        <Typography variant="caption" display="block" color="text.secondary">
                          From: {p.startDate ? new Date(p.startDate).toLocaleDateString() : 'Immediate'}
                        </Typography>
                        <Typography variant="caption" display="block" color={p.endDate && new Date(p.endDate) < new Date() ? 'error.main' : 'text.secondary'}>
                          To: {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'No expiry'}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Switch
                            checked={p.isActive}
                            onChange={() => handleToggleStatus(p)}
                            size="small"
                            color="success"
                          />
                          <Typography variant="caption" fontWeight={600} color={p.isActive ? 'success.main' : 'text.disabled'}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEdit(p)} color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setPromoToDelete(p);
                              setDeleteDialogOpen(true);
                            }}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
          {editPromo ? `Edit Promo Code (${editPromo.code})` : 'Create New Promo Code'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5}>
            {/* Promo Code String */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Promo Code *"
                placeholder="e.g., SUMMER25"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                helperText="Code customers will enter at checkout"
              />
            </Grid>

            {/* Discount Percentage */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Discount Percentage (%) *"
                placeholder="20"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Percentage deducted from eligible tickets"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                placeholder="e.g., 20% discount on Early Bird or VIP Platinum tickets"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>

            {/* Scope Selector */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                  Promo Code Scope *
                </FormLabel>
                <RadioGroup
                  row
                  value={scope}
                  onChange={(e) => {
                    const newScope = e.target.value as PromoCodeScope;
                    setScope(newScope);
                    if (newScope !== 'TICKET_CATEGORY') {
                      setSelectedCategoryId('');
                    }
                  }}
                >
                  <FormControlLabel value="EVENT" control={<Radio color="primary" />} label="Event-wise (All tickets in event)" />
                  <FormControlLabel value="TICKET_CATEGORY" control={<Radio color="primary" />} label="Ticket Category-wise" />
                  {role === 'admin' && (
                    <FormControlLabel value="ALL_EVENTS" control={<Radio color="primary" />} label="All Events (Global)" />
                  )}
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Event Dropdown (When scope is EVENT or TICKET_CATEGORY) */}
            {(scope === 'EVENT' || scope === 'TICKET_CATEGORY') && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="select-event-label">Target Event *</InputLabel>
                  <Select
                    labelId="select-event-label"
                    value={selectedEventId}
                    label="Target Event *"
                    onChange={(e) => {
                      setSelectedEventId(e.target.value);
                      setSelectedCategoryId('');
                    }}
                  >
                    {events.map((evt) => (
                      <MenuItem key={evt.id || evt.eventId} value={evt.id || evt.eventId}>
                        {evt.name} {evt.venue?.name ? `(${evt.venue.name})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Ticket Category Dropdown (When scope is TICKET_CATEGORY) */}
            {scope === 'TICKET_CATEGORY' && (
              <Grid item xs={12}>
                <FormControl fullWidth disabled={!selectedEventId || loadingCategories}>
                  <InputLabel id="select-category-label">Target Ticket Category *</InputLabel>
                  <Select
                    labelId="select-category-label"
                    value={selectedCategoryId}
                    label="Target Ticket Category *"
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                  >
                    {eventCategories.map((cat) => (
                      <MenuItem key={cat.categoryId || cat.id} value={cat.categoryId || cat.id}>
                        {cat.categoryName} {cat.price ? `- LKR ${cat.price}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  {!selectedEventId && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Please select an event above first to view its ticket categories
                    </Typography>
                  )}
                  {loadingCategories && (
                    <Typography variant="caption" color="primary" sx={{ mt: 0.5 }}>
                      Loading ticket categories...
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}

            {/* Max Discount & Min Order Amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Discount Cap (LKR)"
                placeholder="Optional"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                helperText="Maximum discount amount allowed"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Order Spend (LKR)"
                placeholder="Optional"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                helperText="Minimum subtotal required to redeem"
              />
            </Grid>

            {/* Start & End Dates */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Valid From"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Leave blank for immediate activation"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Valid Until (Expiry)"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Leave blank for no expiration"
              />
            </Grid>

            {/* Usage Limit & Status */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Usage Limit"
                placeholder="e.g., 100"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                helperText="Total times this code can be redeemed"
              />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="success" />}
                label="Active Status"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePromo}
            disabled={saving}
            sx={{
              bgcolor: '#ff1955',
              '&:hover': { bgcolor: '#e01545' },
              fontWeight: 700,
              px: 3,
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : editPromo ? 'Update Code' : 'Create Code'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to permanently delete promo code <strong>"{promoToDelete?.code}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PromoCodesPage;
