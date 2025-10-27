import React, { useState } from 'react';
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
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import RoleManagement from './RoleManagement';
import { UserRole } from '../../types';

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

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ROLE_ADMIN ||
                  user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN;

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

    const [systemSettings, setSystemSettings] = useState({
      defaultCurrency: 'LKR',
      defaultLanguage: 'en',
      enableMaintenance: false,
      logLevel: 'INFO',
      themeMode: 'light'
    });

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
    setSecuritySettings({
      ...securitySettings,
      [e.target.name]: e.target.value
    });
  };

  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSystemSettings({
      ...systemSettings,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Account settings updated successfully');
    } catch (err: unknown) {
      console.error('Error updating account settings:', err);
      setError('Failed to update account settings');
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
      setSuccess('Notification preferences updated successfully');
    } catch (err: unknown) {
      console.error('Error updating notification preferences:', err);
      setError('Failed to update notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      setError('New passwords do not match');
      setSaving(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Password updated successfully');
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: unknown) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('System settings updated successfully');
    } catch (err: unknown) {
      console.error('Error updating system settings:', err);
      setError('Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
        Settings
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
            <Tab label="Account" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label="Notifications" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab label="Security" id="settings-tab-2" aria-controls="settings-tabpanel-2" />
            <Tab label="System" id="settings-tab-3" aria-controls="settings-tabpanel-3" />
            {isAdmin && <Tab label="Roles" id="settings-tab-4" aria-controls="settings-tabpanel-4" />}
          </Tabs>
        </Box>

        {/* Account Settings */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {success && <Grid item xs={12}><Alert severity="success">{success}</Alert></Grid>}
            {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
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
                label="Last Name"
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
                label="Email"
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
                label="Phone Number"
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
                {saving ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notification Settings */}
        <TabPanel value={activeTab} index={1}>
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
                label="Email Notifications"
              />
              <Typography variant="body2" color="textSecondary">
                Receive notifications about bookings and transactions via email
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
                label="SMS Notifications"
              />
              <Typography variant="body2" color="textSecondary">
                Receive notifications about bookings and transactions via SMS
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
                label="Marketing Emails"
              />
              <Typography variant="body2" color="textSecondary">
                Receive marketing emails about upcoming events and promotions
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
                {saving ? <CircularProgress size={24} /> : 'Save Preferences'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {success && <Grid item xs={12}><Alert severity="success">{success}</Alert></Grid>}
            {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
                Change Password
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                value={securitySettings.currentPassword}
                onChange={handleSecurityChange}
                fullWidth
                variant="outlined"
                margin="normal"
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="New Password"
                name="newPassword"
                type="password"
                value={securitySettings.newPassword}
                onChange={handleSecurityChange}
                fullWidth
                variant="outlined"
                margin="normal"
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={securitySettings.confirmPassword}
                onChange={handleSecurityChange}
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
                onClick={handleSaveSecurity}
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
                {saving ? <CircularProgress size={24} /> : 'Update Password'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* System Settings */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            {success && <Grid item xs={12}><Alert severity="success">{success}</Alert></Grid>}
            {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Default Currency"
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
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="LKR">LKR (Rs)</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Default Language"
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
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Log Level"
                name="logLevel"
                value={systemSettings.logLevel}
                onChange={handleSystemChange}
                fullWidth
                variant="outlined"
                margin="normal"
                SelectProps={{
                  native: true,
                  inputProps: {
                    'aria-label': 'Log Level',
                  },
                }}
                sx={{ borderRadius: 2 }}
              >
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
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
                label="Maintenance Mode"
              />
              <Typography variant="body2" color="textSecondary">
                Enable maintenance mode to temporarily disable the booking system
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={systemSettings.themeMode === 'dark'}
                    onChange={handleSystemChange}
                    name="themeMode"
                    color="primary"
                  />
                }
                label="Dark Mode"
              />
              <Typography variant="body2" color="textSecondary">
                Enable dark mode for the application interface
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
                {saving ? <CircularProgress size={24} /> : 'Save System Settings'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Role Management */}
        {isAdmin && (
          <TabPanel value={activeTab} index={4}>
            <RoleManagement />
          </TabPanel>
        )}
      </Paper>
    </Box>
  );
};

export default Settings;
