import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Chip,
  Container,
  Tabs,
  Tab,
  Badge,
  Switch,
  FormControlLabel,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem
} from '@mui/material';
import { 
  PhotoCamera, 
  Save, 
  Edit, 
  Cancel, 
  CheckCircle, 
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { 
  ReceiptLong as ReceiptIcon, 
  Refresh as RefreshIcon, 
  Print as PrintIcon, 
  Close as CloseIcon 
} from '@mui/icons-material';
import PublicNavbar from '../../../components/public/PublicNavbar';
import { ProfileDTO, ProfileUpdateDTO, Booking, BookingStatus } from '../../../types';
import { profileService } from '../../../services/profile.service';
import { BookingService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import { getProfilePictureUrl } from '../../../utils/formatters';

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
}

const validationSchema = Yup.object().shape({
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

const UserProfile: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Booking history states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState<boolean>(false);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.search.includes('tab=1') || location.search.includes('booking') || location.state?.tab === 1) {
      setCurrentTab(1);
    }
  }, [location]);

  useEffect(() => {
    if (currentTab === 1) {
      fetchBookings();
    }
  }, [currentTab]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const data = await BookingService.getAllBookings();
      setBookings(Array.isArray(data) ? data : data?.content ?? []);
    } catch (error) {
    } finally {
      setBookingsLoading(false);
    }
  };

  const renderStatusChip = (status: BookingStatus | string) => {
    const statusUpper = (status || '').toUpperCase();
    switch (statusUpper) {
      case 'CONFIRMED':
        return (
          <Chip
            label="CONFIRMED"
            size="small"
            sx={{
              backgroundColor: 'rgba(46, 125, 50, 0.25)',
              color: '#4caf50',
              border: '1px solid #4caf50',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      case 'PENDING':
        return (
          <Chip
            label="PENDING"
            size="small"
            sx={{
              backgroundColor: 'rgba(237, 108, 2, 0.25)',
              color: '#ff9800',
              border: '1px solid #ff9800',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      case 'REFUNDED':
        return (
          <Chip
            label="REFUNDED"
            size="small"
            sx={{
              backgroundColor: 'rgba(171, 71, 188, 0.25)',
              color: '#ce93d8',
              border: '1px solid #ab47bc',
              fontWeight: 700,
              fontSize: '0.75rem',
              boxShadow: '0 0 10px rgba(171, 71, 188, 0.4)',
            }}
          />
        );
      case 'CANCELLED':
        return (
          <Chip
            label="CANCELLED"
            size="small"
            sx={{
              backgroundColor: 'rgba(211, 47, 47, 0.25)',
              color: '#ef5350',
              border: '1px solid #ef5350',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      case 'COMPLETED':
        return (
          <Chip
            label="COMPLETED"
            size="small"
            sx={{
              backgroundColor: 'rgba(2, 136, 209, 0.25)',
              color: '#29b6f6',
              border: '1px solid #29b6f6',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      default:
        return (
          <Chip
            label={statusUpper || 'N/A'}
            size="small"
            sx={{
              backgroundColor: 'rgba(120, 144, 156, 0.25)',
              color: '#b0bec5',
              border: '1px solid #78909c',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Booking Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
        h2 { color: #cc0033; } table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .label { color: #555; font-size: 12px; } .value { font-weight: 600; }
        .total { font-size: 16px; font-weight: 700; color: #cc0033; }
      </style></head><body>
      ${receiptRef.current.innerHTML}
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const formatReceiptPrice = (amount: number, currencyCode?: string) => {
    const currency = currencyCode || 'LKR';
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      LKR: 'Rs.'
    };
    const symbol = symbols[currency] || 'Rs.';
    return `${symbol}${Number(amount ?? 0).toLocaleString()}`;
  };

  const bookingColumns: GridColDef[] = [
    { field: 'bookingReference', headerName: 'Booking Ref', width: 160 },
    {
      field: 'eventName', headerName: 'Event', flex: 1,
      valueGetter: (params: any) => params.row.eventName || params.row.event?.name || 'N/A'
    },
    { field: 'ticketCount', headerName: 'Tickets', width: 90 },
    {
      field: 'totalAmount', headerName: 'Amount', width: 130,
      renderCell: (params: any) => formatReceiptPrice(params.value, params.row.currency)
    },
    {
      field: 'bookingTime', headerName: 'Booking Date', width: 160,
      valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A'
    },
    {
      field: 'status', headerName: 'Status', width: 140,
      renderCell: (params: any) => renderStatusChip(params.value)
    },
    {
      field: 'actions', headerName: 'Receipt', width: 120, sortable: false,
      renderCell: (params: any) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ReceiptIcon sx={{ fontSize: '14px !important' }} />}
          onClick={() => setReceiptBooking(params.row as Booking)}
          sx={{
            borderColor: '#ff1955', color: '#ff1955', fontSize: '0.75rem',
            '&:hover': { bgcolor: 'rgba(255,25,85,0.08)', borderColor: '#ff1955' }
          }}
        >
          Receipt
        </Button>
      )
    },
  ];

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    loginEmailNotifications: true
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailChangeSettings, setEmailChangeSettings] = useState({
    newEmail: '',
    confirmEmail: '',
    passwordForEmail: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
    passwordForEmail: false
  });

  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false,
    passwordsMatch: false
  });

  const [emailValidation, setEmailValidation] = useState({
    isValidEmail: false,
    emailsMatch: false
  });

  const [showSecurityNotice, setShowSecurityNotice] = useState(false);

  // System settings
  const [systemSettings, setSystemSettings] = useState({
    defaultCurrency: 'LKR',
    enableMaintenance: false
  });

  // Load system settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setSystemSettings(prev => ({
          ...prev,
          defaultCurrency: settings.defaultCurrency || 'LKR',
          enableMaintenance: settings.enableMaintenance || false
        }));
      } catch (error) {
        console.error('Failed to parse system settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfile();
      setProfile(data);
      setNotificationSettings(prev => ({
        ...prev,
        emailNotifications: data.emailNotificationsEnabled ?? true,
        smsNotifications: data.smsNotificationsEnabled ?? false,
        marketingEmails: data.marketingEmailsEnabled ?? false,
        loginEmailNotifications: data.loginEmailEnabled ?? true
      }));
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to load profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (
    values: ProfileFormValues,
    { setSubmitting }: FormikHelpers<ProfileFormValues>
  ) => {
    try {
      const updateData: ProfileUpdateDTO = {
        email: values.email, // Email is required in ProfileUpdateDTO
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
      };

      await profileService.updateProfile(updateData);

      if (selectedFile) {
        await profileService.uploadProfilePicture(selectedFile);
      }

      await fetchProfile();
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.status === 413 ? 'Profile picture is too large. Maximum allowed size is 1MB.' : (error.response?.data?.message || 'Failed to update profile'),
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Notification handlers
  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotificationSettings({
      ...notificationSettings,
      [e.target.name]: e.target.checked
    });
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await Promise.all([
        profileService.updateNotificationPreferences(
          notificationSettings.emailNotifications,
          notificationSettings.smsNotifications,
          notificationSettings.marketingEmails
        ),
        profileService.updateLoginEmailPreference(notificationSettings.loginEmailNotifications),
      ]);
      setSnackbar({
        open: true,
        message: 'Notification preferences saved successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save notification preferences',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Security handlers
  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSettings = {
      ...securitySettings,
      [e.target.name]: e.target.value
    };
    setSecuritySettings(newSettings);

    if (e.target.value.length > 0 && !showSecurityNotice) {
      setShowSecurityNotice(true);
      setTimeout(() => {
        setShowSecurityNotice(false);
      }, 5000);
    }

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

  const handleClickShowPassword = (field: 'currentPassword' | 'newPassword' | 'confirmPassword' | 'passwordForEmail') => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleEmailChangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSettings = {
      ...emailChangeSettings,
      [e.target.name]: e.target.value
    };
    setEmailChangeSettings(newSettings);

    // Real-time email validation
    if (e.target.name === 'newEmail' || e.target.name === 'confirmEmail') {
      const newEmail = e.target.name === 'newEmail' ? e.target.value : newSettings.newEmail;
      const confirmEmail = e.target.name === 'confirmEmail' ? e.target.value : newSettings.confirmEmail;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      setEmailValidation({
        isValidEmail: emailRegex.test(newEmail),
        emailsMatch: newEmail === confirmEmail && newEmail.length > 0 && confirmEmail.length > 0
      });
    }
  };

  const handleSaveEmailChange = async () => {
    setSaving(true);

    // Validate all fields are filled
    if (!emailChangeSettings.newEmail || !emailChangeSettings.confirmEmail || !emailChangeSettings.passwordForEmail) {
      setSnackbar({
        open: true,
        message: 'Please fill in all email change fields',
        severity: 'error'
      });
      setSaving(false);
      return;
    }

    // Validate email format
    if (!emailValidation.isValidEmail) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid email address',
        severity: 'error'
      });
      setSaving(false);
      return;
    }

    // Validate emails match
    if (!emailValidation.emailsMatch) {
      setSnackbar({
        open: true,
        message: 'Emails do not match',
        severity: 'error'
      });
      setSaving(false);
      return;
    }

    try {
      await profileService.changeEmail(
        emailChangeSettings.newEmail,
        emailChangeSettings.passwordForEmail
      );
      setSnackbar({
        open: true,
        message: 'Email updated successfully. You will be logged out in 3 seconds for security.',
        severity: 'success'
      });
      setEmailChangeSettings({
        newEmail: '',
        confirmEmail: '',
        passwordForEmail: ''
      });
      setEmailValidation({
        isValidEmail: false,
        emailsMatch: false
      });
      
      // Reload profile to show new email
      await fetchProfile();
      
      // Logout after 3 seconds
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update email. Please check your password.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    if (!securitySettings.currentPassword || !securitySettings.newPassword) {
      setSnackbar({
        open: true,
        message: 'Please fill in all password fields',
        severity: 'error'
      });
      setSaving(false);
      return;
    }

    if (!passwordValidation.minLength || !passwordValidation.hasUppercase || 
        !passwordValidation.hasNumber || !passwordValidation.hasSymbol) {
      setSnackbar({
        open: true,
        message: 'New password does not meet the security requirements',
        severity: 'error'
      });
      setSaving(false);
      return;
    }

    if (!passwordValidation.passwordsMatch) {
      setSnackbar({
        open: true,
        message: 'Passwords do not match',
        severity: 'error'
      });
      setSaving(false);
      return;
    }

    try {
      await profileService.changePassword(
        securitySettings.currentPassword,
        securitySettings.newPassword
      );
      setSnackbar({
        open: true,
        message: 'Password updated successfully. You will be logged out in 3 seconds for security.',
        severity: 'success'
      });
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
      const errorMessage = err.response?.data?.message || 'Failed to update password. Please check your current password.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // System handlers
  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const newSettings = {
      ...systemSettings,
      [target.name]: 'type' in target && target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    };
    setSystemSettings(newSettings);
  };

  const handleSaveSystem = async () => {
    setSaving(true);
    try {
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
      window.dispatchEvent(new Event('currencyChanged'));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'System settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save system settings',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
        }}
      >
        <PublicNavbar />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box
        sx={{
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
        }}
      >
        <PublicNavbar />
        <Container maxWidth="lg" sx={{ pt: 12 }}>
          <Alert severity="error">Failed to load profile data</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: '#242a33',
        minHeight: '100vh',
      }}
    >
      <PublicNavbar />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#fff' }}>
          Settings
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)', mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'uppercase',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
              },
              '& .Mui-selected': {
                color: '#ff1955 !important',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#ff1955',
              }
            }}
          >
            <Tab label="PROFILE" />
            <Tab label="BOOKING HISTORY" />
            <Tab label="NOTIFICATIONS" />
            <Tab label="SECURITY" />
            <Tab label="SYSTEM" />
          </Tabs>
        </Box>

        {currentTab === 0 && (
          <Grid container spacing={3}>
            {/* Left Side - Profile Picture Card */}
            <Grid item xs={12} md={4}>
              <Card sx={{ backgroundColor: '#1a1f28', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        isEditing && (
                          <IconButton
                            component="label"
                            sx={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              width: 40,
                              height: 40,
                              '&:hover': { backgroundColor: '#0056b3' }
                            }}
                          >
                            <input
                              hidden
                              accept="image/*"
                              type="file"
                              onChange={handleFileSelect}
                            />
                            <PhotoCamera fontSize="small" />
                          </IconButton>
                        )
                      }
                    >
                      <Avatar
                        src={previewUrl || getProfilePictureUrl(profile.profilePicture)}
                        sx={{ 
                          width: 150, 
                          height: 150,
                          border: '4px solid rgba(255, 25, 85, 0.3)',
                          fontSize: '3rem',
                          backgroundColor: '#ff1955'
                        }}
                      >
                        {profile.firstName?.[0] || profile.email?.[0] || 'U'}
                      </Avatar>
                    </Badge>
                  </Box>
                  
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#fff' }}>
                    {profile.firstName} {profile.lastName}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Side - Profile Information */}
            <Grid item xs={12} md={8}>
              <Card sx={{ backgroundColor: '#1a1f28', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600 }}>
                      Profile Information
                    </Typography>
                    {!isEditing ? (
                      <Button
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => setIsEditing(true)}
                        sx={{ 
                          backgroundColor: '#ff1955',
                          '&:hover': { backgroundColor: '#e01545' }
                        }}
                      >
                        Edit Profile
                      </Button>
                    ) : null}
                  </Box>

                  <Formik
                    initialValues={{
                      firstName: profile.firstName || '',
                      lastName: profile.lastName || '',
                      email: profile.email || '',
                      phoneNumber: profile.phoneNumber || '',
                      dateOfBirth: profile.dateOfBirth || '',
                    }}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                    enableReinitialize
                  >
                    {({ errors, touched, values, handleChange, isSubmitting }) => (
                      <Form>
                        <Grid container spacing={3}>
                          {/* First Name and Last Name */}
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                              First Name
                            </Typography>
                            <TextField
                              fullWidth
                              name="firstName"
                              placeholder="First Name"
                              value={values.firstName}
                              onChange={handleChange}
                              disabled={!isEditing}
                              error={touched.firstName && Boolean(errors.firstName)}
                              helperText={(touched.firstName && errors.firstName) as string}
                              size="small"
                              sx={{
                                '& .MuiInputBase-root': {
                                  backgroundColor: '#242a33',
                                  color: '#fff'
                                },
                                '& .MuiInputBase-input.Mui-disabled': {
                                  WebkitTextFillColor: 'rgba(255, 255, 255, 0.7)',
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                              Last Name
                            </Typography>
                            <TextField
                              fullWidth
                              name="lastName"
                              placeholder="Last Name"
                              value={values.lastName}
                              onChange={handleChange}
                              disabled={!isEditing}
                              error={touched.lastName && Boolean(errors.lastName)}
                              helperText={(touched.lastName && errors.lastName) as string}
                              size="small"
                              sx={{
                                '& .MuiInputBase-root': {
                                  backgroundColor: '#242a33',
                                  color: '#fff'
                                },
                                '& .MuiInputBase-input.Mui-disabled': {
                                  WebkitTextFillColor: 'rgba(255, 255, 255, 0.7)',
                                }
                              }}
                            />
                          </Grid>

                          {/* Email */}
                          <Grid item xs={12}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                              Email
                            </Typography>
                            <TextField
                              fullWidth
                              name="email"
                              placeholder="Email"
                              value={values.email}
                              disabled
                              size="small"
                              sx={{
                                '& .MuiInputBase-root': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                },
                                '& .MuiInputBase-input.Mui-disabled': {
                                  WebkitTextFillColor: 'rgba(255, 255, 255, 0.5)',
                                }
                              }}
                            />
                          </Grid>

                          {/* Phone Number */}
                          <Grid item xs={12}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                              Phone Number
                            </Typography>
                            <TextField
                              fullWidth
                              name="phoneNumber"
                              placeholder="Phone Number"
                              value={values.phoneNumber}
                              onChange={handleChange}
                              disabled={!isEditing}
                              error={touched.phoneNumber && Boolean(errors.phoneNumber)}
                              helperText={(touched.phoneNumber && errors.phoneNumber) as string}
                              size="small"
                              sx={{
                                '& .MuiInputBase-root': {
                                  backgroundColor: '#242a33',
                                  color: '#fff'
                                },
                                '& .MuiInputBase-input.Mui-disabled': {
                                  WebkitTextFillColor: 'rgba(255, 255, 255, 0.7)',
                                }
                              }}
                            />
                          </Grid>

                          {/* Date of Birth */}
                          <Grid item xs={12}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                              Date of Birth
                            </Typography>
                            <TextField
                              fullWidth
                              name="dateOfBirth"
                              type="date"
                              value={values.dateOfBirth}
                              onChange={handleChange}
                              disabled={!isEditing}
                              InputLabelProps={{ shrink: true }}
                              error={touched.dateOfBirth && Boolean(errors.dateOfBirth)}
                              helperText={(touched.dateOfBirth && errors.dateOfBirth) as string}
                              size="small"
                              sx={{
                                '& .MuiInputBase-root': {
                                  backgroundColor: '#242a33',
                                  color: '#fff'
                                },
                                '& .MuiInputBase-input.Mui-disabled': {
                                  WebkitTextFillColor: 'rgba(255, 255, 255, 0.7)',
                                }
                              }}
                            />
                          </Grid>

                          {/* Account Information */}
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                            <Typography variant="subtitle2" sx={{ color: '#fcd0a5', fontWeight: 600, mb: 2 }}>
                              Account Information
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                <strong>Account created:</strong> {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric' 
                                })}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                  <strong>Status:</strong>
                                </Typography>
                                {profile.active ? (
                                  <Chip 
                                    label="Active" 
                                    size="small" 
                                    sx={{ 
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      height: 20,
                                      fontSize: '0.75rem'
                                    }} 
                                  />
                                ) : (
                                  <Chip 
                                    label="Inactive" 
                                    size="small" 
                                    color="error"
                                    sx={{ height: 20, fontSize: '0.75rem' }}
                                  />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                  <strong>Email:</strong>
                                </Typography>
                                {profile.emailVerified ? (
                                  <Chip 
                                    label="Verified" 
                                    size="small" 
                                    icon={<CheckCircle sx={{ fontSize: 14 }} />}
                                    sx={{ 
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      height: 20,
                                      fontSize: '0.75rem'
                                    }} 
                                  />
                                ) : (
                                  <Chip 
                                    label="Not verified" 
                                    size="small" 
                                    icon={<ErrorIcon sx={{ fontSize: 14 }} />}
                                    color="error"
                                    sx={{ height: 20, fontSize: '0.75rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>

                        {isEditing && (
                          <Box mt={3} display="flex" gap={2}>
                            <Button
                              type="submit"
                              variant="contained"
                              startIcon={<Save />}
                              disabled={isSubmitting}
                              sx={{ 
                                backgroundColor: '#ff1955',
                                '&:hover': { backgroundColor: '#e01545' }
                              }}
                            >
                              {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                              variant="outlined"
                              startIcon={<Cancel />}
                              onClick={() => {
                                setIsEditing(false);
                                setSelectedFile(null);
                                setPreviewUrl(null);
                              }}
                              sx={{
                                color: '#fff',
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                '&:hover': {
                                  borderColor: '#fff',
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                              }}
                            >
                              Cancel
                            </Button>
                          </Box>
                        )}
                      </Form>
                    )}
                  </Formik>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Booking History Tab */}
        {currentTab === 1 && (
          <Box sx={{ width: '100%' }}>
            <Card sx={{
              backgroundColor: '#1a1f28',
              border: '1px solid rgba(255, 25, 85, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.8)',
              borderRadius: 2
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600 }}>
                    My Booking History
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={fetchBookings}
                    sx={{ backgroundColor: '#ff1955', '&:hover': { backgroundColor: '#e01545' }, fontWeight: 600 }}
                  >
                    Refresh
                  </Button>
                </Box>

                <Box sx={{
                  height: 550, width: '100%',
                  '& .MuiDataGrid-root': { border: 'none', color: '#fff', backgroundColor: 'transparent' },
                  '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.8)' },
                  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' },
                  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: '#fcd0a5' },
                  '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' },
                  '& .MuiTablePagination-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiDataGrid-virtualScroller': { backgroundColor: 'transparent' },
                  '& .MuiIconButton-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
                }}>
                  <DataGrid
                    rows={bookings}
                    columns={bookingColumns}
                    loading={bookingsLoading}
                    getRowId={(row) => row.bookingId}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    disableRowSelectionOnClick
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Notification Settings Tab */}
        {currentTab === 2 && (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Card sx={{ backgroundColor: '#1a1f28', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={notificationSettings.emailNotifications}
                        onChange={handleNotificationChange}
                        name="emailNotifications"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#ff1955',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#ff1955',
                          }
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#fff' }}>
                        Email Notifications
                      </Typography>
                    }
                  />
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: 5 }}>
                    Receive email notifications about your bookings and events
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={notificationSettings.smsNotifications}
                        onChange={handleNotificationChange}
                        name="smsNotifications"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#ff1955',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#ff1955',
                          }
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#fff' }}>
                        SMS Notifications
                      </Typography>
                    }
                  />
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: 5 }}>
                    Receive SMS notifications for important updates
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={notificationSettings.marketingEmails}
                        onChange={handleNotificationChange}
                        name="marketingEmails"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#ff1955',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#ff1955',
                          }
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#fff' }}>
                        Marketing Emails
                      </Typography>
                    }
                  />
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: 5 }}>
                    Receive promotional emails about new events and special offers
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={notificationSettings.loginEmailNotifications}
                        onChange={handleNotificationChange}
                        name="loginEmailNotifications"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#ff1955',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#ff1955',
                          }
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#fff' }}>
                        Login Email Notifications
                      </Typography>
                    }
                  />
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', ml: 5 }}>
                    Receive an email each time you sign in to your account
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                  <Button 
                    variant="contained" 
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    sx={{
                      backgroundColor: '#ff1955',
                      '&:hover': {
                        backgroundColor: '#e01545'
                      }
                    }}
                  >
                    {saving ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Save Preferences'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          </Box>
        )}

        {/* Security Settings Tab */}
        {currentTab === 3 && (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {showSecurityNotice && (
              <Alert 
                severity="info" 
                icon={<InfoIcon />} 
                sx={{ 
                  mb: 3,
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(33, 150, 243, 0.3)'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  <strong>Security Notice:</strong> After changing your password, you'll be automatically logged out for security purposes.
                </Typography>
              </Alert>
            )}

            <Card sx={{ backgroundColor: '#1a1f28', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <LockIcon sx={{ color: '#ff1955', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#fcd0a5' }}>
                    Change Password
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                      Current Password
                    </Typography>
                    <TextField
                      name="currentPassword"
                      type={showPasswords.currentPassword ? 'text' : 'password'}
                      value={securitySettings.currentPassword}
                      onChange={handleSecurityChange}
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: '#242a33',
                          color: '#fff'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => handleClickShowPassword('currentPassword')}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                            >
                              {showPasswords.currentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <Chip label="New Password" size="small" sx={{ fontWeight: 600, backgroundColor: '#ff1955', color: '#fff' }} />
                    </Divider>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                      New Password
                    </Typography>
                    <TextField
                      name="newPassword"
                      type={showPasswords.newPassword ? 'text' : 'password'}
                      value={securitySettings.newPassword}
                      onChange={handleSecurityChange}
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: '#242a33',
                          color: '#fff'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => handleClickShowPassword('newPassword')}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                            >
                              {showPasswords.newPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    
                    {securitySettings.newPassword && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', mb: 1, display: 'block' }}>
                          Password Requirements:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.minLength ? (
                              <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: '#f44336' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.minLength ? '#4caf50' : 'rgba(255, 255, 255, 0.6)' }}>
                              Minimum 8 characters
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.hasUppercase ? (
                              <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: '#f44336' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.hasUppercase ? '#4caf50' : 'rgba(255, 255, 255, 0.6)' }}>
                              At least 1 uppercase letter
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.hasNumber ? (
                              <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: '#f44336' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.hasNumber ? '#4caf50' : 'rgba(255, 255, 255, 0.6)' }}>
                              At least 1 number
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {passwordValidation.hasSymbol ? (
                              <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: 16, color: '#f44336' }} />
                            )}
                            <Typography variant="caption" sx={{ color: passwordValidation.hasSymbol ? '#4caf50' : 'rgba(255, 255, 255, 0.6)' }}>
                              At least 1 special character
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                      Confirm Password
                    </Typography>
                    <TextField
                      name="confirmPassword"
                      type={showPasswords.confirmPassword ? 'text' : 'password'}
                      value={securitySettings.confirmPassword}
                      onChange={handleSecurityChange}
                      fullWidth
                      size="small"
                      error={securitySettings.confirmPassword.length > 0 && !passwordValidation.passwordsMatch}
                      helperText={
                        securitySettings.confirmPassword.length > 0 && !passwordValidation.passwordsMatch
                          ? 'Passwords do not match'
                          : ''
                      }
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: '#242a33',
                          color: '#fff'
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#f44336'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => handleClickShowPassword('confirmPassword')}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                            >
                              {showPasswords.confirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    
                    {securitySettings.confirmPassword && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {passwordValidation.passwordsMatch ? (
                            <>
                              <CheckCircle sx={{ fontSize: 20, color: '#4caf50' }} />
                              <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                                Passwords match!
                              </Typography>
                            </>
                          ) : (
                            <>
                              <CancelIcon sx={{ fontSize: 20, color: '#f44336' }} />
                              <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
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
                      startIcon={saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <LockIcon />}
                      onClick={handleSaveSecurity}
                      disabled={saving}
                      fullWidth
                      sx={{
                        backgroundColor: '#ff1955',
                        color: '#fff',
                        py: 1.5,
                        fontWeight: 700,
                        '&:hover': {
                          backgroundColor: '#e01545'
                        }
                      }}
                    >
                      {saving ? 'Updating Password...' : 'Update Password'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Email Change Section */}
            <Card sx={{ mt: 3, backgroundColor: '#1a1f28', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <EmailIcon sx={{ color: '#ff1955', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#fcd0a5' }}>
                    Change Email Address
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#fff', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
                  <Typography variant="body2">
                    <strong>Important:</strong> After changing your email, you'll be logged out and need to sign in with your new email address.
                  </Typography>
                </Alert>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
                      Current Email: <Box component="strong" sx={{ color: '#fcd0a5' }}>{profile?.email}</Box>
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                      New Email Address
                    </Typography>
                    <TextField
                      name="newEmail"
                      type="email"
                      value={emailChangeSettings.newEmail}
                      onChange={handleEmailChangeChange}
                      fullWidth
                      size="small"
                      error={emailChangeSettings.newEmail.length > 0 && !emailValidation.isValidEmail}
                      helperText={
                        emailChangeSettings.newEmail.length > 0 && !emailValidation.isValidEmail
                          ? 'Please enter a valid email address'
                          : ''
                      }
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: '#242a33',
                          color: '#fff'
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#f44336'
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                      Confirm New Email
                    </Typography>
                    <TextField
                      name="confirmEmail"
                      type="email"
                      value={emailChangeSettings.confirmEmail}
                      onChange={handleEmailChangeChange}
                      fullWidth
                      size="small"
                      error={emailChangeSettings.confirmEmail.length > 0 && !emailValidation.emailsMatch}
                      helperText={
                        emailChangeSettings.confirmEmail.length > 0 && !emailValidation.emailsMatch
                          ? 'Emails do not match'
                          : ''
                      }
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: '#242a33',
                          color: '#fff'
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#f44336'
                        }
                      }}
                    />
                    
                    {emailChangeSettings.confirmEmail && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {emailValidation.emailsMatch ? (
                            <>
                              <CheckCircle sx={{ fontSize: 20, color: '#4caf50' }} />
                              <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                                Emails match!
                              </Typography>
                            </>
                          ) : (
                            <>
                              <CancelIcon sx={{ fontSize: 20, color: '#f44336' }} />
                              <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
                                Emails don't match
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <Chip label="Verify Your Identity" size="small" sx={{ fontWeight: 600, backgroundColor: '#ff1955', color: '#fff' }} />
                    </Divider>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                      Current Password (for verification)
                    </Typography>
                    <TextField
                      name="passwordForEmail"
                      type={showPasswords.passwordForEmail ? 'text' : 'password'}
                      value={emailChangeSettings.passwordForEmail}
                      onChange={handleEmailChangeChange}
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: '#242a33',
                          color: '#fff'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => handleClickShowPassword('passwordForEmail')}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                            >
                              {showPasswords.passwordForEmail ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Button 
                      variant="contained" 
                      startIcon={saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <EmailIcon />}
                      onClick={handleSaveEmailChange}
                      disabled={saving}
                      fullWidth
                      sx={{
                        backgroundColor: '#1976d2',
                        color: '#fff',
                        py: 1.5,
                        fontWeight: 700,
                        '&:hover': {
                          backgroundColor: '#1565c0'
                        }
                      }}
                    >
                      {saving ? 'Updating Email...' : 'Update Email Address'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Additional Security Features */}
            <Card sx={{ mt: 3, backgroundColor: '#1a1f28', border: '1px solid rgba(255, 255, 255, 0.1)', opacity: 0.7 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <SecurityIcon sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>
                    Additional Security Features
                  </Typography>
                  <Chip label="Coming Soon" size="small" sx={{ ml: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff' }} />
                </Box>

                <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
                        <LockIcon sx={{ fontSize: 18 }} />
                        Two-Factor Authentication
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Add an extra layer of security to your account
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
                        <HistoryIcon sx={{ fontSize: 18 }} />
                        Login History
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        View your recent login activity and devices
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* System Settings Tab */}
        {currentTab === 4 && (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Card sx={{ backgroundColor: '#1a1f28', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
                    Default Currency
                  </Typography>
                  <TextField
                    select
                    name="defaultCurrency"
                    value={systemSettings.defaultCurrency}
                    onChange={handleSystemChange}
                    fullWidth
                    size="small"
                    SelectProps={{
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            bgcolor: '#242a33',
                            color: '#fff',
                            '& .MuiMenuItem-root': {
                              fontFamily: 'Raleway, sans-serif',
                              '&:hover': {
                                bgcolor: 'rgba(255, 25, 85, 0.12)',
                              },
                              '&.Mui-selected': {
                                bgcolor: '#ff1955',
                                color: '#fff',
                                '&:hover': {
                                  bgcolor: '#e01545',
                                }
                              }
                            }
                          }
                        }
                      }
                    }}
                    sx={{
                      '& .MuiInputBase-root': {
                        backgroundColor: '#242a33',
                        color: '#fff'
                      }
                    }}
                  >
                    <MenuItem value="USD">USD - US Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                    <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
                    <MenuItem value="LKR">LKR - Sri Lankan Rupee</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                  <Button 
                    variant="contained" 
                    onClick={handleSaveSystem}
                    disabled={saving}
                    sx={{
                      backgroundColor: '#ff1955',
                      '&:hover': {
                        backgroundColor: '#e01545'
                      }
                    }}
                  >
                    {saving ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Save Settings'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          </Box>
        )}
      </Container>

      {/* Receipt Dialog */}
      <Dialog
        open={!!receiptBooking}
        onClose={() => setReceiptBooking(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1f28', color: '#fff', borderRadius: 3,
            border: '1px solid rgba(255,25,85,0.3)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon sx={{ color: '#ff1955' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>Booking Receipt</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handlePrintReceipt} size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
              <PrintIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={() => setReceiptBooking(null)} size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {receiptBooking && (
            <Box ref={receiptRef}>
              <Box sx={{
                background: 'linear-gradient(135deg, #ff1955 0%, #c8002f 100%)',
                borderRadius: 2, p: 2.5, mb: 3, textAlign: 'center'
              }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.4rem', color: '#fff', letterSpacing: 1 }}>
                  Ticketer.lk
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                  Official Booking Confirmation
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Booking Reference
                  </Typography>
                  <Typography sx={{ color: '#fcd0a5', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'monospace' }}>
                    {receiptBooking.bookingReference || receiptBooking.bookingId?.slice(0, 8).toUpperCase()}
                  </Typography>
                </Box>
                {renderStatusChip(receiptBooking.status)}
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />

              <Typography sx={{ color: '#ff1955', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                Event Details
              </Typography>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, p: 2, mb: 3 }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', mb: 0.5 }}>
                  {receiptBooking.eventName || 'N/A'}
                </Typography>
                {receiptBooking.bookingTime && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    Date: {new Date(receiptBooking.bookingTime).toLocaleDateString()}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Tickets ({receiptBooking.ticketCount || 1})</Typography>
                <Typography sx={{ color: '#fff', fontWeight: 600 }}>{formatReceiptPrice(receiptBooking.totalAmount ?? 0, receiptBooking.currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, mt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Total Amount</Typography>
                <Typography sx={{ color: '#ff1955', fontWeight: 800, fontSize: '1.2rem' }}>{formatReceiptPrice(receiptBooking.totalAmount ?? 0, receiptBooking.currency)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfile;
