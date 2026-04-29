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
  InputAdornment,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  ToggleOff as DeactivateIcon,
  ToggleOn as ActivateIcon,
  DeleteSweep as DeleteSweepIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  CheckCircle as VerifiedIcon,
  Cancel as UnverifiedIcon,
} from '@mui/icons-material';
import EmployeeService, { OrganizerEmployee, CreateEmployeeRequest, UpdateEmployeeRequest } from '../../services/employee.service';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import OrganizerService, { Organizer } from '../../services/organizer.service';
import { UserRole } from '../../types';
import { formatPhoneNumber } from '../../utils/formatters';

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

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<OrganizerEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewEmployee, setViewEmployee] = useState<OrganizerEmployee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateEmployeeRequest & { newPassword?: string }>({
    email: '',
    password: '',
    newPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    employeePosition: '',
    department: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    checkUserRole();
    // Only fetch organizers if user is admin (for the organizer filter dropdown)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const isAdminUser = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || 
                        user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN';
        if (isAdminUser) {
          fetchOrganizers();
        }
      } catch (e) {
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
      }
    }
  };

  const fetchOrganizers = async () => {
    try {
      const response = await OrganizerService.getAllOrganizers(0, 100);
      setOrganizers(response.content);
    } catch (error) {
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
      newPassword: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      dateOfBirth: '',
      employeePosition: '',
      department: '',
    });
    setShowPassword(false);
    setShowNewPassword(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (employee: OrganizerEmployee) => {
    setEditMode(true);
    setCurrentEmployeeId(employee.employeeId);
    setFormData({
      email: employee.email,
      password: '', // Password not needed for edit
      newPassword: '',
      firstName: employee.firstName,
      lastName: employee.lastName,
      phoneNumber: employee.phoneNumber || '',
      dateOfBirth: employee.dateOfBirth || '',
      employeePosition: employee.employeePosition || '',
      department: employee.department || '',
    });
    setShowPassword(false);
    setShowNewPassword(false);
    setOpenDialog(true);
  };

  const handleOpenViewDialog = (employee: OrganizerEmployee) => {
    setViewEmployee(employee);
    setOpenViewDialog(true);
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
        
        // If new password is provided, change the password
        if (formData.newPassword && formData.newPassword.trim()) {
          await EmployeeService.changeEmployeePassword(currentEmployeeId, formData.newPassword);
          setSuccess('Employee and password updated successfully');
        } else {
          setSuccess('Employee updated successfully');
        }
      } else {
        // Create new employee
        await EmployeeService.createEmployee(formData);
        setSuccess('Employee created successfully');
      }
      setOpenDialog(false);
      fetchEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
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
      setError(err.response?.data?.message || 'Failed to delete employee');
      setOpenDeleteDialog(false);
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
      setError(err.response?.data?.message || 'Failed to deactivate employee');
    }
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Filter out deleted employees (show only active and inactive)
  const visibleEmployees = employees.filter(emp => emp.active !== -1);

  return (
    <Box sx={{ p: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ color: '#ed6c02' }}>
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
            color="warning"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Add Employee
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(237,108,2,0.08)' }}>
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
                    <CircularProgress color="warning" />
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
                  <TableRow key={employee.employeeId} hover sx={{ '&:hover': { backgroundColor: 'rgba(237,108,2,0.02)' } }}>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{formatPhoneNumber(employee.phoneNumber)}</TableCell>
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
                      <Tooltip title="View Details" arrow>
                        <IconButton
                          onClick={() => handleOpenViewDialog(employee)}
                          size="small"
                          color="info"
                          sx={{
                            backgroundColor: 'rgba(2,136,209,0.1)',
                            '&:hover': { backgroundColor: 'rgba(2,136,209,0.2)' },
                            mr: 1
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Employee" arrow>
                        <IconButton
                          onClick={() => handleOpenEditDialog(employee)}
                          size="small"
                          color="primary"
                          sx={{
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.2)' },
                            mr: 1
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {employee.active === 1 ? (
                        <Tooltip title="Deactivate Employee" arrow>
                          <IconButton
                            onClick={() => handleDeactivateEmployee(employee.employeeId)}
                            size="small"
                            color="error"
                            sx={{
                              backgroundColor: 'rgba(211, 47, 47, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.2)' },
                              mr: 1
                            }}
                          >
                            <DeactivateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Activate Employee" arrow>
                          <IconButton
                            onClick={() => handleActivateEmployee(employee.employeeId)}
                            size="small"
                            color="success"
                            sx={{
                              backgroundColor: 'rgba(46, 125, 50, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.2)' },
                              mr: 1
                            }}
                          >
                            <ActivateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Move to Recycle Bin" arrow>
                        <IconButton
                          onClick={() => handleOpenDeleteDialog(employee)}
                          size="small"
                          color="warning"
                          sx={{
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.2)' }
                          }}
                        >
                          <DeleteSweepIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Employee Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#ed6c02', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Employee Details
          <IconButton onClick={() => setOpenViewDialog(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {viewEmployee && (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ width: 72, height: 72, bgcolor: '#ed6c02', fontSize: '1.8rem', fontWeight: 700 }}>
                  {viewEmployee.firstName?.[0]}{viewEmployee.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{viewEmployee.firstName} {viewEmployee.lastName}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {viewEmployee.employeePosition || 'Employee'} • {viewEmployee.department || 'N/A'}
                  </Typography>
                  <Box display="flex" gap={1} mt={0.5}>
                    <Chip label={viewEmployee.active === 1 ? 'Active' : 'Inactive'} color={viewEmployee.active === 1 ? 'success' : 'default'} size="small" />
                    <Chip
                      icon={viewEmployee.emailVerified ? <VerifiedIcon fontSize="small" /> : <UnverifiedIcon fontSize="small" />}
                      label={viewEmployee.emailVerified ? 'Email Verified' : 'Email Unverified'}
                      color={viewEmployee.emailVerified ? 'success' : 'warning'} size="small" variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <SectionTitle icon={<PersonIcon />} title="Personal Information" color="#1976d2" />
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}><DetailRow label="First Name" value={viewEmployee.firstName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Last Name" value={viewEmployee.lastName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Email" value={viewEmployee.email} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Phone Number" value={formatPhoneNumber(viewEmployee.phoneNumber)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Date of Birth" value={formatDateShort(viewEmployee.dateOfBirth)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Employee ID" value={viewEmployee.employeeId} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Account Created" value={formatDateTime(viewEmployee.createdAt)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Last Login" value={formatDateTime(viewEmployee.lastLoginAt)} /></Grid>
              </Grid>

              <Divider sx={{ mb: 2.5 }} />

              <SectionTitle icon={<WorkIcon />} title="Work Information" color="#2e7d32" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><DetailRow label="Position" value={viewEmployee.employeePosition} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Department" value={viewEmployee.department} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Hire Date" value={formatDateShort(viewEmployee.hireDate)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Organization" value={viewEmployee.organizationName} /></Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)} sx={{ borderRadius: 2 }}>Close</Button>
          <Button variant="contained" color="warning" onClick={() => { setOpenViewDialog(false); handleOpenEditDialog(viewEmployee!); }}
            startIcon={<EditIcon />} sx={{ borderRadius: 2, fontWeight: 600 }}>
            Edit Employee
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Employee Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#ed6c02' }}>{editMode ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
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
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
            )}
            {editMode && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="New Password (Optional)"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  helperText="Leave blank to keep current password"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
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
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCreateEmployee} variant="contained" color="warning" sx={{ borderRadius: 2, fontWeight: 600 }}>
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
