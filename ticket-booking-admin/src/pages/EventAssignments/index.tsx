import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import EventAssignmentService, { EventEmployeeAssignment } from '../../services/event-assignment.service';
import EventService from '../../services/event.service';
import { showErrorToast, showSuccessToast } from '../../services/toast.service';

interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
}

interface Event {
  id?: string;
  eventId?: string;
  name: string;
  status: string;
}

const EventAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<EventEmployeeAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [roleDescription, setRoleDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<EventEmployeeAssignment | null>(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, eventsData, employeesData] = await Promise.all([
        EventAssignmentService.getAllAssignments(),
        EventService.getOrganizerEvents(),
        fetchEmployees(),
      ]);
      setAssignments(assignmentsData);
      setEvents(eventsData);
      setEmployees(employeesData);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (): Promise<Employee[]> => {
    try {
      const response = await api.get<any>('/api/organizer/employees');
      // Backend returns Page<OrganizerEmployeeDTO>, extract content array
      return response.data.content || [];
    } catch (error) {
      showErrorToast('Failed to fetch employees');
      return [];
    }
  };

  const handleOpenAssignDialog = () => {
    setSelectedEvent('');
    setSelectedEmployees([]);
    setRoleDescription('');
    setNotes('');
    setOpenAssignDialog(true);
  };

  const handleAssignEmployees = async () => {
    if (!selectedEvent || selectedEmployees.length === 0) {
      showErrorToast('Please select an event and at least one employee');
      return;
    }

    try {
      await EventAssignmentService.assignEmployeesToEvent({
        eventId: selectedEvent,
        employees: selectedEmployees.map((empId) => ({
          employeeId: empId,
          roleDescription: roleDescription || undefined,
          notes: notes || undefined,
        })),
      });
      showSuccessToast('Employees assigned successfully');
      setOpenAssignDialog(false);
      fetchData();
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to assign employees');
    }
  };

  const handleRemoveAssignment = async (eventId: string, employeeId: string) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) return;

    try {
      await EventAssignmentService.removeEmployeeFromEvent(eventId, employeeId);
      showSuccessToast('Assignment removed successfully');
      fetchData();
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to remove assignment');
    }
  };

  const handleOpenEditDialog = (assignment: EventEmployeeAssignment) => {
    setEditingAssignment(assignment);
    setRoleDescription(assignment.roleDescription || '');
    setNotes(assignment.notes || '');
    setOpenEditDialog(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      await EventAssignmentService.updateAssignment(
        editingAssignment.assignmentId,
        roleDescription,
        notes
      );
      showSuccessToast('Assignment updated successfully');
      setOpenEditDialog(false);
      fetchData();
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to update assignment');
    }
  };

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.eventId === eventId);
    return event?.name || 'Unknown Event';
  };

  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.eventId]) {
      acc[assignment.eventId] = [];
    }
    acc[assignment.eventId].push(assignment);
    return acc;
  }, {} as Record<string, EventEmployeeAssignment[]>);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Event Employee Assignments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAssignDialog}>
          Assign Employees
        </Button>
      </Box>

      {Object.keys(groupedAssignments).length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No assignments found. Start by assigning employees to events.</Typography>
        </Paper>
      ) : (
        Object.entries(groupedAssignments).map(([eventId, eventAssignments]) => (
          <Paper key={eventId} sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {getEventName(eventId)}
              <Chip label={`${eventAssignments.length} employees`} size="small" sx={{ ml: 2 }} />
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Assigned At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventAssignments.map((assignment) => (
                    <TableRow key={assignment.assignmentId}>
                      <TableCell>{assignment.employeeName}</TableCell>
                      <TableCell>{assignment.employeeEmail}</TableCell>
                      <TableCell>{assignment.roleDescription || '-'}</TableCell>
                      <TableCell>{new Date(assignment.assignedAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenEditDialog(assignment)} title="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveAssignment(assignment.eventId, assignment.employeeId)}
                          title="Remove"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))
      )}

      {/* Assign Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Employees to Event</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Event</InputLabel>
              <Select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} label="Event">
                {events.map((event) => (
                  <MenuItem key={event.id || event.eventId} value={event.id || event.eventId}>
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Employees</InputLabel>
              <Select
                multiple
                value={selectedEmployees}
                onChange={(e) => setSelectedEmployees(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                input={<OutlinedInput label="Employees" />}
                renderValue={(selected) => `${selected.length} selected`}
              >
                {employees.filter((emp) => emp.active).map((employee) => (
                  <MenuItem key={employee.employeeId} value={employee.employeeId}>
                    <Checkbox checked={selectedEmployees.indexOf(employee.employeeId) > -1} />
                    <ListItemText primary={`${employee.firstName} ${employee.lastName}`} secondary={employee.email} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Role Description (Optional)"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              fullWidth
              placeholder="e.g., Event Manager, Ticket Validator"
            />

            <TextField
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button onClick={handleAssignEmployees} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Editing assignment for <strong>{editingAssignment?.employeeName}</strong> on event{' '}
              <strong>{editingAssignment?.eventName}</strong>
            </Alert>

            <TextField
              label="Role Description"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              fullWidth
            />

            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateAssignment} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventAssignments;
