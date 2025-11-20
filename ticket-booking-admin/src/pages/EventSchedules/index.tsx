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
  EventAvailable as EventAvailableIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSchedule, setSelectedSchedule] = useState<EventSchedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    console.log('EventSchedules - eventId from useParams:', eventId);
    if (eventId && eventId !== 'undefined') {
      fetchEvent();
      fetchSchedules();
    } else {
      console.error('EventSchedules - Invalid or missing eventId:', eventId);
      navigate('/organizer/events');
    }
  }, [eventId]);

  const fetchEvent = async () => {
    if (!eventId || eventId === 'undefined') {
      console.error('Cannot fetch event - eventId is:', eventId);
      return;
    }
    try {
      const response = await EventService.getEventById(eventId);
      setEvent(response);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchSchedules = async () => {
    if (!eventId || eventId === 'undefined') {
      console.error('Cannot fetch schedules - eventId is:', eventId);
      return;
    }
    setLoading(true);
    try {
      const response = await EventScheduleService.getSchedulesForEvent(eventId);
      setSchedules(response);
    } catch (error) {
      console.error('Error fetching schedules:', error);
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
      console.error('Error deleting schedule:', error);
      alert(error.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const handleChangeStatus = async (schedule: EventSchedule, status: ScheduleStatus) => {
    try {
      await EventScheduleService.changeScheduleStatus(eventId!, schedule.scheduleId, status);
      fetchSchedules();
    } catch (error) {
      console.error('Error changing schedule status:', error);
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

  const validationSchema = Yup.object({
    scheduleDate: Yup.date()
      .required('Schedule date is required')
      .min(new Date(new Date().setDate(new Date().getDate() - 1)), 'Date cannot be in the past'),
    startTime: Yup.date().required('Start time is required'),
    endTime: Yup.date()
      .required('End time is required')
      .min(Yup.ref('startTime'), 'End time must be after start time'),
    capacity: Yup.number()
      .required('Capacity is required')
      .min(1, 'Capacity must be at least 1')
      .max(100000, 'Capacity cannot exceed 100,000'),
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
            <IconButton onClick={() => navigate('/organizer/events')} color="primary">
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
            }}
          >
            Add Schedule
          </Button>
        </Grid>

        {/* Event Info Card */}
        {event && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Base Price
                  </Typography>
                  <Typography variant="h6">LKR {event.basePrice}</Typography>
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
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.1)' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Capacity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Available</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Booked</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.scheduleId} hover>
                        <TableCell>{formatDate(schedule.scheduleDate)}</TableCell>
                        <TableCell>
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </TableCell>
                        <TableCell>{schedule.capacity}</TableCell>
                        <TableCell>
                          <Chip
                            label={schedule.availableSeats}
                            size="small"
                            color={schedule.availableSeats > 0 ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{schedule.bookedSeats}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">LKR {schedule.finalPrice}</Typography>
                            {schedule.priceAdjustment !== 0 && (
                              <Typography
                                variant="caption"
                                color={schedule.priceAdjustment > 0 ? 'success.main' : 'error.main'}
                              >
                                {schedule.priceAdjustment > 0 ? '+' : ''}
                                {schedule.priceAdjustment}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={schedule.status}
                            color={getStatusChipColor(schedule.status)}
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
                    ))}
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
          {selectedSchedule ? 'Edit Schedule' : 'Add New Schedule'}
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
                : new Date(),
              endTime: selectedSchedule?.endTime
                ? new Date(`2000-01-01T${selectedSchedule.endTime}`)
                : new Date(),
              capacity: selectedSchedule?.capacity || 100,
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
                console.error('Error saving schedule:', error);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, errors, touched, setFieldValue, handleChange, handleBlur, isSubmitting }) => (
              <Form>
                <Box sx={{ mt: 2 }}>
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
                              helperText: touched.startTime && errors.startTime as string,
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
                              helperText: touched.endTime && errors.endTime as string,
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        name="capacity"
                        label="Capacity"
                        value={values.capacity}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.capacity && Boolean(errors.capacity)}
                        helperText={touched.capacity && errors.capacity as string}
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
                            : `Final Price: LKR ${(event?.basePrice || 0) + values.priceAdjustment}`
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

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={handleDialogClose} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <CircularProgress size={24} /> : 'Save'}
                    </Button>
                  </Box>
                </Box>
              </Form>
            )}
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
