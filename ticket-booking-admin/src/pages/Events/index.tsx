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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Cancel as CancelIcon,
  EventAvailable as EventAvailableIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { EventService } from '../../services';
import { Event, EventStatus } from '../../types';
import EventForm from './components/EventForm';

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenuEvent, setContextMenuEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response: any = await EventService.getAllEvents();
      
      // Handle Page response from backend
      let eventsData: any[] = [];
      if (response && response.content) {
        // It's a Page response, extract the content array
        eventsData = response.content;
      } else if (Array.isArray(response)) {
        // It's already an array
        eventsData = response;
      } else {
        // Handle unexpected response format
        eventsData = [];
      }
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedEvent(null); // Clear selected event for create mode
    setIsDialogOpen(true);
  };

  const handleEditClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  };

  const handleContextMenuClick = (event: React.MouseEvent<HTMLElement>, rowEvent: Event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setContextMenuEvent(rowEvent);
  };

  const handleContextMenuClose = () => {
    setAnchorEl(null);
    setContextMenuEvent(null);
  };

  const handleChangeStatus = async (status: EventStatus) => {
    if (!contextMenuEvent) return;
    
    try {
      await EventService.changeEventStatus(contextMenuEvent.id, status);
      fetchEvents(); // Refresh the events list
      handleContextMenuClose();
    } catch (error) {
      console.error('Error changing event status:', error);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedEvent(null);
  };

  // The event saving is now handled by EventForm component

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    
    try {
      await EventService.deleteEvent(selectedEvent.id);
      fetchEvents();
      handleDeleteDialogClose();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getStatusChipColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.PUBLISHED:
        return 'success';
      case EventStatus.DRAFT:
        return 'warning';
      case EventStatus.CANCELLED:
        return 'error';
      case EventStatus.COMPLETED:
        return 'info';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Event Name', flex: 1 },
    { 
      field: 'venue', 
      headerName: 'Venue', 
      flex: 1,
      valueFormatter: (params) => {
        // Handle both frontend Event type and backend response format
        if (params.value && typeof params.value === 'object') {
          return params.value.name || 'N/A';
        }
        return 'N/A';
      }
    },
    { 
      field: 'startDateTime', 
      headerName: 'Start Date', 
      flex: 1, 
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value as string).toLocaleDateString();
        }
        return 'N/A';
      }
    },
    { 
      field: 'endDateTime', 
      headerName: 'End Date', 
      flex: 1, 
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value as string).toLocaleDateString();
        }
        return 'N/A';
      }
    },
    { 
      field: 'availableSeats', 
      headerName: 'Available Seats', 
      flex: 1,
      valueFormatter: (params) => {
        return params.value || 0;
      }
    },
    { 
      field: 'basePrice', 
      headerName: 'Price (LKR)', 
      flex: 1, 
      valueFormatter: (params) => {
        return `LKR ${params.value || 0}`;
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color={getStatusChipColor(params.value as EventStatus)} 
          variant="outlined" 
          size="small" 
          sx={{ fontWeight: 500 }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            onClick={(e) => handleContextMenuClick(e, params.row as Event)}
            size="small"
            color="primary"
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.2)',
              },
              mr: 1
            }}
          >
            <MoreVertIcon />
          </IconButton>
          <IconButton
            onClick={() => handleEditClick(params.row as Event)}
            size="small"
            color="primary"
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.2)',
              },
              mr: 1
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDeleteClick(params.row as Event)}
            size="small"
            color="error"
            sx={{
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.2)',
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>Event Management</Typography>
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
              '&:hover': {
                boxShadow: '0 6px 8px rgba(25, 118, 210, 0.3)',
              }
            }}
          >
            Add New Event
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 2,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            ) : (
              <DataGrid
                rows={events}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 10,
                    },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                autoHeight
                sx={{
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    borderRadius: '8px 8px 0 0',
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Status Change Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleContextMenuClose}
      >
        <MenuItem onClick={() => handleChangeStatus(EventStatus.DRAFT)}>
          <ListItemIcon>
            <AccessTimeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mark as Draft</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleChangeStatus(EventStatus.PUBLISHED)}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Publish Event</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleChangeStatus(EventStatus.CANCELLED)}>
          <ListItemIcon>
            <CancelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cancel Event</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleChangeStatus(EventStatus.COMPLETED)}>
          <ListItemIcon>
            <EventAvailableIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mark as Completed</ListItemText>
        </MenuItem>
      </Menu>

      {/* Event Form Dialog */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1976d2' }}>
          {selectedEvent ? 'Edit Event' : 'Create New Event'}
          <IconButton
            aria-label="close"
            onClick={handleDialogClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <EventForm 
              event={selectedEvent || undefined}
              onClose={handleDialogClose} 
              onSuccess={() => {
                fetchEvents();
                handleDialogClose();
              }} 
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Event</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the event "{selectedEvent?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteDialogClose}
            sx={{ fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteConfirm}
            sx={{ fontWeight: 500 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Events;