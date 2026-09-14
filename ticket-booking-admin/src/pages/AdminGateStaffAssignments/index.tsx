import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Radio,
  Divider,
  TextField,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  EventNote as EventIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { gateStaffService } from '../../services/gateStaff.service';
import eventService from '../../services/event.service';
import eventScheduleService from '../../services/eventSchedule.service';
import { GateStaff, GateStaffAssignment, AssignGateStaffRequest, EventSchedule, UpdateGateStaffAssignmentRequest } from '../../types';

export const AdminGateStaffAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<GateStaffAssignment[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [gateStaffList, setGateStaffList] = useState<GateStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [filterEventId, setFilterEventId] = useState<string>('');

  // Assign Dialog (Create)
  const [openModal, setOpenModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventSchedules, setEventSchedules] = useState<EventSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [isAllSchedules, setIsAllSchedules] = useState(true);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [assignNotes, setAssignNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Assignment Dialog
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<GateStaffAssignment | null>(null);
  const [editStaffId, setEditStaffId] = useState<string>('');
  const [editIsAllSchedules, setEditIsAllSchedules] = useState<boolean>(true);
  const [editScheduleId, setEditScheduleId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editEventSchedules, setEditEventSchedules] = useState<EventSchedule[]>([]);
  const [editLoadingSchedules, setEditLoadingSchedules] = useState<boolean>(false);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirm Dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gateStaffService.getAllAssignments(
        filterEventId ? { eventId: filterEventId } : undefined
      );
      setAssignments(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load gate staff assignments.');
    } finally {
      setLoading(false);
    }
  }, [filterEventId]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [eventsRes, staffRes] = await Promise.all([
        eventService.getAllEvents(),
        gateStaffService.getAllGateStaff(),
      ]);
      const evList = eventsRes?.content || (Array.isArray(eventsRes) ? eventsRes : []);
      setEvents(evList);
      setGateStaffList(staffRes || []);
    } catch (err: any) {
      console.error('Failed to load initial assignment data:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // When event is selected in assignment modal, load its schedules dynamically
  useEffect(() => {
    if (!selectedEventId) {
      setEventSchedules([]);
      setSelectedScheduleIds([]);
      return;
    }

    const loadSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const schList = await eventScheduleService.getSchedulesForEvent(selectedEventId);
        setEventSchedules(schList || []);
      } catch (e) {
        // Fallback to embedded schedules if available
        const found = events.find((ev) => String(ev.eventId || ev.id) === String(selectedEventId));
        setEventSchedules(found?.schedules || []);
      } finally {
        setLoadingSchedules(false);
      }
    };

    loadSchedules();
    setIsAllSchedules(true);
    setSelectedScheduleIds([]);
  }, [selectedEventId, events]);

  // Helper: Get staff members already assigned to a specific schedule (or all schedules) for an event
  const getAssignedStaffForSchedule = (eventId: string, scheduleId?: string) => {
    if (!scheduleId) {
      return assignments.filter(
        (a) => String(a.eventId) === String(eventId) && (a.isAllSchedules || !a.scheduleId)
      );
    }
    return assignments.filter(
      (a) =>
        String(a.eventId) === String(eventId) &&
        (String(a.scheduleId) === String(scheduleId) || a.isAllSchedules || !a.scheduleId)
    );
  };

  // Helper: Get a staff member's current assignments for the selected event
  const getStaffCurrentAssignmentsForEvent = (eventId: string, staffId: string) => {
    return assignments.filter(
      (a) => String(a.staffUserId) === String(staffId) && String(a.eventId) === String(eventId)
    );
  };

  const handleOpenAssignModal = () => {
    setSelectedEventId(events.length > 0 ? String(events[0].eventId || events[0].id) : '');
    setIsAllSchedules(true);
    setSelectedScheduleIds([]);
    setSelectedStaffIds([]);
    setAssignNotes('');
    setOpenModal(true);
  };

  const handleToggleSchedule = (scheduleId: string) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(scheduleId) ? prev.filter((id) => id !== scheduleId) : [...prev, scheduleId]
    );
  };

  const handleToggleStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSelectAllStaff = () => {
    if (selectedStaffIds.length === gateStaffList.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(gateStaffList.map((s) => s.id));
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedEventId) {
      setError('Please select an Event to assign.');
      return;
    }

    if (selectedStaffIds.length === 0) {
      setError('Please select at least one Gate Staff member.');
      return;
    }

    if (!isAllSchedules && selectedScheduleIds.length === 0) {
      setError('Please select at least one schedule or choose "All Schedules".');
      return;
    }

    setSubmitting(true);
    try {
      const payload: AssignGateStaffRequest = {
        eventId: selectedEventId,
        scheduleIds: isAllSchedules ? undefined : selectedScheduleIds,
        staffUserIds: selectedStaffIds,
        notes: assignNotes.trim() || undefined,
      };

      await gateStaffService.assignGateStaff(payload);
      setSuccessMsg('Gate staff assigned successfully.');
      setOpenModal(false);
      fetchAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign gate staff.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Assignment Dialog
  const handleOpenEdit = async (assignment: GateStaffAssignment) => {
    setEditingAssignment(assignment);
    setEditStaffId(assignment.staffUserId || '');
    const hasSpecificSchedule = Boolean(assignment.scheduleId && !assignment.isAllSchedules);
    setEditIsAllSchedules(!hasSpecificSchedule);
    setEditScheduleId(assignment.scheduleId || '');
    setEditNotes(assignment.notes || '');
    setEditError(null);
    setOpenEditModal(true);

    // Load schedules for this assignment's event
    setEditLoadingSchedules(true);
    try {
      const schedules = await eventScheduleService.getSchedulesForEvent(assignment.eventId);
      setEditEventSchedules(schedules || []);
    } catch (err) {
      const found = events.find((ev) => String(ev.eventId || ev.id) === String(assignment.eventId));
      setEditEventSchedules(found?.schedules || []);
    } finally {
      setEditLoadingSchedules(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setEditError(null);

    if (!editStaffId) {
      setEditError('Please select a Gate Staff member.');
      return;
    }

    if (!editIsAllSchedules && !editScheduleId) {
      setEditError('Please select a specific showtime or select "Assign to ALL showtimes".');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload: UpdateGateStaffAssignmentRequest = {
        staffUserId: editStaffId,
        isAllSchedules: editIsAllSchedules,
        scheduleId: editIsAllSchedules ? null : editScheduleId,
        notes: editNotes.trim() || undefined,
      };

      await gateStaffService.updateAssignment(editingAssignment.assignmentId, payload);
      setSuccessMsg('Gate staff assignment updated successfully.');
      setOpenEditModal(false);
      setEditingAssignment(null);
      fetchAssignments();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update assignment.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await gateStaffService.removeAssignment(deleteConfirmId);
      setDeleteConfirmId(null);
      setSuccessMsg('Assignment removed successfully.');
      fetchAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove assignment.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header Card */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                }}
              >
                <AssignmentIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
                  Gate Staff Assignments
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Assign Gate Keepers to specific events and showtime schedules for ticket verification
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => fetchAssignments()}
                sx={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAssignModal}
                disabled={gateStaffList.length === 0 || events.length === 0}
                sx={{
                  bgcolor: '#ff1955',
                  color: '#ffffff',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#e0144c' },
                }}
              >
                Assign Gate Staff
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Notifications */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Event Filter Bar */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel id="event-filter-label">Filter by Event</InputLabel>
              <Select
                labelId="event-filter-label"
                value={filterEventId}
                label="Filter by Event"
                onChange={(e) => setFilterEventId(e.target.value)}
              >
                <MenuItem value="">All Events</MenuItem>
                {events.map((ev) => (
                  <MenuItem key={ev.eventId || ev.id} value={String(ev.eventId || ev.id)}>
                    {ev.name || ev.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(0, 0, 0, 0.04)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Gate Staff Member</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned Event</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Schedule / Showtime</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} sx={{ color: '#ff1955', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Loading gate staff assignments...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      No active gate staff assignments found.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Click "Assign Gate Staff" to allocate staff members to events and showtimes.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.assignmentId} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            bgcolor: 'rgba(59, 130, 246, 0.1)',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          <PersonIcon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {assignment.staffName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {assignment.staffEmail}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventIcon sx={{ fontSize: 18, color: '#ff1955' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {assignment.eventTitle}
                        </Typography>
                      </Box>
                      {assignment.venueName && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', ml: 3.2 }}>
                          {assignment.venueName}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {assignment.isAllSchedules || !assignment.scheduleDate ? (
                        <Chip
                          label="All Showtimes / Schedules"
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {assignment.scheduleDate} • {assignment.startTime ? String(assignment.startTime).slice(0, 5) : ''}
                            {assignment.endTime ? ` - ${String(assignment.endTime).slice(0, 5)}` : ''}
                          </Typography>
                        </Box>
                      )}
                      {assignment.notes && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                          Note: {assignment.notes}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{assignment.assignedByName || 'System Admin'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Edit Assignment">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEdit(assignment)}
                          sx={{
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.2)',
                            },
                            mr: 0.5,
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Remove Assignment">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteConfirmId(assignment.assignmentId)}
                          sx={{
                            backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(211, 47, 47, 0.2)',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Assign Gate Staff Dialog (Create) */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleAssignSubmit}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Assign Gate Staff to Event</span>
            <IconButton size="small" onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              {/* Event Select */}
              <FormControl fullWidth required>
                <InputLabel id="assign-event-label">Select Event</InputLabel>
                <Select
                  labelId="assign-event-label"
                  value={selectedEventId}
                  label="Select Event"
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map((ev) => (
                    <MenuItem key={ev.eventId || ev.id} value={String(ev.eventId || ev.id)}>
                      {ev.name || ev.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Schedules / Showtimes */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Target Showtimes / Schedules
                </Typography>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 1.5,
                    borderRadius: 2,
                    bgcolor: isAllSchedules ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    borderColor: isAllSchedules ? '#3b82f6' : 'rgba(0, 0, 0, 0.12)',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isAllSchedules}
                        onChange={(e) => {
                          setIsAllSchedules(e.target.checked);
                          if (e.target.checked) setSelectedScheduleIds([]);
                        }}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Assign to ALL showtimes for this event
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Staff will be authorized to scan tickets across any showtime/date for this event.
                        </Typography>
                      </Box>
                    }
                  />
                  {(() => {
                    const allShowtimeStaff = getAssignedStaffForSchedule(selectedEventId);
                    if (allShowtimeStaff.length > 0) {
                      return (
                        <Box sx={{ mt: 1, pl: 4, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            Currently assigned to all showtimes:
                          </Typography>
                          {allShowtimeStaff.map((a) => (
                            <Chip
                              key={a.assignmentId}
                              label={a.staffName}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          ))}
                        </Box>
                      );
                    }
                    return null;
                  })()}
                </Paper>

                {!isAllSchedules && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Select specific showtimes to assign (shows currently assigned staff):
                    </Typography>

                    {loadingSchedules ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : eventSchedules.length === 0 ? (
                      <Alert severity="info">
                        No specific showtime schedules found for this event. You can assign staff to All Showtimes.
                      </Alert>
                    ) : (
                      eventSchedules.map((sch) => {
                        const isSelected = selectedScheduleIds.includes(sch.scheduleId);
                        const assignedStaff = getAssignedStaffForSchedule(selectedEventId, sch.scheduleId);

                        return (
                          <Paper
                            key={sch.scheduleId}
                            variant="outlined"
                            onClick={() => handleToggleSchedule(sch.scheduleId)}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              bgcolor: isSelected ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
                              borderColor: isSelected ? '#3b82f6' : 'rgba(0, 0, 0, 0.12)',
                              '&:hover': {
                                borderColor: '#3b82f6',
                                bgcolor: 'rgba(59, 130, 246, 0.03)',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Checkbox
                                size="small"
                                checked={isSelected}
                                onChange={() => handleToggleSchedule(sch.scheduleId)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ p: 0.5, mt: -0.25 }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {sch.scheduleDate} at {String(sch.startTime || '').slice(0, 5)}
                                    {sch.endTime ? ` - ${String(sch.endTime).slice(0, 5)}` : ''}
                                  </Typography>
                                  {assignedStaff.length > 0 ? (
                                    <Chip
                                      label={`${assignedStaff.length} Staff Assigned`}
                                      size="small"
                                      color="info"
                                      sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                                    />
                                  ) : (
                                    <Chip
                                      label="No Staff Assigned"
                                      size="small"
                                      variant="outlined"
                                      color="default"
                                      sx={{ fontSize: '0.7rem', height: 22 }}
                                    />
                                  )}
                                </Box>

                                {/* Assigned staff pills */}
                                {assignedStaff.length > 0 ? (
                                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                      Assigned:
                                    </Typography>
                                    {assignedStaff.map((st) => (
                                      <Chip
                                        key={st.assignmentId}
                                        avatar={<Avatar sx={{ width: 16, height: 16, fontSize: '0.65rem' }}>{st.staffName ? st.staffName[0] : 'S'}</Avatar>}
                                        label={st.staffName}
                                        size="small"
                                        sx={{
                                          fontSize: '0.7rem',
                                          height: 22,
                                          bgcolor: 'rgba(59, 130, 246, 0.1)',
                                          color: '#1d4ed8',
                                          fontWeight: 600,
                                        }}
                                      />
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Gate operator needed for this showtime.
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Paper>
                        );
                      })
                    )}
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Gate Staff Selection */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Select Gate Staff Members ({selectedStaffIds.length}/{gateStaffList.length})
                  </Typography>
                  <Button size="small" onClick={handleSelectAllStaff} sx={{ textTransform: 'none' }}>
                    {selectedStaffIds.length === gateStaffList.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Box>

                <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 220, overflowY: 'auto', borderRadius: 2 }}>
                  {gateStaffList.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No gate staff members created yet. Go to Gate Staff tab to create accounts.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {gateStaffList.map((staff) => {
                        const isChecked = selectedStaffIds.includes(staff.id);
                        const staffAssignments = getStaffCurrentAssignmentsForEvent(selectedEventId, staff.id);
                        const isAssignedToAll = staffAssignments.some((a) => a.isAllSchedules || !a.scheduleId);
                        const specificAssignments = staffAssignments.filter((a) => !a.isAllSchedules && a.scheduleId);

                        return (
                          <Box
                            key={staff.id}
                            onClick={() => handleToggleStaff(staff.id)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1,
                              borderRadius: 1.5,
                              cursor: 'pointer',
                              bgcolor: isChecked ? 'rgba(255, 25, 85, 0.05)' : 'transparent',
                              border: isChecked ? '1px solid rgba(255, 25, 85, 0.3)' : '1px solid transparent',
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.02)',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={() => handleToggleStaff(staff.id)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ p: 0.5, color: isChecked ? '#ff1955' : undefined, '&.Mui-checked': { color: '#ff1955' } }}
                              />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {staff.firstName} {staff.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {staff.email} {staff.phoneNumber ? `• ${staff.phoneNumber}` : ''}
                                </Typography>
                              </Box>
                            </Box>

                            <Box>
                              {isAssignedToAll ? (
                                <Chip
                                  label="Assigned (All Showtimes)"
                                  size="small"
                                  color="warning"
                                  sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                                />
                              ) : specificAssignments.length > 0 ? (
                                <Chip
                                  label={`Assigned (${specificAssignments.length} Showtime${specificAssignments.length > 1 ? 's' : ''})`}
                                  size="small"
                                  color="info"
                                  sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                                />
                              ) : (
                                <Chip
                                  label="Available"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.68rem', height: 20 }}
                                />
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </Box>

              {/* Assignment Notes */}
              <TextField
                fullWidth
                label="Internal Notes / Instructions (Optional)"
                placeholder="e.g. Gate 2 entry scanner, VIP line..."
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                size="small"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || selectedStaffIds.length === 0}
              sx={{ bgcolor: '#ff1955', color: '#fff', '&:hover': { bgcolor: '#e0144c' } }}
            >
              {submitting ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Gate Staff Assignment Dialog */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="sm" fullWidth>
        {editingAssignment && (
          <form onSubmit={handleEditSubmit}>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Edit Gate Staff Assignment</span>
              <IconButton size="small" onClick={() => setOpenEditModal(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                {editError && (
                  <Alert severity="error" onClose={() => setEditError(null)}>
                    {editError}
                  </Alert>
                )}

                {/* Event Information Card (Readonly) */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 25, 85, 0.04)',
                    borderColor: 'rgba(255, 25, 85, 0.2)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#ff1955', fontWeight: 700, textTransform: 'uppercase' }}>
                    Target Event
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <EventIcon sx={{ fontSize: 20, color: '#ff1955' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {editingAssignment.eventTitle}
                    </Typography>
                  </Box>
                  {editingAssignment.venueName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5, color: 'text.secondary' }}>
                      <LocationIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{editingAssignment.venueName}</Typography>
                    </Box>
                  )}
                </Paper>

                {/* Staff Member Selection */}
                <FormControl fullWidth required>
                  <InputLabel id="edit-staff-select-label">Assigned Gate Staff Member</InputLabel>
                  <Select
                    labelId="edit-staff-select-label"
                    value={editStaffId}
                    label="Assigned Gate Staff Member"
                    onChange={(e) => setEditStaffId(e.target.value)}
                  >
                    {gateStaffList.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: '0.75rem', bgcolor: '#3b82f6' }}>
                            {staff.firstName ? staff.firstName[0].toUpperCase() : 'G'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {staff.firstName} {staff.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {staff.email} {staff.phoneNumber ? `• ${staff.phoneNumber}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Target Showtime Selection */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Target Showtimes / Schedules
                  </Typography>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      mb: 1.5,
                      borderRadius: 2,
                      bgcolor: editIsAllSchedules ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                      borderColor: editIsAllSchedules ? '#3b82f6' : 'rgba(0, 0, 0, 0.12)',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editIsAllSchedules}
                          onChange={(e) => {
                            setEditIsAllSchedules(e.target.checked);
                            if (e.target.checked) setEditScheduleId('');
                          }}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Assign to ALL showtimes for this event
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Staff will be authorized to scan tickets across any showtime/date for this event.
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>

                  {!editIsAllSchedules && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Select one specific showtime for this assignment:
                      </Typography>

                      {editLoadingSchedules ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : editEventSchedules.length === 0 ? (
                        <Alert severity="info">
                          No specific showtime schedules found for this event.
                        </Alert>
                      ) : (
                        editEventSchedules.map((sch) => {
                          const isSelected = editScheduleId === sch.scheduleId;
                          const assignedStaff = getAssignedStaffForSchedule(editingAssignment.eventId, sch.scheduleId);

                          return (
                            <Paper
                              key={sch.scheduleId}
                              variant="outlined"
                              onClick={() => setEditScheduleId(sch.scheduleId)}
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                bgcolor: isSelected ? 'rgba(59, 130, 246, 0.06)' : '#ffffff',
                                borderColor: isSelected ? '#3b82f6' : 'rgba(0, 0, 0, 0.12)',
                                '&:hover': {
                                  borderColor: '#3b82f6',
                                  bgcolor: 'rgba(59, 130, 246, 0.03)',
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Radio
                                  checked={isSelected}
                                  onChange={() => setEditScheduleId(sch.scheduleId)}
                                  value={sch.scheduleId}
                                  name="edit-schedule-radio"
                                  sx={{ p: 0.5 }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {sch.scheduleDate} at {String(sch.startTime || '').slice(0, 5)}
                                      {sch.endTime ? ` - ${String(sch.endTime).slice(0, 5)}` : ''}
                                    </Typography>
                                    {assignedStaff.length > 0 ? (
                                      <Chip
                                        label={`${assignedStaff.length} Staff Assigned`}
                                        size="small"
                                        color="info"
                                        sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                                      />
                                    ) : (
                                      <Chip
                                        label="No Staff Assigned"
                                        size="small"
                                        variant="outlined"
                                        color="default"
                                        sx={{ fontSize: '0.7rem', height: 22 }}
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            </Paper>
                          );
                        })
                      )}
                    </Box>
                  )}
                </Box>

                {/* Notes Input */}
                <TextField
                  fullWidth
                  label="Internal Notes / Instructions"
                  placeholder="e.g. Main Gate, VIP Scanner 1, Gate B..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  multiline
                  rows={2}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenEditModal(false)} disabled={editSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={editSubmitting || !editStaffId || (!editIsAllSchedules && !editScheduleId)}
                sx={{ bgcolor: '#ff1955', color: '#fff', '&:hover': { bgcolor: '#e0144c' } }}
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Unassignment</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to remove this gate staff assignment? The operator will no longer be able to scan tickets for this event.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRemoveConfirm}>
            Remove Assignment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminGateStaffAssignments;
