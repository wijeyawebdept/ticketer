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
import OrganizerForm from './components/OrganizerForm';
import api from '../../services/api';
import { formatPhoneNumber } from '../../utils/formatters';

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
  lastLoginAt?: string;
}

const Organizers: React.FC = () => {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrganizerIds, setSelectedOrganizerIds] = useState<string[]>([]);

  const fetchOrganizers = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Starting to fetch organizers...');
      
      // Build query parameters for search and filter
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (statusFilter !== 'all') {
        params.append('active', statusFilter === 'active' ? '1' : '0');
      }
      
      const url = params.toString() 
        ? `/api/admin/organizers?${params.toString()}`
        : '/api/admin/organizers';
      
      const response = await api.get<{ content: Organizer[] }>(url);
      console.log('Organizers data received:', response.data);
      
      const organizersData = response.data.content || [];
      setOrganizers(organizersData);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  // Debounce search
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        fetchOrganizers();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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

  const handleActivateOrganizer = async (organizerId: string) => {
    try {
      await api.patch(`/api/admin/organizers/${organizerId}/activate`);
      fetchOrganizers();
    } catch (error) {
      console.error('Error activating organizer:', error);
    }
  };

  const handleDeactivateOrganizer = async (organizerId: string) => {
    try {
      await api.patch(`/api/admin/organizers/${organizerId}/deactivate`);
      fetchOrganizers();
    } catch (error) {
      console.error('Error deactivating organizer:', error);
    }
  };

  const handleBulkOperation = async (operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE') => {
    if (selectedOrganizerIds.length === 0) return;

    try {
      for (const organizerId of selectedOrganizerIds) {
        if (operation === 'ACTIVATE') {
          await api.patch(`/api/admin/organizers/${organizerId}/activate`);
        } else if (operation === 'DEACTIVATE') {
          await api.patch(`/api/admin/organizers/${organizerId}/deactivate`);
        } else if (operation === 'DELETE') {
          await api.delete(`/api/admin/organizers/${organizerId}`);
        }
      }
      setSelectedOrganizerIds([]);
      fetchOrganizers();
    } catch (error) {
      console.error('Error performing bulk operation:', error);
    }
  };

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedOrganizerIds(newSelection);
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

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1 },
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
      field: 'organizationName', 
      headerName: 'Organization', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.value || 'N/A'} arrow placement="top">
          <Typography 
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'help'
            }}
          >
            {params.value || 'N/A'}
          </Typography>
        </Tooltip>
      )
    },
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
      flex: 1,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title="Edit Organizer" arrow>
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
          </Tooltip>
          {params.row.active ? (
            <Tooltip title="Deactivate Organizer (and all employees)" arrow>
              <IconButton
                onClick={() => handleDeactivateOrganizer(params.row.organizerId)}
                size="small"
                color="error"
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
            </Tooltip>
          ) : (
            <Tooltip title="Activate Organizer" arrow>
              <IconButton
                onClick={() => handleActivateOrganizer(params.row.organizerId)}
                size="small"
                color="success"
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
            </Tooltip>
          )}
          <Tooltip title="Move to Recycle Bin" arrow>
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
            >
              <DeleteSweepIcon />
            </IconButton>
          </Tooltip>
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
        <Box>
          <IconButton onClick={fetchOrganizers} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
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
      </Box>

      {/* Bulk Actions Toolbar */}
      {selectedOrganizerIds.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={500}>
              {selectedOrganizerIds.length} organizer(s) selected
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
            placeholder="Search by name, email, or organization..."
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
        {!loading && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Showing {organizers.length} organizer{organizers.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
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
              checkboxSelection
              rowSelectionModel={selectedOrganizerIds}
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
