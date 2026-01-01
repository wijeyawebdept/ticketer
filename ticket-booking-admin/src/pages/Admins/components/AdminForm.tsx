import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Typography,
  Divider,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { ToastService } from '../../../services/toast.service';

interface Admin {
  adminId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

interface AdminFormProps {
  admin?: Admin;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface AdminFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phoneNumber: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

const PHONE_REGEX = /^\d{10}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const AdminForm: React.FC<AdminFormProps> = ({ admin, onClose, onSuccess }) => {
  const { isSuperAdmin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Formik
      initialValues={{
        firstName: admin?.firstName || '',
        lastName: admin?.lastName || '',
        email: admin?.email || '',
        password: '',
        phoneNumber: admin?.phoneNumber || '',
        role: admin?.role || 'ADMIN',
      }}
      validationSchema={Yup.object({
        firstName: Yup.string()
          .required('First name is required')
          .min(2, 'First name must be at least 2 characters')
          .max(50, 'First name must be less than 50 characters'),
        lastName: Yup.string()
          .required('Last name is required')
          .min(2, 'Last name must be at least 2 characters')
          .max(50, 'Last name must be less than 50 characters'),
        email: Yup.string()
          .required('Email is required')
          .email('Invalid email address')
          .max(100, 'Email must not exceed 100 characters'),
        password: admin 
          ? Yup.string()
            .test('password-validation', 'Invalid password format', value => {
              if (!value || value === '') return true;
              return value.length >= 8 && PASSWORD_REGEX.test(value);
            })
          : Yup.string()
            .required('Password is required')
            .min(8, 'Password must be at least 8 characters')
            .matches(
              PASSWORD_REGEX,
              'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'
            ),
        phoneNumber: Yup.string()
          .matches(PHONE_REGEX, 'Phone number must be 10 digits'),
        role: Yup.string()
          .required('Role is required'),
      })}
      onSubmit={async (values: AdminFormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<AdminFormValues>) => {
        try {
          const adminData = { ...values };
          if (admin?.adminId && !adminData.password) {
            delete adminData.password;
          }
          
          if (admin?.adminId) {
            await api.put(`/api/admin/admins/${admin.adminId}`, adminData);
            ToastService.success('Admin updated successfully!');
          } else {
            if (!adminData.password) {
              setErrors({ password: 'Password is required' });
              return;
            }
            await api.post('/api/admin/admins', adminData);
            ToastService.success('Admin created successfully!');
          }
          
          resetForm();
          if (onSuccess) onSuccess();
        } catch (error: any) {
          console.error(`Error ${admin ? 'updating' : 'creating'} admin:`, error);
          
          // Check if it's a 403 permission error
          if (error?.response?.status === 403) {
            ToastService.warning('You don\'t have permission to complete this action. Only Super Admins can create new admins.');
            if (onClose) onClose();
            return;
          }
          
          if (error?.response?.data?.message) {
            setErrors({ email: error.response.data.message });
            ToastService.error(error.response.data.message);
          } else {
            const errorMsg = `Failed to ${admin ? 'update' : 'create'} admin. Please try again.`;
            setErrors({ email: errorMsg });
            ToastService.error(errorMsg);
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#d32f2f' }}>Admin Information</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="firstName"
                name="firstName"
                label="First Name"
                value={values.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.firstName && Boolean(errors.firstName)}
                helperText={touched.firstName && errors.firstName ? String(errors.firstName) : ''}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="lastName"
                name="lastName"
                label="Last Name"
                value={values.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.lastName && Boolean(errors.lastName)}
                helperText={touched.lastName && errors.lastName ? String(errors.lastName) : ''}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email Address"
                type="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email && Boolean(errors.email)}
                helperText={touched.email && errors.email ? String(errors.email) : ''}
                disabled={!!admin}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="password"
                name="password"
                label={admin ? "New Password (leave blank to keep current)" : "Password"}
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password ? String(errors.password) : ''}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="phoneNumber"
                name="phoneNumber"
                label="Phone Number"
                value={values.phoneNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.phoneNumber && Boolean(errors.phoneNumber)}
                helperText={touched.phoneNumber && errors.phoneNumber ? String(errors.phoneNumber) : ''}
                placeholder="1234567890"
              />
            </Grid>

            {isSuperAdmin() && (
              <Grid item xs={12}>
                <FormControl fullWidth error={touched.role && Boolean(errors.role)}>
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select
                    labelId="role-label"
                    id="role"
                    name="role"
                    value={values.role}
                    onChange={(e) => {
                      handleChange({
                        target: {
                          name: 'role',
                          value: e.target.value
                        }
                      } as any);
                    }}
                    onBlur={handleBlur}
                    label="Role"
                  >
                    <MenuItem value="ADMIN">Admin</MenuItem>
                    <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                  </Select>
                  {touched.role && errors.role && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {String(errors.role)}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button 
              onClick={onClose}
              variant="outlined"
              color="inherit"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (admin ? 'Update Admin' : 'Create Admin')}
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export default AdminForm;
