import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogContentText
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteSweep as DeleteSweepIcon, EventSeat as EventSeatIcon, AutoAwesome as AutoAwesomeIcon, Refresh as RefreshIcon, CheckCircle as ActivateIcon, Block as DeactivateIcon, Search as SearchIcon, Info as InfoIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { VenueService } from '../../services';
import { Venue } from '../../types';
import VenueForm from './components/VenueForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ConfirmationDialog, { ConfirmationMessages } from '../../components/ConfirmationDialog';
import { ToastService } from '../../services/toast.service';

const VenuesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [generatingSeats, setGeneratingSeats] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [maxCapacity, setMaxCapacity] = useState<string>('');
  
  // Batch operations states
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  
  // Info dialog states
  const [infoDialogOpen, setInfoDialogOpen] = useState<boolean>(false);
  const [infoVenue, setInfoVenue] = useState<Venue | null>(null);
  
  // Confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [generateSeatsDialogOpen, setGenerateSeatsDialogOpen] = useState<boolean>(false);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);
  const [venueForSeats, setVenueForSeats] = useState<Venue | null>(null);

  // Determine if user is admin based on URL path or user role
  const isAdmin = location.pathname.includes('/admin/') || (
    user?.role === 'ADMIN' || 
    user?.role === 'ROLE_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ROLE_SUPER_ADMIN'
  );
  
  // Check if user is organizer - organizers cannot modify venues
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ROLE_ORGANIZER';
  
  // Fetch all venues from the API
  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await VenueService.getAllVenues();
      console.log('Fetched venues:', data);
      
      // Validate venue data
      const validatedVenues = data.map((venue: any) => {
        if (!venue.name || venue.name.trim() === '') {
          console.warn('Invalid venue name found:', venue);
          return { ...venue, name: 'Unnamed Venue' };
        }
        return venue;
      });
      
      setVenues(validatedVenues);
      setFilteredVenues(validatedVenues);
    } catch (error) {
      console.error('Error fetching venues:', error);
      ToastService.error('Failed to load venues. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load venues when component mounts
  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  // Apply filters
  useEffect(() => {
    let filtered = [...venues];

    // Search by name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(venue =>
        venue.name.toLowerCase().includes(query) ||
        venue.description?.toLowerCase().includes(query) ||
        venue.address?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const status = statusFilter === 'active' ? 1 : 0;
      filtered = filtered.filter(venue => venue.status === status);
    }

    // Filter by capacity range
    if (minCapacity) {
      const min = parseInt(minCapacity);
      filtered = filtered.filter(venue => venue.capacity >= min);
    }
    if (maxCapacity) {
      const max = parseInt(maxCapacity);
      filtered = filtered.filter(venue => venue.capacity <= max);
    }

    setFilteredVenues(filtered);
  }, [venues, searchQuery, statusFilter, minCapacity, maxCapacity]);

  // Handle form close
  const handleFormClose = () => {
    setOpenForm(false);
    setSelectedVenue(null);
  };

  // Handle form success (create/update)
  const handleFormSuccess = () => {
    fetchVenues(); // Refresh the list
    handleFormClose();
  };

  // Handle edit venue
  const handleEditVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setOpenForm(true);
  };

  // Handle delete venue - open confirmation dialog
  const handleDeleteVenue = (venue: Venue) => {
    console.log('Delete venue clicked for:', {
      id: venue.id,
      name: venue.name,
      description: venue.description,
      address: venue.address
    });
    
    setVenueToDelete(venue);
    setDeleteDialogOpen(true);
  };

  // Confirm delete venue
  const confirmDeleteVenue = async () => {
    if (!venueToDelete) return;
    
    const toastId = ToastService.loading(`Deleting venue "${venueToDelete.name}"...`);
    
    try {
      console.log('Attempting to delete venue:', {
        id: venueToDelete.id,
        name: venueToDelete.name
      });
      
      await VenueService.deleteVenue(venueToDelete.id);
      ToastService.updateSuccess(toastId, `Venue "${venueToDelete.name}" has been deleted successfully!`);
      setDeleteDialogOpen(false);
      setVenueToDelete(null);
      fetchVenues(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting venue:', error);
      
      // Provide more specific error messages
      let errorMessage = `Failed to delete venue "${venueToDelete.name}". `;
      
      if (error.message?.includes('500')) {
        errorMessage += 'Server error occurred. This venue may have associated events or bookings that prevent deletion.';
      } else if (error.message?.includes('403')) {
        errorMessage += 'You do not have permission to delete this venue.';
      } else if (error.message?.includes('404')) {
        errorMessage += 'Venue not found.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      ToastService.updateError(toastId, errorMessage);
    }
  };

  // Handle seating arrangement
  const handleSeatingArrangement = (venue: Venue) => {
    // Use different paths for admin and organizer
    if (isAdmin) {
      navigate(`/venues/${venue.id}/seating`);
    } else {
      navigate(`/organizer/venues/${venue.id}/seating`);
    }
  };

  // Handle generate seats for venue - open confirmation dialog
  const handleGenerateSeats = (venue: Venue) => {
    setVenueForSeats(venue);
    setGenerateSeatsDialogOpen(true);
  };

  // Confirm generate seats
  const confirmGenerateSeats = async () => {
    if (!venueForSeats) return;
    
    const toastId = ToastService.loading(`Generating template seats for "${venueForSeats.name}"...`);
    setGeneratingSeats(venueForSeats.id);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`http://localhost:8081/api/admin/venues/${venueForSeats.id}/generate-seats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate seats');
      }
      
      const result = await response.text();
      ToastService.updateSuccess(toastId, result);
      setGenerateSeatsDialogOpen(false);
      setVenueForSeats(null);
    } catch (error) {
      console.error('Error generating seats:', error);
      ToastService.updateError(toastId, `Failed to generate seats for "${venueForSeats.name}". Please try again.`);
    } finally {
      setGeneratingSeats(null);
    }
  };

  // Handle toggle venue status
  const handleToggleStatus = async (venue: Venue) => {
    const toastId = ToastService.loading(`Updating status for "${venue.name}"...`);
    
    try {
      const updatedVenue = await VenueService.toggleVenueStatus(venue.id);
      
      // Update the local state
      setVenues(prevVenues =>
        prevVenues.map(v => v.id === updatedVenue.id ? updatedVenue : v)
      );
      
      const newStatus = updatedVenue.status === 1 ? 'Active' : 'Inactive';
      ToastService.updateSuccess(toastId, `Venue status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error toggling venue status:', error);
      ToastService.updateError(toastId, `Failed to update venue status. Please try again.`);
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE') => {
    if (selectedVenueIds.length === 0) return;

    const toastId = ToastService.loading(`Performing ${operation.toLowerCase()} on ${selectedVenueIds.length} venue(s)...`);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const venueId of selectedVenueIds) {
        try {
          if (operation === 'ACTIVATE' || operation === 'DEACTIVATE') {
            const venue = venues.find(v => v.id === venueId);
            if (venue) {
              const currentStatus = venue.status ?? 1; // Default to active if not set
              const shouldToggle = (operation === 'ACTIVATE' && currentStatus !== 1) || 
                                  (operation === 'DEACTIVATE' && currentStatus === 1);
              if (shouldToggle) {
                await VenueService.toggleVenueStatus(venueId);
              }
            }
            successCount++;
          } else if (operation === 'DELETE') {
            await VenueService.deleteVenue(venueId);
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to process venue ${venueId}:`, error);
          failCount++;
        }
      }

      setSelectedVenueIds([]);
      fetchVenues();

      if (failCount === 0) {
        ToastService.updateSuccess(toastId, `Successfully ${operation.toLowerCase()}d ${successCount} venue(s)`);
      } else {
        ToastService.updateError(toastId, `Completed: ${successCount} succeeded, ${failCount} failed`);
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      ToastService.updateError(toastId, 'Failed to perform bulk operation. Please try again.');
    }
  };

  // Handle selection change
  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedVenueIds(newSelection);
  };

  // Define columns for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.value || ''} arrow placement="top">
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'help'
            }}
          >
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        const text = params.value || 'N/A';
        const truncated = text.length > 50 ? text.substring(0, 50) + '...' : text;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {truncated}
            </Typography>
            {text.length > 50 && (
              <Tooltip title="Click row info icon to view full details" arrow>
                <InfoIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: 'address',
      headerName: 'Address',
      flex: 1.5,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        const text = params.value || 'N/A';
        const truncated = text.length > 50 ? text.substring(0, 50) + '...' : text;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {truncated}
            </Typography>
            {text.length > 50 && (
              <Tooltip title="Click row info icon to view full details" arrow>
                <InfoIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: 'capacity',
      headerName: 'Capacity',
      flex: 1,
      minWidth: 100,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status ?? 1; // Default to active if not set
        const isActive = status === 1;
        return (
          <Chip
            label={isActive ? 'Active' : 'Inactive'}
            color={isActive ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 2.5,
      minWidth: 250,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title="View Full Details" arrow>
            <IconButton
              onClick={() => {
                setInfoVenue(params.row);
                setInfoDialogOpen(true);
              }}
              size="small"
              color="info"
              sx={{ mr: 1 }}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={isOrganizer ? "Organizers cannot edit venues" : "Edit Venue"} arrow>
            <span>
              <IconButton
                onClick={() => handleEditVenue(params.row)}
                size="small"
                color="primary"
                disabled={isOrganizer}
                sx={{ mr: 1 }}
              >
                <EditIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={isOrganizer ? "Organizers cannot modify seating" : "Seating Arrangement"}>
            <span>
              <IconButton
                onClick={() => handleSeatingArrangement(params.row)}
                size="small"
                color="secondary"
                disabled={isOrganizer}
                sx={{ mr: 1 }}
              >
                <EventSeatIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={isOrganizer ? "Organizers cannot generate seats" : "Generate Template Seats"}>
            <span>
              <IconButton
                onClick={() => handleGenerateSeats(params.row)}
                size="small"
                color="success"
                disabled={generatingSeats === params.row.id || isOrganizer}
                sx={{ mr: 1 }}
              >
                {generatingSeats === params.row.id ? (
                  <CircularProgress size={20} />
                ) : (
                  <AutoAwesomeIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
          {(params.row.status ?? 1) === 1 ? (
            <Tooltip title={isOrganizer ? "Organizers cannot deactivate venues" : "Deactivate Venue"}>
              <span>
                <IconButton
                  onClick={() => handleToggleStatus(params.row)}
                  size="small"
                  color="error"
                  disabled={isOrganizer}
                  sx={{
                    backgroundColor: 'rgba(211, 47, 47, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(211, 47, 47, 0.2)',
                    },
                    mr: 1
                  }}
                >
                  <DeactivateIcon />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title={isOrganizer ? "Organizers cannot activate venues" : "Activate Venue"}>
              <span>
                <IconButton
                  onClick={() => handleToggleStatus(params.row)}
                  size="small"
                  color="success"
                  disabled={isOrganizer}
                  sx={{
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(46, 125, 50, 0.2)',
                    },
                    mr: 1
                  }}
                >
                  <ActivateIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title={isOrganizer ? "Organizers cannot delete venues" : "Move to Recycle Bin"}>
            <span>
              <IconButton
                onClick={() => handleDeleteVenue(params.row)}
                size="small"
                color="warning"
                disabled={isOrganizer}
              >
                <DeleteSweepIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Venue Management</Typography>
        <Box>
          <IconButton onClick={fetchVenues} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Tooltip title={isOrganizer ? "Organizers cannot create venues" : ""}>
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenForm(true)}
                disabled={isOrganizer}
              >
                Add New Venue
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Search and Filter Section */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by name, description, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Min Capacity"
          type="number"
          value={minCapacity}
          onChange={(e) => setMinCapacity(e.target.value)}
          sx={{ width: 130 }}
          inputProps={{ min: 0 }}
        />
        <TextField
          size="small"
          label="Max Capacity"
          type="number"
          value={maxCapacity}
          onChange={(e) => setMaxCapacity(e.target.value)}
          sx={{ width: 130 }}
          inputProps={{ min: 0 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setMinCapacity('');
            setMaxCapacity('');
          }}
          sx={{ height: 40 }}
        >
          Clear Filters
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', ml: 'auto' }}>
          Showing {filteredVenues.length} of {venues.length} venue{venues.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Bulk Operations Bar */}
      {selectedVenueIds.length > 0 && !isOrganizer && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={500}>
              {selectedVenueIds.length} venue(s) selected
            </Typography>
            <Box>
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={() => handleBulkOperation('ACTIVATE')}
                sx={{ mr: 1 }}
              >
                Activate Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleBulkOperation('DEACTIVATE')}
                sx={{ mr: 1 }}
              >
                Deactivate Selected
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleBulkOperation('DELETE')}
              >
                Delete Selected
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper>
        <Box height={500} width="100%">
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredVenues}
              columns={columns}
              getRowId={(row) => row.id}
              pageSizeOptions={[5, 10, 25]}
              checkboxSelection
              disableRowSelectionOnClick={false}
              onRowSelectionModelChange={(newSelection) => handleSelectionChange(newSelection as string[])}
              rowSelectionModel={selectedVenueIds}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          )}
        </Box>
      </Paper>

      <Dialog
        open={openForm}
        onClose={handleFormClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1.5rem', pb: 1 }}>
          {selectedVenue ? 'Edit Venue' : 'Add New Venue'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <VenueForm
            venue={selectedVenue}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title={ConfirmationMessages.DELETE_VENUE.title}
        message={`Are you sure you want to move "${venueToDelete?.name}" to the recycle bin? You can restore it later from the recycle bin.`}
        confirmText={ConfirmationMessages.DELETE_VENUE.confirmText}
        variant={ConfirmationMessages.DELETE_VENUE.variant}
        onConfirm={confirmDeleteVenue}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setVenueToDelete(null);
        }}
      />

      {/* Generate Seats Confirmation Dialog */}
      <ConfirmationDialog
        open={generateSeatsDialogOpen}
        title={ConfirmationMessages.GENERATE_SEATS.title}
        message={`This will generate ${venueForSeats?.capacity || 0} template seats for "${venueForSeats?.name}". Any existing template seats will be replaced. Continue?`}
        confirmText={ConfirmationMessages.GENERATE_SEATS.confirmText}
        variant={ConfirmationMessages.GENERATE_SEATS.variant}
        onConfirm={confirmGenerateSeats}
        onCancel={() => {
          setGenerateSeatsDialogOpen(false);
          setVenueForSeats(null);
        }}
      />

      {/* Venue Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => {
          setInfoDialogOpen(false);
          setInfoVenue(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="info" />
            <Typography variant="h6">Venue Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {infoVenue && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Name
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {infoVenue.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <DialogContentText>
                  {infoVenue.description || 'N/A'}
                </DialogContentText>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Address
                </Typography>
                <DialogContentText>
                  {infoVenue.address || 'N/A'}
                </DialogContentText>
              </Box>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Capacity
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {infoVenue.capacity}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={(infoVenue.status ?? 1) === 1 ? 'Active' : 'Inactive'}
                    color={(infoVenue.status ?? 1) === 1 ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setInfoDialogOpen(false);
              setInfoVenue(null);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VenuesPage;