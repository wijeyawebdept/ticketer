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
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ROLE_ADMIN ||
                  user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN;

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

  const [systemSettings, setSystemSettings] = useState(loadSystemSettings());

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

    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      setError(t('settings.security.passwordMismatch'));
      setSaving(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(t('settings.security.successMessage'));
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: unknown) {
      console.error('Error updating password:', err);
      setError(t('settings.security.errorMessage'));
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
            <Tab label={t('settings.tabs.account')} id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label={t('settings.tabs.notifications')} id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab label={t('settings.tabs.security')} id="settings-tab-2" aria-controls="settings-tabpanel-2" />
            <Tab label={t('settings.tabs.system')} id="settings-tab-3" aria-controls="settings-tabpanel-3" />
            {isAdmin && <Tab label={t('settings.tabs.roles')} id="settings-tab-4" aria-controls="settings-tabpanel-4" />}
          </Tabs>
        </Box>

        {/* Account Settings */}
        <TabPanel value={activeTab} index={0}>
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
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {success && <Grid item xs={12}><Alert severity="success">{success}</Alert></Grid>}
            {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
                {t('settings.security.changePassword')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('settings.security.currentPassword')}
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
                label={t('settings.security.newPassword')}
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
                label={t('settings.security.confirmPassword')}
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
                {saving ? <CircularProgress size={24} /> : t('settings.security.updatePassword')}
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
