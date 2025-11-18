import React from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Grid,
  Typography,
  Divider
} from '@mui/material';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import api from '../../../services/api';

interface Organizer {
  organizerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
}

interface OrganizerFormProps {
  organizer?: Organizer;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface OrganizerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phoneNumber: string;
  organizationName: string;
}

const PHONE_REGEX = /^\d{10}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const OrganizerForm: React.FC<OrganizerFormProps> = ({ organizer, onClose, onSuccess }) => {
  return (
    <Formik
      initialValues={{
        firstName: organizer?.firstName || '',
        lastName: organizer?.lastName || '',
        email: organizer?.email || '',
        password: '',
        phoneNumber: organizer?.phoneNumber || '',
        organizationName: organizer?.organizationName || '',
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
        password: organizer 
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
        organizationName: Yup.string()
          .required('Organization name is required')
          .min(2, 'Organization name must be at least 2 characters')
          .max(255, 'Organization name must be less than 255 characters'),
      })}
      onSubmit={async (values: OrganizerFormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<OrganizerFormValues>) => {
        try {
          const organizerData = { ...values };
          if (organizer?.organizerId && !organizerData.password) {
            delete organizerData.password;
          }
          
          if (organizer?.organizerId) {
            await api.put(`/api/admin/organizers/${organizer.organizerId}`, organizerData);
          } else {
            if (!organizerData.password) {
              setErrors({ password: 'Password is required' });
              return;
            }
            await api.post('/api/admin/organizers', organizerData);
          }
          
          resetForm();
          if (onSuccess) onSuccess();
        } catch (error: any) {
          console.error(`Error ${organizer ? 'updating' : 'creating'} organizer:`, error);
          if (error?.response?.data?.message) {
            setErrors({ email: error.response.data.message });
          } else {
            setErrors({ email: `Failed to ${organizer ? 'update' : 'create'} organizer. Please try again.` });
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#ed6c02' }}>Organizer Information</Typography>
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
                disabled={!!organizer}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="password"
                name="password"
                label={organizer ? "New Password (leave blank to keep current)" : "Password"}
                type="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password ? String(errors.password) : ''}
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

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="organizationName"
                name="organizationName"
                label="Organization Name"
                value={values.organizationName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.organizationName && Boolean(errors.organizationName)}
                helperText={touched.organizationName && errors.organizationName ? String(errors.organizationName) : ''}
              />
            </Grid>
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
              color="warning"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (organizer ? 'Update Organizer' : 'Create Organizer')}
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export default OrganizerForm;
