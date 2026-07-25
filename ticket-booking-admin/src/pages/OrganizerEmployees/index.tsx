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
  InputAdornment,
  Divider,
  Grid,
  Avatar
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon, 
  Edit as EditIcon, 
  Refresh as RefreshIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  Search as SearchIcon,
  DeleteSweep as DeleteSweepIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  CheckCircle as VerifiedIcon,
  Cancel as UnverifiedIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { formatPhoneNumber } from '../../utils/formatters';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import { toast } from 'react-toastify';
import { FileDownload as DownloadIcon } from '@mui/icons-material';

interface OrganizerEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  role: string;
  active: number; // 1 = active, 0 = deactivated, -1 = soft deleted
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
  lastLoginAt: string | null;
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

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.25, wordBreak: 'break-all' }}>
      {value || <em style={{ color: '#bbb' }}>Not provided</em>}
    </Typography>
  </Box>
);

const SectionTitle = ({ icon, title, color = '#1976d2' }: { icon: React.ReactNode; title: string; color?: string }) => (
  <Box display="flex" alignItems="center" gap={1} mb={1.5} mt={1}>
    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, color }}>{title}</Typography>
  </Box>
);

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
  const [viewEmployee, setViewEmployee] = useState<OrganizerEmployee | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
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
      setError(err.message || 'Failed to fetch organizer employees');
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

  const handleViewEmployee = (employee: OrganizerEmployee) => {
    setViewEmployee(employee);
    setOpenViewDialog(true);
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
      setError(err.message || 'Failed to save organizer employee');
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
      setError(err.message || 'Failed to delete organizer employee');
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
      setError(err.message || 'Failed to activate employee');
    }
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    try {
      await api.patch(`/api/admin/organizer-employees/${employeeId}/deactivate`);
      setSuccess('Employee deactivated successfully');
      fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate employee');
    }
  };

  const prepareExportData = () => {
    return employees.map(e => ({
      'First Name': e.firstName,
      'Last Name': e.lastName,
      'Email': e.email,
      'Phone Number': formatPhoneNumber(e.phoneNumber),
      'Organization': e.organizationName,
      'Organizer': e.organizerName,
      'Position': e.employeePosition || 'N/A',
      'Department': e.department || 'N/A',
      'Hire Date': e.hireDate ? new Date(e.hireDate).toLocaleDateString() : 'N/A',
      'Status': e.active === 1 ? 'Active' : 'Inactive',
      'Created At': new Date(e.createdAt).toLocaleString()
    }));
  };

  const handleExportExcel = () => {
    const data = prepareExportData();
    exportToExcel(data, `Organizer_Employees_Export_${new Date().toLocaleDateString()}`);
    toast.success('Exporting to Excel...');
  };

  const handleExportCSV = () => {
    const data = prepareExportData();
    exportToCSV(data, `Organizer_Employees_Export_${new Date().toLocaleDateString()}`);
    toast.success('Exporting to CSV...');
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
      setError(err.message || 'Failed to perform bulk operation');
    }
  };

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedEmployeeIds(newSelection);
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
          label={params.value === 1 ? 'Active' : 'Inactive'}
          color={params.value === 1 ? 'success' : 'default'}
          size="small"
          sx={{ fontWeight: 500 }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title="View Details" arrow>
            <IconButton size="small" color="info" onClick={() => handleViewEmployee(params.row as OrganizerEmployee)}
              sx={{ backgroundColor: 'rgba(2,136,209,0.1)', '&:hover': { backgroundColor: 'rgba(2,136,209,0.2)' }, mr: 0.5 }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Employee" arrow>
            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(params.row as OrganizerEmployee)}
              sx={{ backgroundColor: 'rgba(25,118,210,0.1)', '&:hover': { backgroundColor: 'rgba(25,118,210,0.2)' }, mr: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.active === 1 ? (
            <Tooltip title="Deactivate Employee" arrow>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeactivateEmployee(params.row.employeeId)}
                sx={{ backgroundColor: 'rgba(211,47,47,0.1)', '&:hover': { backgroundColor: 'rgba(211,47,47,0.2)' }, mr: 0.5 }}
              >
                <DeactivateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Activate Employee" arrow>
              <IconButton
                size="small"
                color="success"
                onClick={() => handleActivateEmployee(params.row.employeeId)}
                sx={{ backgroundColor: 'rgba(46,125,50,0.1)', '&:hover': { backgroundColor: 'rgba(46,125,50,0.2)' }, mr: 0.5 }}
              >
                <ActivateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete Employee" arrow>
            <IconButton size="small" color="warning" onClick={() => handleDeleteClick(params.row as OrganizerEmployee)}
              sx={{ backgroundColor: 'rgba(255,152,0,0.1)', '&:hover': { backgroundColor: 'rgba(255,152,0,0.2)' } }}>
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const e = viewEmployee;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>Organizer Employees</Typography>
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
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            sx={{ ml: 1 }}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ ml: 1 }}
          >
            CSV
          </Button>
          <Tooltip title="Refresh" arrow>
            <IconButton onClick={fetchEmployees} sx={{ mx: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Add New Employee
          </Button>
        </Box>
      </Box>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', fontWeight: 500 }}>
            Total: {employees.length} employee{employees.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Paper>

      {/* Bulk Operations Toolbar */}
      {selectedEmployeeIds.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
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
                sx={{ mr: 1, borderRadius: 2 }}
              >
                Activate Selected
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleBulkOperation('DEACTIVATE')}
                sx={{ mr: 1, borderRadius: 2 }}
              >
                Deactivate Selected
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleBulkOperation('DELETE')}
                sx={{ borderRadius: 2 }}
              >
                Delete Selected
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Box sx={{ height: 600, width: '100%' }}>
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
              sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] }
            }}
            sx={{
              '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(25,118,210,0.05)', borderRadius: '8px 8px 0 0' },
              '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(0,0,0,0.05)' },
              '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(25,118,210,0.02)' },
            }}
          />
        </Box>
      </Paper>

      {/* ── View Details Dialog ──────────────────────────────────────────────── */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#1976d2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Employee Details
          <IconButton onClick={() => setOpenViewDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {e && (
            <Box>
              {/* Header */}
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ width: 72, height: 72, bgcolor: '#1976d2', fontSize: '1.8rem', fontWeight: 700 }}>
                  {e.firstName?.[0]}{e.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{e.firstName} {e.lastName}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {e.employeePosition || 'Employee'} • {e.department || 'N/A'}
                  </Typography>
                  <Box display="flex" gap={1} mt={0.5}>
                    <Chip label={e.active === 1 ? 'Active' : 'Inactive'} color={e.active === 1 ? 'success' : 'default'} size="small" />
                    <Chip
                      icon={e.emailVerified ? <VerifiedIcon fontSize="small" /> : <UnverifiedIcon fontSize="small" />}
                      label={e.emailVerified ? 'Email Verified' : 'Email Unverified'}
                      color={e.emailVerified ? 'success' : 'warning'} size="small" variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Personal Info */}
              <SectionTitle icon={<PersonIcon />} title="Personal Information" color="#1976d2" />
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}><DetailRow label="First Name" value={e.firstName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Last Name" value={e.lastName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Email" value={e.email} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Phone Number" value={formatPhoneNumber(e.phoneNumber)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Date of Birth" value={formatDateShort(e.dateOfBirth)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Employee ID" value={e.employeeId} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Account Created" value={formatDateTime(e.createdAt)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Last Login" value={formatDateTime(e.lastLoginAt)} /></Grid>
              </Grid>

              <Divider sx={{ mb: 2.5 }} />

              {/* Work Info */}
              <SectionTitle icon={<WorkIcon />} title="Work & Organization" color="#2e7d32" />
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}><DetailRow label="Organization" value={e.organizationName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Organizer Name" value={e.organizerName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Position" value={e.employeePosition} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Department" value={e.department} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Hire Date" value={formatDateShort(e.hireDate)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Role" value={e.role} /></Grid>
              </Grid>

              {e.createdByAdminName && (
                <>
                  <Divider sx={{ mb: 2.5 }} />
                  <SectionTitle icon={<BusinessIcon />} title="Administration" color="#ed6c02" />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><DetailRow label="Created By Admin" value={e.createdByAdminName} /></Grid>
                    <Grid item xs={12} sm={6}><DetailRow label="Admin ID" value={e.createdByAdminId} /></Grid>
                  </Grid>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)} sx={{ borderRadius: 2 }}>Close</Button>
          <Button variant="contained" onClick={() => { setOpenViewDialog(false); handleOpenDialog(e!); }}
            startIcon={<EditIcon />} sx={{ borderRadius: 2, fontWeight: 600 }}>
            Edit Employee
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit / Add Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#1976d2' }}>
          {editingEmployee ? 'Edit Organizer Employee' : 'Add New Organizer Employee'}
        </DialogTitle>
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
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" sx={{ borderRadius: 2, fontWeight: 600 }}>
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
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          {employeeToDelete && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete this organizer employee?
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)' }}>
                <Typography variant="subtitle2" color="text.secondary">Name:</Typography>
                <Typography variant="body1" fontWeight="700" gutterBottom>
                  {employeeToDelete.firstName} {employeeToDelete.lastName}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Email:</Typography>
                <Typography variant="body2" gutterBottom>{employeeToDelete.email}</Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Organization:</Typography>
                <Typography variant="body2">{employeeToDelete.organizationName}</Typography>
              </Box>
              <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 500 }}>
                 Warning: This action will move the employee account to the recycle bin.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={handleDeleteCancel} color="inherit" sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" sx={{ borderRadius: 2, fontWeight: 600 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ borderRadius: 2 }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrganizerEmployees;
