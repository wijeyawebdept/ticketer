import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteSweep as DeleteSweepIcon, EventSeat as EventSeatIcon, AutoAwesome as AutoAwesomeIcon, Refresh as RefreshIcon, CheckCircle as ActivateIcon, Block as DeactivateIcon } from '@mui/icons-material';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [generatingSeats, setGeneratingSeats] = useState<string | null>(null);
  
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

  // Define columns for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'address',
      headerName: 'Address',
      flex: 2,
      minWidth: 200,
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
          <Tooltip title={isOrganizer ? "Organizers cannot edit venues" : "Edit Venue"}>
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
          {params.row.status === 1 ? (
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

      <Paper>
        <Box height={500} width="100%">
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={venues}
              columns={columns}
              getRowId={(row) => row.id}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
            />
          )}
        </Box>
      </Paper>

      <Dialog
        open={openForm}
        onClose={handleFormClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedVenue ? 'Edit Venue' : 'Add New Venue'}
        </DialogTitle>
        <DialogContent>
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
    </Box>
  );
};

export default VenuesPage;