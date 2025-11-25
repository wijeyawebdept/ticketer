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
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  DeleteSweep as DeleteSweepIcon, 
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AdminForm from './components/AdminForm';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface Admin {
  adminId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  active: boolean;
  createdAt: string;
}

const Admins: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const { isSuperAdmin } = useAuth();

  const fetchAdmins = React.useCallback(async () => {
    setLoading(true);
    try {
      console.log('Starting to fetch admins...');
      const response = await api.get<{ content: Admin[] }>('/api/admin/admins');
      console.log('Admins data received:', response.data);
      
      const adminsData = response.data.content || [];
      
      // Filter out SUPER_ADMIN if current user is not a SUPER_ADMIN
      let filteredAdmins = adminsData;
      if (!isSuperAdmin()) {
        filteredAdmins = adminsData.filter(admin => admin.role !== 'SUPER_ADMIN');
        console.log('Filtered admins (excluding SUPER_ADMIN):', filteredAdmins);
      }
      
      setAdmins(filteredAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateClick = () => {
    setSelectedAdmin(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAdmin(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedAdmin(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAdmin) return;
    
    try {
      await api.delete(`/api/admin/admins/${selectedAdmin.adminId}`);
      fetchAdmins();
      handleDeleteDialogClose();
    } catch (error) {
      console.error('Error deleting admin:', error);
    }
  };

  const getRoleChipColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'secondary'; // Purple for SUPER_ADMIN
      case 'ADMIN':
        return 'error'; // Red for ADMIN
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'phoneNumber', headerName: 'Phone', flex: 1 },
    { 
      field: 'role', 
      headerName: 'Role', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color={getRoleChipColor(params.value as string)} 
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
            onClick={() => handleEditClick(params.row as Admin)}
            size="small"
            color="primary"
            disabled={!isSuperAdmin()}
            sx={{
              backgroundColor: isSuperAdmin() ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0, 0, 0, 0.12)',
              '&:hover': {
                backgroundColor: isSuperAdmin() ? 'rgba(25, 118, 210, 0.2)' : 'rgba(0, 0, 0, 0.12)',
              },
              mr: 1
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDeleteClick(params.row as Admin)}
            size="small"
            color="warning"
            disabled={!isSuperAdmin()}
            sx={{
              backgroundColor: isSuperAdmin() ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0, 0, 0, 0.12)',
              '&:hover': {
                backgroundColor: isSuperAdmin() ? 'rgba(255, 152, 0, 0.2)' : 'rgba(0, 0, 0, 0.12)',
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
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#d32f2f' }}>Admin Management</Typography>
        <Box>
          <IconButton onClick={fetchAdmins} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            color="error"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
            disabled={!isSuperAdmin()}
            sx={{
              borderRadius: 2,
              padding: '8px 16px',
              fontWeight: 600,
              boxShadow: isSuperAdmin() ? '0 4px 6px rgba(211, 47, 47, 0.2)' : 'none',
              '&:hover': {
                boxShadow: isSuperAdmin() ? '0 6px 8px rgba(211, 47, 47, 0.3)' : 'none',
              }
            }}
          >
            Add New Admin
          </Button>
        </Box>
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
              rows={admins}
              columns={columns}
              getRowId={(row) => row.adminId}
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
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  borderRadius: '8px 8px 0 0',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'rgba(211, 47, 47, 0.04)',
                },
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Admin Form Dialog */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#d32f2f' }}>
          {selectedAdmin ? 'Edit Admin' : 'Create New Admin'}
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
            <AdminForm 
              admin={selectedAdmin || undefined}
              onClose={handleDialogClose} 
              onSuccess={() => {
                fetchAdmins();
                handleDialogClose();
              }} 
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Move Admin to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move the admin "{selectedAdmin?.firstName} {selectedAdmin?.lastName}" to the recycle bin? You can restore it later from the recycle bin.
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

export default Admins;
