import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  RestoreFromTrash as RestoreIcon,
  ToggleOff as DeactivateIcon,
  ToggleOn as ActivateIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import EmployeeService, { OrganizerEmployee, CreateEmployeeRequest, UpdateEmployeeRequest } from '../../services/employee.service';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import OrganizerService, { Organizer } from '../../services/organizer.service';
import { UserRole } from '../../types';

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<OrganizerEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    employeePosition: '',
    department: '',
  });

  useEffect(() => {
    checkUserRole();
    // Only fetch organizers if user is admin (for the organizer filter dropdown)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || 
                        user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN';
        if (isAdmin) {
          fetchOrganizers();
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    fetchEmployees();
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(0);
    fetchEmployees();
  }, [selectedOrganizerId]);

  const checkUserRole = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || 
                    user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN');
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  };

  const fetchOrganizers = async () => {
    try {
      const response = await OrganizerService.getAllOrganizers(0, 100);
      setOrganizers(response.content);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (selectedOrganizerId) {
        response = await EmployeeService.getEmployeesByOrganizer(selectedOrganizerId, currentPage, 10);
      } else {
        response = await EmployeeService.getAllEmployees(currentPage, 10);
      }
      setEmployees(response.content);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setEditMode(false);
    setCurrentEmployeeId(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      dateOfBirth: '',
      employeePosition: '',
      department: '',
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (employee: OrganizerEmployee) => {
    setEditMode(true);
    setCurrentEmployeeId(employee.employeeId);
    setFormData({
      email: employee.email,
      password: '', // Password not needed for edit
      firstName: employee.firstName,
      lastName: employee.lastName,
      phoneNumber: employee.phoneNumber || '',
      dateOfBirth: employee.dateOfBirth || '',
      employeePosition: employee.employeePosition || '',
      department: employee.department || '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateEmployee = async () => {
    try {
      setError(null);
      if (editMode && currentEmployeeId) {
        // Update existing employee
        const updateData: UpdateEmployeeRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          employeePosition: formData.employeePosition,
        };
        await EmployeeService.updateEmployee(currentEmployeeId, updateData);
        setSuccess('Employee updated successfully');
      } else {
        // Create new employee
        await EmployeeService.createEmployee(formData);
        setSuccess('Employee created successfully');
      }
      setOpenDialog(false);
      fetchEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setError(err.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleOpenDeleteDialog = (employee: OrganizerEmployee) => {
    setEmployeeToDelete({
      id: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`
    });
    setOpenDeleteDialog(true);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      setError(null);
      await EmployeeService.deleteEmployee(employeeToDelete.id);
      setSuccess('Employee moved to recycle bin successfully');
      setOpenDeleteDialog(false);
      setEmployeeToDelete(null);
      fetchEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      setError(err.response?.data?.message || 'Failed to delete employee');
      setOpenDeleteDialog(false);
    }
  };

  const handleRestoreEmployee = async (employeeId: string) => {
    try {
      setError(null);
      await EmployeeService.restoreEmployee(employeeId);
      setSuccess('Employee restored successfully');
      fetchEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error restoring employee:', err);
      setError(err.response?.data?.message || 'Failed to restore employee');
    }
  };

  const handleActivateEmployee = async (employeeId: string) => {
    try {
      setError(null);
      await EmployeeService.activateEmployee(employeeId);
      setSuccess('Employee activated successfully');
      fetchEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error activating employee:', err);
      setError(err.response?.data?.message || 'Failed to activate employee');
    }
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    try {
      setError(null);
      await EmployeeService.deactivateEmployee(employeeId);
      setSuccess('Employee deactivated successfully');
      fetchEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deactivating employee:', err);
      setError(err.response?.data?.message || 'Failed to deactivate employee');
    }
  };

  // Filter out deleted employees (show only active and inactive)
  const visibleEmployees = employees.filter(emp => emp.active !== -1);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Organizer Employees
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          {isAdmin && organizers.length > 0 && (
            <Autocomplete
              size="small"
              sx={{ minWidth: 250 }}
              options={[{ organizerId: '', organizationName: 'All Organizers' }, ...organizers]}
              getOptionLabel={(option) => option.organizationName}
              value={organizers.find(org => org.organizerId === selectedOrganizerId) || { organizerId: '', organizationName: 'All Organizers' }}
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
          <IconButton onClick={fetchEmployees} color="primary" sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Add Employee
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Phone</strong></TableCell>
                <TableCell><strong>Position</strong></TableCell>
                <TableCell><strong>Department</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : visibleEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" color="text.secondary">
                      No employees found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleEmployees.map((employee) => (
                  <TableRow key={employee.employeeId} hover>
                    <TableCell>
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.phoneNumber || '-'}</TableCell>
                    <TableCell>{employee.employeePosition || '-'}</TableCell>
                    <TableCell>{employee.department || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={employee.active === 1 ? 'Active' : 'Inactive'}
                        color={employee.active === 1 ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => handleOpenEditDialog(employee)}
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
                      {employee.active === 1 ? (
                        <IconButton
                          onClick={() => handleDeactivateEmployee(employee.employeeId)}
                          size="small"
                          color="error"
                          sx={{
                            backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(211, 47, 47, 0.2)',
                            },
                            mr: 1
                          }}
                          title="Deactivate Employee"
                        >
                          <DeactivateIcon />
                        </IconButton>
                      ) : (
                        <IconButton
                          onClick={() => handleActivateEmployee(employee.employeeId)}
                          size="small"
                          color="success"
                          sx={{
                            backgroundColor: 'rgba(46, 125, 50, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(46, 125, 50, 0.2)',
                            },
                            mr: 1
                          }}
                          title="Activate Employee"
                        >
                          <ActivateIcon />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={() => handleOpenDeleteDialog(employee)}
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Employee Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </Grid>
            {!editMode && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position"
                name="employeePosition"
                value={formData.employeePosition}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateEmployee} variant="contained" color="primary">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={openDeleteDialog}
        title="Move Employee to Recycle Bin"
        message={`Are you sure you want to move ${employeeToDelete?.name || 'this employee'} to the recycle bin? This employee will be deactivated and can be restored later from the recycle bin.`}
        confirmText="Move to Recycle Bin"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleDeleteEmployee}
        onCancel={() => {
          setOpenDeleteDialog(false);
          setEmployeeToDelete(null);
        }}
      />
    </Box>
  );
};

export default Employees;
