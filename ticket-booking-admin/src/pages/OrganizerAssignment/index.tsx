import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { showSuccessToast, showErrorToast } from '../../services/toast.service';
import ConfirmDialog from '../../components/ConfirmDialog';

interface Event {
  id: string;
  name: string;
  description: string;
  status: string;
  category: string | { id: string; categoryName: string; description?: string; active?: boolean; createdAt?: string; updatedAt?: string } | null;
  basePrice: number;
  createdAt: string;
  createdByType?: string; // "ADMIN", "SUPER_ADMIN", "ORGANIZER", etc.
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
  organizationName?: string;
  isVerified: boolean;
  active: boolean;
}

const OrganizerAssignment: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [eventToRemove, setEventToRemove] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsData, organizersData] = await Promise.all([
        api.get<any>('/api/admin/events?size=1000'),
        api.get<any>('/api/admin/organizers?size=1000'),
      ]);

      // Extract content from paginated responses
      const eventsContent = eventsData.data.content || eventsData.data;
      const organizersContent = organizersData.data.content || organizersData.data;

      // Filter only admin/super admin created events
      // Show events where createdByType is 'ADMIN', 'SUPER_ADMIN', or null (for backward compatibility)
      const adminEvents = eventsContent.filter((event: Event) => {
        const createdByType = event.createdByType;
        return createdByType === 'ADMIN' || 
               createdByType === 'SUPER_ADMIN' || 
               createdByType === null || 
               createdByType === undefined;
      });

      setEvents(adminEvents);
      setOrganizers(organizersContent.filter((org: Organizer) => org.active));
    } catch (error) {
      showErrorToast('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignDialog = (event: Event) => {
    setSelectedEvent(event);
    setSelectedOrganizerId(event.organizer?.id || '');
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectedEvent(null);
    setSelectedOrganizerId('');
  };

  const handleAssignOrganizer = async () => {
    if (!selectedEvent || !selectedOrganizerId) {
      showErrorToast('Please select an organizer');
      return;
    }

    try {
      await api.patch(
        `/api/admin/events/${selectedEvent.id}/assign-organizer?organizerId=${selectedOrganizerId}`
      );
      showSuccessToast('Organizer assigned successfully');
      handleCloseAssignDialog();
      fetchData();
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to assign organizer');
      console.error('Error assigning organizer:', error);
    }
  };

  const handleRemoveOrganizer = async (eventId: string) => {
    setEventToRemove(eventId);
    setConfirmDialogOpen(true);
  };

  const confirmRemoveOrganizer = async () => {
    if (!eventToRemove) return;

    try {
      await api.delete(`/api/admin/events/${eventToRemove}/remove-organizer`);
      showSuccessToast('Organizer removed successfully');
      fetchData();
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Failed to remove organizer');
      console.error('Error removing organizer:', error);
    } finally {
      setConfirmDialogOpen(false);
      setEventToRemove(null);
    }
  };

  const handleCancelRemove = () => {
    setConfirmDialogOpen(false);
    setEventToRemove(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="600">
            Organizer Assignment
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Assign organizers to events created by admins. Organizers can then manage these events and assign their employees.
        </Alert>

        {events.length === 0 ? (
          <Alert severity="warning">
            No admin-created events found without organizers.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Event Name</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Assigned Organizer</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {event.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          event.category
                            ? typeof event.category === 'object'
                              ? event.category.categoryName
                              : event.category
                            : 'N/A'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.status}
                        size="small"
                        color={
                          event.status === 'PUBLISHED'
                            ? 'success'
                            : event.status === 'DRAFT'
                            ? 'default'
                            : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {event.organizer ? (
                        <Box>
                          <Typography variant="body2">
                            {event.organizer.firstName} {event.organizer.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.organizer.email}
                          </Typography>
                        </Box>
                      ) : (
                        <Chip label="Not Assigned" size="small" color="warning" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={event.organizer ? "Reassign Organizer" : "Assign Organizer"}>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenAssignDialog(event)}
                        >
                          <PersonAddIcon />
                        </IconButton>
                      </Tooltip>
                      {event.organizer && (
                        <Tooltip title="Remove Organizer">
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveOrganizer(event.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Assign Organizer Dialog */}
      <Dialog open={assignDialogOpen} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEvent?.organizer ? 'Reassign Organizer' : 'Assign Organizer'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Event: <strong>{selectedEvent?.name}</strong>
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Organizer</InputLabel>
            <Select
              value={selectedOrganizerId}
              onChange={(e) => setSelectedOrganizerId(e.target.value)}
              label="Select Organizer"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {organizers.map((org) => (
                <MenuItem key={org.organizerId} value={org.organizerId}>
                  <Box>
                    <Typography variant="body2">
                      {org.firstName} {org.lastName}
                      {org.isVerified && ' ✓'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {org.email}
                      {org.organizationName && ` - ${org.organizationName}`}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button
            onClick={handleAssignOrganizer}
            variant="contained"
            disabled={!selectedOrganizerId}
          >
            {selectedEvent?.organizer ? 'Reassign' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Remove Organizer"
        content="Are you sure you want to remove the organizer from this event?"
        onClose={handleCancelRemove}
        onConfirm={confirmRemoveOrganizer}
        confirmText="Remove"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default OrganizerAssignment;
