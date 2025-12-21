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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  DeleteSweep as DeleteSweepIcon, 
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AdminForm from './components/AdminForm';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatPhoneNumber } from '../../utils/formatters';

interface Admin {
  adminId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const Admins: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const { isSuperAdmin, user } = useAuth();

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Starting to fetch admins...');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (statusFilter !== 'all') {
        params.append('active', statusFilter === 'active' ? '1' : '0');
      }
      
      const url = params.toString() 
        ? `/api/admin/admins?${params.toString()}`
        : '/api/admin/admins';
      
      const response = await api.get<{ content: Admin[] }>(url);
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
  }, [isSuperAdmin, searchQuery, statusFilter]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Debounce search - only trigger on statusFilter change
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        fetchAdmins();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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

  const handleActivateAdmin = async (adminId: string) => {
    try {
      await api.patch(`/api/admin/admins/${adminId}/activate`);
      fetchAdmins();
    } catch (error) {
      console.error('Error activating admin:', error);
    }
  };

  const handleDeactivateAdmin = async (adminId: string) => {
    try {
      await api.patch(`/api/admin/admins/${adminId}/deactivate`);
      fetchAdmins();
    } catch (error) {
      console.error('Error deactivating admin:', error);
    }
  };

  const handleBulkOperation = async (operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE') => {
    if (selectedAdminIds.length === 0) return;

    try {
      const payload = {
        adminIds: selectedAdminIds,
        operation: operation,
      };

      await api.post('/api/admin/admins/bulk-operation', payload);
      setSelectedAdminIds([]);
      fetchAdmins();
    } catch (error) {
      console.error('Error performing bulk operation:', error);
    }
  };

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedAdminIds(newSelection);
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

  const getRoleTooltip = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Can manage admins, users, events, and system settings';
      case 'ADMIN':
        return 'Can manage users, events, and organizers';
      default:
        return '';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isCurrentAdmin = (adminId: string) => {
    return user?.id === adminId;
  };

  const columns: GridColDef[] = [
    { 
      field: 'firstName', 
      headerName: 'First Name', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.value}
          {isCurrentAdmin(params.row.adminId) && (
            <Chip 
              label="You" 
              size="small" 
              color="primary" 
              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} 
            />
          )}
        </Box>
      )
    },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { 
      field: 'phoneNumber', 
      headerName: 'Phone', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {formatPhoneNumber(params.value)}
        </Typography>
      )
    },
    { 
      field: 'role', 
      headerName: 'Role', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={getRoleTooltip(params.value as string)} arrow>
          <Chip 
            label={params.value} 
            color={getRoleChipColor(params.value as string)} 
            variant="outlined" 
            size="small" 
            sx={{ fontWeight: 600, cursor: 'help' }}
          />
        </Tooltip>
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
      field: 'lastLoginAt',
      headerName: 'Last Login',
      flex: 1.2,
      renderCell: (params: GridRenderCellParams) => {
        const fullTimestamp = formatDateTime(params.value);
        const shortDate = formatDateShort(params.value);
        return (
          <Tooltip title={fullTimestamp} arrow placement="top">
            <Typography 
              variant="body2" 
              sx={{ 
                color: params.value ? 'text.primary' : 'text.secondary',
                cursor: params.value ? 'help' : 'default'
              }}
            >
              {shortDate}
            </Typography>
          </Tooltip>
        );
      }
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1.2,
      renderCell: (params: GridRenderCellParams) => {
        const fullTimestamp = formatDateTime(params.value);
        const shortDate = formatDateShort(params.value);
        return (
          <Tooltip title={fullTimestamp} arrow placement="top">
            <Typography 
              variant="body2"
              sx={{ cursor: 'help' }}
            >
              {shortDate}
            </Typography>
          </Tooltip>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1.2,
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
          {params.row.active ? (
            <IconButton
              onClick={() => handleDeactivateAdmin(params.row.adminId)}
              size="small"
              color="error"
              disabled={!isSuperAdmin()}
              sx={{
                backgroundColor: isSuperAdmin() ? 'rgba(211, 47, 47, 0.1)' : 'rgba(0, 0, 0, 0.12)',
                '&:hover': {
                  backgroundColor: isSuperAdmin() ? 'rgba(211, 47, 47, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                },
                mr: 1
              }}
              title="Deactivate Admin (Super Admin Only)"
            >
              <DeactivateIcon />
            </IconButton>
          ) : (
            <IconButton
              onClick={() => handleActivateAdmin(params.row.adminId)}
              size="small"
              color="success"
              disabled={!isSuperAdmin()}
              sx={{
                backgroundColor: isSuperAdmin() ? 'rgba(46, 125, 50, 0.1)' : 'rgba(0, 0, 0, 0.12)',
                '&:hover': {
                  backgroundColor: isSuperAdmin() ? 'rgba(46, 125, 50, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                },
                mr: 1
              }}
              title="Activate Admin (Super Admin Only)"
            >
              <ActivateIcon />
            </IconButton>
          )}
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

      {/* Bulk Actions Toolbar */}
      {selectedAdminIds.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={500}>
              {selectedAdminIds.length} admin(s) selected
            </Typography>
            <Box>
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={() => handleBulkOperation('ACTIVATE')}
                disabled={!isSuperAdmin()}
                sx={{ mr: 1 }}
              >
                Activate Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleBulkOperation('DEACTIVATE')}
                disabled={!isSuperAdmin()}
                sx={{ mr: 1 }}
              >
                Deactivate Selected
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleBulkOperation('DELETE')}
                disabled={!isSuperAdmin()}
              >
                Delete Selected
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Search and Filters */}
      <Paper 
        sx={{ 
          p: 2,
          mb: 2,
          borderRadius: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
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
        </Box>
      </Paper>
      
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
              checkboxSelection
              rowSelectionModel={selectedAdminIds}
              onRowSelectionModelChange={(newSelection) => {
                handleSelectionChange(newSelection as string[]);
              }}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                  },
                },
                sorting: {
                  sortModel: [{ field: 'createdAt', sort: 'desc' }],
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              getRowClassName={(params) => 
                isCurrentAdmin(params.row.adminId) ? 'current-admin-row' : ''
              }
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
                '& .current-admin-row': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                  },
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
