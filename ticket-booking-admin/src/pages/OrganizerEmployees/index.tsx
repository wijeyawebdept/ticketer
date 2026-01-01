import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Chip,
  Tooltip,
  InputAdornment
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Refresh as RefreshIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  Search as SearchIcon,
  DeleteSweep as DeleteSweepIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { formatPhoneNumber } from '../../utils/formatters';

interface OrganizerEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  role: string;
  active: boolean;
  emailVerified: boolean;
  organizerId: string;
  organizerName: string;
  organizationName: string;
  createdByAdminId: string | null;
  createdByAdminName: string | null;
  employeePosition: string | null;
  department: string | null;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Organizer {
  organizerId: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  newPassword: string;
  phoneNumber: string;
  dateOfBirth: string;
  organizerId: string;
  employeePosition: string;
  department: string;
  hireDate: string;
}

const OrganizerEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<OrganizerEmployee[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<OrganizerEmployee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<OrganizerEmployee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    newPassword: '',
    phoneNumber: '',
    dateOfBirth: '',
    organizerId: '',
    employeePosition: '',
    department: '',
    hireDate: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '1000');
      
      if (selectedOrganizerId) {
        params.append('organizerId', selectedOrganizerId);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (statusFilter !== 'all') {
        params.append('active', statusFilter === 'active' ? '1' : '0');
      }
      
      const response = await api.get<{ content: OrganizerEmployee[] }>(
        `/api/admin/organizer-employees?${params.toString()}`
      );
      setEmployees(response.data.content || []);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to fetch organizer employees');
    } finally {
      setLoading(false);
    }
  }, [selectedOrganizerId, searchQuery, statusFilter]);

  useEffect(() => {
    fetchEmployees();
    fetchOrganizers();
  }, [fetchEmployees]);

  // Debounce search
  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        fetchEmployees();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const fetchOrganizers = async () => {
    try {
      const response = await api.get<{ content: Organizer[] }>('/api/admin/organizers', {
        params: { page: 0, size: 1000 }
      });
      setOrganizers(response.data.content);
    } catch (err: any) {
      console.error('Failed to fetch organizers:', err);
    }
  };

  const handleOpenDialog = (employee?: OrganizerEmployee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        password: '',
        newPassword: '',
        phoneNumber: employee.phoneNumber || '',
        dateOfBirth: employee.dateOfBirth || '',
        organizerId: employee.organizerId,
        employeePosition: employee.employeePosition || '',
        department: employee.department || '',
        hireDate: employee.hireDate || ''
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        newPassword: '',
        phoneNumber: '',
        dateOfBirth: '',
        organizerId: '',
        employeePosition: '',
        department: '',
        hireDate: ''
      });
    }
    setShowPassword(false);
    setShowNewPassword(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployee(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingEmployee) {
        await api.put(`/api/admin/organizer-employees/${editingEmployee.employeeId}`, formData);
        
        // If new password is provided, change the password
        if (formData.newPassword && formData.newPassword.trim()) {
          await api.post(`/api/admin/organizer-employees/${editingEmployee.employeeId}/change-password`, {
            newPassword: formData.newPassword
          });
          setSuccess('Organizer employee and password updated successfully');
        } else {
          setSuccess('Organizer employee updated successfully');
        }
      } else {
        await api.post('/api/admin/organizer-employees', formData);
        setSuccess('Organizer employee created successfully');
      }
      handleCloseDialog();
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data || 'Failed to save organizer employee');
    }
  };

  const handleDeleteClick = (employee: OrganizerEmployee) => {
    setEmployeeToDelete(employee);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    
    try {
      await api.delete(`/api/admin/organizer-employees/${employeeToDelete.employeeId}`);
      setSuccess('Organizer employee deleted successfully');
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data || 'Failed to delete organizer employee');
    } finally {
      setOpenDeleteDialog(false);
      setEmployeeToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
    setEmployeeToDelete(null);
  };

  const handleActivateEmployee = async (employeeId: string) => {
    try {
      await api.patch(`/api/admin/organizer-employees/${employeeId}/activate`);
      setSuccess('Employee activated successfully');
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data || 'Failed to activate employee');
    }
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    try {
      await api.patch(`/api/admin/organizer-employees/${employeeId}/deactivate`);
      setSuccess('Employee deactivated successfully');
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data || 'Failed to deactivate employee');
    }
  };

  const handleBulkOperation = async (operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE') => {
    if (selectedEmployeeIds.length === 0) return;

    try {
      for (const employeeId of selectedEmployeeIds) {
        if (operation === 'ACTIVATE') {
          await api.patch(`/api/admin/organizer-employees/${employeeId}/activate`);
        } else if (operation === 'DEACTIVATE') {
          await api.patch(`/api/admin/organizer-employees/${employeeId}/deactivate`);
        } else if (operation === 'DELETE') {
          await api.delete(`/api/admin/organizer-employees/${employeeId}`);
        }
      }
      setSelectedEmployeeIds([]);
      setSuccess(`Bulk operation completed for ${selectedEmployeeIds.length} employee(s)`);
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data || 'Failed to perform bulk operation');
    }
  };

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedEmployeeIds(newSelection);
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', width: 120 },
    { field: 'lastName', headerName: 'Last Name', width: 120 },
    { field: 'email', headerName: 'Email', width: 200 },
    { 
      field: 'organizationName', 
      headerName: 'Organization', 
      width: 180,
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
    { field: 'employeePosition', headerName: 'Position', width: 150 },
    { field: 'department', headerName: 'Department', width: 130 },
    { 
      field: 'phoneNumber', 
      headerName: 'Phone', 
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {formatPhoneNumber(params.value)}
        </Typography>
      )
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 100,
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
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title="Edit Employee" arrow>
            <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          {params.row.active ? (
            <Tooltip title="Deactivate Employee" arrow>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeactivateEmployee(params.row.employeeId)}
              >
                <DeactivateIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Activate Employee" arrow>
              <IconButton
                size="small"
                color="success"
                onClick={() => handleActivateEmployee(params.row.employeeId)}
              >
                <ActivateIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete Employee" arrow>
            <IconButton size="small" color="warning" onClick={() => handleDeleteClick(params.row)}>
              <DeleteSweepIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Organizer Employees</Typography>
        <Box display="flex" gap={2} alignItems="center">
          {organizers.length > 0 && (
            <Autocomplete
              size="small"
              sx={{ minWidth: 250 }}
              options={[{ organizerId: '', organizationName: 'All Organizers', firstName: '', lastName: '' }, ...organizers]}
              getOptionLabel={(option) => option.organizationName}
              value={organizers.find(org => org.organizerId === selectedOrganizerId) || { organizerId: '', organizationName: 'All Organizers', firstName: '', lastName: '' }}
              onChange={(_, newValue) => {
                setSelectedOrganizerId(newValue?.organizerId || '');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Organizer"
                  placeholder="Search organizers..."
                />
              )}
              isOptionEqualToValue={(option, value) => option.organizerId === value.organizerId}
            />
          )}
          <Tooltip title="Refresh" arrow>
            <IconButton onClick={fetchEmployees} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add New Employee
          </Button>
        </Box>
      </Box>

      {/* Search and Filter Section */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
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
        <Typography variant="body2" color="text.secondary">
          Total: {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Bulk Operations Toolbar */}
      {selectedEmployeeIds.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={500}>
              {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
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

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={employees}
          columns={columns}
          getRowId={(row) => row.employeeId}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => handleSelectionChange(newSelection as string[])}
          rowSelectionModel={selectedEmployeeIds}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingEmployee ? 'Edit Organizer Employee' : 'Add New Organizer Employee'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </Box>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            {!editingEmployee && (
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}
            {editingEmployee && (
              <TextField
                fullWidth
                label="New Password (leave empty to keep current)"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password to change"
                helperText="Only fill this if you want to change the employee's password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}
            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
            />
            <FormControl fullWidth required>
              <InputLabel>Organization</InputLabel>
              <Select
                name="organizerId"
                value={formData.organizerId}
                onChange={handleSelectChange}
                label="Organization"
              >
                {organizers.map((org) => (
                  <MenuItem key={org.organizerId} value={org.organizerId}>
                    {org.organizationName} ({org.firstName} {org.lastName})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Position"
                name="employeePosition"
                value={formData.employeePosition}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Hire Date"
                name="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingEmployee ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          {employeeToDelete && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete this organizer employee?
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Name:
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {employeeToDelete.firstName} {employeeToDelete.lastName}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                  Email:
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {employeeToDelete.email}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                  Organization:
                </Typography>
                <Typography variant="body2">
                  {employeeToDelete.organizationName}
                </Typography>
              </Box>
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                ⚠️ Warning: This action will deactivate the employee account.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrganizerEmployees;
