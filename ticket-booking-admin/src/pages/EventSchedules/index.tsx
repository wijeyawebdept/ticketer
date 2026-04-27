import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { EventScheduleService, EventService } from '../../services';
import { EventSchedule, EventScheduleRequest, ScheduleStatus, Event } from '../../types';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

const EventSchedules: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSchedule, setSelectedSchedule] = useState<EventSchedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // Determine the correct back navigation path based on current route
  const getBackPath = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/organizer/')) {
      return '/organizer/events';
    } else if (pathname.startsWith('/employee/')) {
      return '/employee/events';
    } else if (pathname.startsWith('/admin/')) {
      return '/admin/events';
    } else {
      // Default to admin events (this page should only be accessed by admin/organizer/employee)
      return '/admin/events';
    }
  };

  useEffect(() => {
    if (eventId && eventId !== 'undefined') {
      fetchEvent();
      fetchSchedules();
    } else {
      navigate(getBackPath());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEvent = async () => {
    if (!eventId || eventId === 'undefined') {
      return;
    }
    try {
      const response = await EventService.getEventById(eventId);

      setEvent(response);
    } catch (error) {
    }
  };

  const fetchSchedules = async () => {
    if (!eventId || eventId === 'undefined') {
      return;
    }
    setLoading(true);
    try {
      const response = await EventScheduleService.getSchedulesForEvent(eventId);
      setSchedules(response);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedSchedule(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (schedule: EventSchedule) => {
    setSelectedSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (schedule: EventSchedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedSchedule(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedSchedule(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchedule) return;

    try {
      await EventScheduleService.deleteSchedule(eventId!, selectedSchedule.scheduleId);
      fetchSchedules();
      handleDeleteDialogClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const handleChangeStatus = async (schedule: EventSchedule, status: ScheduleStatus) => {
    try {
      await EventScheduleService.changeScheduleStatus(eventId!, schedule.scheduleId, status);
      fetchSchedules();
    } catch (error) {
    }
  };

  const getStatusChipColor = (status: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.ACTIVE:
        return 'success';
      case ScheduleStatus.CANCELLED:
        return 'error';
      case ScheduleStatus.SOLD_OUT:
        return 'warning';
      case ScheduleStatus.COMPLETED:
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    // Time is in HH:mm:ss format from backend
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  // Calculate duration between two time strings
  const getScheduleDuration = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Format price with comma separator
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US');
  };

  // Check if schedule is in the past
  const isSchedulePast = (scheduleDate: string, endTime: string) => {
    const [hours, minutes] = endTime.split(':').map(Number);
    const scheduleDateTime = new Date(scheduleDate);
    scheduleDateTime.setHours(hours, minutes, 0, 0);
    return scheduleDateTime < new Date();
  };

  // Get effective status (including auto-detection of SOLD_OUT and EXPIRED)
  const getEffectiveStatus = (schedule: EventSchedule): ScheduleStatus => {
    // Check if sold out
    if (schedule.availableSeats === 0 && schedule.status === ScheduleStatus.ACTIVE) {
      return ScheduleStatus.SOLD_OUT;
    }
    // Check if expired (past date/time)
    if (isSchedulePast(schedule.scheduleDate, schedule.endTime) && schedule.status === ScheduleStatus.ACTIVE) {
      return ScheduleStatus.COMPLETED;
    }
    return schedule.status;
  };

  // Calculate total scheduled capacity across all schedules
  const getTotalScheduledCapacity = () => {
    return schedules.reduce((sum, schedule) => sum + schedule.capacity, 0);
  };

  // Sort schedules by date and time
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dateCompare = new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    // If same date, compare start times
    return a.startTime.localeCompare(b.startTime);
  });

  // Calculate duration in minutes
  const calculateDuration = (startTime: Date, endTime: Date): number => {
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.floor(diffMs / 60000); // Convert to minutes
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const validationSchema = Yup.object({
    scheduleDate: Yup.date()
      .required('Schedule date is required')
      .min(new Date(new Date().setDate(new Date().getDate() - 1)), 'Date cannot be in the past'),
    startTime: Yup.date()
      .required('Start time is required'),
    endTime: Yup.date()
      .required('End time is required')
      .test('is-after-start', 'End time must be after start time', function(value) {
        const { startTime } = this.parent;
        if (!value || !startTime) return true;
        return value.getTime() > startTime.getTime();
      })
      .test('minimum-duration', 'Event must be at least 15 minutes long', function(value) {
        const { startTime } = this.parent;
        if (!value || !startTime) return true;
        const duration = calculateDuration(startTime, value);
        return duration >= 15;
      }),
    capacity: Yup.number()
      .required('Capacity is required')
      .min(1, 'Capacity must be at least 1')
      .max(100000, 'Capacity cannot exceed 100,000')
      .test('not-exceed-event', 'Capacity cannot exceed event total capacity', function(value) {
        if (!event || !value) return true;
        return value <= (event.totalCapacity || 0);
      }),
    priceAdjustment: Yup.number()
      .min(-1000000, 'Price adjustment cannot be less than -1,000,000')
      .max(1000000, 'Price adjustment cannot exceed 1,000,000'),
    notes: Yup.string().max(1000, 'Notes cannot exceed 1000 characters'),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate(getBackPath())} color="primary">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>
                Event Schedules
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {event?.name}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
            sx={{
              borderRadius: 2,
              padding: '8px 16px',
              fontWeight: 600,
              boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
              position: 'sticky',
              top: 16,
              zIndex: 10,
            }}
          >
            Add Event Schedule
          </Button>
        </Grid>

        {/* Event Info Card */}
        {event && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Starting From
                  </Typography>
                  <Typography variant="h6">
                    {event.ticketCategories && event.ticketCategories.length > 0
                      ? `LKR ${Math.min(...event.ticketCategories.filter(tc => !tc.isSharedArea).map(tc => Number(tc.price) || 0)).toLocaleString()}`
                      : 'TBA'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Total Schedules
                  </Typography>
                  <Typography variant="h6">{schedules.length}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Schedules Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            ) : schedules.length === 0 ? (
              <Box textAlign="center" py={5}>
                <ScheduleIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  No schedules yet
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Add your first schedule to get started
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Box sx={{ px: 2, py: 1, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                  <Typography variant="caption" color="textSecondary">
                    📍 All times shown in Asia/Colombo (GMT+5:30)
                  </Typography>
                </Box>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.1)' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Time & Duration</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Capacity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedSchedules.map((schedule) => {
                      const effectiveStatus = getEffectiveStatus(schedule);
                      const isPast = isSchedulePast(schedule.scheduleDate, schedule.endTime);
                      
                      return (
                      <TableRow 
                        key={schedule.scheduleId} 
                        hover
                        sx={{
                          opacity: isPast && effectiveStatus === ScheduleStatus.COMPLETED ? 0.6 : 1,
                          backgroundColor: effectiveStatus === ScheduleStatus.SOLD_OUT ? 'rgba(255, 152, 0, 0.05)' : 'transparent'
                        }}
                      >
                        <TableCell>{formatDate(schedule.scheduleDate)}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Duration: {getScheduleDuration(schedule.startTime, schedule.endTime)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {schedule.availableSeats}/{schedule.capacity}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {schedule.bookedSeats} booked
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>LKR {formatPrice(schedule.finalPrice)}</Typography>
                            {schedule.priceAdjustment !== 0 && (
                              <Typography
                                variant="caption"
                                color={schedule.priceAdjustment > 0 ? 'success.main' : 'error.main'}
                              >
                                {schedule.priceAdjustment > 0 ? '+' : ''}
                                {formatPrice(Math.abs(schedule.priceAdjustment))}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={effectiveStatus}
                            color={getStatusChipColor(effectiveStatus)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditClick(schedule)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {schedule.status === ScheduleStatus.ACTIVE && (
                              <Tooltip title="Cancel">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handleChangeStatus(schedule, ScheduleStatus.CANCELLED)
                                  }
                                >
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {schedule.status === ScheduleStatus.CANCELLED && (
                              <Tooltip title="Reactivate">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() =>
                                    handleChangeStatus(schedule, ScheduleStatus.ACTIVE)
                                  }
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleDeleteClick(schedule)}
                                disabled={schedule.bookedSeats > 0}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add/Edit Schedule Dialog */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1976d2' }}>
          {selectedSchedule ? 'Edit Event Schedule' : 'Add Event Schedule'}
          {event && (
            <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 0.5 }}>
              {event.name}
            </Typography>
          )}
          <IconButton
            aria-label="close"
            onClick={handleDialogClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={{
              scheduleDate: selectedSchedule?.scheduleDate
                ? new Date(selectedSchedule.scheduleDate)
                : new Date(),
              startTime: selectedSchedule?.startTime
                ? new Date(`2000-01-01T${selectedSchedule.startTime}`)
                : (() => {
                    // Default to midnight (00:00) for new schedules
                    const date = new Date();
                    date.setHours(0, 0, 0, 0);
                    return date;
                  })(),
              endTime: selectedSchedule?.endTime
                ? new Date(`2000-01-01T${selectedSchedule.endTime}`)
                : (() => {
                    // Default to midnight (00:00) for new schedules
                    const date = new Date();
                    date.setHours(0, 0, 0, 0);
                    return date;
                  })(),
              capacity: selectedSchedule?.capacity || (event?.totalCapacity ?? 100),
              priceAdjustment: selectedSchedule?.priceAdjustment || 0,
              notes: selectedSchedule?.notes || '',
            }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                const request: EventScheduleRequest = {
                  scheduleDate: values.scheduleDate.toISOString().split('T')[0],
                  startTime: values.startTime.toTimeString().split(' ')[0].substring(0, 5),
                  endTime: values.endTime.toTimeString().split(' ')[0].substring(0, 5),
                  capacity: values.capacity,
                  priceAdjustment: values.priceAdjustment,
                  notes: values.notes,
                };

                if (selectedSchedule) {
                  await EventScheduleService.updateSchedule(
                    eventId!,
                    selectedSchedule.scheduleId,
                    request
                  );
                } else {
                  await EventScheduleService.createSchedule(eventId!, request);
                }

                fetchSchedules();
                handleDialogClose();
              } catch (error) {
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, errors, touched, setFieldValue, handleChange, handleBlur, isSubmitting }) => {
              const duration = calculateDuration(values.startTime, values.endTime);
              const hasErrors = Object.keys(errors).length > 0;
              const hasTouched = Object.keys(touched).length > 0;
              
              return (
                <Form>
                  <Box sx={{ mt: 2 }}>
                    {/* Capacity Info Alert */}
                    {event && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold">Event Capacity:</Typography>
                        <Typography variant="body2">
                          Maximum capacity per schedule: {event.totalCapacity || 0} seats
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Note: Each schedule is independent and can use the full event capacity.
                        </Typography>
                      </Alert>
                    )}

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Schedule Date"
                            value={values.scheduleDate}
                            onChange={(newValue) => setFieldValue('scheduleDate', newValue)}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                error: touched.scheduleDate && Boolean(errors.scheduleDate),
                                helperText: touched.scheduleDate && errors.scheduleDate as string,
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="Start Time"
                            value={values.startTime}
                            onChange={(newValue) => setFieldValue('startTime', newValue)}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                error: touched.startTime && Boolean(errors.startTime),
                                helperText: touched.startTime ? errors.startTime as string : 'Time zone: Asia/Colombo (GMT+5:30)',
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="End Time"
                            value={values.endTime}
                            onChange={(newValue) => setFieldValue('endTime', newValue)}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                error: touched.endTime && Boolean(errors.endTime),
                                helperText: touched.endTime ? 
                                  errors.endTime as string : 
                                  duration > 0 ? `Duration: ${formatDuration(duration)}` : 'Time zone: Asia/Colombo (GMT+5:30)',
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>

                      {/* Duration Display */}
                      {duration > 0 && (
                        <Grid item xs={12}>
                          <Alert 
                            severity={duration < 15 ? 'error' : 'success'} 
                            icon={duration >= 15 ? <CheckCircleIcon /> : undefined}
                            sx={{ py: 0.5 }}
                          >
                            <Typography variant="body2">
                              <strong>Event Duration:</strong> {formatDuration(duration)}
                              {duration < 15 && ' - Minimum 15 minutes required'}
                            </Typography>
                          </Alert>
                        </Grid>
                      )}

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          name="capacity"
                          label="Schedule Capacity"
                          value={values.capacity}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.capacity && Boolean(errors.capacity)}
                          helperText={
                            touched.capacity && errors.capacity ? 
                              errors.capacity as string : 
                              event ? `Default: ${event.venue?.capacity || 0} (Event capacity from venue)` : ''
                          }
                          inputProps={{ min: 1, max: event?.venue?.capacity || 100000 }}
                        />
                      </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        name="priceAdjustment"
                        label="Price Adjustment (LKR)"
                        value={values.priceAdjustment}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.priceAdjustment && Boolean(errors.priceAdjustment)}
                        helperText={
                          touched.priceAdjustment && errors.priceAdjustment
                            ? (errors.priceAdjustment as string)
                            : `Price adjustment applies to the per-category ticket price`
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        name="notes"
                        label="Notes (Optional)"
                        value={values.notes}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.notes && Boolean(errors.notes)}
                        helperText={touched.notes && errors.notes as string}
                      />
                    </Grid>
                  </Grid>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Button 
                        variant="outlined"
                        color="secondary"
                        onClick={handleDialogClose} 
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || (hasTouched && hasErrors)}
                        startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                      >
                        {isSubmitting ? 'Saving...' : selectedSchedule ? 'Update Schedule' : 'Create Schedule'}
                      </Button>
                    </Box>
                  </Box>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* Move to Recycle Bin Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Move Schedule to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move this schedule to the Recycle Bin? It will be marked as deleted
            and can be restored later or permanently deleted from the Recycle Bin page.
          </Typography>
          {selectedSchedule && selectedSchedule.bookedSeats > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This schedule has {selectedSchedule.bookedSeats} booked seats. Cancel the schedule
              instead of deleting it.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={selectedSchedule?.bookedSeats! > 0}
          >
            Move to Recycle Bin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventSchedules;
