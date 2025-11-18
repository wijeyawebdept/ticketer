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
  IconButton,
  CircularProgress,
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteSweep as DeleteSweepIcon, Close as CloseIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import OrganizerForm from './components/OrganizerForm';
import api from '../../services/api';

interface Organizer {
  organizerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  role: 'ORGANIZER';
  active: boolean;
  createdAt: string;
}

const Organizers: React.FC = () => {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const fetchOrganizers = React.useCallback(async () => {
    setLoading(true);
    try {
      console.log('Starting to fetch organizers...');
      const response = await api.get<{ content: Organizer[] }>('/api/admin/organizers');
      console.log('Organizers data received:', response.data);
      
      const organizersData = response.data.content || [];
      setOrganizers(organizersData);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  const handleCreateClick = () => {
    setSelectedOrganizer(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (organizer: Organizer) => {
    setSelectedOrganizer(organizer);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (organizer: Organizer) => {
    setSelectedOrganizer(organizer);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedOrganizer(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedOrganizer(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedOrganizer) return;
    
    try {
      await api.delete(`/api/admin/organizers/${selectedOrganizer.organizerId}`);
      fetchOrganizers();
      handleDeleteDialogClose();
    } catch (error) {
      console.error('Error deleting organizer:', error);
    }
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'phoneNumber', headerName: 'Phone', flex: 1 },
    { field: 'organizationName', headerName: 'Organization', flex: 1 },
    { 
      field: 'role', 
      headerName: 'Role', 
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label="ORGANIZER" 
          color="warning" 
          variant="outlined" 
          size="small" 
          sx={{ fontWeight: 600 }}
        />
      )
    },
    {
      field: 'active',
      headerName: 'Status',
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
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
            onClick={() => handleEditClick(params.row as Organizer)}
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
            onClick={() => handleDeleteClick(params.row as Organizer)}
            size="small"
            color="warning"
            sx={{
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
              }
            }}
            title="Move to Recycle Bin"
          >
            <DeleteSweepIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#ed6c02' }}>Organizer Management</Typography>
        <Button
          variant="contained"
          color="warning"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          sx={{
            borderRadius: 2,
            padding: '8px 16px',
            fontWeight: 600,
            boxShadow: '0 4px 6px rgba(237, 108, 2, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 8px rgba(237, 108, 2, 0.3)',
            }
          }}
        >
          Add New Organizer
        </Button>
      </Box>
      
      <Paper 
        sx={{ 
          p: 2,
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <Box sx={{ height: '70vh' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={40} thickness={4} />
            </Box>
          ) : (
            <DataGrid
              rows={organizers}
              columns={columns}
              getRowId={(row) => row.organizerId}
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
                  backgroundColor: 'rgba(237, 108, 2, 0.1)',
                  borderRadius: '8px 8px 0 0',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'rgba(237, 108, 2, 0.04)',
                },
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Organizer Form Dialog */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#ed6c02' }}>
          {selectedOrganizer ? 'Edit Organizer' : 'Create New Organizer'}
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
            <OrganizerForm 
              organizer={selectedOrganizer || undefined}
              onClose={handleDialogClose} 
              onSuccess={() => {
                fetchOrganizers();
                handleDialogClose();
              }} 
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Move Organizer to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move the organizer "{selectedOrganizer?.firstName} {selectedOrganizer?.lastName}" ({selectedOrganizer?.organizationName}) to the recycle bin? You can restore it later from the recycle bin.
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

export default Organizers;
