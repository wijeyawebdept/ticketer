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
  ListItemText,
  Autocomplete,
  TextField,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  DeleteSweep as DeleteSweepIcon, 
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Cancel as CancelIcon,
  EventAvailable as EventAvailableIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  Search as SearchIcon,
  Publish as PublishIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { EventService, OrganizerService } from '../../services';
import { Event, EventStatus, UserRole } from '../../types';
import EventForm from './components/EventForm';
import { Organizer } from '../../services/organizer.service';

const Events: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenuEvent, setContextMenuEvent] = useState<Event | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  useEffect(() => {
    const initPage = async () => {
      await checkUserRole();
      fetchEvents();
    };
    initPage();
  }, []);

  const checkUserRole = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || 
                    user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN');
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await EventService.getAllEvents();
      console.log('Events - Raw API response:', response);
      
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
      
      console.log('Events - Processed events data:', eventsData);
      console.log('Events - First event sample:', eventsData[0]);
      
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

  const handleActivateEvent = async (eventId: string) => {
    try {
      await EventService.activateEvent(eventId);
      fetchEvents(); // Refresh the events list
    } catch (error) {
      console.error('Error activating event:', error);
    }
  };

  const handleDeactivateEvent = async (eventId: string) => {
    try {
      await EventService.deactivateEvent(eventId);
      fetchEvents(); // Refresh the events list
    } catch (error) {
      console.error('Error deactivating event:', error);
    }
  };

  // The event saving is now handled by EventForm component

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    
    try {
      // Use soft delete (move to recycle bin) instead of permanent delete
      await EventService.moveToRecycleBin(selectedEvent.id);
      fetchEvents();
      handleDeleteDialogClose();
    } catch (error) {
      console.error('Error moving event to recycle bin:', error);
    }
  };

  // Bulk action handlers
  const handleBulkPublish = async () => {
    if (selectedEventIds.length === 0) return;
    
    try {
      await Promise.all(
        selectedEventIds.map(id => EventService.changeEventStatus(id, EventStatus.PUBLISHED))
      );
      setSelectedEventIds([]);
      fetchEvents();
    } catch (error) {
      console.error('Error bulk publishing events:', error);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedEventIds.length === 0) return;
    
    try {
      await Promise.all(
        selectedEventIds.map(id => EventService.deactivateEvent(id))
      );
      setSelectedEventIds([]);
      fetchEvents();
    } catch (error) {
      console.error('Error bulk deactivating events:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEventIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedEventIds.length} event(s)?`)) {
      return;
    }
    
    try {
      await Promise.all(
        selectedEventIds.map(id => EventService.moveToRecycleBin(id))
      );
      setSelectedEventIds([]);
      fetchEvents();
    } catch (error) {
      console.error('Error bulk deleting events:', error);
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
      field: 'availableSeats', 
      headerName: 'Seats', 
      flex: 1,
      valueGetter: (params) => {
        const available = params.row.availableSeats || 0;
        const total = params.row.totalCapacity || 0;
        return `${available} / ${total}`;
      }
    },
    { 
      field: 'basePrice', 
      headerName: 'Price (LKR)', 
      flex: 1, 
      valueFormatter: (params) => {
        const price = params.value || 0;
        return `LKR ${price.toLocaleString('en-US')}`;
      }
    },
    {
      field: 'status',
      headerName: 'Event Status',
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
      field: 'active',
      headerName: 'Active Status',
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => {
        // Only PUBLISHED events are considered Active
        const isActive = params.row.status === EventStatus.PUBLISHED;
        return (
          <Chip
            label={isActive ? 'Active' : 'Inactive'}
            color={isActive ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      }
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
            title="Change Status"
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
            onClick={() => {
              console.log('Schedule button clicked - Full row data:', params.row);
              console.log('Schedule button clicked - eventId:', params.row.eventId);
              console.log('Schedule button clicked - id:', params.row.id);
              const idToUse = params.row.eventId || params.row.id;
              if (idToUse && idToUse !== 'undefined') {
                // Detect user role and navigate to appropriate path
                const userStr = localStorage.getItem('user');
                let basePath = '/organizer';
                if (userStr) {
                  try {
                    const user = JSON.parse(userStr);
                    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || 
                        user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN') {
                      basePath = '';
                    }
                  } catch (e) {
                    console.error('Error parsing user:', e);
                  }
                }
                navigate(`${basePath}/events/${idToUse}/schedules`);
              } else {
                console.error('Cannot navigate - no valid ID found in row:', params.row);
              }
            }}
            size="small"
            color="secondary"
            title="Manage Schedules"
            sx={{
              backgroundColor: 'rgba(220, 0, 78, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(220, 0, 78, 0.2)',
              },
              mr: 1
            }}
          >
            <ScheduleIcon />
          </IconButton>
          <IconButton
            onClick={() => handleEditClick(params.row as Event)}
            size="small"
            color="primary"
            title="Edit Event"
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
            color="warning"
            title="Move to Recycle Bin"
            sx={{
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
              }
            }}
          >
            <DeleteSweepIcon />
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
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search events, venues, organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 350 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton onClick={fetchEvents} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
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
          </Box>
        </Grid>

        {/* Bulk Actions Toolbar */}
        {selectedEventIds.length > 0 && (
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 2,
                backgroundColor: '#e3f2fd',
                borderRadius: 2,
                border: '1px solid #1976d2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                {selectedEventIds.length} event(s) selected
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<PublishIcon />}
                  onClick={handleBulkPublish}
                  sx={{ fontWeight: 600 }}
                >
                  Publish
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  startIcon={<DeactivateIcon />}
                  onClick={handleBulkDeactivate}
                  sx={{ fontWeight: 600 }}
                >
                  Deactivate
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleBulkDelete}
                  sx={{ fontWeight: 600 }}
                >
                  Delete
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedEventIds([])}
                  sx={{ fontWeight: 600 }}
                >
                  Clear Selection
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}

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
                rows={events.filter(event => {
                  // Unified search filter - searches across all fields
                  if (searchTerm) {
                    const search = searchTerm.toLowerCase();
                    const eventName = event.name?.toLowerCase() || '';
                    const venueName = event.venue?.name?.toLowerCase() || '';
                    const venueAddress = event.venue?.address?.toLowerCase() || '';
                    const venueCity = event.venue?.city?.toLowerCase() || '';
                    const category = event.category?.toLowerCase() || '';
                    const status = event.status?.toLowerCase() || '';
                    
                    // Search in organizer name - check both organizer and createdBy fields
                    let organizerName = '';
                    const organizerData = (event as any).organizer || event.createdBy;
                    if (organizerData) {
                      organizerName = `${organizerData.firstName || ''} ${organizerData.lastName || ''}`.toLowerCase();
                    }
                    
                    return eventName.includes(search) || 
                           venueName.includes(search) || 
                           venueAddress.includes(search) ||
                           venueCity.includes(search) ||
                           category.includes(search) ||
                           status.includes(search) ||
                           organizerName.includes(search);
                  }
                  return true;
                })}
                columns={columns}
                getRowId={(row) => row.eventId || row.id}
                checkboxSelection
                rowSelectionModel={selectedEventIds}
                onRowSelectionModelChange={(newSelection) => {
                  setSelectedEventIds(newSelection as string[]);
                }}
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
        <DialogTitle sx={{ fontWeight: 600 }}>Move Event to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move the event "{selectedEvent?.name}" to the recycle bin? You can restore it later from the recycle bin.
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
            color="warning" 
            onClick={handleDeleteConfirm}
            sx={{ fontWeight: 500 }}
          >
            Move to Recycle Bin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Events;