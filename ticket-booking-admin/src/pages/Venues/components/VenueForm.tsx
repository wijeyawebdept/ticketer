import React from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { VenueService } from '../../../services';
import { Venue, VenueLayoutType } from '../../../types';

interface VenueFormProps {
  venue?: Venue | null;
  onClose?: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

interface FormValues {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  capacity: number;
  layoutType: string;
  customLayoutType: string;
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
    .required('State is required')
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State must be less than 100 characters'),
  zipCode: Yup.string()
    .required('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789'),
  capacity: Yup.number()
    .required('Capacity is required')
    .min(1, 'Capacity must be at least 1')
    .max(1000000, 'Capacity must be less than 1,000,000'),
  layoutType: Yup.string()
    .required('Layout type is required')
    .oneOf(Object.values(VenueLayoutType), 'Please select a valid layout type'),
  customLayoutType: Yup.string()
    .when('layoutType', {
      is: VenueLayoutType.CUSTOM,
      then: () => Yup.string()
        .required('Custom layout type is required when selecting Custom')
        .min(2, 'Custom layout type must be at least 2 characters')
        .max(50, 'Custom layout type must be less than 50 characters'),
      otherwise: () => Yup.string().notRequired()
    })
});

const VenueForm: React.FC<VenueFormProps> = ({ venue, onClose, onSuccess, isAdmin = true }) => {
  const initialValues: FormValues = {
    name: venue?.name || '',
    description: venue?.description || '',
    address: venue?.address || '',
    city: venue?.city || '',
    state: venue?.state || '',
    zipCode: venue?.zipCode || '',
    capacity: venue?.capacity || 0,
    layoutType: venue?.layoutType || VenueLayoutType.THEATER, // Default to THEATER instead of empty string
    customLayoutType: ''
  };

  console.log('VenueForm - Editing venue:', venue);
  console.log('VenueForm - Initial layoutType:', initialValues.layoutType);

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
          // Prepare the final layout type value
          const finalLayoutType = values.layoutType === VenueLayoutType.CUSTOM 
            ? (values.customLayoutType as VenueLayoutType)
            : values.layoutType;

          const venueData = {
            name: values.name,
            description: values.description,
            address: values.address,
            city: values.city,
            state: values.state,
            zipCode: values.zipCode,
            capacity: values.capacity,
            layoutType: finalLayoutType as VenueLayoutType
          };

          if (venue?.id) {
            // Update existing venue
            await VenueService.updateVenue(venue.id, venueData, isAdmin);
          } else {
            // Create new venue
            await VenueService.createVenue(venueData, isAdmin);
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
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Venue Information</Typography>
          <Divider sx={{ mb: 3 }} />

          {venue?.id && (
            <Alert severity="info" sx={{ mb: 2 }}>
              After saving, you can configure seating arrangements for this venue in the separate seating management page.
            </Alert>
          )}

          <Grid container spacing={2}>
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
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                multiline
                rows={3}
                value={values.description}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.description && Boolean(errors.description)}
                helperText={touched.description && errors.description ? errors.description as string : undefined}
                placeholder="Describe the venue (e.g., features, amenities, atmosphere, etc.)"
                required
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
                required
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
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={values.state}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.state && Boolean(errors.state)}
                helperText={touched.state && errors.state ? errors.state as string : undefined}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ZIP Code"
                name="zipCode"
                value={values.zipCode}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.zipCode && Boolean(errors.zipCode)}
                helperText={touched.zipCode && errors.zipCode ? errors.zipCode as string : undefined}
                required
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
                helperText={touched.capacity && errors.capacity ? errors.capacity as string : undefined}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl 
                fullWidth 
                error={touched.layoutType && Boolean(errors.layoutType)}
                required
              >
                <InputLabel id="layoutType-label">Layout Type</InputLabel>
                <Select
                  labelId="layoutType-label"
                  id="layoutType"
                  name="layoutType"
                  value={values.layoutType}
                  label="Layout Type"
                  onChange={(event) => {
                    console.log('Layout Type changed to:', event.target.value);
                    setFieldValue('layoutType', event.target.value);
                  }}
                  onBlur={handleBlur}
                  displayEmpty
                >
                  <MenuItem value={VenueLayoutType.THEATER}>Theater</MenuItem>
                  <MenuItem value={VenueLayoutType.GENERAL_ADMISSION}>General Admission</MenuItem>
                  <MenuItem value={VenueLayoutType.STADIUM}>Stadium</MenuItem>
                  <MenuItem value={VenueLayoutType.CUSTOM}>Custom</MenuItem>
                </Select>
                {touched.layoutType && errors.layoutType && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                    {errors.layoutType as string}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {values.layoutType === VenueLayoutType.CUSTOM && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Custom Layout Type"
                  name="customLayoutType"
                  value={values.customLayoutType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.customLayoutType && Boolean(errors.customLayoutType)}
                  helperText={touched.customLayoutType && errors.customLayoutType ? errors.customLayoutType as string : undefined}
                  placeholder="Enter your custom layout type"
                  required
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button
                  onClick={onClose}
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="contained"
                  color="primary"
                >
                  {getButtonText(isSubmitting, !!venue?.id)}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
    </Formik>
  );
};

export default VenueForm;