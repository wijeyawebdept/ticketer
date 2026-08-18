import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import systemSettingService, { HandlingFeeSetting } from '../../../services/systemSetting.service';
import { useCurrency } from '../../../context/CurrencyContext';

const HandlingFeeManager: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<HandlingFeeSetting | null>(null);

  const [feeAmount, setFeeAmount] = useState<string>('100');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [description, setDescription] = useState<string>('Standard online booking and handling fee');

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadFeeSetting();
  }, []);

  const loadFeeSetting = async () => {
    setLoading(true);
    try {
      const data = await systemSettingService.getHandlingFee();
      setCurrentSetting(data);
      setFeeAmount(data.handlingFee?.toString() || '100');
      setIsEnabled(data.isEnabled !== undefined ? data.isEnabled : true);
      setDescription(data.description || 'Standard online booking and handling fee');
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to load handling fee setting',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const parsedFee = parseFloat(feeAmount);
    if (isNaN(parsedFee) || parsedFee < 0) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid handling fee amount (0 or greater)',
        severity: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await systemSettingService.updateHandlingFee({
        handlingFee: parsedFee,
        isEnabled,
        description,
      });
      setCurrentSetting(updated);
      setSnackbar({
        open: true,
        message: 'Handling fee updated successfully!',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to update handling fee',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const parsedFeeNumber = parseFloat(feeAmount) || 0;
  const sampleTicketPrice = 6000;
  const sampleFinalTotal = sampleTicketPrice + (isEnabled ? parsedFeeNumber : 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress sx={{ color: '#ff1955' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Raleway, sans-serif', color: '#1e293b', mb: 0.5 }}>
          Handling Fee Manager
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Configure and manage the handling & service fee charged during checkout for customer ticket bookings.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Metric Summary Cards */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Current Active Fee
                </Typography>
                <ReceiptIcon sx={{ color: '#ff1955', fontSize: 28 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', my: 1 }}>
                {currentSetting?.isEnabled ? formatCurrency(currentSetting?.handlingFee || 0) : 'Rs 0.00 (Disabled)'}
              </Typography>
              <Chip
                icon={currentSetting?.isEnabled ? <CheckCircleIcon sx={{ fontSize: '16px !important' }} /> : <CancelIcon sx={{ fontSize: '16px !important' }} />}
                label={currentSetting?.isEnabled ? 'Active in Checkout' : 'Disabled (Free Checkout)'}
                size="small"
                sx={{
                  backgroundColor: currentSetting?.isEnabled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: currentSetting?.isEnabled ? '#16a34a' : '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Last Updated
                </Typography>
                <InfoIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', my: 1 }}>
                {currentSetting?.updatedAt ? new Date(currentSetting.updatedAt).toLocaleString() : 'System Initialized'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                By: <strong>{currentSetting?.updatedBy || 'SYSTEM'}</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', height: '100%', backgroundColor: '#0f172a', color: '#fff' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  Live Checkout Impact
                </Typography>
                <CartIcon sx={{ color: '#ff1955', fontSize: 28 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#ff1955', my: 0.5 }}>
                +{isEnabled ? formatCurrency(parsedFeeNumber) : 'Rs 0.00'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
                Added automatically per transaction upon checkout.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Settings Form */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Raleway, sans-serif', color: '#0f172a', mb: 3 }}>
              Configure Fee Details
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Fee Amount */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                  Handling Fee Amount (LKR)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="e.g. 100"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  }}
                  helperText="Enter 0 to charge no handling fee, or specify standard amount."
                  disabled={saving}
                />
              </Box>

              {/* Status Switch */}
              <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      color="primary"
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#ff1955',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 25, 85, 0.08)',
                          },
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#ff1955',
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Enable Handling Fee
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        When disabled, handling fee will be Rs 0.00 for all customers.
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {/* Description / Customer Note */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                  Fee Description / Note
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard online booking and handling fee"
                  disabled={saving}
                />
              </Box>

              <Box sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{
                    backgroundColor: '#ff1955',
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 1.3,
                    px: 4,
                    borderRadius: '10px',
                    '&:hover': {
                      backgroundColor: '#e0144c',
                    },
                  }}
                >
                  {saving ? 'Saving...' : 'Save Handling Fee'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Live Preview Card */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Raleway, sans-serif', color: '#0f172a', mb: 2 }}>
              Customer Checkout Preview
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 3 }}>
              Here is how the amount breakdown appears to customers during checkout:
            </Typography>

            <Box sx={{ backgroundColor: '#1e293b', borderRadius: '14px', p: 2.5, color: '#fff', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                AMOUNT BREAKDOWN
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Sub Total</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffffff' }}>{formatCurrency(sampleTicketPrice)}</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Handling fee</Typography>
                  {!isEnabled && (
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>(Waived)</Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: isEnabled ? '#4ade80' : '#94a3b8' }}>
                  {isEnabled ? formatCurrency(parsedFeeNumber) : 'Rs 0.00'}
                </Typography>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', my: 0.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff' }}>Total Pay</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#ff1955' }}>
                  {formatCurrency(sampleFinalTotal)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HandlingFeeManager;
