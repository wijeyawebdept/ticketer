import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  Typography,
  Divider,
  CircularProgress
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { EventService, VenueService } from '../../../services';
import { Event, EventStatus, Venue } from '../../../types';

// Image preview
const ImagePreview = ({ src, alt }: { src: string, alt: string }) => {
  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <img 
        src={src} 
        alt={alt} 
        style={{ 
          maxWidth: '100%', 
          maxHeight: '200px', 
          objectFit: 'contain',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '4px'
        }} 
      />
    </Box>
  );
};

interface EventFormProps {
  event?: Event;
  onClose?: () => void;
  onSuccess?: () => void;
}

// Form values interface used for the event form
interface FormValues {
  name: string;
  description: string;
  eventDate: Date;
  venueId: string;
  category: string;
  basePrice: number;
  ticketsAvailable: number;
  status: EventStatus;
  imageFile?: File | null;
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
    setErrors({ name: `Failed to ${action} event. Please try again.` });
  }
};

const EventForm: React.FC<EventFormProps> = ({ event, onClose, onSuccess }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);
  
  // Function to get button text based on form state
  const getButtonText = (isUploading: boolean, isSubmitting: boolean): string => {
    if (isUploading) return 'Uploading...';
    if (isSubmitting) return 'Saving...';
    return 'Save';
  };
  
  // Load venues when component mounts
  useEffect(() => {
    const fetchVenues = async () => {
      setVenueLoading(true);
      try {
        const venueData = await VenueService.getAllVenues();
        setVenues(venueData);
      } catch (error) {
        console.error('Error fetching venues:', error);
      } finally {
        setVenueLoading(false);
      }
    };
    
    fetchVenues();
  }, []);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setFieldValue('imageFile', file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string || null);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Formik
      initialValues={{
        name: event?.name || '',
        description: event?.description || '',
        eventDate: event?.eventDate ? new Date(event.eventDate) : new Date(),
        venueId: event?.venue?.venueId || '',
        category: event?.category || '',
        basePrice: event?.basePrice || 0,
        ticketsAvailable: event?.ticketsAvailable || 100,
        status: event?.status || EventStatus.DRAFT,
        imageFile: null
      }}
      validationSchema={Yup.object({
        name: Yup.string()
          .required('Event name is required')
          .min(3, 'Event name must be at least 3 characters')
          .max(100, 'Event name must be less than 100 characters'),
        description: Yup.string()
          .required('Event description is required')
          .min(10, 'Description must be at least 10 characters'),
        eventDate: Yup.date()
          .required('Event date is required')
          .min(new Date(), 'Event date cannot be in the past'),
        venueId: Yup.string()
          .required('Venue is required'),
        category: Yup.string()
          .required('Category is required'),
        basePrice: Yup.number()
          .required('Base price is required')
          .min(0, 'Base price cannot be negative'),
        ticketsAvailable: Yup.number()
          .required('Number of tickets is required')
          .min(1, 'At least 1 ticket must be available')
      })}
      onSubmit={async (values: FormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<FormValues>) => {
        try {
          setUploading(true);
          const eventData = { ...values };
          delete eventData.imageFile;
          
          // Convert Date to ISO string for API
          const eventDataForApi = {
            ...eventData,
            eventDate: eventData.eventDate.toISOString()
          };
          
          let savedEvent;
          
          if (event?.id) {
            // Update existing event
            savedEvent = await EventService.updateEvent(event.id, eventDataForApi);
          } else {
            // Create new event
            savedEvent = await EventService.createEvent(eventDataForApi);
          }
          
          // Upload the image if one is selected
          if (selectedImage && savedEvent.id) {
            const formData = new FormData();
            formData.append('image', selectedImage);
            await EventService.uploadEventImage(savedEvent.id, formData);
          }
          
          resetForm();
          if (onSuccess) onSuccess();
        } catch (error) {
          console.error(`Error ${event ? 'updating' : 'creating'} event:`, error);
          handleApiError(error as ApiError, setErrors, event ? 'update' : 'create');
        } finally {
          setSubmitting(false);
          setUploading(false);
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Event Information</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="name"
                name="name"
                label="Event Name"
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
                id="description"
                name="description"
                label="Description"
                value={values.description}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.description && Boolean(errors.description)}
                helperText={touched.description && errors.description ? errors.description as string : undefined}
                variant="outlined"
                margin="normal"
                multiline
                rows={4}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Event Date & Time"
                  value={values.eventDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFieldValue('eventDate', newValue);
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                      required: true,
                      error: touched.eventDate && Boolean(errors.eventDate),
                      helperText: touched.eventDate && errors.eventDate ? errors.eventDate as string : undefined
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                variant="outlined"
                margin="normal"
                error={touched.venueId && Boolean(errors.venueId)}
                required
              >
                <InputLabel id="venue-label">Venue</InputLabel>
                <Select
                  labelId="venue-label"
                  id="venueId"
                  name="venueId"
                  value={values.venueId}
                  onChange={(e) => {
                    setFieldValue('venueId', e.target.value);
                  }}
                  label="Venue"
                  disabled={venueLoading}
                >
                  {venueLoading ? (
                    <MenuItem value="">
                      <em>Loading venues...</em>
                    </MenuItem>
                  ) : (
                    venues.map((venue) => (
                      <MenuItem key={venue.venueId} value={venue.venueId}>
                        {venue.name} ({venue.address})
                      </MenuItem>
                    ))
                  )}
                </Select>
                {touched.venueId && errors.venueId && (
                  <FormHelperText>{errors.venueId as string}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="category"
                name="category"
                label="Category"
                value={values.category}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.category && Boolean(errors.category)}
                helperText={touched.category && errors.category ? errors.category as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl 
                fullWidth 
                variant="outlined" 
                margin="normal"
                error={touched.status && Boolean(errors.status)}
              >
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={values.status}
                  onChange={(e) => {
                    setFieldValue('status', e.target.value);
                  }}
                  label="Status"
                >
                  <MenuItem value={EventStatus.DRAFT}>Draft</MenuItem>
                  <MenuItem value={EventStatus.PUBLISHED}>Published</MenuItem>
                  <MenuItem value={EventStatus.CANCELLED}>Cancelled</MenuItem>
                  <MenuItem value={EventStatus.COMPLETED}>Completed</MenuItem>
                </Select>
                {touched.status && errors.status && (
                  <FormHelperText>{errors.status as string}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="basePrice"
                name="basePrice"
                label="Base Price"
                type="number"
                value={values.basePrice}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.basePrice && Boolean(errors.basePrice)}
                helperText={touched.basePrice && errors.basePrice ? errors.basePrice as string : undefined}
                variant="outlined"
                margin="normal"
                InputProps={{
                  startAdornment: <Typography variant="body2">$</Typography>,
                }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="ticketsAvailable"
                name="ticketsAvailable"
                label="Tickets Available"
                type="number"
                value={values.ticketsAvailable}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.ticketsAvailable && Boolean(errors.ticketsAvailable)}
                helperText={touched.ticketsAvailable && errors.ticketsAvailable ? errors.ticketsAvailable as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Event Image
              </Typography>
              
              <Button
                variant="outlined"
                component="label"
              >
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleImageChange(e, setFieldValue)}
                />
              </Button>
              
              {imagePreview && <ImagePreview src={imagePreview} alt="Event preview" />}
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              color="secondary"
              onClick={onClose}
              sx={{ mr: 1 }}
              disabled={isSubmitting || uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || uploading}
              startIcon={uploading && <CircularProgress size={20} />}
            >
              {getButtonText(uploading, isSubmitting)}
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export default EventForm;