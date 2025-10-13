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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { UserService } from '../../services';
import { User, UserRole } from '../../types';
import UserForm from './components/UserForm';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Starting to fetch users...');
      const data = await UserService.getAllUsers();
      console.log('Users data received:', data);
      console.log('Data type:', typeof data);
      console.log('Is array?', Array.isArray(data));
      console.log('Users count:', data?.length);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add this debugging effect to log when users state changes
  useEffect(() => {
    console.log('DataGrid receiving users:', users);
    console.log('Users type:', typeof users);
    console.log('Users is array:', Array.isArray(users));
    console.log('Users length:', users?.length);
  }, [users]);

  const handleCreateClick = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      await UserService.deleteUser(selectedUser.id);
      fetchUsers();
      handleDeleteDialogClose();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleChipColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      case UserRole.ORGANIZER:
        return 'warning';
      case UserRole.USER:
      default:
        return 'success';
    }
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { 
      field: 'role', 
      headerName: 'Role', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color={getRoleChipColor(params.value as UserRole)} 
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
            onClick={() => handleEditClick(params.row as User)}
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
            onClick={() => handleDeleteClick(params.row as User)}
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
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>User Management</Typography>
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
          Add New User
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
              rows={users}
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
        </Box>
      </Paper>

      {/* User Form Dialog */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1976d2' }}>
          {selectedUser ? 'Edit User' : 'Create New User'}
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
            <UserForm 
              user={selectedUser || undefined}
              onClose={handleDialogClose} 
              onSuccess={() => {
                fetchUsers();
                handleDialogClose();
              }} 
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the user "{selectedUser?.firstName} {selectedUser?.lastName}"? This action cannot be undone.
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

export default Users;