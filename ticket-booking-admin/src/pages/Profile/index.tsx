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
  Chip
} from '@mui/material';
import { PhotoCamera, Save, Edit, Cancel } from '@mui/icons-material';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { ProfileDTO, ProfileUpdateDTO } from '../../types';
import { profileService } from '../../services/profile.service';
import './Profile.css';

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

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true);
      const profileData = await profileService.getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      showSnackbar('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (values: ProfileFormValues) => {
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load profile data</Alert>
      </Box>
    );
  }

  const initialValues: ProfileFormValues = {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    email: profile.email || '',
    phoneNumber: profile.phoneNumber || '',
    dateOfBirth: formatDate(profile.dateOfBirth) || ''
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
        My Profile
      </Typography>

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
                  className="profile-picture-upload"
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
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
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

export default Profile;