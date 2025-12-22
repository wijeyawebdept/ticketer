import React from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { VenueService } from '../../../services';
import { Venue } from '../../../types';

interface VenueFormProps {
  venue?: Venue | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface FormValues {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  capacity: number | '';
}

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Venue name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  address: Yup.string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters'),
  city: Yup.string()
    .required('City is required')
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  state: Yup.string()
    .required('State/Province is required')
    .min(2, 'State/Province must be at least 2 characters')
    .max(100, 'State/Province must be less than 100 characters'),
  postalCode: Yup.string()
    .required('Postal code is required')
    .min(3, 'Postal code must be at least 3 characters')
    .max(10, 'Postal code must be less than 10 characters'),
  capacity: Yup.number()
    .required('Capacity is required')
    .min(1, 'Capacity must be at least 1')
    .max(1000000, 'Capacity must be less than 1,000,000')
    .typeError('Capacity must be a valid number')
});

const VenueForm: React.FC<VenueFormProps> = ({ venue, onClose, onSuccess }) => {
  const initialValues: FormValues = {
    name: venue?.name || '',
    description: venue?.description || '',
    address: venue?.address || '',
    city: venue?.city || '',
    state: venue?.state || '',
    postalCode: venue?.zipCode || '',
    capacity: venue?.capacity || ''
  };

  console.log('VenueForm - Editing venue:', venue);

  const getButtonText = (isSubmitting: boolean, isEditing: boolean): string => {
    if (isSubmitting) return 'Saving...';
    return isEditing ? 'Update Venue' : 'Create Venue';
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values: FormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<FormValues>) => {
        try {
          const venueData = {
            name: values.name,
            description: values.description,
            address: values.address,
            city: values.city,
            state: values.state,
            zipCode: values.postalCode,
            capacity: Number(values.capacity)
          };

          if (venue?.id) {
            // Update existing venue
            await VenueService.updateVenue(venue.id, venueData);
          } else {
            // Create new venue
            await VenueService.createVenue(venueData);
          }

          resetForm();
          onSuccess?.();
          onClose?.();
        } catch (error: any) {
          console.error('Error saving venue:', error);
          if (error.response?.data?.errors) {
            setErrors(error.response.data.errors);
          } else {
            setErrors({ name: 'Failed to save venue. Please try again.' });
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => {
        const isFormValid = Object.keys(errors).length === 0 && 
          values.name && values.description && values.address && values.city && 
          values.state && values.postalCode && values.capacity;
        const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues);

        return (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          {/* Admin Context Banner */}
          <Alert 
            severity="info" 
            icon={<LockIcon />} 
            sx={{ 
              mb: 3,
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              '& .MuiAlert-icon': {
                color: '#1976d2'
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              <strong>Admin Only:</strong> Creating and managing venues is restricted to administrators.
            </Typography>
          </Alert>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Venue Information</Typography>
            {venue?.id && <Chip label="Editing" size="small" color="primary" />}
          </Box>
          <Divider sx={{ mb: 3 }} />

          {venue?.id && (
            <Alert severity="info" sx={{ mb: 3 }}>
              After saving, you can configure seating arrangements for this venue in the separate seating management page.
            </Alert>
          )}

          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Venue Name"
                name="name"
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.name && Boolean(errors.name)}
                helperText={touched.name && errors.name ? errors.name as string : undefined}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error': {
                      '& fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                multiline
                rows={4}
                value={values.description}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.description && Boolean(errors.description)}
                helperText={
                  touched.description && errors.description 
                    ? errors.description as string 
                    : `${values.description.length}/500 characters`
                }
                placeholder="Brief description of the venue, facilities, seating type, amenities, parking availability, accessibility features, etc."
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error': {
                      '& fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={values.address}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.address && Boolean(errors.address)}
                helperText={touched.address && errors.address ? errors.address as string : undefined}
                placeholder="Street address, building number, etc."
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error': {
                      '& fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={values.city}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.city && Boolean(errors.city)}
                helperText={touched.city && errors.city ? errors.city as string : undefined}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error': {
                      '& fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State / Province"
                name="state"
                value={values.state}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.state && Boolean(errors.state)}
                helperText={touched.state && errors.state ? errors.state as string : undefined}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error': {
                      '& fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Postal Code"
                name="postalCode"
                value={values.postalCode}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.postalCode && Boolean(errors.postalCode)}
                helperText={touched.postalCode && errors.postalCode ? errors.postalCode as string : 'Enter postal/ZIP code'}
                placeholder="e.g., 12345 or A1B 2C3"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error': {
                      '& fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Capacity"
                name="capacity"
                type="number"
                value={values.capacity}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.capacity && Boolean(errors.capacity)}
                helperText={touched.capacity && errors.capacity ? errors.capacity as string : 'Maximum number of attendees'}
                placeholder="e.g., 500"
                required
                inputProps={{ min: 1 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-error': {
                      '& fieldset': {
                        borderColor: 'error.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  onClick={onClose}
                  disabled={isSubmitting}
                  variant="outlined"
                  sx={{
                    minWidth: 100,
                    fontWeight: 600
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isFormValid || !hasChanges}
                  variant="contained"
                  color="primary"
                  startIcon={isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null}
                  sx={{
                    minWidth: 150,
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                      color: '#666'
                    }
                  }}
                >
                  {getButtonText(isSubmitting, !!venue?.id)}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
        );
      }}
    </Formik>
  );
};

export default VenueForm;