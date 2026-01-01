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
  IconButton,
  CircularProgress,
  Paper,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Card
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  CloudUpload as CloudUploadIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Event, Venue, EventStatus, TicketCategory } from '../../../types';
import { EventService } from '../../../services';
import { VenueService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';

// Define the form values type
interface FormValues {
  name: string;
  description: string;
  venueId: string;
  category: string;
  basePrice: number | '';
  totalCapacity: number | '';
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
  <Box 
    sx={{ 
      mt: 2, 
      textAlign: 'center',
      '& img': {
        maxWidth: '100%',
        maxHeight: '200px',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }
    }}
  >
    <img src={src} alt={alt} />
  </Box>
);

const EventForm: React.FC<EventFormProps> = ({ event, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const steps = ['Event Info', 'Venue & Capacity', 'Ticket Categories', 'Media & Publish'];
  const [stepErrors, setStepErrors] = useState<{ [key: number]: string[] }>({});
  
  // Function to validate current step fields
  const validateStep = (stepIndex: number, values: any, errors: any, touched: any): string[] => {
    const stepErrorMessages: string[] = [];
    
    switch (stepIndex) {
      case 0: // Event Info
        if (touched.name && errors.name) stepErrorMessages.push(`Event Name: ${errors.name}`);
        if (touched.description && errors.description) stepErrorMessages.push(`Description: ${errors.description}`);
        if (touched.basePrice && errors.basePrice) stepErrorMessages.push(`Base Price: ${errors.basePrice}`);
        if (touched.status && errors.status) stepErrorMessages.push(`Status: ${errors.status}`);
        // Check if required fields are empty
        if (!values.name) stepErrorMessages.push('Event Name is required');
        if (!values.description || values.description.length < 10) stepErrorMessages.push('Description is required (minimum 10 characters)');
        if (values.basePrice === '' || values.basePrice === null) stepErrorMessages.push('Base Price is required');
        break;
        
      case 1: // Venue & Capacity
        if (touched.venueId && errors.venueId) stepErrorMessages.push(`Venue: ${errors.venueId}`);
        if (touched.totalCapacity && errors.totalCapacity) stepErrorMessages.push(`Total Capacity: ${errors.totalCapacity}`);
        // Check if required fields are empty
        if (!values.venueId) stepErrorMessages.push('Venue is required');
        if (values.totalCapacity === '' || values.totalCapacity === null) stepErrorMessages.push('Total Capacity is required');
        // Check venue capacity constraint
        const selectedVenue = venues.find(v => v.id === values.venueId);
        if (selectedVenue && values.totalCapacity && Number(values.totalCapacity) > selectedVenue.capacity) {
          stepErrorMessages.push(`Total Capacity (${values.totalCapacity}) exceeds Venue Capacity (${selectedVenue.capacity})`);
        }
        break;
        
      case 2: // Ticket Categories
        if (values.ticketCategories.length === 0) {
          stepErrorMessages.push('At least one ticket category is required');
        } else {
          // Check each category
          values.ticketCategories.forEach((cat: any, idx: number) => {
            if (!cat.categoryName) stepErrorMessages.push(`Category ${idx + 1}: Name is required`);
            if (cat.price === '' || cat.price === null) stepErrorMessages.push(`Category ${idx + 1}: Price is required`);
            if (cat.capacity === '' || cat.capacity === null) stepErrorMessages.push(`Category ${idx + 1}: Capacity is required`);
          });
          
          // Check capacity sum
          const totalCategoryCapacity = values.ticketCategories.reduce(
            (sum: number, cat: any) => sum + Number(cat.capacity || 0), 
            0
          );
          if (totalCategoryCapacity > Number(values.totalCapacity)) {
            stepErrorMessages.push(`Category capacities (${totalCategoryCapacity}) exceed Total Capacity (${values.totalCapacity})`);
          }
          if (totalCategoryCapacity === 0) {
            stepErrorMessages.push('Category capacities must be greater than 0');
          }
        }
        break;
        
      case 3: // Media & Publish (optional step)
        // No required fields in this step
        break;
    }
    
    return stepErrorMessages;
  };
  
  // Wizard navigation with validation
  const handleNext = (values: any, errors: any, touched: any, validateForm: any, setTouched: any) => async () => {
    // Validate current step
    const currentStepErrors = validateStep(activeStep, values, errors, touched);
    
    if (currentStepErrors.length > 0) {
      // Mark all fields in current step as touched to show errors
      const touchedFields: any = {};
      switch (activeStep) {
        case 0:
          touchedFields.name = true;
          touchedFields.description = true;
          touchedFields.basePrice = true;
          touchedFields.status = true;
          break;
        case 1:
          touchedFields.venueId = true;
          touchedFields.totalCapacity = true;
          break;
        case 2:
          touchedFields.ticketCategories = values.ticketCategories.map(() => ({
            categoryName: true,
            price: true,
            capacity: true
          }));
          break;
      }
      setTouched({ ...touched, ...touchedFields });
      
      // Update step errors state
      setStepErrors(prev => ({ ...prev, [activeStep]: currentStepErrors }));
      setValidationError(currentStepErrors.join(', '));
      return;
    }
    
    // Clear errors for this step and proceed
    setStepErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[activeStep];
      return newErrors;
    });
    setValidationError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setValidationError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Function to get button text based on form state and status
  const getButtonText = (isUploading: boolean, isSubmitting: boolean, status: EventStatus): string => {
    if (isUploading) return 'Uploading...';
    if (isSubmitting) return 'Saving...';
    if (status === EventStatus.DRAFT) return event?.id ? 'Update Draft' : 'Save as Draft';
    if (status === EventStatus.PUBLISHED) return event?.id ? 'Update & Publish' : 'Create & Publish Event';
    return event?.id ? 'Update Event' : 'Create Event';
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
    console.log('=== IMAGE CHANGE HANDLER CALLED ===');
    const file = e.target.files?.[0];
    console.log('Selected file:', file);
    
    if (file) {
      console.log('File details:', { name: file.name, type: file.type, size: file.size });
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        console.log('Invalid file type:', file.type);
        setValidationError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        console.log('File too large:', file.size);
        setValidationError('Image size must not exceed 5MB. Please choose a smaller file.');
        e.target.value = ''; // Clear the input
        return;
      }
      
      console.log('File validation passed, setting image states...');
      setValidationError(null);
      setSelectedImage(file);
      setFieldValue('imageFile', file);
      console.log('selectedImage state updated, imageFile field set');
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string || null;
        console.log('Preview created:', preview ? 'Yes' : 'No');
        setImagePreview(preview);
      };
      reader.readAsDataURL(file);
    } else {
      console.log('No file selected');
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
        venueId: event?.venue?.id || '',
        category: '',
        basePrice: event?.basePrice || '',
        totalCapacity: event?.ticketsAvailable || '',
        status: event?.status || EventStatus.DRAFT,
        imageFile: null,
        ticketCategories: event?.ticketCategories && event.ticketCategories.length > 0 
          ? event.ticketCategories 
          : [{ categoryName: '', price: '' as any, capacity: '' as any }]
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
          .min(0.01, 'Base price must be greater than LKR 0')
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
              .min(0.01, 'Price must be greater than LKR 0')
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
      onSubmit={async (values: FormValues, { setSubmitting, resetForm, setErrors, validateForm, setTouched }: FormikHelpers<FormValues>) => {
        console.log('=== FORM SUBMISSION STARTED ===');
        console.log('Form values:', values);
        console.log('Is editing existing event:', !!event?.id);
        console.log('Event ID:', event?.id);
        console.log('Selected image:', selectedImage);
        
        try {
          // Validate all steps before submission
          const allErrors: { [key: number]: string[] } = {};
          for (let i = 0; i < steps.length - 1; i++) {
            const stepErrs = validateStep(i, values, {}, {});
            if (stepErrs.length > 0) {
              allErrors[i] = stepErrs;
            }
          }
          
          if (Object.keys(allErrors).length > 0) {
            setStepErrors(allErrors);
            const errorSteps = Object.keys(allErrors).map(k => steps[parseInt(k)]).join(', ');
            setValidationError(`Please fix errors in: ${errorSteps}`);
            // Jump to first step with error
            const firstErrorStep = parseInt(Object.keys(allErrors)[0]);
            setActiveStep(firstErrorStep);
            setSubmitting(false);
            return;
          }
          
          setValidationError(null);
          setUploading(true);
          
          // Additional business rule validations
          const totalCategoryCapacity = values.ticketCategories.reduce(
            (sum, cat) => sum + Number(cat.capacity), 
            0
          );
          
          if (totalCategoryCapacity > Number(values.totalCapacity)) {
            setValidationError(
              `Sum of ticket category capacities (${totalCategoryCapacity}) cannot exceed total event capacity (${values.totalCapacity})`
            );
            setSubmitting(false);
            setUploading(false);
            return;
          }
          
          // Check venue capacity
          const selectedVenue = venues.find(v => v.id === values.venueId);
          if (selectedVenue && Number(values.totalCapacity) > selectedVenue.capacity) {
            setValidationError(
              `Event capacity (${values.totalCapacity}) cannot exceed venue capacity (${selectedVenue.capacity})`
            );
            setSubmitting(false);
            setUploading(false);
            return;
          }
          
          const eventData: any = { ...values };
          delete eventData.imageFile;
          
          // Prepare data for API
          const eventDataForApi = {
            ...eventData,
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
            console.log('Updating event with ID:', event.id);
            console.log('Event data:', eventDataForApi);
            savedEvent = await EventService.updateEvent(event.id, eventDataForApi);
            console.log('Event updated successfully:', savedEvent);
          } else {
            // Create new event
            console.log('Creating new event');
            console.log('Event data:', eventDataForApi);
            savedEvent = await EventService.createEvent(eventDataForApi);
            console.log('Event created successfully:', savedEvent);
          }
          
          // Upload the image if one is selected
          if (selectedImage && savedEvent.id) {
            console.log('Uploading image for event ID:', savedEvent.id);
            const formData = new FormData();
            formData.append('file', selectedImage);
            const imageUrl = await EventService.uploadEventImage(savedEvent.id, formData);
            console.log('Image uploaded successfully:', imageUrl);
          }
          
          setValidationError(null);
          resetForm();
          setSelectedImage(null);
          setImagePreview(null);
          if (onSuccess) onSuccess();
        } catch (error) {
          console.error('=== FORM SUBMISSION ERROR ===');
          console.error(`Error ${event ? 'updating' : 'creating'} event:`, error);
          
          // Extract error message from API response
          const apiError = error as ApiError;
          console.error('API Error response:', apiError.response);
          
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
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue, validateForm, setTouched }) => {
        // Render step content based on active step
        const renderStepContent = (step: number) => {
          switch (step) {
            case 0:
              // Step 1: Event Info
              return (
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
                          : `Enter a descriptive name for your event (${values.name.length}/100 characters, minimum 3)`
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
                          : 'Minimum ticket price (greater than LKR 0, max LKR 1,000,000)'
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
                </Grid>
              );
              
            case 1:
              // Step 2: Venue & Capacity
              return (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
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
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="totalCapacity"
                      name="totalCapacity"
                      label="Total Event Capacity"
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
                </Grid>
              );
              
            case 2:
              // Step 3: Ticket Categories
              return (
                <Grid container spacing={2}>
                  {/* Capacity Summary */}
                  {values.ticketCategories.length > 0 && Number(values.totalCapacity) > 0 && (
                    <Grid item xs={12}>
                      <Alert 
                        severity={
                          values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0) > Number(values.totalCapacity)
                            ? 'error'
                            : values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0) === Number(values.totalCapacity)
                            ? 'success'
                            : 'info'
                        }
                        sx={{ mb: 2 }}
                      >
                        <strong>Capacity Summary:</strong> 
                        {' '}Total Event Capacity: {values.totalCapacity}
                        {' | '}Category Capacities Sum: {values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0)}
                        {' | '}Remaining: {Number(values.totalCapacity) - values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0)}
                        {values.ticketCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0) > Number(values.totalCapacity) && (
                          <> - <strong>Categories exceed total capacity!</strong></>
                        )}
                      </Alert>
                    </Grid>
                  )}
                  
                  {values.ticketCategories.map((category, index) => (
                    <Grid item xs={12} key={index}>
                      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                Category {index + 1}
                              </Typography>
                              {values.ticketCategories.length > 1 && (
                                <IconButton 
                                  onClick={() => {
                                    const newCategories = [...values.ticketCategories];
                                    newCategories.splice(index, 1);
                                    setFieldValue('ticketCategories', newCategories);
                                  }}
                                  size="small"
                                  color="error"
                                >
                                  <RemoveIcon />
                                </IconButton>
                              )}
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              name={`ticketCategories[${index}].categoryName`}
                              label="Category Name"
                              placeholder="e.g., VIP, General Admission, Student"
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
                              placeholder="0.00"
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
                                startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>LKR</Typography>,
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
                              placeholder="0"
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
                              placeholder="Additional details about this ticket category"
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
                    </Grid>
                  ))}
                  
                  <Grid item xs={12}>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const newCategories = [...values.ticketCategories, { categoryName: '', price: '', capacity: '' }];
                        setFieldValue('ticketCategories', newCategories);
                      }}
                      sx={{ mt: 1 }}
                    >
                      Add Another Category
                    </Button>
                    
                    {typeof errors.ticketCategories === 'string' && (
                      <FormHelperText error sx={{ ml: 2 }}>{errors.ticketCategories}</FormHelperText>
                    )}
                  </Grid>
                </Grid>
              );
              
            case 3:
              // Step 4: Media & Publish
              return (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Event Image (Optional)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Upload an eye-catching image to attract more attendees. Recommended size: 1920x1080px
                    </Typography>
                    
                    <Card sx={{ p: 3, borderRadius: 2, border: '2px dashed', borderColor: imagePreview ? 'success.main' : 'divider', bgcolor: imagePreview ? 'success.50' : 'background.paper' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CloudUploadIcon sx={{ fontSize: 48, color: imagePreview ? 'success.main' : 'text.secondary', mb: 2 }} />
                        <Button
                          variant={imagePreview ? "outlined" : "contained"}
                          component="label"
                          startIcon={imagePreview ? <CheckCircleIcon /> : <CloudUploadIcon />}
                          color={imagePreview ? "success" : "primary"}
                          size="large"
                          sx={{ mb: 1 }}
                        >
                          {imagePreview ? 'Image Selected - Change' : 'Choose Event Image'}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            hidden
                            onChange={(e) => handleImageChange(e, setFieldValue)}
                          />
                        </Button>
                        <FormHelperText sx={{ textAlign: 'center', fontSize: '0.875rem' }}>
                          Supported formats: JPEG, PNG, GIF, WebP (max 5MB)
                        </FormHelperText>
                      </Box>
                      
                      {imagePreview && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ textAlign: 'center', color: 'success.main', mb: 2 }}>
                            <CheckCircleIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                            Preview:
                          </Typography>
                          <ImagePreview src={imagePreview} alt="Event preview" />
                          {selectedImage && (
                            <Typography variant="caption" display="block" sx={{ textAlign: 'center', mt: 1, color: 'text.secondary' }}>
                              {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        <CheckCircleIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        Ready to {values.status === EventStatus.DRAFT ? 'Save' : 'Publish'}
                      </Typography>
                      <Typography variant="body2">
                        Review all details and click "{getButtonText(uploading, isSubmitting, values.status)}" to finalize your event.
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              );
              
            default:
              return null;
          }
        };
        
        return (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Validation Error Alert */}
            {validationError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationError(null)}>
                {validationError}
              </Alert>
            )}
            
            {/* Admin Context Banner */}
            {user && (
              <Alert severity="info" icon={<LockIcon />} sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="body2" component="div">
                    <strong>Admin Context:</strong> Creating event as <Chip label={user.role} size="small" color="primary" sx={{ mx: 0.5 }} /> ({user.email})
                    {user.role.includes('ORGANIZER') && (
                      <> - Events will be associated with your organizer account</>
                    )}
                  </Typography>
                </Box>
              </Alert>
            )}
            
            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label, index) => {
                const hasError = stepErrors[index] && stepErrors[index].length > 0;
                return (
                  <Step key={label}>
                    <StepLabel 
                      error={hasError}
                      sx={{
                        '& .MuiStepLabel-label': hasError ? {
                          color: 'error.main',
                          fontWeight: 'bold'
                        } : {}
                      }}
                    >
                      {label}
                      {hasError && (
                        <Chip 
                          label={stepErrors[index].length} 
                          size="small" 
                          color="error" 
                          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
            
            {/* Step Content */}
            <Box sx={{ minHeight: 400, mb: 10 }}>
              {renderStepContent(activeStep)}
            </Box>
            
            {/* Sticky Footer with Navigation Buttons */}
            <Box sx={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              p: 2,
              mt: 3,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              zIndex: 10
            }}>
              <Box>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={onClose}
                  disabled={isSubmitting || uploading}
                >
                  Cancel
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  variant="outlined"
                >
                  Back
                </Button>
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || uploading}
                    startIcon={uploading ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={() => {
                      console.log('=== SUBMIT BUTTON CLICKED ===');
                      console.log('Active step:', activeStep);
                      console.log('Steps length:', steps.length);
                      console.log('Is submitting:', isSubmitting);
                      console.log('Is uploading:', uploading);
                      console.log('Button disabled:', isSubmitting || uploading);
                    }}
                  >
                    {getButtonText(uploading, isSubmitting, values.status)}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext(values, errors, touched, validateForm, setTouched)}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        );
      }}
    </Formik>
  );
};

export default EventForm;