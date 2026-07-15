import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  MenuItem,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { VenueService, EventService, EventCategoryService } from '../../services';
import venueSeatService, { VenueSeatCategoryDTO } from '../../services/venueSeatService';
import api from '../../services/api';
import { Venue, EventCategory, EventScheduleRequest } from '../../types';

interface TicketCategoryForm {
  categoryName: string;
  price: number;
  capacity: number;
  description: string;
  venueSeatCategoryName: string;
  isSharedArea?: boolean;
  sharedAreaNumber?: number;
}

const RequestEvent: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    venueId: '',
    imageUrl: '',
    totalCapacity: 0,
  });

  const [schedules, setSchedules] = useState<{
    scheduleDate: Date | null;
    startTime: Date | null;
    endTime: Date | null;
  }[]>([{ scheduleDate: null, startTime: null, endTime: null }]);

  const [ticketCategories, setTicketCategories] = useState<TicketCategoryForm[]>([]);

  useEffect(() => {
    const savedData = sessionStorage.getItem('requestEventForm');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.schedules) {
          const parsedSchedules = parsed.schedules.map((s: any) => ({
            scheduleDate: s.scheduleDate ? new Date(s.scheduleDate) : null,
            startTime: s.startTime ? new Date(s.startTime) : null,
            endTime: s.endTime ? new Date(s.endTime) : null,
          }));
          setSchedules(parsedSchedules);
        }
        if (parsed.ticketCategories) setTicketCategories(parsed.ticketCategories);
      } catch (error) {
        console.error('Failed to parse saved form data', error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const dataToSave = {
      formData,
      schedules: schedules.map(s => ({
        scheduleDate: s.scheduleDate ? s.scheduleDate.toISOString() : null,
        startTime: s.startTime ? s.startTime.toISOString() : null,
        endTime: s.endTime ? s.endTime.toISOString() : null,
      })),
      ticketCategories,
    };
    sessionStorage.setItem('requestEventForm', JSON.stringify(dataToSave));
  }, [formData, schedules, ticketCategories]);

  const fetchData = async () => {
    try {
      const [venuesData, categoriesData] = await Promise.all([
        VenueService.getAllVenues(),
        EventCategoryService.getActiveCategories()
      ]);
      setVenues(venuesData.filter(v => v.status !== 0));
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to fetch required data');
    }
  };

  const handleVenueChange = async (venueId: string) => {
    setFormData({ ...formData, venueId });
    if (!venueId) return;

    try {
      setLoading(true);
      const venue = venues.find(v => v.id === venueId);
      if (venue) {
        setFormData(prev => ({ ...prev, totalCapacity: venue.capacity || 0 }));
      }
      
      const categories: VenueSeatCategoryDTO[] = await venueSeatService.getVenueSeatCategories(venueId);
      
      const mappedCategories: TicketCategoryForm[] = categories.map(c => ({
        categoryName: c.categoryName,
        price: 0,
        capacity: c.seatCount,
        description: '',
        venueSeatCategoryName: c.categoryName,
        isSharedArea: false
      }));

      if (venue && venue.hasSharedAreas && venue.sharedAreaCount && venue.sharedAreaCount > 0) {
        const perAreaCapacity = Math.floor((venue.sharedAreaTotalCapacity || 0) / venue.sharedAreaCount);
        for (let i = 1; i <= venue.sharedAreaCount; i++) {
          mappedCategories.push({
            categoryName: `Shared Area ${i}`,
            price: 0,
            capacity: perAreaCapacity,
            description: 'General Admission / Standing Area',
            venueSeatCategoryName: '',
            isSharedArea: true,
            sharedAreaNumber: i
          });
        }
      }

      setTicketCategories(mappedCategories);
    } catch (error) {
      toast.error('Failed to fetch venue seat categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (index: number, field: string, value: any) => {
    const updated = [...ticketCategories];
    (updated[index] as any)[field] = value;
    setTicketCategories(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataToUpload = new FormData();
    formDataToUpload.append('file', file);

    setIsUploadingImage(true);
    try {
      const response = await api.post<{ url: string }>('/api/upload/image', formDataToUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFormData({ ...formData, imageUrl: response.data.url });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload failed', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleScheduleChange = (index: number, field: string, value: any) => {
    const updated = [...schedules];
    (updated[index] as any)[field] = value;
    setSchedules(updated);
  };

  const addSchedule = () => {
    setSchedules([...schedules, { scheduleDate: null, startTime: null, endTime: null }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId || !formData.venueId) {
      toast.error('Please fill all required basic fields');
      return;
    }

    if (schedules.length === 0 || schedules.some(s => !s.scheduleDate || !s.startTime || !s.endTime)) {
      toast.error('Please complete all schedule entries');
      return;
    }

    setLoading(true);
    try {
      const formattedSchedules = schedules.map(s => {
        const scheduleDate = s.scheduleDate!;
        const startTime = s.startTime!;
        const endTime = s.endTime!;
        
        return {
          scheduleDate: scheduleDate.toISOString().split('T')[0], // yyyy-MM-dd
          startTime: startTime.toTimeString().split(' ')[0], // HH:mm:ss
          endTime: endTime.toTimeString().split(' ')[0], // HH:mm:ss
          capacity: formData.totalCapacity || 100, // Or whatever default
          priceAdjustment: 0,
        };
      });

      const requestData = {
        ...formData,
        schedules: formattedSchedules,
        ticketCategories,
      };

      await EventService.requestEventCreation(requestData);
      sessionStorage.removeItem('requestEventForm');
      toast.success('Event request submitted successfully! Admin will review it.');
      navigate('/organizer/events');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit event request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Request Event Creation
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Fill out this form to request an admin to create an event on your behalf.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <Typography variant="h6">Event Details</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Event Title"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Detailed Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                required
                fullWidth
                label="Event Category"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.categoryName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Cover Image
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? <CircularProgress size={24} /> : 'Upload Image'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
                {formData.imageUrl && (
                  <Typography variant="body2" color="text.secondary">
                    Image uploaded successfully
                  </Typography>
                )}
              </Box>
              {formData.imageUrl && (
                <Box
                  component="img"
                  src={formData.imageUrl}
                  alt="Event Cover"
                  sx={{ width: '100%', maxWidth: 400, height: 'auto', borderRadius: 1 }}
                />
              )}
            </Grid>

            {/* Date and Time */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6">Date & Time</Typography>
            </Grid>
            <Grid item xs={12}>
              {schedules.map((schedule, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, position: 'relative' }}>
                  <Typography variant="subtitle2" gutterBottom>Schedule {index + 1}</Typography>
                  {schedules.length > 1 && (
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => removeSchedule(index)}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="Schedule Date"
                          value={schedule.scheduleDate}
                          onChange={(newValue) => handleScheduleChange(index, 'scheduleDate', newValue)}
                          slotProps={{ textField: { fullWidth: true, required: true } }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <TimePicker
                          label="Start Time"
                          value={schedule.startTime}
                          onChange={(newValue) => handleScheduleChange(index, 'startTime', newValue)}
                          slotProps={{ textField: { fullWidth: true, required: true } }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <TimePicker
                          label="End Time"
                          value={schedule.endTime}
                          onChange={(newValue) => handleScheduleChange(index, 'endTime', newValue)}
                          slotProps={{ textField: { fullWidth: true, required: true } }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              <Button 
                startIcon={<AddIcon />} 
                onClick={addSchedule} 
                variant="outlined" 
                size="small"
                sx={{ mt: 1 }}
              >
                Add Another Schedule
              </Button>
            </Grid>
            {/* Venue & Ticketing */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6">Venue & Ticketing</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                required
                fullWidth
                label="Select Venue"
                value={formData.venueId}
                onChange={(e) => handleVenueChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a venue</em>
                </MenuItem>
                {venues.map((venue) => (
                  <MenuItem key={venue.id} value={venue.id}>
                    {venue.name} - {venue.address}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {ticketCategories.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Ticket Categories
                </Typography>
                {ticketCategories.map((cat, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: '#f8fafc' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Category Name (You can rename this)"
                          value={cat.categoryName}
                          onChange={(e) => handleCategoryChange(index, 'categoryName', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Price"
                          value={cat.price}
                          onChange={(e) => handleCategoryChange(index, 'price', parseFloat(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          disabled
                          label="Capacity"
                          value={cat.capacity}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Grid>
            )}

            {/* Submit */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/organizer/events')}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Submit Request'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default RequestEvent;
