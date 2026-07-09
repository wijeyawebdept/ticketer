import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Avatar, Grid,
  IconButton, Alert, Snackbar, CircularProgress, Divider, Chip,
  FormControlLabel, Switch, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import {
  PhotoCamera, Save, Edit, Cancel, NotificationsActive, NotificationsOff,
  Business, AccountBalance, Person, Phone, LocationOn, Badge,
  MarkEmailRead, Email, CheckCircle,
} from '@mui/icons-material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { ProfileDTO, ProfileUpdateDTO } from '../../types';
import { profileService } from '../../services/profile.service';
import { getProfilePictureUrl } from '../../utils/formatters';
import './Profile.css';

const isOrganizer = (role?: string) => role === 'ORGANIZER' || role === 'ROLE_ORGANIZER';
const isEmployee = (role?: string) => role === 'ORGANIZER_EMPLOYEE' || role === 'ROLE_ORGANIZER_EMPLOYEE';
const isAdmin = (role?: string) => role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'SUPER_ADMIN' || role === 'ROLE_SUPER_ADMIN';
const formatDate = (d?: string) => d ? new Date(d).toISOString().split('T')[0] : '';
const formatDisplay = (d?: string) => d ? new Date(d).toLocaleDateString() : 'Not set';
const roleColor = (role: string) => {
  switch (role.toUpperCase()) {
    case 'ADMIN': case 'ROLE_ADMIN': return 'error';
    case 'ORGANIZER': case 'ROLE_ORGANIZER': return 'warning';
    case 'ORGANIZER_EMPLOYEE': case 'ROLE_ORGANIZER_EMPLOYEE': return 'success';
    default: return 'primary';
  }
};

const validationSchema = Yup.object({
  firstName: Yup.string().required('Required').max(100),
  lastName: Yup.string().required('Required').max(100),
  email: Yup.string().email('Invalid email').required('Required').max(255),
  phoneNumber: Yup.string().matches(/^[+]?\d{10,15}$/, 'Invalid phone').nullable(),
  businessPhone: Yup.string().max(20).nullable(),
});

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loginEmailToggling, setLoginEmailToggling] = useState(false);
  const [loginEmailEnabled, setLoginEmailEnabled] = useState(true);

  // OTP dialog state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => setSnackbar({ open: true, message, severity });

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfile();
      setProfile(data);
      setLoginEmailEnabled(data.loginEmailEnabled ?? true);
    } catch { showSnackbar('Failed to load profile', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSubmit = async (values: any) => {
    try {
      const updateData: ProfileUpdateDTO = {
        firstName: values.firstName, lastName: values.lastName, email: values.email,
        phoneNumber: values.phoneNumber || undefined, dateOfBirth: values.dateOfBirth || undefined,
        organizationName: values.organizationName || undefined,
        businessRegistrationNumber: values.businessRegistrationNumber || undefined,
        taxId: values.taxId || undefined, businessAddress: values.businessAddress || undefined,
        businessPhone: values.businessPhone || undefined,
        bankName: values.bankName || undefined,
        bankAccountNumber: values.bankAccountNumber || undefined,
        bankRoutingNumber: values.bankRoutingNumber || undefined,
      };
      const updated = await profileService.updateProfile(updateData);
      setProfile(updated); setEditing(false);
      showSnackbar('Profile updated successfully', 'success');
    } catch { showSnackbar('Failed to update profile', 'error'); }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setUploading(true); await profileService.uploadProfilePicture(file); await loadProfile(); showSnackbar('Profile picture updated', 'success'); }
    catch (error: any) { showSnackbar(error.response?.status === 413 ? 'Profile picture is too large. Maximum allowed size is 1MB.' : 'Failed to upload picture', 'error'); }
    finally { setUploading(false); }
  };

  const handleLoginEmailToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginEmailToggling(true);
    try { const r = await profileService.updateLoginEmailPreference(e.target.checked); setLoginEmailEnabled(r.loginEmailEnabled); showSnackbar(r.message, 'success'); }
    catch { showSnackbar('Failed to update preference', 'error'); }
    finally { setLoginEmailToggling(false); }
  };

  // ── OTP handlers ──────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setOtpSending(true);
    try {
      await profileService.sendEmailOtp();
      setOtpSent(true);
      showSnackbar('OTP sent to your email. Valid for 10 minutes.', 'info');
    } catch { showSnackbar('Failed to send OTP', 'error'); }
    finally { setOtpSending(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.length !== 6) { showSnackbar('Enter the 6-digit OTP', 'warning'); return; }
    setOtpVerifying(true);
    try {
      const result = await profileService.verifyEmailOtp(otpValue);
      if (result.verified) {
        showSnackbar(result.message, 'success');
        setOtpOpen(false); setOtpSent(false); setOtpValue('');
        await loadProfile(); // refresh to show verified badge
      } else { showSnackbar(result.message, 'error'); }
    } catch { showSnackbar('Verification failed', 'error'); }
    finally { setOtpVerifying(false); }
  };

  const handleCloseOtpDialog = () => { setOtpOpen(false); setOtpSent(false); setOtpValue(''); };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress size={60} /></Box>;
  if (!profile) return <Box p={3}><Alert severity="error">Failed to load profile data</Alert></Box>;

  const org = isOrganizer(profile.role);
  const emp = isEmployee(profile.role);
  const adm = isAdmin(profile.role);
  const initialValues = {
    firstName: profile.firstName || '', lastName: profile.lastName || '',
    email: profile.email || '', phoneNumber: profile.phoneNumber || '',
    dateOfBirth: formatDate(profile.dateOfBirth) || '',
    organizationName: profile.organizationName || '',
    businessRegistrationNumber: profile.businessRegistrationNumber || '',
    taxId: profile.taxId || '', businessAddress: profile.businessAddress || '',
    businessPhone: profile.businessPhone || '',
    bankName: profile.bankName || '', bankAccountNumber: profile.bankAccountNumber || '',
    bankRoutingNumber: profile.bankRoutingNumber || '',
  };

  const cardSx = { borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)', mb: 3 };
  const SectionHeader = ({ icon, title, color = '#1976d2' }: { icon: React.ReactNode; title: string; color?: string }) => (
    <Box display="flex" alignItems="center" gap={1.5} mb={2}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color }}>{title}</Typography>
    </Box>
  );
  const ReadField = ({ label, value }: { label: string; value?: string | null }) => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}>{label}</Typography>
      <Typography variant="body1" sx={{ mt: 0.25 }}>{value || <em style={{ color: '#bbb' }}>Not set</em>}</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1976d2' }}>My Profile</Typography>

      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form>
            <Grid container spacing={3}>

              {/* Avatar card */}
              <Grid item xs={12} md={3}>
                <Card sx={{ ...cardSx, textAlign: 'center' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box position="relative" display="inline-block">
                      <Avatar src={getProfilePictureUrl(profile.profilePicture)}
                        sx={{ width: 130, height: 130, margin: 'auto', fontSize: '3rem', border: '4px solid rgba(25,118,210,0.2)', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                        {profile.firstName?.[0]}{profile.lastName?.[0]}
                      </Avatar>
                      <input accept="image/*" className="profile-picture-upload" id="profile-picture-upload" type="file" onChange={handlePictureUpload} />
                      <label htmlFor="profile-picture-upload">
                        <IconButton component="span" disabled={uploading} sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, width: 44, height: 44 }}>
                          {uploading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : <PhotoCamera />}
                        </IconButton>
                      </label>
                    </Box>
                    <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>{profile.firstName} {profile.lastName}</Typography>
                    {org && profile.organizationName && <Typography variant="body2" color="text.secondary">{profile.organizationName}</Typography>}
                    <Chip label={profile.role.replace('ROLE_', '')} color={roleColor(profile.role) as any} size="small" sx={{ mt: 1.5, fontWeight: 600 }} />
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" display="block">Joined {new Date(profile.createdAt).toLocaleDateString()}</Typography>
                    {profile.lastLoginAt && <Typography variant="caption" color="text.secondary" display="block">Last login {new Date(profile.lastLoginAt).toLocaleDateString()}</Typography>}
                    <Box mt={1}>
                      <Chip label={profile.emailVerified ? 'Email Verified' : 'Email Unverified'} color={profile.emailVerified ? 'success' : 'default'} size="small" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right column */}
              <Grid item xs={12} md={9}>

                {/* Personal Information */}
                <Card sx={cardSx}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <SectionHeader icon={<Person />} title="Personal Information" />
                      {!editing ? (
                        <Button startIcon={<Edit />} variant="contained" onClick={() => setEditing(true)} sx={{ borderRadius: 2, fontWeight: 600 }}>Edit Profile</Button>
                      ) : (
                        <Box display="flex" gap={1}>
                          <Button startIcon={<Cancel />} variant="outlined" onClick={() => setEditing(false)} sx={{ borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
                          <Button type="submit" startIcon={<Save />} variant="contained" disabled={isSubmitting} sx={{ borderRadius: 2, fontWeight: 600 }}>
                            {isSubmitting ? 'Saving...' : 'Save All'}
                          </Button>
                        </Box>
                      )}
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    {editing ? (
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}><TextField fullWidth name="firstName" label="First Name" value={values.firstName} onChange={handleChange} onBlur={handleBlur} error={touched.firstName && Boolean(errors.firstName)} helperText={touched.firstName && errors.firstName as string} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth name="lastName" label="Last Name" value={values.lastName} onChange={handleChange} onBlur={handleBlur} error={touched.lastName && Boolean(errors.lastName)} helperText={touched.lastName && errors.lastName as string} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth name="email" label="Email" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={touched.email && Boolean(errors.email)} helperText={touched.email && errors.email as string} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth name="phoneNumber" label="Phone Number" value={values.phoneNumber} onChange={handleChange} onBlur={handleBlur} InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }} /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth name="dateOfBirth" label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} value={values.dateOfBirth} onChange={handleChange} onBlur={handleBlur} /></Grid>
                      </Grid>
                    ) : (
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}><ReadField label="First Name" value={profile.firstName} /></Grid>
                        <Grid item xs={12} sm={6}><ReadField label="Last Name" value={profile.lastName} /></Grid>
                        <Grid item xs={12} sm={6}><ReadField label="Email" value={profile.email} /></Grid>
                        <Grid item xs={12} sm={6}><ReadField label="Phone Number" value={profile.phoneNumber} /></Grid>
                        <Grid item xs={12} sm={6}><ReadField label="Date of Birth" value={formatDisplay(profile.dateOfBirth)} /></Grid>
                        <Grid item xs={12} sm={6}><ReadField label="Status" value={`${profile.active ? 'Active' : 'Inactive'} · Email ${profile.emailVerified ? 'Verified' : 'Unverified'}`} /></Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>

                {/* Email Verification (Organizer, Employee, Admin) */}
                {(org || emp || adm) && (
                  <Card sx={{ ...cardSx, border: profile.emailVerified ? '1px solid rgba(46,125,50,0.3)' : '1px solid rgba(237,108,2,0.3)', backgroundColor: profile.emailVerified ? 'rgba(46,125,50,0.03)' : 'rgba(255,244,229,0.5)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1.5}>
                          {profile.emailVerified
                            ? <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                            : <Email sx={{ color: 'warning.main', fontSize: 28 }} />}
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: profile.emailVerified ? '#2e7d32' : '#ed6c02' }}>
                              Email Verification
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="div">
                              {profile.email}&nbsp;
                              {profile.emailVerified
                                ? <Chip label="Verified" color="success" size="small" />
                                : <Chip label="Not Verified" color="warning" size="small" />}
                            </Typography>
                          </Box>
                        </Box>
                        {!profile.emailVerified && (
                          <Button
                            startIcon={<MarkEmailRead />}
                            variant="contained"
                            color="warning"
                            onClick={() => setOtpOpen(true)}
                            sx={{ borderRadius: 2, fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            Verify Email
                          </Button>
                        )}
                      </Box>
                      {!profile.emailVerified && (
                        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                          Please verify your email address to activate all account features.
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Business Information (Organizer only) */}
                {org && (
                  <Card sx={cardSx}>
                    <CardContent sx={{ p: 3 }}>
                      <SectionHeader icon={<Business />} title="Business Information" color="#ed6c02" />
                      <Divider sx={{ mb: 3 }} />
                      {editing ? (
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6}><TextField fullWidth name="organizationName" label="Organization Name" value={values.organizationName} onChange={handleChange} onBlur={handleBlur} InputProps={{ startAdornment: <InputAdornment position="start"><Business fontSize="small" /></InputAdornment> }} /></Grid>
                          <Grid item xs={12} sm={6}><TextField fullWidth name="businessRegistrationNumber" label="Business Registration No." value={values.businessRegistrationNumber} onChange={handleChange} onBlur={handleBlur} InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment> }} /></Grid>
                          <Grid item xs={12} sm={6}><TextField fullWidth name="taxId" label="Tax ID / VAT Number" value={values.taxId} onChange={handleChange} onBlur={handleBlur} InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment> }} /></Grid>
                          <Grid item xs={12} sm={6}><TextField fullWidth name="businessPhone" label="Business Phone" value={values.businessPhone} onChange={handleChange} onBlur={handleBlur} InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }} /></Grid>
                          <Grid item xs={12}><TextField fullWidth name="businessAddress" label="Business Address" value={values.businessAddress} onChange={handleChange} onBlur={handleBlur} InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment> }} /></Grid>
                        </Grid>
                      ) : (
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6}><ReadField label="Organization Name" value={profile.organizationName} /></Grid>
                          <Grid item xs={12} sm={6}><ReadField label="Business Registration No." value={profile.businessRegistrationNumber} /></Grid>
                          <Grid item xs={12} sm={6}><ReadField label="Tax ID / VAT Number" value={profile.taxId} /></Grid>
                          <Grid item xs={12} sm={6}><ReadField label="Business Phone" value={profile.businessPhone} /></Grid>
                          <Grid item xs={12}><ReadField label="Business Address" value={profile.businessAddress} /></Grid>
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Banking (Organizer only) */}
                {org && (
                  <Card sx={{ ...cardSx, border: '1px solid rgba(46,125,50,0.2)', backgroundColor: 'rgba(46,125,50,0.02)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <SectionHeader icon={<AccountBalance />} title="Banking & Payout Details" color="#2e7d32" />
                      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>Your banking info is used for event revenue payouts and is kept secure.</Alert>
                      <Divider sx={{ mb: 3 }} />
                      {editing ? (
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6}><TextField fullWidth name="bankName" label="Bank Name" value={values.bankName} onChange={handleChange} onBlur={handleBlur} /></Grid>
                          <Grid item xs={12} sm={6}><TextField fullWidth name="bankRoutingNumber" label="Routing / IFSC Code" value={values.bankRoutingNumber} onChange={handleChange} onBlur={handleBlur} /></Grid>
                          <Grid item xs={12}><TextField fullWidth name="bankAccountNumber" label="Bank Account Number" value={values.bankAccountNumber} onChange={handleChange} onBlur={handleBlur} inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 2 } }} /></Grid>
                        </Grid>
                      ) : (
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6}><ReadField label="Bank Name" value={profile.bankName} /></Grid>
                          <Grid item xs={12} sm={6}><ReadField label="Routing / IFSC Code" value={profile.bankRoutingNumber} /></Grid>
                          <Grid item xs={12}><ReadField label="Account Number" value={profile.bankAccountNumber} /></Grid>
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>

      {/* Notification Preferences (USER only) */}
      {profile.role === 'USER' && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>Notification Preferences</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: 2, bgcolor: loginEmailEnabled ? '#e8f5e9' : '#fafafa', border: `1px solid ${loginEmailEnabled ? '#a5d6a7' : '#e0e0e0'}`, transition: 'background-color 0.3s' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {loginEmailEnabled ? <NotificationsActive sx={{ color: 'success.main', fontSize: 28 }} /> : <NotificationsOff sx={{ color: 'text.disabled', fontSize: 28 }} />}
                <Box>
                  <Typography variant="body1" fontWeight={600}>Login email notifications</Typography>
                  <Typography variant="body2" color="text.secondary">Receive an email each time you sign in.</Typography>
                </Box>
              </Box>
              <FormControlLabel control={<Switch checked={loginEmailEnabled} onChange={handleLoginEmailToggle} disabled={loginEmailToggling} color="success" />} label={loginEmailEnabled ? 'On' : 'Off'} labelPlacement="start" sx={{ ml: 2, mr: 0 }} />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* OTP Dialog */}
      <Dialog open={otpOpen} onClose={handleCloseOtpDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MarkEmailRead color="warning" /> Verify Your Email
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            We'll send a 6-digit OTP to <strong>{profile?.email}</strong>. Enter it below to verify your account.
          </Typography>
          {!otpSent ? (
            <Button fullWidth variant="contained" color="warning" onClick={handleSendOtp} disabled={otpSending} sx={{ borderRadius: 2, fontWeight: 600, py: 1.5 }}>
              {otpSending ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Send OTP'}
            </Button>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>OTP sent! Check your inbox.</Alert>
              <TextField
                fullWidth autoFocus label="Enter 6-digit OTP" value={otpValue}
                onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: 8, fontFamily: 'monospace' } }}
                sx={{ mb: 2 }}
              />
              <Button variant="text" size="small" onClick={handleSendOtp} disabled={otpSending} sx={{ mb: 1 }}>
                Resend OTP
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseOtpDialog} sx={{ borderRadius: 2 }}>Cancel</Button>
          {otpSent && (
            <Button onClick={handleVerifyOtp} variant="contained" disabled={otpVerifying || otpValue.length !== 6} sx={{ borderRadius: 2, fontWeight: 600 }}>
              {otpVerifying ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Verify'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
        <Alert onClose={() => setSnackbar(p => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ fontWeight: 500 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;
