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
import { VenueService } from '../../../services';
import { Venue } from '../../../types';

interface VenueFormProps {
  venue?: Venue | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

// Form values interface for the venue form
interface FormValues {
  name: string;
  address: string;
  capacity: number;
  seatingArrangement: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string>;
    }
  }
}

// Helper function to handle API errors
const handleApiError = (
  error: ApiError, 
  setErrors: (errors: Record<string, string>) => void,
  action: 'create' | 'update'
) => {
  if (error.response?.data) {
    const backendErrors = error.response.data;
    if (backendErrors.message) {
      setErrors({ name: backendErrors.message });
    }
    if (backendErrors.errors) {
      setErrors(backendErrors.errors as any);
    }
  } else {
    setErrors({ name: `Failed to ${action} venue. Please try again.` });
  }
};

const VenueForm: React.FC<VenueFormProps> = ({ venue, onClose, onSuccess }) => {
  return (
    <Formik
      initialValues={{
        name: venue?.name || '',
        address: venue?.address || '',
        capacity: venue?.capacity || 0,
        seatingArrangement: venue?.seatingArrangement || ''
      }}
      validationSchema={Yup.object({
        name: Yup.string()
          .required('Venue name is required')
          .min(3, 'Venue name must be at least 3 characters')
          .max(100, 'Venue name must be less than 100 characters'),
        address: Yup.string()
          .required('Address is required')
          .min(5, 'Address must be at least 5 characters'),
        capacity: Yup.number()
          .required('Capacity is required')
          .min(1, 'Capacity must be at least 1'),
        seatingArrangement: Yup.string()
          .required('Seating arrangement is required')
      })}
      onSubmit={async (values: FormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<FormValues>) => {
        try {
          if (venue && venue.venueId) {
            // Update existing venue
            await VenueService.updateVenue(venue.venueId, values);
          } else {
            // Create new venue
            await VenueService.createVenue(values);
          }
          
          resetForm();
          if (onSuccess) onSuccess();
        } catch (error) {
          console.error(`Error ${venue ? 'updating' : 'creating'} venue:`, error);
          handleApiError(error as ApiError, setErrors, venue ? 'update' : 'create');
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Venue Information</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="name"
                name="name"
                label="Venue Name"
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.name && Boolean(errors.name)}
                helperText={touched.name && errors.name ? errors.name as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="address"
                name="address"
                label="Address"
                value={values.address}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.address && Boolean(errors.address)}
                helperText={touched.address && errors.address ? errors.address as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="capacity"
                name="capacity"
                label="Capacity"
                type="number"
                value={values.capacity}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.capacity && Boolean(errors.capacity)}
                helperText={touched.capacity && errors.capacity ? errors.capacity as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="seatingArrangement"
                name="seatingArrangement"
                label="Seating Arrangement"
                value={values.seatingArrangement}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.seatingArrangement && Boolean(errors.seatingArrangement)}
                helperText={touched.seatingArrangement && errors.seatingArrangement ? errors.seatingArrangement as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              color="secondary"
              onClick={onClose}
              sx={{ mr: 1 }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export default VenueForm;