import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  Divider,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Avatar,
  Card,
  CardContent,
  Chip,
  Snackbar
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PhotoCamera,
  Save,
  Edit,
  Cancel,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { profileService } from '../../services/profile.service';
import RoleManagement from './RoleManagement';
import { UserRole, ProfileDTO, ProfileUpdateDTO } from '../../types';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const profileValidationSchema = Yup.object().shape({
  firstName: Yup.string()
    .required('First name is required')
    .max(100, 'First name must not exceed 100 characters'),
  lastName: Yup.string()
    .required('Last name is required')
    .max(100, 'Last name must not exceed 100 characters'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required')
    .max(255, 'Email must not exceed 255 characters'),
  phoneNumber: Yup.string()
    .matches(/^[+]?\d{10,15}$/, 'Invalid phone number format')
    .max(20, 'Phone number must not exceed 20 characters'),
  dateOfBirth: Yup.date().nullable()
});

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { setCurrency } = useCurrency();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ROLE_ADMIN ||
                  user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN;

  // Profile states
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load system settings from localStorage
  const loadSystemSettings = () => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          defaultCurrency: 'LKR',
          defaultLanguage: 'en',
          enableMaintenance: false,
          logLevel: 'INFO',
          themeMode: 'light'
        };
      }
    }
    return {
      defaultCurrency: 'LKR',
      defaultLanguage: 'en',
      enableMaintenance: false,
      logLevel: 'INFO',
      themeMode: 'light'
    };
  };

  // Form states
  const [accountSettings, setAccountSettings] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false,
    passwordsMatch: false
  });

  // Track if user is actively changing password
  const [showSecurityNotice, setShowSecurityNotice] = useState(false);

  const [systemSettings, setSystemSettings] = useState(loadSystemSettings());

  // Load profile data
  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const profileData = await profileService.getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      showSnackbar('Failed to load profile', 'error');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case 'ROLE_ADMIN':
        return 'error';
      case 'ORGANIZER':
      case 'ROLE_ORGANIZER':
        return 'warning';
      case 'USER':
      case 'ROLE_USER':
        return 'primary';
      default:
        return 'default';
    }
  };

  const handleProfileSubmit = async (values: any) => {
    try {
      const updateData: ProfileUpdateDTO = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber || undefined,
        dateOfBirth: values.dateOfBirth || undefined
      };

      const updatedProfile = await profileService.updateProfile(updateData);
      setProfile(updatedProfile);
      setEditing(false);
      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar('Failed to update profile', 'error');
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await profileService.uploadProfilePicture(file);
      
      // Reload profile to get updated picture URL
      await loadProfile();
      showSnackbar('Profile picture updated successfully', 'success');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showSnackbar('Failed to upload profile picture', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountSettings({
      ...accountSettings,
      [e.target.name]: e.target.value
    });
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotificationSettings({
      ...notificationSettings,
      [e.target.name]: e.target.checked
    });
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSettings = {
      ...securitySettings,
      [e.target.name]: e.target.value
    };
    setSecuritySettings(newSettings);

    // Show security notice when user starts typing in any password field
    if (e.target.value.length > 0 && !showSecurityNotice) {
      setShowSecurityNotice(true);
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowSecurityNotice(false);
      }, 5000);
    }

    // Real-time password validation
    if (e.target.name === 'newPassword' || e.target.name === 'confirmPassword') {
      const password = e.target.name === 'newPassword' ? e.target.value : newSettings.newPassword;
      const confirmPassword = e.target.name === 'confirmPassword' ? e.target.value : newSettings.confirmPassword;

      setPasswordValidation({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        passwordsMatch: password === confirmPassword && password.length > 0 && confirmPassword.length > 0
      });
    }
  };

  const handleClickShowPassword = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const newSettings = {
      ...systemSettings,
      [target.name]: 'type' in target && target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    };
    setSystemSettings(newSettings);
    
    // Change language immediately when language is changed
    if (target.name === 'defaultLanguage') {
      i18n.changeLanguage(target.value);
    }
    
    // Change currency immediately when currency is changed
    if (target.name === 'defaultCurrency') {
      setCurrency(target.value);
    }
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(t('settings.account.successMessage'));
    } catch (err: unknown) {
      console.error('Error updating account settings:', err);
      setError(t('settings.account.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(t('settings.notifications.successMessage'));
    } catch (err: unknown) {
      console.error('Error updating notification preferences:', err);
      setError(t('settings.notifications.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    // Validate all fields are filled
    if (!securitySettings.currentPassword || !securitySettings.newPassword) {
      setError('Please fill in all password fields');
      setSaving(false);
      return;
    }

    // Validate password requirements
    if (!passwordValidation.minLength || !passwordValidation.hasUppercase || 
        !passwordValidation.hasNumber || !passwordValidation.hasSymbol) {
      setError('New password does not meet the security requirements');
      setSaving(false);
      return;
    }

    // Validate passwords match
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      setError(t('settings.security.passwordMismatch'));
      setSaving(false);
      return;
    }

    try {
      await profileService.changePassword(
        securitySettings.currentPassword,
        securitySettings.newPassword
      );
      setSuccess('Password updated successfully. You will be logged out in 3 seconds for security.');
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordValidation({
        minLength: false,
        hasUppercase: false,
        hasNumber: false,
        hasSymbol: false,
        passwordsMatch: false
      });
      
      // Logout after 3 seconds
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update password. Please check your current password.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      // Save to localStorage
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
      // Change language
      i18n.changeLanguage(systemSettings.defaultLanguage);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(t('settings.system.successMessage'));
    } catch (err: unknown) {
      console.error('Error updating system settings:', err);
      setError(t('settings.system.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
        {t('settings.title')}
      </Typography>

      <Paper 
        sx={{ 
          width: '100%', 
          mt: 2,
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="settings tabs"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 500,
                fontSize: '1rem'
              },
              '& .Mui-selected': {
                color: '#1976d2'
              }
            }}
          >
            <Tab label="Profile" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label={t('settings.tabs.account')} id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab label={t('settings.tabs.notifications')} id="settings-tab-2" aria-controls="settings-tabpanel-2" />
            <Tab label={t('settings.tabs.security')} id="settings-tab-3" aria-controls="settings-tabpanel-3" />
            <Tab label={t('settings.tabs.system')} id="settings-tab-4" aria-controls="settings-tabpanel-4" />
            {isAdmin && <Tab label={t('settings.tabs.roles')} id="settings-tab-5" aria-controls="settings-tabpanel-5" />}
          </Tabs>
        </Box>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          {loadingProfile ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress size={60} thickness={4} />
            </Box>
          ) : !profile ? (
            <Alert severity="error">Failed to load profile data</Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Profile Picture Section */}
              <Grid item xs={12} md={4}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 4 }}>
                    <Box position="relative" display="inline-block">
                      <Avatar
                        src={profile.profilePicture ? `http://localhost:8081/${profile.profilePicture}` : undefined}
                        sx={{ 
                          width: 150, 
                          height: 150, 
                          margin: 'auto', 
                          fontSize: '3rem',
                          border: '4px solid rgba(25, 118, 210, 0.2)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        {profile.firstName?.[0]}{profile.lastName?.[0]}
                      </Avatar>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="profile-picture-upload"
                        type="file"
                        onChange={handleProfilePictureUpload}
                      />
                      <label htmlFor="profile-picture-upload">
                        <IconButton
                          component="span"
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                            width: 48,
                            height: 48,
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                          }}
                          disabled={uploading}
                        >
                          {uploading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : <PhotoCamera />}
                        </IconButton>
                      </label>
                    </Box>
                    <Typography variant="h5" sx={{ mt: 3, fontWeight: 600 }}>
                      {profile.firstName} {profile.lastName}
                    </Typography>
                    <Chip 
                      label={profile.role.replace('ROLE_', '')} 
                      color={getRoleColor(profile.role) as any} 
                      sx={{ mt: 2, fontWeight: 600, fontSize: '1rem' }} 
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Profile Information Section */}
              <Grid item xs={12} md={8}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
                        Profile Information
                      </Typography>
                      {!editing ? (
                        <Button
                          startIcon={<Edit />}
                          variant="contained"
                          onClick={() => setEditing(true)}
                          sx={{
                            borderRadius: 2,
                            padding: '8px 16px',
                            fontWeight: 600,
                            boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
                            '&:hover': {
                              boxShadow: '0 6px 8px rgba(25, 118, 210, 0.3)',
                            }
                          }}
                        >
                          Edit Profile
                        </Button>
                      ) : (
                        <Button
                          startIcon={<Cancel />}
                          variant="outlined"
                          onClick={() => setEditing(false)}
                          sx={{
                            borderRadius: 2,
                            padding: '8px 16px',
                            fontWeight: 600
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* User ID (Non-editable) */}
                    <Box mb={3}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
                        User ID (Read-only)
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1.5, borderRadius: 2 }}>
                        {profile.userId}
                      </Typography>
                    </Box>

                    {editing ? (
                      <Formik
                        initialValues={{
                          firstName: profile.firstName || '',
                          lastName: profile.lastName || '',
                          email: profile.email || '',
                          phoneNumber: profile.phoneNumber || '',
                          dateOfBirth: formatDate(profile.dateOfBirth) || ''
                        }}
                        validationSchema={profileValidationSchema}
                        onSubmit={handleProfileSubmit}
                      >
                        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                          <Form>
                            <Grid container spacing={3}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  name="firstName"
                                  label="First Name"
                                  value={values.firstName}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  error={touched.firstName && Boolean(errors.firstName)}
                                  helperText={touched.firstName && errors.firstName as string}
                                  required
                                  sx={{ borderRadius: 2 }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  name="lastName"
                                  label="Last Name"
                                  value={values.lastName}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  error={touched.lastName && Boolean(errors.lastName)}
                                  helperText={touched.lastName && errors.lastName as string}
                                  required
                                  sx={{ borderRadius: 2 }}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  name="email"
                                  label="Email"
                                  type="email"
                                  value={values.email}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  error={touched.email && Boolean(errors.email)}
                                  helperText={touched.email && errors.email as string}
                                  required
                                  sx={{ borderRadius: 2 }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  name="phoneNumber"
                                  label="Phone Number"
                                  value={values.phoneNumber}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  error={touched.phoneNumber && Boolean(errors.phoneNumber)}
                                  helperText={touched.phoneNumber && errors.phoneNumber as string}
                                  sx={{ borderRadius: 2 }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  name="dateOfBirth"
                                  label="Date of Birth"
                                  type="date"
                                  InputLabelProps={{ shrink: true }}
                                  value={values.dateOfBirth}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  error={touched.dateOfBirth && Boolean(errors.dateOfBirth)}
                                  helperText={touched.dateOfBirth && errors.dateOfBirth as string}
                                  sx={{ borderRadius: 2 }}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Box display="flex" gap={2} justifyContent="flex-end">
                                  <Button
                                    variant="outlined"
                                    onClick={() => setEditing(false)}
                                    sx={{
                                      borderRadius: 2,
                                      padding: '8px 16px',
                                      fontWeight: 600
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<Save />}
                                    disabled={isSubmitting}
                                    sx={{
                                      borderRadius: 2,
                                      padding: '8px 16px',
                                      fontWeight: 600,
                                      boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
                                      '&:hover': {
                                        boxShadow: '0 6px 8px rgba(25, 118, 210, 0.3)',
                                      }
                                    }}
                                  >
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                  </Button>
                                </Box>
                              </Grid>
                            </Grid>
                          </Form>
                        )}
                      </Formik>
                    ) : (
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
                            First Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>{profile.firstName}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
                            Last Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>{profile.lastName}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
                            Email
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>{profile.email}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
                            Phone Number
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>{profile.phoneNumber || 'Not set'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
                            Date of Birth
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>{formatDisplayDate(profile.dateOfBirth)}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
                            Account Information
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Account created: {new Date(profile.createdAt).toLocaleDateString()}
                          </Typography>
                          {profile.lastLoginAt && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              Last login: {new Date(profile.lastLoginAt).toLocaleDateString()}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            Status: {profile.active ? 'Active' : 'Inactive'} | 
                            Email: {profile.emailVerified ? 'Verified' : 'Not verified'}
                          </Typography>
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* Account Settings */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {success && <Grid item xs={12}><Alert severity="success">{success}</Alert></Grid>}
            {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

            <Grid item xs={12} sm={6}>
              <TextField
                label={t('settings.account.firstName')}
                name="firstName"
                value={accountSettings.firstName}
                onChange={handleAccountChange}
                fullWidth
                variant="outlined"
                margin="normal"
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('settings.account.lastName')}
                name="lastName"
                value={accountSettings.lastName}
                onChange={handleAccountChange}
                fullWidth
                variant="outlined"
                margin="normal"
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('settings.account.email')}
                name="email"
                type="email"
                value={accountSettings.email}
                onChange={handleAccountChange}
                fullWidth
                variant="outlined"
                margin="normal"
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('settings.account.phoneNumber')}
                name="phoneNumber"
                value={accountSettings.phoneNumber}
                onChange={handleAccountChange}
                fullWidth
                variant="outlined"
                margin="normal"
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSaveAccount}
                disabled={saving}
                sx={{
                  borderRadius: 2,
                  padding: '8px 16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
                  '&:hover': {
                    boxShadow: '0 6px 8px rgba(25, 118, 210, 0.3)',
                  }
                }}
              >
                {saving ? <CircularProgress size={24} /> : t('settings.account.saveChanges')}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notification Settings */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {success && <Grid item xs={12}><Alert severity="success">{success}</Alert></Grid>}
            {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={notificationSettings.emailNotifications}
                    onChange={handleNotificationChange}
                    name="emailNotifications"
                    color="primary"
                  />
                }
                label={t('settings.notifications.emailNotifications')}
              />
              <Typography variant="body2" color="textSecondary">
                {t('settings.notifications.emailDesc')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={notificationSettings.smsNotifications}
                    onChange={handleNotificationChange}
                    name="smsNotifications"
                    color="primary"
                  />
                }
                label={t('settings.notifications.smsNotifications')}
              />
              <Typography variant="body2" color="textSecondary">
                {t('settings.notifications.smsDesc')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={notificationSettings.marketingEmails}
                    onChange={handleNotificationChange}
                    name="marketingEmails"
                    color="primary"
                  />
                }
                label={t('settings.notifications.marketingEmails')}
              />
              <Typography variant="body2" color="textSecondary">
                {t('settings.notifications.marketingDesc')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSaveNotifications}
                disabled={saving}
                sx={{
                  borderRadius: 2,
                  padding: '8px 16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
                  '&:hover': {
                    boxShadow: '0 6px 8px rgba(25, 118, 210, 0.3)',
                  }
                }}
              >
                {saving ? <CircularProgress size={24} /> : t('settings.notifications.savePreferences')}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {success && (
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Security Context Banner - Only show when user is typing */}
            {showSecurityNotice && (
              <Alert 
                severity="info" 
                icon={<InfoIcon />} 
                sx={{ 
                  mb: 3,
                  animation: 'fadeIn 0.3s ease-in',
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(-10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                   <strong>Security Notice:</strong> After changing your password, you'll be automatically logged out for security purposes.
                </Typography>
              </Alert>
            )}

            {/* Password Change Section */}
            <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <LockIcon sx={{ color: '#1976d2', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    {t('settings.security.changePassword')}
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label={t('settings.security.currentPassword')}
                      name="currentPassword"
                      type={showPasswords.currentPassword ? 'text' : 'password'}
                      value={securitySettings.currentPassword}
                      onChange={handleSecurityChange}
                      fullWidth
                      variant="outlined"
                      sx={{ 
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => handleClickShowPassword('currentPassword')}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                            >
                              {showPasswords.currentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>
                      <Chip label="New Password" size="small" sx={{ fontWeight: 600 }} />
                    </Divider>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label={t('settings.security.newPassword')}
                      name="newPassword"
                      type={showPasswords.newPassword ? 'text' : 'password'}
                      value={securitySettings.newPassword}
                      onChange={handleSecurityChange}
                      fullWidth
                      variant="outlined"
                      sx={{ 
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => handleClickShowPassword('newPassword')}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                            >
                              {showPasswords.newPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    
                    {/* Password Requirements */}
                    {securitySettings.newPassword && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
                          Password Requirements:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.minLength ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.minLength ? 'success.main' : 'text.secondary' }}>
                              Minimum 8 characters
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.hasUppercase ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.hasUppercase ? 'success.main' : 'text.secondary' }}>
                              At least 1 uppercase letter
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.hasNumber ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.hasNumber ? 'success.main' : 'text.secondary' }}>
                              At least 1 number
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.hasSymbol ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.hasSymbol ? 'success.main' : 'text.secondary' }}>
                              At least 1 special character (!@#$%^&*...)
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label={t('settings.security.confirmPassword')}
                      name="confirmPassword"
                      type={showPasswords.confirmPassword ? 'text' : 'password'}
                      value={securitySettings.confirmPassword}
                      onChange={handleSecurityChange}
                      fullWidth
                      variant="outlined"
                      error={securitySettings.confirmPassword.length > 0 && !passwordValidation.passwordsMatch}
                      helperText={
                        securitySettings.confirmPassword.length > 0 && !passwordValidation.passwordsMatch
                          ? 'Passwords do not match'
                          : ''
                      }
                      sx={{ 
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => handleClickShowPassword('confirmPassword')}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                            >
                              {showPasswords.confirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    
                    {/* Password Match Indicator */}
                    {securitySettings.confirmPassword && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {passwordValidation.passwordsMatch ? (
                            <>
                              <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                Passwords match!
                              </Typography>
                            </>
                          ) : (
                            <>
                              <CancelIcon sx={{ fontSize: 20, color: 'error.main' }} />
                              <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                                Passwords don't match
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <Button 
                      variant="contained" 
                      color="error"
                      startIcon={saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <LockIcon />}
                      onClick={handleSaveSecurity}
                      disabled={saving}
                      fullWidth
                      sx={{
                        borderRadius: 2,
                        padding: '12px 24px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                        background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                        '&:hover': {
                          boxShadow: '0 6px 16px rgba(211, 47, 47, 0.4)',
                          background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                        },
                        '&:disabled': {
                          background: '#ccc',
                          color: '#666'
                        }
                      }}
                    >
                      {saving ? 'Updating Password...' : ' Update Password'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Additional Security Features (Coming Soon) */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', opacity: 0.7 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <SecurityIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Additional Security Features
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="default" sx={{ ml: 'auto' }} />
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LockIcon sx={{ fontSize: 18 }} />
                        Two-Factor Authentication
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Add an extra layer of security to your account
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon sx={{ fontSize: 18 }} />
                        Login History
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        View your recent login activity and devices
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon sx={{ fontSize: 18 }} />
                        Active Sessions
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Manage devices logged into your account
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon sx={{ fontSize: 18 }} />
                        Security Alerts
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Get notified of suspicious account activity
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* System Settings */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <Grid container spacing={3}>
            {success && <Grid item xs={12}><Alert severity="success">{success}</Alert></Grid>}
            {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label={t('settings.system.defaultCurrency')}
                name="defaultCurrency"
                value={systemSettings.defaultCurrency}
                onChange={handleSystemChange}
                fullWidth
                variant="outlined"
                margin="normal"
                SelectProps={{
                  native: true,
                  inputProps: {
                    'aria-label': 'Default Currency',
                  },
                }}
                sx={{ borderRadius: 2 }}
              >
                <option value="USD">{t('settings.system.currencies.usd')}</option>
                <option value="EUR">{t('settings.system.currencies.eur')}</option>
                <option value="GBP">{t('settings.system.currencies.gbp')}</option>
                <option value="JPY">{t('settings.system.currencies.jpy')}</option>
                <option value="LKR">{t('settings.system.currencies.lkr')}</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label={t('settings.system.defaultLanguage')}
                name="defaultLanguage"
                value={systemSettings.defaultLanguage}
                onChange={handleSystemChange}
                fullWidth
                variant="outlined"
                margin="normal"
                SelectProps={{
                  native: true,
                  inputProps: {
                    'aria-label': 'Default Language',
                  },
                }}
                sx={{ borderRadius: 2 }}
              >
                <option value="en">{t('settings.system.languages.en')}</option>
                <option value="es">{t('settings.system.languages.es')}</option>
                <option value="fr">{t('settings.system.languages.fr')}</option>
                <option value="de">{t('settings.system.languages.de')}</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={systemSettings.enableMaintenance}
                    onChange={handleSystemChange}
                    name="enableMaintenance"
                    color="primary"
                  />
                }
                label={t('settings.system.maintenanceMode')}
              />
              <Typography variant="body2" color="textSecondary">
                {t('settings.system.maintenanceDesc')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSaveSystem}
                disabled={saving}
                sx={{
                  borderRadius: 2,
                  padding: '8px 16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
                  '&:hover': {
                    boxShadow: '0 6px 8px rgba(25, 118, 210, 0.3)',
                  }
                }}
              >
                {saving ? <CircularProgress size={24} /> : t('settings.system.saveSettings')}
              </Button>
            </Grid>
          </Grid>
          </Box>
        </TabPanel>

        {/* Role Management */}
        {isAdmin && (
          <TabPanel value={activeTab} index={5}>
            <RoleManagement />
          </TabPanel>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ fontWeight: 500 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
