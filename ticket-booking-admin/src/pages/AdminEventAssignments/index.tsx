import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  PersonRemove as PersonRemoveIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { showErrorToast, showSuccessToast } from '../../services/toast.service';

interface EventEmployeeAssignment {
  assignmentId: string;
  eventId: string;
  eventName: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  assignedByOrganizerId: string;
  assignedByOrganizerName: string;
  assignedAt: string;
  roleDescription?: string;
  notes?: string;
  isActive: boolean;
}

interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  organizerId: string;
  active: boolean;
}

interface Event {
  id: string;  // Backend returns 'id', not 'eventId'
  eventId?: string;  // Keep for compatibility
  name: string;
  organizer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Organizer {
  organizerId: string;
  firstName: string;
  lastName: string;
  email: string;
}

const AdminEventAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<EventEmployeeAssignment[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  
  // Form states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [roleDescription, setRoleDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<EventEmployeeAssignment | null>(null);
  const [unassigningEmployee, setUnassigningEmployee] = useState<EventEmployeeAssignment | null>(null);
  
  // Filter state
  const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
  
  // Assignment form organizer selection
  const [assignFormOrganizerId, setAssignFormOrganizerId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentsData, eventsData, employeesData, organizersData] = await Promise.all([
        api.get<EventEmployeeAssignment[]>('/api/admin/event-assignments'),
        api.get<any>('/api/admin/events?size=1000'),
        fetchAllEmployees(),
        api.get<any>('/api/admin/organizers?size=1000'),
      ]);
      setAssignments(assignmentsData.data);
      // Extract content from paginated response and map id to eventId
      const eventsContent = eventsData.data.content || eventsData.data;
      const mappedEvents = eventsContent.map((event: any) => ({
        ...event,
        eventId: event.id || event.eventId,  // Backend returns 'id', map to 'eventId'
      }));
      setEvents(mappedEvents);
      setEmployees(employeesData);
      // Extract content from paginated response
      setOrganizers(organizersData.data.content || organizersData.data);
    } catch (error) {
      showErrorToast('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchAllEmployees = async (): Promise<Employee[]> => {
    try {
      const response = await api.get<any>('/api/admin/organizer-employees?size=1000');
      // Handle paginated response
      return response.data.content || response.data;
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  };

  const handleAssign = async () => {
    if (!assignFormOrganizerId) {
      showErrorToast('Please select an organizer');
      return;
    }
    if (!selectedEventId) {
      showErrorToast('Please select an event');
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      showErrorToast('Please select at least one employee');
      return;
    }

    try {
      await api.post('/api/admin/event-assignments', {
        eventId: selectedEventId,
        employees: selectedEmployeeIds.map(employeeId => ({
          employeeId,
          roleDescription: roleDescription || undefined,
          notes: notes || undefined,
        })),
      });
      showSuccessToast('Employees assigned successfully');
      setAssignDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to assign employees');
      console.error('Error assigning employees:', error);
    }
  };

  const handleEdit = async () => {
    if (!editingAssignment) return;

    try {
      await api.patch(`/api/admin/event-assignments/${editingAssignment.assignmentId}`, null, {
        params: {
          roleDescription: roleDescription || undefined,
          notes: notes || undefined,
        },
      });
      showSuccessToast('Assignment updated successfully');
      setEditDialogOpen(false);
      setEditingAssignment(null);
      resetForm();
      fetchData();
    } catch (error) {
      showErrorToast('Failed to update assignment');
      console.error('Error updating assignment:', error);
    }
  };

  const handleUnassign = async () => {
    if (!unassigningEmployee) return;

    try {
      console.log('Unassigning employee:', unassigningEmployee.employeeId, 'from event:', unassigningEmployee.eventId);
      await api.delete(`/api/admin/event-assignments/events/${unassigningEmployee.eventId}/employees/${unassigningEmployee.employeeId}`);
      console.log('Unassign successful, refreshing data...');
      showSuccessToast('Employee unassigned successfully');
      setUnassignDialogOpen(false);
      setUnassigningEmployee(null);
      // Force immediate refresh
      await fetchData();
      console.log('Data refreshed, assignments count:', assignments.length);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to unassign employee');
      console.error('Error unassigning employee:', error);
    }
  };

  const resetForm = () => {
    setAssignFormOrganizerId('');
    setSelectedEventId('');
    setSelectedEmployeeIds([]);
    setRoleDescription('');
    setNotes('');
  };
  
  const getOrganizerEvents = (organizerId: string) => {
    const filteredEvents = events.filter(event => event.organizer?.id === organizerId);
    console.log('getOrganizerEvents called with:', organizerId);
    console.log('All events:', events);
    console.log('Filtered events:', filteredEvents);
    return filteredEvents;
  };
  
  const getOrganizerEmployees = (organizerId: string) => {
    const filteredEmployees = employees.filter(emp => emp.organizerId === organizerId && emp.active);
    console.log('getOrganizerEmployees called with:', organizerId);
    console.log('All employees:', employees);
    console.log('Filtered employees:', filteredEmployees);
    return filteredEmployees;
  };

  const openEditDialog = (assignment: EventEmployeeAssignment) => {
    setEditingAssignment(assignment);
    setRoleDescription(assignment.roleDescription || '');
    setNotes(assignment.notes || '');
    setEditDialogOpen(true);
  };

  const openUnassignDialog = (assignment: EventEmployeeAssignment) => {
    setUnassigningEmployee(assignment);
    setUnassignDialogOpen(true);
  };

  const filteredAssignments = selectedOrganizerId
    ? assignments.filter(a => {
        const event = events.find(e => e.eventId === a.eventId);
        return event?.organizer?.id === selectedOrganizerId;
      })
    : assignments;

  const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
    if (!acc[assignment.eventId]) {
      acc[assignment.eventId] = [];
    }
    acc[assignment.eventId].push(assignment);
    return acc;
  }, {} as Record<string, EventEmployeeAssignment[]>);

  const getEmployeesForEvent = (eventId: string) => {
    const event = events.find(e => e.eventId === eventId);
    if (!event || !event.organizer) return [];
    return employees.filter(emp => emp.organizerId === event.organizer!.id && emp.active);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Event-Employee Assignments
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAssignDialogOpen(true)}
        >
          Assign Employees
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Organizer</InputLabel>
                <Select
                  value={selectedOrganizerId}
                  onChange={(e) => setSelectedOrganizerId(e.target.value)}
                  label="Filter by Organizer"
                >
                  <MenuItem key="all" value="">All Organizers</MenuItem>
                  {organizers.map(org => (
                    <MenuItem key={org.organizerId} value={org.organizerId}>
                      {org.firstName} {org.lastName} ({org.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" color="text.secondary">
                Total Assignments: {filteredAssignments.length} | Events with Assignments: {Object.keys(groupedAssignments).length}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {Object.keys(groupedAssignments).length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No assignments found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Assign Employees" to create your first assignment
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedAssignments).map(([eventId, eventAssignments]) => {
          const event = events.find(e => e.eventId === eventId);
          return (
            <Accordion key={eventId} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" width="100%">
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {event?.name || 'Unknown Event'}
                  </Typography>
                  <Chip
                    label={`${eventAssignments.length} Employee${eventAssignments.length > 1 ? 's' : ''}`}
                    color="primary"
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Assigned By</TableCell>
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
                          <TableCell>{assignment.notes || '-'}</TableCell>
                          <TableCell>{assignment.assignedByOrganizerName}</TableCell>
                          <TableCell>
                            {new Date(assignment.assignedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(assignment)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openUnassignDialog(assignment)}
                              color="error"
                              title="Unassign Employee"
                            >
                              <PersonRemoveIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Assign Employees to Event</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Follow these steps: 1) Select an organizer → 2) Choose their event → 3) Assign their employees
          </Alert>
          
          {/* Step 1: Select Organizer */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Step 1: Select Organizer</InputLabel>
            <Select
              value={assignFormOrganizerId}
              onChange={(e) => {
                setAssignFormOrganizerId(e.target.value);
                setSelectedEventId('');
                setSelectedEmployeeIds([]);
              }}
              label="Step 1: Select Organizer"
            >
              <MenuItem value="">
                <em>Select an organizer</em>
              </MenuItem>
              {organizers.map((org) => (
                <MenuItem key={org.organizerId} value={org.organizerId}>
                  {org.firstName} {org.lastName} ({org.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Step 2: Select Event (only show if organizer is selected) */}
          {assignFormOrganizerId && (
            <>
              <FormControl fullWidth margin="normal" key={`event-${assignFormOrganizerId}`}>
                <InputLabel>Step 2: Select Event</InputLabel>
                <Select
                  value={selectedEventId}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value : '';
                    console.log('Event selected - raw value:', e.target.value, 'processed:', value);
                    const selectedEvent = events.find(ev => ev.eventId === value);
                    console.log('Selected event object:', selectedEvent);
                    setSelectedEventId(value);
                    setSelectedEmployeeIds([]);
                  }}
                  label="Step 2: Select Event"
                >
                  <MenuItem value="">
                    <em>Select an event</em>
                  </MenuItem>
                  {getOrganizerEvents(assignFormOrganizerId).map((event) => (
                    <MenuItem key={event.eventId} value={event.eventId}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {getOrganizerEvents(assignFormOrganizerId).length === 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This organizer has no events. Please select a different organizer.
                </Alert>
              )}
            </>
          )}
          
          {/* Step 3: Select Employees (only show if event is selected) */}
          {selectedEventId && assignFormOrganizerId && (
            <>
              <FormControl fullWidth margin="normal" key={`employees-${selectedEventId}`}>
                <InputLabel>Step 3: Select Employees</InputLabel>
                <Select
                  multiple
                  value={selectedEmployeeIds}
                  onChange={(e) => {
                    console.log('Employees selected:', e.target.value);
                    setSelectedEmployeeIds(e.target.value as string[]);
                  }}
                  label="Step 3: Select Employees"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((id) => {
                        const emp = employees.find(e => e.employeeId === id);
                        return (
                          <Chip 
                            key={id} 
                            label={emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'} 
                            size="small" 
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {getOrganizerEmployees(assignFormOrganizerId).map((emp) => (
                    <MenuItem key={emp.employeeId} value={emp.employeeId}>
                      {emp.firstName} {emp.lastName} ({emp.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {getOrganizerEmployees(assignFormOrganizerId).length === 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This organizer has no active employees. Please select a different organizer.
                </Alert>
              )}
            </>
          )}
          
          <TextField
            fullWidth
            margin="normal"
            label="Role Description (Optional)"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="e.g., Event Manager, Coordinator"
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAssignDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained">Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Assignment</DialogTitle>
        <DialogContent>
          {editingAssignment && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Event: {editingAssignment.eventName}<br />
                Employee: {editingAssignment.employeeName}
              </Typography>
              
              <TextField
                fullWidth
                margin="normal"
                label="Role Description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
              
              <TextField
                fullWidth
                margin="normal"
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); setEditingAssignment(null); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <Dialog open={unassignDialogOpen} onClose={() => setUnassignDialogOpen(false)}>
        <DialogTitle>Confirm Unassign Employee</DialogTitle>
        <DialogContent>
          {unassigningEmployee && (
            <Typography>
              Are you sure you want to unassign <strong>{unassigningEmployee.employeeName}</strong> from{' '}
              <strong>{unassigningEmployee.eventName}</strong>?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setUnassignDialogOpen(false); setUnassigningEmployee(null); }}>
            Cancel
          </Button>
          <Button onClick={handleUnassign} variant="contained" color="error" startIcon={<PersonRemoveIcon />}>
            Unassign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminEventAssignments;
