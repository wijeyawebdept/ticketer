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
  TextField,
  InputAdornment,
  Snackbar,
  Alert as MuiAlert
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
  Search as SearchIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { EventService, EventScheduleService } from '../../services';
import { Event, EventStatus, UserRole } from '../../types';
import EventForm from './components/EventForm';

const Events: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenuEvent, setContextMenuEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'warning' | 'info' | 'success' }>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isOrganizer = user?.role === UserRole.ORGANIZER || user?.role === 'ROLE_ORGANIZER' || 
                      user?.role === UserRole.ORGANIZER_EMPLOYEE || user?.role === 'ROLE_ORGANIZER_EMPLOYEE';
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === 'ROLE_ADMIN' ||
                  user?.role === UserRole.SUPER_ADMIN || user?.role === 'ROLE_SUPER_ADMIN';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await EventService.getAllEvents();
      
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
    
    // If trying to publish, check if event has schedules
    if (status === EventStatus.PUBLISHED) {
      try {
        const schedules = await EventScheduleService.getSchedulesForEvent(contextMenuEvent.id);
        if (!schedules || schedules.length === 0) {
          setSnackbar({ 
            open: true, 
            message: 'Cannot publish event without schedules. Please add at least one event schedule before publishing.', 
            severity: 'warning' 
          });
          handleContextMenuClose();
          return;
        }
      } catch (error) {
        setSnackbar({ 
          open: true, 
          message: 'Failed to verify event schedules. Please try again.', 
          severity: 'error' 
        });
        handleContextMenuClose();
        return;
      }
    }
    
    try {
      await EventService.changeEventStatus(contextMenuEvent.id, status);
      fetchEvents(); // Refresh the events list
      handleContextMenuClose();
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to change event status. Please try again.', 
        severity: 'error' 
      });
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
      // Use soft delete (move to recycle bin) instead of permanent delete
      await EventService.moveToRecycleBin(selectedEvent.id);
      fetchEvents();
      handleDeleteDialogClose();
    } catch (error) {
    }
  };

  // Bulk action handlers
  const handleBulkPublish = async () => {
    if (selectedEventIds.length === 0) return;
    
    try {
      // Check if all selected events have schedules
      const scheduleChecks = await Promise.all(
        selectedEventIds.map(async (id) => {
          const schedules = await EventScheduleService.getSchedulesForEvent(id);
          return { id, hasSchedules: schedules && schedules.length > 0 };
        })
      );
      
      const eventsWithoutSchedules = scheduleChecks.filter(check => !check.hasSchedules);
      
      if (eventsWithoutSchedules.length > 0) {
        const eventNames = events
          .filter(e => eventsWithoutSchedules.some(check => check.id === e.id))
          .map(e => e.name)
          .join(', ');
        setSnackbar({ 
          open: true, 
          message: `Cannot publish the following events without schedules: ${eventNames}. Please add schedules to these events before publishing.`, 
          severity: 'warning' 
        });
        return;
      }
      
      // All events have schedules, proceed with publishing
      await Promise.all(
        selectedEventIds.map(id => EventService.changeEventStatus(id, EventStatus.PUBLISHED))
      );
      setSelectedEventIds([]);
      fetchEvents();
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to publish some events. Please try again.', 
        severity: 'error' 
      });
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
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEventIds.length === 0) return;
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(false);
    try {
      await Promise.all(
        selectedEventIds.map(id => EventService.moveToRecycleBin(id))
      );
      setSelectedEventIds([]);
      fetchEvents();
    } catch (error) {
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
      field: 'categoryName',
      headerName: 'Category',
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => {
        const categoryName = params.row.category?.categoryName;
        if (!categoryName) {
          return <Chip label="Uncategorized" size="small" variant="outlined" />;
        }
        return (
          <Chip
            label={categoryName}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 500
            }}
          />
        );
      }
    },
    { 
      field: 'availableSeats', 
      headerName: 'Seats', 
      flex: 1,
      valueGetter: (params) => {
        const total = params.row.totalCapacity || 0;
        const available = params.row.availableSeats ?? total;
        const booked = Math.max(0, total - available);
        return `${booked} / ${total} Booked`;
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
              const idToUse = params.row.eventId || params.row.id;
              if (idToUse && idToUse !== 'undefined') {
                // Detect user role and navigate to appropriate path
                // Check sessionStorage first (admin), then localStorage (organizers/employees)
                const sessionUserStr = sessionStorage.getItem('user');
                const localUserStr = localStorage.getItem('user');
                const userStr = sessionUserStr || localUserStr;
                
                let basePath = '/organizer';
                if (userStr) {
                  try {
                    const user = JSON.parse(userStr);
                    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || 
                        user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN') {
                      basePath = '/admin';
                    } else if (user.role === UserRole.ORGANIZER_EMPLOYEE || user.role === 'ROLE_ORGANIZER_EMPLOYEE') {
                      basePath = '/employee';
                    }
                  } catch (e) {
                  }
                }
                navigate(`${basePath}/events/${idToUse}/schedules`);
              } else {
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
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', fontSize: { xs: '20px', sm: '28px', md: '32px' } }}>
          Event Management
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'stretch', sm: 'center' },
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <TextField
            size="small"
            placeholder="Search events, venues, organizers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: { xs: '100%', sm: 260, md: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
            <IconButton onClick={fetchEvents} sx={{ minHeight: 44, minWidth: 44 }}>
              <RefreshIcon />
            </IconButton>

            {isAdmin && (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => navigate('/admin/events/pending')}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  fontWeight: 600,
                  flex: { xs: 1, sm: 'none' },
                }}
              >
                Pending Requests
              </Button>
            )}

            {isOrganizer && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigate('/organizer/events/request')}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  fontWeight: 600,
                  flex: { xs: 1, sm: 'none' },
                }}
              >
                Request Event
              </Button>
            )}

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateClick}
              sx={{
                borderRadius: 2,
                minHeight: 44,
                fontWeight: 700,
                boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)',
                backgroundColor: '#ff1955',
                flex: { xs: 1, sm: 'none' },
                '&:hover': { backgroundColor: '#d01443' },
              }}
            >
              Add New Event
            </Button>
          </Box>
        </Box>
      </Box>

        {/* Bulk Actions Toolbar */}
        {selectedEventIds.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                  {selectedEventIds.length} event(s) selected
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    onClick={handleBulkPublish}
                    sx={{ mr: 1 }}
                  >
                    Publish Selected
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={handleBulkDeactivate}
                    sx={{ mr: 1 }}
                  >
                    Deactivate Selected
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </Button>
                </Box>
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
                    const category = event.category?.categoryName?.toLowerCase() || '';
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={isBulkDeleteDialogOpen}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 600 }}>
          Confirm Bulk Delete
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography>
            Are you sure you want to delete {selectedEventIds.length} event(s)?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action will move the selected events to the recycle bin.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Button 
            onClick={() => setIsBulkDeleteDialogOpen(false)}
            sx={{ fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={confirmBulkDelete}
            sx={{ fontWeight: 500 }}
          >
            Delete {selectedEventIds.length} Event(s)
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default Events;
