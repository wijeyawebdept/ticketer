import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  InputAdornment,
  TablePagination,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Visibility,
  VisibilityOff,
  Visibility as ViewIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  DeleteSweep as DeleteSweepIcon,
  AssignmentTurnedIn as AssignmentIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { gateStaffService } from '../../services/gateStaff.service';
import { GateStaff, CreateGateStaffRequest, UpdateGateStaffRequest } from '../../types';

export const AdminGateStaff: React.FC = () => {
  const [staffList, setStaffList] = useState<GateStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | ''>('');

  // Dialogs
  const [openModal, setOpenModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewStaff, setViewStaff] = useState<GateStaff | null>(null);
  const [editingStaff, setEditingStaff] = useState<GateStaff | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    nic: '',
    password: '',
    active: 1,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Dialog
  const [staffToDelete, setStaffToDelete] = useState<GateStaff | null>(null);

  const fetchGateStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeParam = statusFilter === '' ? undefined : Number(statusFilter);
      const res = await gateStaffService.getGateStaffPage(page, rowsPerPage, search, activeParam);
      setStaffList(res.content || []);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load gate staff members.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => {
    fetchGateStaff();
  }, [fetchGateStaff]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      nic: '',
      password: '',
      active: 1,
    });
    setShowPassword(false);
    setOpenModal(true);
  };

  const handleOpenEdit = (staff: GateStaff) => {
    setEditingStaff(staff);
    setFormData({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      email: staff.email || '',
      phoneNumber: staff.phoneNumber || '',
      nic: staff.nic || '',
      password: '', // Blank unless changing
      active: staff.active ?? 1,
    });
    setShowPassword(false);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingStaff(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in First Name, Last Name, and Email.');
      return;
    }

    if (!editingStaff && !formData.password) {
      setError('Password is required for creating a new gate staff user.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        const updatePayload: UpdateGateStaffRequest = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: formData.phoneNumber.trim() || undefined,
          nic: formData.nic.trim() || undefined,
          active: formData.active,
          password: formData.password ? formData.password : undefined,
        };
        await gateStaffService.updateGateStaff(editingStaff.id, updatePayload);
        setSuccessMsg(`Gate staff ${formData.firstName} updated successfully.`);
      } else {
        const createPayload: CreateGateStaffRequest = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phoneNumber: formData.phoneNumber.trim() || undefined,
          nic: formData.nic.trim() || undefined,
        };
        await gateStaffService.createGateStaff(createPayload);
        setSuccessMsg(`New gate staff member ${formData.firstName} created successfully.`);
      }
      handleCloseModal();
      fetchGateStaff();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save gate staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: GateStaff) => {
    const newStatus = staff.active === 1 ? 0 : 1;
    try {
      await gateStaffService.toggleGateStaffStatus(staff.id, newStatus);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, active: newStatus } : s))
      );
      setSuccessMsg(`Updated ${staff.firstName}'s status to ${newStatus === 1 ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;
    try {
      await gateStaffService.deleteGateStaff(staffToDelete.id);
      setStaffToDelete(null);
      setSuccessMsg('Gate staff moved to recycle bin');
      fetchGateStaff();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting gate staff');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Top Header Card */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 25, 85, 0.15)',
                  border: '1px solid rgba(255, 25, 85, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff1955',
                }}
              >
                <SecurityIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
                  Gate Staff Management
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Create and manage gate operator credentials for ticket scanning terminals
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => fetchGateStaff()}
                sx={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
                sx={{
                  bgcolor: '#ff1955',
                  color: '#ffffff',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#e0144c' },
                }}
              >
                Add Gate Staff
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Notifications */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 280, flex: 1 }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value={1}>Active</MenuItem>
                <MenuItem value={0}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Gate Staff Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(0, 0, 0, 0.04)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Staff Member</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone / NIC</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Active Assignments</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} sx={{ color: '#ff1955', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Loading gate staff accounts...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      No gate staff members found.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Click "Add Gate Staff" to create your first scanning operator account.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((staff) => (
                  <TableRow key={staff.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255, 25, 85, 0.1)',
                            color: '#ff1955',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                          }}
                        >
                          {staff.firstName ? staff.firstName[0].toUpperCase() : 'G'}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {staff.firstName} {staff.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {staff.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{staff.phoneNumber || '—'}</Typography>
                      {staff.nic && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          NIC: {staff.nic}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        icon={<AssignmentIcon sx={{ fontSize: '14px !important' }} />}
                        label={`${staff.activeAssignmentsCount || 0} Event(s)`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          bgcolor: (staff.activeAssignmentsCount || 0) > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          color: (staff.activeAssignmentsCount || 0) > 0 ? '#2563eb' : 'text.secondary',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        icon={staff.active === 1 ? <ActiveIcon sx={{ fontSize: '14px !important' }} /> : <InactiveIcon sx={{ fontSize: '14px !important' }} />}
                        label={staff.active === 1 ? 'Active' : 'Inactive'}
                        size="small"
                        color={staff.active === 1 ? 'success' : 'default'}
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton
                        onClick={() => {
                          setViewStaff(staff);
                          setOpenViewModal(true);
                        }}
                        size="small"
                        color="info"
                        sx={{
                          backgroundColor: 'rgba(2, 136, 209, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(2, 136, 209, 0.2)',
                          },
                          mr: 0.5,
                        }}
                        title="View Details"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        onClick={() => handleOpenEdit(staff)}
                        size="small"
                        color="primary"
                        sx={{
                          backgroundColor: 'rgba(25, 118, 210, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.2)',
                          },
                          mr: 0.5,
                        }}
                        title="Edit Gate Staff"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      {staff.active === 1 ? (
                        <IconButton
                          onClick={() => handleToggleStatus(staff)}
                          size="small"
                          color="error"
                          sx={{
                            backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(211, 47, 47, 0.2)',
                            },
                            mr: 0.5,
                          }}
                          title="Deactivate Gate Staff"
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton
                          onClick={() => handleToggleStatus(staff)}
                          size="small"
                          color="success"
                          sx={{
                            backgroundColor: 'rgba(46, 125, 50, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(46, 125, 50, 0.2)',
                            },
                            mr: 0.5,
                          }}
                          title="Activate Gate Staff"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}

                      <IconButton
                        onClick={() => setStaffToDelete(staff)}
                        size="small"
                        color="warning"
                        sx={{
                          backgroundColor: 'rgba(255, 152, 0, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 152, 0, 0.2)',
                          },
                        }}
                        title="Move to Recycle Bin"
                      >
                        <DeleteSweepIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalElements}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Gate Staff Details</span>
          <IconButton size="small" onClick={() => setOpenViewModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {viewStaff && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255, 25, 85, 0.12)',
                    color: '#ff1955',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                  }}
                >
                  {viewStaff.firstName ? viewStaff.firstName[0].toUpperCase() : 'G'}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {viewStaff.firstName} {viewStaff.lastName}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip
                      label="GATE STAFF"
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={viewStaff.active === 1 ? 'Active' : 'Inactive'}
                      size="small"
                      color={viewStaff.active === 1 ? 'success' : 'default'}
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              </Box>

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Email Address:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {viewStaff.email}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Phone Number:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {viewStaff.phoneNumber || 'Not provided'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        NIC Number:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {viewStaff.nic || 'Not provided'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Active Assignments:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2563eb' }}>
                        {viewStaff.activeAssignmentsCount || 0} Event(s)
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Created Date:
                      </Typography>
                      <Typography variant="body2">
                        {viewStaff.createdAt ? new Date(viewStaff.createdAt).toLocaleDateString() : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Last Login:
                      </Typography>
                      <Typography variant="body2">
                        {viewStaff.lastLoginAt ? new Date(viewStaff.lastLoginAt).toLocaleString() : 'Never logged in'}
                      </Typography>
                    </Box>
                  </Box>
                  {viewStaff.notes && (
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Internal Notes:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {viewStaff.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewModal(false)}>Close</Button>
          {viewStaff && (
            <Button
              variant="contained"
              onClick={() => {
                setOpenViewModal(false);
                handleOpenEdit(viewStaff);
              }}
              sx={{ bgcolor: '#ff1955', color: '#fff', '&:hover': { bgcolor: '#e0144c' } }}
            >
              Edit Staff
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <form onSubmit={handleFormSubmit}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
            {editingStaff ? `Edit Gate Staff: ${editingStaff.firstName}` : 'Add New Gate Staff Member'}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  required
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
                <TextField
                  required
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </Box>

              <TextField
                required
                fullWidth
                type="email"
                label="Login Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                helperText="Gate staff operator will use this email to log in at /login/gate"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="NIC Number"
                  value={formData.nic}
                  onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                />
              </Box>

              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label={editingStaff ? 'New Password (leave blank to keep current)' : 'Password'}
                required={!editingStaff}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText="Minimum 6 characters for staff login."
              />

              {editingStaff && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active === 1}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked ? 1 : 0 })}
                      color="success"
                    />
                  }
                  label={formData.active === 1 ? 'Account is Active (Allowed to scan)' : 'Account is Disabled'}
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ bgcolor: '#ff1955', color: '#fff', '&:hover': { bgcolor: '#e0144c' } }}
            >
              {submitting ? 'Saving...' : editingStaff ? 'Update Staff' : 'Create Staff Member'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!staffToDelete} onClose={() => setStaffToDelete(null)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Move Gate Staff to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move the gate staff "{staffToDelete?.firstName} {staffToDelete?.lastName}" to the recycle bin? You can restore it later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setStaffToDelete(null)}
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

export default AdminGateStaff;
