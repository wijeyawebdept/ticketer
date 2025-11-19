import React, { useState, useEffect } from 'react';
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
  InputLabel
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../../services/api';

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
    phoneNumber: '',
    dateOfBirth: '',
    organizerId: '',
    employeePosition: '',
    department: '',
    hireDate: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchOrganizers();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ content: OrganizerEmployee[] }>('/api/admin/organizer-employees', {
        params: { page: 0, size: 1000 }
      });
      setEmployees(response.data.content);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to fetch organizer employees');
    } finally {
      setLoading(false);
    }
  };

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
        phoneNumber: '',
        dateOfBirth: '',
        organizerId: '',
        employeePosition: '',
        department: '',
        hireDate: ''
      });
    }
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
        setSuccess('Organizer employee updated successfully');
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

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', width: 120 },
    { field: 'lastName', headerName: 'Last Name', width: 120 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'organizationName', headerName: 'Organization', width: 180 },
    { field: 'employeePosition', headerName: 'Position', width: 150 },
    { field: 'department', headerName: 'Department', width: 130 },
    { field: 'phoneNumber', headerName: 'Phone', width: 130 },
    {
      field: 'active',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Box component="span" sx={{ color: params.value ? 'success.main' : 'error.main' }}>
          {params.value ? 'Active' : 'Inactive'}
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDeleteClick(params.row)}>
            <DeleteIcon />
          </IconButton>
        </>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Organizer Employees</Typography>
        <Box>
          <IconButton onClick={fetchEmployees} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add New Employee
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={employees}
          columns={columns}
          getRowId={(row) => row.employeeId}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
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
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
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
