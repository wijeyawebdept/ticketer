import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Menu,
  ListItemIcon,
  ListItemText,
  Alert,
  Snackbar,
  Grid
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  DeleteSweep as DeleteSweepIcon, 
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { UserService } from '../../services';
import { User, UserRole } from '../../types';
import UserForm from './components/UserForm';
import UserDetailsDialog from './components/UserDetailsDialog';
import { useAuth } from '../../context/AuthContext';
import { formatPhoneNumber } from '../../utils/formatters';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { isSuperAdmin } = useAuth();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Bulk operations
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.active = statusFilter === 'active';
      // Only fetch USER role
      params.role = 'USER';

      const data = await UserService.getAllUsers(params);
      
      // Filter out SUPER_ADMIN users if the current user is not a SUPER_ADMIN
      let filteredUsers = data;
      if (!isSuperAdmin()) {
        filteredUsers = data.filter(user => 
          user.role !== UserRole.SUPER_ADMIN && 
          user.role !== UserRole.ROLE_SUPER_ADMIN
        );
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      showSnackbar('Error fetching users', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, isSuperAdmin]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce search

    return () => clearTimeout(delayDebounceFn);
  }, [fetchUsers]);

  const handleCreateClick = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleViewClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailsDialogOpen(true);
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

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setSelectedUserId(null);
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await UserService.activateUser(userId);
      fetchUsers();
      showSnackbar('User activated successfully', 'success');
    } catch (error) {
      showSnackbar('Error activating user', 'error');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await UserService.deactivateUser(userId);
      fetchUsers();
      showSnackbar('User deactivated successfully', 'success');
    } catch (error) {
      showSnackbar('Error deactivating user', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      await UserService.deleteUser(selectedUser.id);
      fetchUsers();
      handleDeleteDialogClose();
      showSnackbar('User moved to recycle bin', 'success');
    } catch (error) {
      showSnackbar('Error deleting user', 'error');
    }
  };

  const handleBulkMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setBulkMenuAnchor(event.currentTarget);
  };

  const handleBulkMenuClose = () => {
    setBulkMenuAnchor(null);
  };

  const handleBulkOperation = async (operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE') => {
    if (selectedRows.length === 0) {
      showSnackbar('Please select users first', 'error');
      return;
    }

    try {
      const userIds = selectedRows.map(id => String(id));
      const result = await UserService.bulkOperation({
        userIds,
        operation
      });
      
      showSnackbar(result.message, result.failed > 0 ? 'error' : 'success');
      fetchUsers();
      setSelectedRows([]);
    } catch (error) {
      showSnackbar('Error performing bulk operation', 'error');
    }
    
    handleBulkMenuClose();
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
  };

  const getRoleChipColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
      case UserRole.ROLE_SUPER_ADMIN:
        return 'secondary';
      case UserRole.ADMIN:
      case UserRole.ROLE_ADMIN:
        return 'error';
      case UserRole.ORGANIZER:
      case UserRole.ROLE_ORGANIZER:
        return 'warning';
      case UserRole.USER:
      case UserRole.ROLE_USER:
      default:
        return 'success';
    }
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.2 },
    { 
      field: 'phoneNumber', 
      headerName: 'Phone Number', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <span>{formatPhoneNumber(params.value)}</span>
      )
    },
    { 
      field: 'role', 
      headerName: 'Role', 
      flex: 0.8,
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
      field: 'active',
      headerName: 'Status',
      flex: 0.7,
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
      flex: 1.2,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            onClick={() => handleViewClick(params.row.id)}
            size="small"
            color="info"
            sx={{
              backgroundColor: 'rgba(2, 136, 209, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(2, 136, 209, 0.2)',
              },
              mr: 0.5
            }}
            title="View Details"
          >
            <ViewIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={() => handleEditClick(params.row as User)}
            size="small"
            color="primary"
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.2)',
              },
              mr: 0.5
            }}
            title="Edit User"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          {params.row.active ? (
            <IconButton
              onClick={() => handleDeactivateUser(params.row.id)}
              size="small"
              color="error"
              sx={{
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(211, 47, 47, 0.2)',
                },
                mr: 0.5
              }}
              title="Deactivate User"
            >
              <DeactivateIcon fontSize="small" />
            </IconButton>
          ) : (
            <IconButton
              onClick={() => handleActivateUser(params.row.id)}
              size="small"
              color="success"
              sx={{
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(46, 125, 50, 0.2)',
                },
                mr: 0.5
              }}
              title="Activate User"
            >
              <ActivateIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            onClick={() => handleDeleteClick(params.row as User)}
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
            <DeleteSweepIcon fontSize="small" />
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
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>
          User Management
        </Typography>
        <Box>
          <IconButton onClick={fetchUsers} sx={{ mr: 1 }} title="Refresh">
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
            Add New User
          </Button>
        </Box>
      </Box>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleClearFilters}
              startIcon={<FilterIcon />}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Operations Bar */}
      {selectedRows.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={500}>
              {selectedRows.length} user(s) selected
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
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={(newSelection) => {
                setSelectedRows(newSelection);
              }}
              rowSelectionModel={selectedRows}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                  },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
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
        <DialogTitle sx={{ fontWeight: 600 }}>Move User to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move the user "{selectedUser?.firstName} {selectedUser?.lastName}" to the recycle bin? You can restore it later.
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

      {/* User Details Dialog */}
      <UserDetailsDialog
        userId={selectedUserId}
        open={isDetailsDialogOpen}
        onClose={handleDetailsDialogClose}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users;
