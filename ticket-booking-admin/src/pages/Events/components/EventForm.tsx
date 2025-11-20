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
  Alert,
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
import { useAuth } from '../../../context/AuthContext';

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
  ticketCategories: TicketCategory[];
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
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
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
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setValidationError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setValidationError('Image size must not exceed 5MB. Please choose a smaller file.');
        e.target.value = ''; // Clear the input
        return;
      }
      
      setValidationError(null);
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
        category: '',
        basePrice: event?.basePrice || 0,
        totalCapacity: event?.ticketsAvailable || 100,
        status: event?.status || EventStatus.DRAFT,
        imageFile: null,
        ticketCategories: event?.ticketCategories && event.ticketCategories.length > 0 
          ? event.ticketCategories 
          : [{ categoryName: '', price: 0, capacity: 0 }]
      }}
      validationSchema={Yup.object({
        name: Yup.string()
          .required('Event name is required')
          .min(3, 'Event name must be at least 3 characters')
          .max(100, 'Event name must not exceed 100 characters')
          .matches(/^[a-zA-Z0-9\s\-',.()]+$/, 'Event name contains invalid characters'),
        description: Yup.string()
          .required('Event description is required')
          .min(10, 'Description must be at least 10 characters')
          .max(2000, 'Description must not exceed 2000 characters')
          .test('no-only-spaces', 'Description cannot contain only spaces', (value) => {
            return value ? value.trim().length >= 10 : false;
          }),
        startDateTime: Yup.date()
          .required('Start date and time is required')
          .typeError('Start date and time must be a valid date')
          .test('not-in-past', 'Start date and time cannot be in the past', function(value) {
            // Allow editing events if they're already created (editing mode)
            if (event?.id) return true;
            if (!value) return false;
            const now = new Date();
            // Allow dates from yesterday onwards to handle timezone issues
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return value >= yesterday;
          })
          .test('not-too-far', 'Start date cannot be more than 5 years in the future', function(value) {
            if (!value) return false;
            const fiveYearsFromNow = new Date();
            fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
            return value <= fiveYearsFromNow;
          }),
        endDateTime: Yup.date()
          .required('End date and time is required')
          .typeError('End date and time must be a valid date')
          .min(Yup.ref('startDateTime'), 'End date and time must be after start date and time')
          .test('reasonable-duration', 'Event duration cannot exceed 30 days', function(value) {
            const { startDateTime } = this.parent;
            if (!value || !startDateTime) return true;
            const diffInMs = value.getTime() - startDateTime.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            return diffInDays <= 30;
          })
          .test('minimum-duration', 'Event must be at least 30 minutes long', function(value) {
            const { startDateTime } = this.parent;
            if (!value || !startDateTime) return true;
            const diffInMs = value.getTime() - startDateTime.getTime();
            const diffInMinutes = diffInMs / (1000 * 60);
            return diffInMinutes >= 30;
          }),
        venueId: Yup.string()
          .required('Venue is required')
          .test('valid-uuid', 'Invalid venue selected', (value) => {
            if (!value) return false;
            // Check if it's a valid UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(value);
          }),
        category: Yup.string()
          .optional(),
        basePrice: Yup.number()
          .required('Base price is required')
          .typeError('Base price must be a valid number')
          .min(0, 'Base price cannot be negative')
          .max(1000000, 'Base price cannot exceed LKR 1,000,000')
          .test('two-decimals', 'Base price can have at most 2 decimal places', (value) => {
            if (value === undefined || value === null) return false;
            return /^\d+(\.\d{1,2})?$/.test(value.toString());
          }),
        totalCapacity: Yup.number()
          .required('Total capacity is required')
          .typeError('Total capacity must be a valid number')
          .integer('Total capacity must be a whole number')
          .min(1, 'Total capacity must be at least 1')
          .max(100000, 'Total capacity cannot exceed 100,000')
          .test('capacity-vs-venue', 'Total capacity cannot exceed venue capacity', function(value) {
            const { venueId } = this.parent;
            if (!value || !venueId) return true;
            const selectedVenue = venues.find(v => v.id === venueId);
            if (!selectedVenue) return true;
            return value <= selectedVenue.capacity;
          })
          .test('capacity-vs-categories', 'Total capacity must equal or exceed sum of all ticket category capacities', function(value) {
            const { ticketCategories } = this.parent;
            if (!value || !ticketCategories || ticketCategories.length === 0) return true;
            const totalCategoryCapacity = ticketCategories.reduce(
              (sum: number, cat: TicketCategory) => sum + (Number(cat.capacity) || 0), 
              0
            );
            return value >= totalCategoryCapacity;
          }),
        status: Yup.string()
          .required('Event status is required')
          .oneOf(
            [EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.CANCELLED, EventStatus.COMPLETED],
            'Invalid event status selected'
          ),
        ticketCategories: Yup.array().of(
          Yup.object().shape({
            categoryName: Yup.string()
              .required('Category name is required')
              .min(2, 'Category name must be at least 2 characters')
              .max(50, 'Category name must not exceed 50 characters')
              .matches(/^[a-zA-Z0-9\s-]+$/, 'Category name contains invalid characters'),
            price: Yup.number()
              .required('Price is required')
              .typeError('Price must be a valid number')
              .min(0, 'Price cannot be negative')
              .max(1000000, 'Price cannot exceed LKR 1,000,000')
              .test('two-decimals', 'Price can have at most 2 decimal places', (value) => {
                if (value === undefined || value === null) return false;
                return /^\d+(\.\d{1,2})?$/.test(value.toString());
              }),
            capacity: Yup.number()
              .required('Capacity is required')
              .typeError('Capacity must be a valid number')
              .integer('Capacity must be a whole number')
              .min(1, 'Capacity must be at least 1')
              .max(100000, 'Capacity cannot exceed 100,000'),
            description: Yup.string()
              .max(500, 'Description must not exceed 500 characters')
              .optional()
          })
        )
        .required('At least one ticket category is required')
        .min(1, 'At least one ticket category is required')
        .test('unique-categories', 'Category names must be unique', function(categories) {
          if (!categories || categories.length === 0) return true;
          const names = categories
            .filter((cat: TicketCategory) => cat.categoryName && cat.categoryName.trim())
            .map((cat: TicketCategory) => cat.categoryName.toLowerCase().trim());
          const uniqueNames = new Set(names);
          return names.length === uniqueNames.size;
        })
      })}
      onSubmit={async (values: FormValues, { setSubmitting, resetForm, setErrors }: FormikHelpers<FormValues>) => {
        try {
          setValidationError(null);
          setUploading(true);
          
          // Additional business rule validations
          const totalCategoryCapacity = values.ticketCategories.reduce(
            (sum, cat) => sum + Number(cat.capacity), 
            0
          );
          
          if (totalCategoryCapacity > values.totalCapacity) {
            setValidationError(
              `Sum of ticket category capacities (${totalCategoryCapacity}) cannot exceed total event capacity (${values.totalCapacity})`
            );
            setSubmitting(false);
            setUploading(false);
            return;
          }
          
          // Check venue capacity
          const selectedVenue = venues.find(v => v.id === values.venueId);
          if (selectedVenue && values.totalCapacity > selectedVenue.capacity) {
            setValidationError(
              `Event capacity (${values.totalCapacity}) cannot exceed venue capacity (${selectedVenue.capacity})`
            );
            setSubmitting(false);
            setUploading(false);
            return;
          }
          
          // Validate date/time is reasonable
          const now = new Date();
          if (!event?.id && values.startDateTime < now) {
            setValidationError('Cannot create an event with a start time in the past');
            setSubmitting(false);
            setUploading(false);
            return;
          }
          
          const eventData: any = { ...values };
          delete eventData.imageFile;
          
          // Convert Date to ISO string for API
          const eventDataForApi = {
            ...eventData,
            startDateTime: eventData.startDateTime.toISOString(),
            endDateTime: eventData.endDateTime.toISOString(),
            ticketCategories: eventData.ticketCategories.map((category: TicketCategory) => ({
              ...category,
              categoryName: category.categoryName.trim(),
              description: category.description?.trim() || '',
              price: Number(category.price),
              capacity: Number(category.capacity)
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
          
          setValidationError(null);
          resetForm();
          if (onSuccess) onSuccess();
        } catch (error) {
          console.error(`Error ${event ? 'updating' : 'creating'} event:`, error);
          
          // Extract error message from API response
          const apiError = error as ApiError;
          if (apiError.response?.data?.message) {
            setValidationError(apiError.response.data.message);
          } else {
            setValidationError(`Failed to ${event ? 'update' : 'create'} event. Please check all fields and try again.`);
          }
          
          handleApiError(apiError, setErrors, event ? 'update' : 'create');
        } finally {
          setSubmitting(false);
          setUploading(false);
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          {/* Validation Error Alert */}
          {validationError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationError(null)}>
              {validationError}
            </Alert>
          )}
          
          {/* Role Information */}
          {user && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Creating event as: <strong>{user.role}</strong> ({user.email})
              {user.role.includes('ORGANIZER') && (
                <> - Events will be associated with your organizer account</>
              )}
            </Alert>
          )}
          
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
                helperText={
                  touched.name && errors.name 
                    ? errors.name as string 
                    : 'Enter a descriptive name for your event (3-100 characters)'
                }
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
                helperText={
                  touched.description && errors.description 
                    ? errors.description as string 
                    : `Provide detailed information about your event (${values.description.length}/2000 characters, minimum 10)`
                }
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
                      helperText: touched.startDateTime && errors.startDateTime 
                        ? errors.startDateTime as string 
                        : 'When does your event start?'
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
                      helperText: touched.endDateTime && errors.endDateTime 
                        ? errors.endDateTime as string 
                        : 'When does your event end? (minimum 30 minutes, maximum 30 days)'
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
                helperText={
                  touched.basePrice && errors.basePrice 
                    ? errors.basePrice as string 
                    : 'Minimum ticket price (0 for free events, max LKR 1,000,000)'
                }
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
                helperText={
                  touched.totalCapacity && errors.totalCapacity 
                    ? errors.totalCapacity as string 
                    : values.venueId 
                      ? `Maximum attendees (must not exceed venue capacity: ${venues.find(v => v.id === values.venueId)?.capacity || 'N/A'})` 
                      : 'Total number of tickets available (1-100,000)'
                }
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            
            {/* Ticket Categories Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Ticket Categories</Typography>
              <Divider sx={{ mb: 3 }} />
              
              {/* Capacity Summary */}
              {values.ticketCategories.length > 0 && (
                <Alert 
                  severity={
                    values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0) > values.totalCapacity
                      ? 'error'
                      : values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0) === values.totalCapacity
                      ? 'success'
                      : 'info'
                  }
                  sx={{ mb: 2 }}
                >
                  <strong>Capacity Summary:</strong> 
                  {' '}Total Event Capacity: {values.totalCapacity}
                  {' | '}Category Capacities Sum: {values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0)}
                  {' | '}Remaining: {values.totalCapacity - values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0)}
                  {values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0) > values.totalCapacity && (
                    <> - <strong>Categories exceed total capacity!</strong></>
                  )}
                </Alert>
              )}
              
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
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  hidden
                  onChange={(e) => handleImageChange(e, setFieldValue)}
                />
              </Button>
              <FormHelperText>
                Upload a promotional image for your event (JPEG, PNG, GIF, or WebP, max 5MB)
              </FormHelperText>
              
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