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
  Card,
  Snackbar,
  Alert as MuiAlert
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
import { Event, Venue, EventStatus, TicketCategory, EventCategory } from '../../../types';
import { EventService, EventScheduleService, EventCategoryService } from '../../../services';
import { VenueService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';

// Define the form values type
interface FormValues {
  name: string;
  description: string;
  venueId: string;
  categoryId: string;
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
  // For edit mode: keep existing URL as preview until a new file is chosen
  const existingImageUrl = event?.imageUrl || null;
  const [imagePreview, setImagePreview] = useState<string | null>(existingImageUrl);
  const [uploading, setUploading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'warning' | 'info' | 'success' }>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

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
          // Separate seated and standing categories
          const seatedCategories = values.ticketCategories.filter((cat: any) => !cat.isSharedArea);
          const standingCategories = values.ticketCategories.filter((cat: any) => cat.isSharedArea);
          
          // Check each seated category
          seatedCategories.forEach((cat: any, idx: number) => {
            if (!cat.categoryName) stepErrorMessages.push(`Seated Category ${idx + 1}: Name is required`);
            if (cat.price === '' || cat.price === null) stepErrorMessages.push(`Seated Category ${idx + 1}: Price is required`);
            if (cat.capacity === '' || cat.capacity === null) stepErrorMessages.push(`Seated Category ${idx + 1}: Capacity is required`);
          });
          
          // Check each standing category (only price required, capacity is fixed)
          standingCategories.forEach((cat: any) => {
            if (cat.price === '' || cat.price === null || Number(cat.price) === 0) {
              stepErrorMessages.push(`Standing Area ${cat.sharedAreaNumber}: Price is required`);
            }
          });
          
          // Check seated capacity sum (standing areas are COMPLETELY SEPARATE)
          const seatedCategoryCapacity = seatedCategories.reduce(
            (sum: number, cat: any) => sum + Number(cat.capacity || 0), 
            0
          );
          
          // venue.capacity IS the seating capacity (standing is completely separate)
          const selectedVenueForValidation = venues.find(v => v.id === values.venueId);
          const venueSeatedCapacity = selectedVenueForValidation?.capacity || 0;
          
          if (seatedCategoryCapacity > venueSeatedCapacity) {
            stepErrorMessages.push(`Seated category capacities (${seatedCategoryCapacity}) exceed venue seating capacity (${venueSeatedCapacity})`);
          }
          if (seatedCategories.length > 0 && seatedCategoryCapacity === 0) {
            stepErrorMessages.push('Seated category capacities must be greater than 0');
          }
        }
        break;
        
      case 3: // Media & Publish
        // Image is required only when CREATING a new event
        // When editing, the existing image (existingImageUrl) is kept if no new file is chosen
        if (!existingImageUrl && !values.imageFile && !imagePreview) {
          stepErrorMessages.push('Event image is required');
        }
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
      } finally {
        setVenueLoading(false);
      }
    };
    
    fetchVenues();
  }, []);
  
  // Load categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoryLoading(true);
      try {
        const categoryData = await EventCategoryService.getActiveCategories();
        setCategories(categoryData);
      } catch (error) {
      } finally {
        setCategoryLoading(false);
      }
    };
    
    fetchCategories();
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
        const preview = e.target?.result as string || null;
        setImagePreview(preview);
      };
      reader.readAsDataURL(file);
    } else {
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
    <>
    <Formik
      initialValues={{
        // Form initial values for event creation/editing
        name: event?.name || '',
        description: event?.description || '',
        venueId: event?.venue?.id || '',
        categoryId: event?.category?.id || '',
        basePrice: event?.basePrice || '',
        totalCapacity: event?.totalCapacity || '',
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
        categoryId: Yup.string()
          .optional()
          .test('valid-uuid', 'Invalid category selected', (value) => {
            if (!value) return true; // Optional field
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(value);
          }),
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
          .test('capacity-vs-categories', 'Seated category capacities exceed venue seating capacity', function(value) {
            const { ticketCategories, venueId } = this.parent;
            if (!value || !ticketCategories || ticketCategories.length === 0) return true;
            
            // Get venue's capacities
            const selectedVenue = venues.find(v => v.id === venueId);
            if (!selectedVenue) return true;
            
            // venue.capacity IS the seating capacity (standing is completely separate)
            const venueSeatedCapacity = selectedVenue.capacity;
            
            // Only count seated categories (not standing areas - they have their own capacity)
            const seatedCategoryCapacity = ticketCategories
              .filter((cat: TicketCategory) => !cat.isSharedArea)
              .reduce((sum: number, cat: TicketCategory) => sum + (Number(cat.capacity) || 0), 0);
            
            return seatedCategoryCapacity <= venueSeatedCapacity;
          }),
        status: Yup.string()
          .required('Event status is required')
          .oneOf(
            [EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.CANCELLED, EventStatus.COMPLETED],
            'Invalid event status selected'
          ),
        imageFile: Yup.mixed().nullable(), // Image validation handled by validateStep
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
        
        try {
          // Validate ALL steps including step 3 (Media)
          const allErrors: { [key: number]: string[] } = {};
          for (let i = 0; i < steps.length; i++) {
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
          // Only validate SEATED categories against totalCapacity (standing is separate)
          const seatedCategoryCapacity = values.ticketCategories
            .filter(cat => !cat.isSharedArea)
            .reduce((sum, cat) => sum + Number(cat.capacity), 0);
          
          if (seatedCategoryCapacity > Number(values.totalCapacity)) {
            setValidationError(
              `Sum of seated ticket categories (${seatedCategoryCapacity}) cannot exceed event seating capacity (${values.totalCapacity})`
            );
            setSubmitting(false);
            setUploading(false);
            return;
          }
          
          // Check venue capacity (totalCapacity should not exceed venue's seating capacity)
          const selectedVenue = venues.find(v => v.id === values.venueId);
          if (selectedVenue && Number(values.totalCapacity) > selectedVenue.capacity) {
            setValidationError(
              `Event seating capacity (${values.totalCapacity}) cannot exceed venue seating capacity (${selectedVenue.capacity})`
            );
            setSubmitting(false);
            setUploading(false);
            return;
          }
          
          // If trying to publish an existing event, check for schedules
          if (values.status === EventStatus.PUBLISHED && event?.id) {
            try {
              const schedules = await EventScheduleService.getSchedulesForEvent(event.id);
              if (!schedules || schedules.length === 0) {
                setValidationError('Cannot publish event without schedules. Please add at least one event schedule before publishing.');
                setSubmitting(false);
                setUploading(false);
                return;
              }
            } catch (error) {
              setValidationError('Failed to verify event schedules. Please try again.');
              setSubmitting(false);
              setUploading(false);
              return;
            }
          }
          
          const eventData: any = { ...values };
          delete eventData.imageFile;
          
          // Prepare data for API - explicitly include isSharedArea and sharedAreaNumber
          const eventDataForApi = {
            ...eventData,
            availableSeats: Number(eventData.totalCapacity), // Event's configured capacity
            totalCapacity: selectedVenue?.capacity || Number(eventData.totalCapacity), // Venue's total capacity
            ticketCategories: eventData.ticketCategories.map((category: TicketCategory) => {
              const mapped = {
                categoryName: category.categoryName.trim(),
                description: category.description?.trim() || '',
                price: Number(category.price),
                capacity: Number(category.capacity),
                isSharedArea: category.isSharedArea || false,
                sharedAreaNumber: category.sharedAreaNumber || null
              };
              return mapped;
            })
          };
          
          eventDataForApi.ticketCategories.forEach((cat: any, idx: number) => {
          });
          
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
            const imageUrl = await EventService.uploadEventImage(savedEvent.id, formData);
          }
          
          setValidationError(null);
          resetForm();
          setSelectedImage(null);
          setImagePreview(null);
          if (onSuccess) onSuccess();
        } catch (error) {
          
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
                  
                  <Grid item xs={12}>
                    <FormControl
                      fullWidth
                      variant="outlined"
                      margin="normal"
                      error={touched.categoryId && Boolean(errors.categoryId)}
                    >
                      <InputLabel id="category-label">Event Category</InputLabel>
                      <Select
                        labelId="category-label"
                        id="categoryId"
                        name="categoryId"
                        value={values.categoryId}
                        onChange={(e) => {
                          handleChange({
                            target: {
                              name: 'categoryId',
                              value: e.target.value
                            }
                          } as any);
                        }}
                        onBlur={handleBlur}
                        label="Event Category"
                        disabled={categoryLoading}
                      >
                        <MenuItem value="">
                          <em>None (Uncategorized)</em>
                        </MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.categoryName}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {touched.categoryId && errors.categoryId 
                          ? errors.categoryName as string
                          : categoryLoading 
                            ? 'Loading categories...'
                            : 'Select a category to help attendees find your event'}
                      </FormHelperText>
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
                        onChange={async (e) => {
                          const newStatus = e.target.value as EventStatus;
                          
                          // If trying to publish an existing event, check for schedules
                          if (newStatus === EventStatus.PUBLISHED && event?.id) {
                            try {
                              const schedules = await EventScheduleService.getSchedulesForEvent(event.id);
                              if (!schedules || schedules.length === 0) {
                                setSnackbar({ 
                                  open: true, 
                                  message: 'Cannot publish event without schedules. Please add at least one event schedule before publishing.', 
                                  severity: 'warning' 
                                });
                                return; // Don't change the status
                              }
                            } catch (error) {
                              setSnackbar({ 
                                open: true, 
                                message: 'Failed to verify event schedules. Please try again.', 
                                severity: 'error' 
                              });
                              return;
                            }
                          }
                          
                          setFieldValue('status', newStatus);
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
              const selectedVenueForStep = values.venueId ? venues.find(v => v.id === values.venueId) : null;
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
                            
                            // Handle shared areas - add shared area ticket categories if venue has them
                            if (selectedVenue.hasSharedAreas && selectedVenue.sharedAreaCount && selectedVenue.sharedAreaCount > 0) {
                              // Filter out old shared area categories and keep regular ones
                              const regularCategories = values.ticketCategories.filter(cat => !cat.isSharedArea);
                              
                              // Create new shared area categories based on venue configuration
                              const sharedAreaCategories: TicketCategory[] = [];
                              const capacityPerArea = selectedVenue.sharedAreaTotalCapacity 
                                ? Math.floor(selectedVenue.sharedAreaTotalCapacity / selectedVenue.sharedAreaCount)
                                : 0;
                              
                              for (let i = 1; i <= selectedVenue.sharedAreaCount; i++) {
                                sharedAreaCategories.push({
                                  categoryName: `Standing Area ${i}`,
                                  description: `Standing/shared area ${i} - no assigned seats`,
                                  price: '' as any,
                                  capacity: capacityPerArea as any,
                                  isSharedArea: true,
                                  sharedAreaNumber: i
                                });
                              }
                              
                              // Combine regular categories with shared area categories
                              setFieldValue('ticketCategories', [...regularCategories, ...sharedAreaCategories]);
                            } else {
                              // No shared areas - remove any existing shared area categories
                              const regularCategories = values.ticketCategories.filter(cat => !cat.isSharedArea);
                              if (regularCategories.length !== values.ticketCategories.length) {
                                setFieldValue('ticketCategories', regularCategories.length > 0 
                                  ? regularCategories 
                                  : [{ categoryName: '', price: '' as any, capacity: '' as any }]);
                              }
                            }
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
                              {venue.hasSharedAreas && (
                                <Chip 
                                  label={`${venue.sharedAreaCount} Standing Area${venue.sharedAreaCount && venue.sharedAreaCount > 1 ? 's' : ''}`} 
                                  size="small" 
                                  color="secondary" 
                                  sx={{ ml: 1 }} 
                                />
                              )}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {touched.venueId && errors.venueId && (
                        <FormHelperText>{errors.venueId as string}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  {/* Show shared areas info if venue has them */}
                  {selectedVenueForStep?.hasSharedAreas && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong> This venue has {selectedVenueForStep.sharedAreaCount} standing/shared area(s)</strong>
                        </Typography>
                        <Typography variant="body2">
                          <strong>Venue Capacities:</strong>
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ pl: 2 }}>
                          • Seating: {selectedVenueForStep.capacity || 0} seats
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ pl: 2 }}>
                          • Standing: {selectedVenueForStep.sharedAreaTotalCapacity || 0} people
                          {selectedVenueForStep.sharedAreaCount && selectedVenueForStep.sharedAreaTotalCapacity && 
                            ` (${selectedVenueForStep.sharedAreaCount} areas × ≈${Math.floor(selectedVenueForStep.sharedAreaTotalCapacity / selectedVenueForStep.sharedAreaCount)} each)`
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Standing area ticket categories will be automatically added in the next step. You can set different prices for each area.
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
                  
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
              const regularCategories = values.ticketCategories.filter(cat => !cat.isSharedArea);
              const sharedAreaCategories = values.ticketCategories.filter(cat => cat.isSharedArea);
              const selectedVenueForCategories = values.venueId ? venues.find(v => v.id === values.venueId) : null;
              
              // Check if venue has shared areas but they're not in ticket categories yet
              const venueHasSharedAreas = selectedVenueForCategories?.hasSharedAreas && 
                                         selectedVenueForCategories?.sharedAreaCount && 
                                         selectedVenueForCategories.sharedAreaCount > 0;
              const sharedAreasMissing = venueHasSharedAreas && sharedAreaCategories.length === 0;
              
              // Auto-add shared areas if venue has them but they're not in the list
              if (sharedAreasMissing && selectedVenueForCategories) {
                const capacityPerArea = selectedVenueForCategories.sharedAreaTotalCapacity 
                  ? Math.floor(selectedVenueForCategories.sharedAreaTotalCapacity / (selectedVenueForCategories.sharedAreaCount || 1))
                  : 0;
                
                const newSharedAreaCategories: TicketCategory[] = [];
                for (let i = 1; i <= (selectedVenueForCategories.sharedAreaCount || 0); i++) {
                  newSharedAreaCategories.push({
                    categoryName: `Standing Area ${i}`,
                    description: `Standing/shared area ${i} - no assigned seats`,
                    price: '' as any,
                    capacity: capacityPerArea as any,
                    isSharedArea: true,
                    sharedAreaNumber: i
                  });
                }
                
                // Add shared areas to ticket categories (don't trigger infinite loop)
                setTimeout(() => {
                  setFieldValue('ticketCategories', [...values.ticketCategories, ...newSharedAreaCategories]);
                }, 0);
              }
              
              return (
                <Grid container spacing={2}>
                  {/* Capacity Summary - Seated and Standing are COMPLETELY SEPARATE */}
                  {values.ticketCategories.length > 0 && (
                    <Grid item xs={12}>
                      {(() => {
                        // Calculate seated category capacity (only non-shared area categories)
                        const seatedCategoryCapacity = regularCategories.reduce((sum, cat) => sum + (Number(cat.capacity) || 0), 0);
                        // Standing capacity comes from venue configuration (COMPLETELY SEPARATE)
                        const standingCapacity = selectedVenueForCategories?.sharedAreaTotalCapacity || 0;
                        // Venue's seated capacity IS venue.capacity
                        const venueSeatedCapacity = selectedVenueForCategories?.capacity || 0;
                        
                        // Check if seated categories exceed venue's seated capacity
                        const seatedExceeds = seatedCategoryCapacity > venueSeatedCapacity;
                        const seatedMatches = seatedCategoryCapacity === venueSeatedCapacity;
                        
                        return (
                          <Alert 
                            severity={seatedExceeds ? 'error' : seatedMatches ? 'success' : 'info'}
                            sx={{ mb: 2 }}
                          >
                            <Box>
                              <Typography variant="body2" component="div">
                                <strong>Capacity Summary:</strong>
                              </Typography>
                              <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                                 <strong>Seated Tickets:</strong> {seatedCategoryCapacity} / {venueSeatedCapacity} seats
                                {seatedExceeds && <span style={{ color: '#d32f2f' }}> - Exceeds available seats!</span>}
                                {seatedMatches && <span style={{ color: '#2e7d32' }}> ✓ All seats allocated</span>}
                                {!seatedExceeds && !seatedMatches && venueSeatedCapacity > 0 && ` (${venueSeatedCapacity - seatedCategoryCapacity} seats remaining)`}
                              </Typography>
                              {venueHasSharedAreas && (
                                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                                   <strong>Standing Tickets:</strong> {standingCapacity} people (separate standing areas)
                                </Typography>
                              )}
                            </Box>
                          </Alert>
                        );
                      })()}
                    </Grid>
                  )}
                  
                  {/* Standing/Shared Area Categories Section - Show FIRST if venue has them */}
                  {venueHasSharedAreas && (
                    <>
                      <Grid item xs={12}>
                        <Box sx={{ bgcolor: 'secondary.50', p: 2, borderRadius: 2, border: '2px solid', borderColor: 'secondary.300', mb: 2 }}>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                             Standing/Common Areas 
                            <Chip 
                              label={`${selectedVenueForCategories?.sharedAreaCount} Area${(selectedVenueForCategories?.sharedAreaCount || 0) > 1 ? 's' : ''}`} 
                              color="secondary" 
                              size="small" 
                            />
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            This venue has <strong>{selectedVenueForCategories?.sharedAreaCount}</strong> standing/common area(s) 
                            with a total capacity of <strong>{selectedVenueForCategories?.sharedAreaTotalCapacity || 0}</strong> people.
                            These areas don't have assigned seats - customers can stand anywhere within the area.
                          </Typography>
                          
                          <Grid container spacing={2}>
                            {sharedAreaCategories.length > 0 ? (
                              values.ticketCategories.map((category, index) => {
                                if (!category.isSharedArea) return null;
                                
                                return (
                                  <Grid item xs={12} sm={6} md={4} key={`shared-${index}`}>
                                    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'white', border: '1px solid', borderColor: 'secondary.200' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Chip 
                                          label={`Area ${category.sharedAreaNumber}`} 
                                          color="secondary" 
                                          size="small" 
                                          sx={{ fontWeight: 'bold' }}
                                        />
                                      </Box>
                                      
                                      <TextField
                                        fullWidth
                                        name={`ticketCategories[${index}].categoryName`}
                                        label="Area Name"
                                        placeholder="e.g., Balcony, Floor Standing"
                                        value={category.categoryName}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        variant="outlined"
                                        size="small"
                                        margin="dense"
                                        helperText="Name shown to customers"
                                      />
                                      
                                      <TextField
                                        fullWidth
                                        name={`ticketCategories[${index}].price`}
                                        label="Ticket Price (LKR)"
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
                                          `Capacity: ${category.capacity} people`
                                        }
                                        variant="outlined"
                                        size="small"
                                        margin="dense"
                                        InputProps={{
                                          startAdornment: <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>LKR</Typography>,
                                        }}
                                        required
                                      />
                                    </Paper>
                                  </Grid>
                                );
                              })
                            ) : (
                              <Grid item xs={12}>
                                <Alert severity="info">
                                  Loading standing areas... They will appear here automatically.
                                </Alert>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </Grid>
                    </>
                  )}
                  
                  {/* Seated Ticket Categories Section */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                       Seated Ticket Categories
                      {venueHasSharedAreas && (
                        <Chip label="For seats only" size="small" variant="outlined" />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Define pricing tiers for seated sections (e.g., VIP, General Admission, Student).
                      {venueHasSharedAreas && " Standing areas are configured separately above."}
                    </Typography>
                  </Grid>
                  
                  {values.ticketCategories.map((category, index) => {
                    // Skip shared area categories in this loop
                    if (category.isSharedArea) return null;
                    
                    return (
                      <Grid item xs={12} key={index}>
                        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  Seated Category {regularCategories.findIndex(c => c === category) + 1}
                                </Typography>
                                {regularCategories.length > 1 && (
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
                    );
                  })}
                  
                  <Grid item xs={12}>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        // Find where to insert (before shared area categories)
                        const regularCount = regularCategories.length;
                        const newCategories = [...values.ticketCategories];
                        newCategories.splice(regularCount, 0, { categoryName: '', price: '' as any, capacity: '' as any });
                        setFieldValue('ticketCategories', newCategories);
                      }}
                      sx={{ mt: 1, mb: 3 }}
                    >
                      Add Another Seated Category
                    </Button>
                    
                    {typeof errors.ticketCategories === 'string' && (
                      <FormHelperText error sx={{ ml: 2 }}>{errors.ticketCategories}</FormHelperText>
                    )}
                  </Grid>
                </Grid>
              );
              
            case 3:
              // Step 4: Media & Publish
              // Determine whether image upload is required (only when creating)
              const isEditMode = Boolean(existingImageUrl);
              const imageIsValid = Boolean(imagePreview); // either existing URL or newly selected file
              return (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Event Image{!isEditMode && <span style={{ color: '#d32f2f' }}> *</span>}
                      {isEditMode && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, fontWeight: 'normal' }}>
                          (optional — existing image kept if not changed)
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {isEditMode
                        ? 'You can replace the existing image or leave it unchanged. Recommended size: 1920x1080px'
                        : 'Upload an eye-catching image to attract more attendees. This is required. Recommended size: 1920x1080px'}
                    </Typography>
                    
                    <Card sx={{
                      p: 3, borderRadius: 2, border: '2px dashed',
                      borderColor: imageIsValid ? 'success.main' : (errors.imageFile && touched.imageFile && !isEditMode ? 'error.main' : 'divider'),
                      bgcolor: imageIsValid ? 'success.50' : 'background.paper'
                    }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CloudUploadIcon sx={{
                          fontSize: 48,
                          color: imageIsValid ? 'success.main' : (errors.imageFile && touched.imageFile && !isEditMode ? 'error.main' : 'text.secondary'),
                          mb: 2
                        }} />
                        <Button
                          variant={imageIsValid ? "outlined" : "contained"}
                          component="label"
                          startIcon={imageIsValid ? <CheckCircleIcon /> : <CloudUploadIcon />}
                          color={imageIsValid ? "success" : "primary"}
                          size="large"
                          sx={{ mb: 1 }}
                        >
                          {imageIsValid
                            ? (selectedImage ? 'New Image Selected — Change' : 'Current Image — Change')
                            : 'Choose Event Image *'}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            hidden
                            onChange={(e) => {
                              handleImageChange(e, setFieldValue);
                              setFieldValue('imageFile', e.target.files?.[0] || null);
                            }}
                          />
                        </Button>
                        <FormHelperText
                          error={Boolean(errors.imageFile && touched.imageFile && !isEditMode)}
                          sx={{ textAlign: 'center', fontSize: '0.875rem' }}
                        >
                          {errors.imageFile && touched.imageFile && !isEditMode
                            ? errors.imageFile as string
                            : 'Supported formats: JPEG, PNG, GIF, WebP (max 5MB)'}
                        </FormHelperText>
                      </Box>
                      
                      {imagePreview && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ textAlign: 'center', color: 'success.main', mb: 2 }}>
                            <CheckCircleIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                            {selectedImage ? 'New Image Preview:' : 'Current Image Preview:'}
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
    
    {/* Snackbar for notifications */}
    <Snackbar 
      open={snackbar.open} 
      autoHideDuration={6000} 
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <MuiAlert 
        onClose={() => setSnackbar({ ...snackbar, open: false })} 
        severity={snackbar.severity}
        sx={{ width: '100%' }}
        elevation={6}
        variant="filled"
      >
        {snackbar.message}
      </MuiAlert>
    </Snackbar>
    </>
  );
};

export default EventForm;