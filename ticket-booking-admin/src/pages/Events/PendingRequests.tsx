import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Grid,
  Divider
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Check as CheckIcon, Close as CloseIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { EventService } from '../../services';
import { Event } from '../../types';

const PendingRequests: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Rejection Dialog State
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  
  // View Dialog State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      const data = await EventService.getPendingEvents();
      // the backend returns a page object, extract content
      setEvents(data.content || []);
    } catch (error) {
      toast.error('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to approve and publish this event?')) return;
    
    try {
      await EventService.approveEventRequest(eventId);
      toast.success('Event approved and published');
      fetchPendingEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve event');
    }
  };

  const openRejectDialog = (eventId: string) => {
    setSelectedEventId(eventId);
    setFeedback('');
    setRejectDialogOpen(true);
  };

  const openViewDialog = (event: Event) => {
    setViewEvent(event);
    setViewDialogOpen(true);
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast.error('Feedback is required to reject an event');
      return;
    }

    try {
      await EventService.rejectEventRequest(selectedEventId, feedback);
      toast.success('Event request rejected');
      setRejectDialogOpen(false);
      fetchPendingEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject event');
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Event Name', flex: 1 },
    { 
      field: 'venue', 
      headerName: 'Venue', 
      flex: 1,
      valueFormatter: (params) => {
        if (params.value && typeof params.value === 'object') {
          return params.value.name || 'N/A';
        }
        return 'N/A';
      }
    },
    { field: 'totalCapacity', headerName: 'Capacity', width: 120 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      renderCell: () => <Chip label="Pending Approval" color="warning" size="small" />
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => {
        const eventId = params.row.eventId || params.row.id;
        return (
          <Box display="flex" gap={1}>
            <IconButton
              color="primary"
              size="small"
              title="View Details"
              onClick={() => openViewDialog(params.row as Event)}
            >
              <VisibilityIcon />
            </IconButton>
            <IconButton
              color="success"
              size="small"
              title="Approve"
              onClick={() => handleApprove(eventId)}
            >
              <CheckIcon />
            </IconButton>
            <IconButton
              color="error"
              size="small"
              title="Reject"
              onClick={() => openRejectDialog(eventId)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Pending Event Requests</Typography>
      </Box>

      <Paper sx={{ width: '100%', height: 600 }}>
        <DataGrid
          rows={events}
          columns={columns}
          getRowId={(row) => row.eventId || row.id}
          loading={loading}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Event Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this event request. The organizer will see this feedback.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Event Details: {viewEvent?.name}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {viewEvent && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                <Typography variant="body1" gutterBottom>{viewEvent.category?.categoryName || 'N/A'}</Typography>
                
                <Typography variant="subtitle2" color="text.secondary">Venue</Typography>
                <Typography variant="body1" gutterBottom>{viewEvent.venue?.name || 'N/A'}</Typography>
                
                <Typography variant="subtitle2" color="text.secondary">Total Capacity</Typography>
                <Typography variant="body1" gutterBottom>{viewEvent.totalCapacity}</Typography>
                
                <Typography variant="subtitle2" color="text.secondary">Base Price</Typography>
                <Typography variant="body1" gutterBottom>LKR {viewEvent.basePrice}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Organizer</Typography>
                <Typography variant="body1" gutterBottom>
                  {viewEvent.organizer ? `${viewEvent.organizer.firstName} ${viewEvent.organizer.lastName}` : 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {viewEvent.organizer?.email}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {viewEvent.description}
                </Typography>
              </Grid>

              {/* Ticket Categories */}
              {viewEvent.ticketCategories && viewEvent.ticketCategories.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Ticket Categories</Typography>
                  <Grid container spacing={2}>
                    {viewEvent.ticketCategories.map((tc, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight="bold">{tc.categoryName}</Typography>
                          <Typography variant="body2" color="text.secondary">Price: LKR {tc.price}</Typography>
                          <Typography variant="body2" color="text.secondary">Capacity: {tc.capacity}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}

              {/* Schedules */}
              {viewEvent.schedules && viewEvent.schedules.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Schedules</Typography>
                  <Grid container spacing={2}>
                    {viewEvent.schedules.map((schedule, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Date: {schedule.scheduleDate}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Time: {schedule.startTime} - {schedule.endTime}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Capacity: {schedule.capacity}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}

              {viewEvent.imageUrl && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Cover Image</Typography>
                  <Box
                    component="img"
                    src={viewEvent.imageUrl}
                    alt={viewEvent.name}
                    sx={{ width: '100%', maxWidth: 400, borderRadius: 1 }}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button 
            onClick={() => {
              setViewDialogOpen(false);
              handleApprove(viewEvent?.eventId || viewEvent?.id || '');
            }} 
            color="success" 
            variant="contained"
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingRequests;
