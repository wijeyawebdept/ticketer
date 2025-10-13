import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { VenueService } from '../../services';
import { Venue } from '../../types';
import VenueForm from './components/VenueForm';

const VenuesPage = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openForm, setOpenForm] = useState<boolean>(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load venues when component mounts
  useEffect(() => {
    fetchVenues();
  }, []);

  // Fetch all venues from the API
  const fetchVenues = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await VenueService.getAllVenues();
      setVenues(data);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setError('Failed to load venues. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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

  // Handle delete venue
  const handleDeleteVenue = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this venue?')) {
      try {
        await VenueService.deleteVenue(id);
        fetchVenues(); // Refresh the list
      } catch (error) {
        console.error('Error deleting venue:', error);
        setError('Failed to delete venue. Please try again.');
      }
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
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      minWidth: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            onClick={() => handleEditVenue(params.row)}
            size="small"
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDeleteVenue(params.row.id)}
            size="small"
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Venue Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenForm(true)}
        >
          Add New Venue
        </Button>
      </Box>

      {error && (
        <Box mb={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

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
    </Box>
  );
};

export default VenuesPage;