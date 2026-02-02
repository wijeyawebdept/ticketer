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
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Lock as LockIcon, People as PeopleIcon } from '@mui/icons-material';
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
  hasSharedAreas: boolean;
  sharedAreaCount: number | '';
  sharedAreaTotalCapacity: number | '';
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
    .typeError('Capacity must be a valid number'),
  hasSharedAreas: Yup.boolean(),
  sharedAreaCount: Yup.number()
    .when('hasSharedAreas', {
      is: true,
      then: (schema) => schema.required('Number of shared areas is required').min(1, 'At least 1 shared area').max(10, 'Maximum 10 shared areas'),
      otherwise: (schema) => schema.notRequired()
    }),
  sharedAreaTotalCapacity: Yup.number()
    .when('hasSharedAreas', {
      is: true,
      then: (schema) => schema.required('Total capacity is required').min(1, 'Capacity must be at least 1').max(10000, 'Maximum 10,000'),
      otherwise: (schema) => schema.notRequired()
    })
});

const VenueForm: React.FC<VenueFormProps> = ({ venue, onClose, onSuccess }) => {
  const initialValues: FormValues = {
    name: venue?.name || '',
    description: venue?.description || '',
    address: venue?.address || '',
    city: venue?.city || '',
    state: venue?.state || '',
    postalCode: venue?.zipCode || '',
    capacity: venue?.capacity || '',
    hasSharedAreas: venue?.hasSharedAreas || false,
    sharedAreaCount: venue?.sharedAreaCount || '',
    sharedAreaTotalCapacity: venue?.sharedAreaTotalCapacity || ''
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
            capacity: Number(values.capacity),
            hasSharedAreas: values.hasSharedAreas,
            sharedAreaCount: values.hasSharedAreas ? Number(values.sharedAreaCount) : 0,
            sharedAreaTotalCapacity: values.hasSharedAreas ? Number(values.sharedAreaTotalCapacity) : 0
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

            {/* Shared/Common Areas Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PeopleIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Shared/Common Areas (Optional)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Standing areas without individual seats (e.g., Balcony, Standing Area). 
                These do NOT affect the seated capacity above.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="hasSharedAreas"
                    checked={values.hasSharedAreas}
                    onChange={(e) => {
                      setFieldValue('hasSharedAreas', e.target.checked);
                      if (!e.target.checked) {
                        setFieldValue('sharedAreaCount', '');
                        setFieldValue('sharedAreaTotalCapacity', '');
                      }
                    }}
                    color="primary"
                  />
                }
                label="This venue has shared/common areas (standing areas)"
              />
            </Grid>

            {values.hasSharedAreas && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Number of Shared Areas"
                    name="sharedAreaCount"
                    type="number"
                    value={values.sharedAreaCount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.sharedAreaCount && Boolean(errors.sharedAreaCount)}
                    helperText={touched.sharedAreaCount && errors.sharedAreaCount ? errors.sharedAreaCount as string : 'e.g., 2 for Balcony and Standing Area'}
                    placeholder="e.g., 2"
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total Standing Capacity"
                    name="sharedAreaTotalCapacity"
                    type="number"
                    value={values.sharedAreaTotalCapacity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.sharedAreaTotalCapacity && Boolean(errors.sharedAreaTotalCapacity)}
                    helperText={touched.sharedAreaTotalCapacity && errors.sharedAreaTotalCapacity ? errors.sharedAreaTotalCapacity as string : 'Total across all shared areas'}
                    placeholder="e.g., 400"
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                {values.sharedAreaCount && values.sharedAreaTotalCapacity && Number(values.sharedAreaCount) > 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info" icon={<PeopleIcon />}>
                      <strong>Capacity per area:</strong> {Math.floor(Number(values.sharedAreaTotalCapacity) / Number(values.sharedAreaCount))} people per shared area
                    </Alert>
                  </Grid>
                )}
              </>
            )}

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