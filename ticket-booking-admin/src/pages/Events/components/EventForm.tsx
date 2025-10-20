import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Divider,
  IconButton,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Event, Venue, EventStatus, TicketCategory } from '../../../types';
import { EventService } from '../../../services';
import { VenueService } from '../../../services';

// Define the form values type
interface FormValues {
  name: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  venueId: string;
  category: string;
  basePrice: number;
  totalCapacity: number;
  status: EventStatus;
  imageFile: File | null;
  ticketCategories: TicketCategory[]; // Added ticket categories
}

interface EventFormProps {
  event?: Event;
  onClose: () => void;
  onSuccess?: () => void;
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
      // Handle general error message
    }
    if (backendErrors.errors) {
      setErrors(backendErrors.errors as any);
    }
  } else {
    // Handle generic error
  }
};

// Image preview component
const ImagePreview: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <Box mt={2} textAlign="center">
    <img 
      src={src} 
      alt={alt} 
      style={{ 
        maxWidth: '100%', 
        maxHeight: '200px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }} 
    />
  </Box>
);

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

  // Helper function to get nested field errors
  const getError = (errors: any, path: string) => {
    return path.split('.').reduce((obj, key) => obj && obj[key], errors);
  };

  // Helper function to get nested field touched status
  const getTouched = (touched: any, path: string) => {
    return path.split('.').reduce((obj, key) => obj && obj[key], touched);
  };

  return (
    <Formik
      initialValues={{
        name: event?.name || '',
        description: event?.description || '',
        startDateTime: event?.startDateTime ? new Date(event.startDateTime) : new Date(),
        endDateTime: event?.endDateTime ? new Date(event.endDateTime) : new Date(new Date().setHours(new Date().getHours() + 2)),
        venueId: event?.venue?.id || '',
        category: '', // Remove category requirement since backend doesn't support it
        basePrice: event?.basePrice || 0,
        totalCapacity: event?.ticketsAvailable || 100,
        status: event?.status || EventStatus.DRAFT,
        imageFile: null,
        ticketCategories: event?.ticketCategories && event.ticketCategories.length > 0 
          ? event.ticketCategories 
          : [{ categoryName: '', price: 0, capacity: 0 }] // Initialize with one empty category
      }}
      validationSchema={Yup.object({
        name: Yup.string()
          .required('Event name is required')
          .min(3, 'Event name must be at least 3 characters')
          .max(100, 'Event name must be less than 100 characters'),
        description: Yup.string()
          .required('Event description is required')
          .min(10, 'Description must be at least 10 characters'),
        startDateTime: Yup.date()
          .required('Start date and time is required')
          .min(new Date(new Date().setDate(new Date().getDate() - 1)), 'Start date and time cannot be in the past'),
        endDateTime: Yup.date()
          .required('End date and time is required')
          .min(Yup.ref('startDateTime'), 'End date and time must be after start date and time'),
        venueId: Yup.string()
          .required('Venue is required'),
        category: Yup.string()
          .optional(), // Made category optional since backend doesn't support it
        basePrice: Yup.number()
          .required('Base price is required')
          .min(0, 'Base price cannot be negative'),
        totalCapacity: Yup.number()
          .required('Total capacity is required')
          .min(1, 'At least 1 ticket must be available'),
        ticketCategories: Yup.array().of(
          Yup.object().shape({
            categoryName: Yup.string()
              .required('Category name is required')
              .min(1, 'Category name is required'),
            price: Yup.number()
              .required('Price is required')
              .min(0, 'Price must be 0 or greater'),
            capacity: Yup.number()
              .required('Capacity is required')
              .min(1, 'Capacity must be at least 1')
          })
        ).required('At least one ticket category is required')
        .min(1, 'At least one ticket category is required')
      })}
      onSubmit={async (values: FormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<FormValues>) => {
        try {
          setUploading(true);
          const eventData: any = { ...values };
          delete eventData.imageFile;
          
          // Convert Date to ISO string for API
          const eventDataForApi = {
            ...eventData,
            startDateTime: eventData.startDateTime.toISOString(),
            endDateTime: eventData.endDateTime.toISOString(),
            ticketCategories: eventData.ticketCategories.map((category: TicketCategory) => ({
              ...category,
              price: Number(category.price) // Ensure price is a number
            }))
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
            formData.append('file', selectedImage);
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
                  label="Start Date & Time"
                  value={values.startDateTime}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFieldValue('startDateTime', newValue);
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                      required: true,
                      error: touched.startDateTime && Boolean(errors.startDateTime),
                      helperText: touched.startDateTime && errors.startDateTime ? errors.startDateTime as string : undefined
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="End Date & Time"
                  value={values.endDateTime}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFieldValue('endDateTime', newValue);
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                      required: true,
                      error: touched.endDateTime && Boolean(errors.endDateTime),
                      helperText: touched.endDateTime && errors.endDateTime ? errors.endDateTime as string : undefined
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
                    const selectedVenueId = e.target.value;
                    setFieldValue('venueId', selectedVenueId);
                    
                    // Auto-populate total capacity from selected venue
                    const selectedVenue = venues.find(v => v.id === selectedVenueId);
                    if (selectedVenue) {
                      setFieldValue('totalCapacity', selectedVenue.capacity);
                    }
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
                      <MenuItem key={venue.id} value={venue.id}>
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
                id="venueAddress"
                name="venueAddress"
                label="Venue Address"
                value={values.venueId ? venues.find(v => v.id === values.venueId)?.address || '' : ''}
                variant="outlined"
                margin="normal"
                disabled
                helperText="Automatically filled from selected venue"
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="venueCapacity"
                name="venueCapacity"
                label="Venue Capacity"
                value={values.venueId ? venues.find(v => v.id === values.venueId)?.capacity || '' : ''}
                variant="outlined"
                margin="normal"
                disabled
                helperText="Automatically filled from selected venue"
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
            
            {/* Category field removed since backend doesn't support event categories */}
            
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
                label="Base Price (LKR)"
                type="number"
                value={values.basePrice}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.basePrice && Boolean(errors.basePrice)}
                helperText={touched.basePrice && errors.basePrice ? errors.basePrice as string : undefined}
                variant="outlined"
                margin="normal"
                InputProps={{
                  startAdornment: <Typography variant="body2">LKR</Typography>,
                }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="totalCapacity"
                name="totalCapacity"
                label="Total Capacity"
                type="number"
                value={values.totalCapacity}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.totalCapacity && Boolean(errors.totalCapacity)}
                helperText={touched.totalCapacity && errors.totalCapacity ? errors.totalCapacity as string : undefined}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            
            {/* Ticket Categories Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Ticket Categories</Typography>
              <Divider sx={{ mb: 3 }} />
              
              {values.ticketCategories.map((category, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">
                        Category {index + 1}
                        {values.ticketCategories.length > 1 && (
                          <IconButton 
                            onClick={() => {
                              const newCategories = [...values.ticketCategories];
                              newCategories.splice(index, 1);
                              setFieldValue('ticketCategories', newCategories);
                            }}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <RemoveIcon />
                          </IconButton>
                        )}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name={`ticketCategories[${index}].categoryName`}
                        label="Category Name"
                        value={category.categoryName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={
                          getTouched(touched, `ticketCategories[${index}].categoryName`) && 
                          Boolean(getError(errors, `ticketCategories[${index}].categoryName`))
                        }
                        helperText={
                          getTouched(touched, `ticketCategories[${index}].categoryName`) && 
                          getError(errors, `ticketCategories[${index}].categoryName`) ? 
                          getError(errors, `ticketCategories[${index}].categoryName`) as string : 
                          undefined
                        }
                        variant="outlined"
                        margin="normal"
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        name={`ticketCategories[${index}].price`}
                        label="Price (LKR)"
                        type="number"
                        value={category.price}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={
                          getTouched(touched, `ticketCategories[${index}].price`) && 
                          Boolean(getError(errors, `ticketCategories[${index}].price`))
                        }
                        helperText={
                          getTouched(touched, `ticketCategories[${index}].price`) && 
                          getError(errors, `ticketCategories[${index}].price`) ? 
                          getError(errors, `ticketCategories[${index}].price`) as string : 
                          undefined
                        }
                        variant="outlined"
                        margin="normal"
                        InputProps={{
                          startAdornment: <Typography variant="body2">LKR</Typography>,
                        }}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        name={`ticketCategories[${index}].capacity`}
                        label="Capacity"
                        type="number"
                        value={category.capacity}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={
                          getTouched(touched, `ticketCategories[${index}].capacity`) && 
                          Boolean(getError(errors, `ticketCategories[${index}].capacity`))
                        }
                        helperText={
                          getTouched(touched, `ticketCategories[${index}].capacity`) && 
                          getError(errors, `ticketCategories[${index}].capacity`) ? 
                          getError(errors, `ticketCategories[${index}].capacity`) as string : 
                          undefined
                        }
                        variant="outlined"
                        margin="normal"
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name={`ticketCategories[${index}].description`}
                        label="Description (Optional)"
                        value={category.description || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        variant="outlined"
                        margin="normal"
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              
              <Button
                type="button"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  const newCategories = [...values.ticketCategories, { categoryName: '', price: 0, capacity: 0 }];
                  setFieldValue('ticketCategories', newCategories);
                }}
                sx={{ mt: 1 }}
              >
                Add Another Category
              </Button>
              
              {typeof errors.ticketCategories === 'string' && (
                <FormHelperText error>{errors.ticketCategories}</FormHelperText>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Event Image
              </Typography>
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
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