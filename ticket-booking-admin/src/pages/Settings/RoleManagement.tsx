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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface Role {
  roleId: string;
  roleName: string;
  roleDescription: string;
  isSystemRole: boolean;
  canManageUsers: boolean;
  canManageEvents: boolean;
  canManageVenues: boolean;
  canManageBookings: boolean;
  canViewReports: boolean;
  canManageRoles: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoleFormData {
  roleName: string;
  roleDescription: string;
  canManageUsers: boolean;
  canManageEvents: boolean;
  canManageVenues: boolean;
  canManageBookings: boolean;
  canViewReports: boolean;
  canManageRoles: boolean;
}

const RoleManagement: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    roleName: '',
    roleDescription: '',
    canManageUsers: false,
    canManageEvents: false,
    canManageVenues: false,
    canManageBookings: false,
    canViewReports: false,
    canManageRoles: false,
  });

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ROLE_ADMIN ||
                  user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN;

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get<Role[]>('/api/admin/roles');
      setRoles(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        roleName: role.roleName,
        roleDescription: role.roleDescription,
        canManageUsers: role.canManageUsers,
        canManageEvents: role.canManageEvents,
        canManageVenues: role.canManageVenues,
        canManageBookings: role.canManageBookings,
        canViewReports: role.canViewReports,
        canManageRoles: role.canManageRoles,
      });
    } else {
      setEditingRole(null);
      setFormData({
        roleName: '',
        roleDescription: '',
        canManageUsers: false,
        canManageEvents: false,
        canManageVenues: false,
        canManageBookings: false,
        canViewReports: false,
        canManageRoles: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRole(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingRole) {
        await api.put(`/api/admin/roles/${editingRole.roleId}`, formData);
        setSuccess('Role updated successfully');
      } else {
        await api.post('/api/admin/roles', formData);
        setSuccess('Role created successfully');
      }
      handleCloseDialog();
      fetchRoles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to save role');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    
    try {
      await api.delete(`/api/admin/roles/${roleToDelete.roleId}`);
      setSuccess('Role deleted successfully');
      fetchRoles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to delete role');
      setTimeout(() => setError(null), 3000);
    } finally {
      setOpenDeleteDialog(false);
      setRoleToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
    setRoleToDelete(null);
  };

  const handleToggleStatus = async (roleId: string) => {
    try {
      await api.patch(`/api/admin/roles/${roleId}/toggle-status`);
      setSuccess('Role status updated successfully');
      fetchRoles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to toggle role status');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {!isAdmin ? (
        <Alert severity="warning">
          Only Administrators can manage roles. Please contact your system administrator if you need access.
        </Alert>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h4">Role Management</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create New Role
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.roleId}>
                  <TableCell>
                    <Typography fontWeight="bold">{role.roleName}</Typography>
                  </TableCell>
                  <TableCell>{role.roleDescription}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {role.canManageUsers && <Chip label="Users" size="small" color="primary" />}
                      {role.canManageEvents && <Chip label="Events" size="small" color="primary" />}
                      {role.canManageVenues && <Chip label="Venues" size="small" color="primary" />}
                      {role.canManageBookings && <Chip label="Bookings" size="small" color="primary" />}
                      {role.canViewReports && <Chip label="Reports" size="small" color="primary" />}
                      {role.canManageRoles && <Chip label="Roles" size="small" color="secondary" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={role.isActive ? 'Active' : 'Inactive'}
                      color={role.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(role.isSystemRole || role.roleName === 'SUPER_ADMIN') ? 'System' : 'Custom'}
                      color={(role.isSystemRole || role.roleName === 'SUPER_ADMIN') ? 'warning' : 'info'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(role)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => handleToggleStatus(role.roleId)}
                    >
                      {role.isActive ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(role)}
                      disabled={role.isSystemRole || role.roleName === 'SUPER_ADMIN'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {editingRole && (editingRole.isSystemRole || editingRole.roleName === 'SUPER_ADMIN') && (
              <Typography variant="body2" color="info.main" sx={{ mb: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
                This is a system role. You can only modify permissions, not the name or description.
              </Typography>
            )}
            <TextField
              fullWidth
              label="Role Name"
              name="roleName"
              value={formData.roleName}
              onChange={handleInputChange}
              margin="normal"
              required
              disabled={!!(editingRole && (editingRole.isSystemRole || editingRole.roleName === 'SUPER_ADMIN'))}
              helperText={editingRole && (editingRole.isSystemRole || editingRole.roleName === 'SUPER_ADMIN') ? "Cannot modify system role name" : ""}
            />
            <TextField
              fullWidth
              label="Description"
              name="roleDescription"
              value={formData.roleDescription}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={3}
              disabled={!!(editingRole && (editingRole.isSystemRole || editingRole.roleName === 'SUPER_ADMIN'))}
              helperText={editingRole && (editingRole.isSystemRole || editingRole.roleName === 'SUPER_ADMIN') ? "Cannot modify system role description" : ""}
            />
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Permissions
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  name="canManageUsers"
                  checked={formData.canManageUsers}
                  onChange={handleInputChange}
                />
              }
              label="Can Manage Users"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="canManageEvents"
                  checked={formData.canManageEvents}
                  onChange={handleInputChange}
                />
              }
              label="Can Manage Events"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="canManageVenues"
                  checked={formData.canManageVenues}
                  onChange={handleInputChange}
                />
              }
              label="Can Manage Venues"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="canManageBookings"
                  checked={formData.canManageBookings}
                  onChange={handleInputChange}
                />
              }
              label="Can Manage Bookings"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="canViewReports"
                  checked={formData.canViewReports}
                  onChange={handleInputChange}
                />
              }
              label="Can View Reports"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="canManageRoles"
                  checked={formData.canManageRoles}
                  onChange={handleInputChange}
                />
              }
              label="Can Manage Roles"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingRole ? 'Update' : 'Create'}
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
          Confirm Role Deletion
        </DialogTitle>
        <DialogContent>
          {roleToDelete && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete the following role?
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Role Name:
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {roleToDelete.roleName}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                  Description:
                </Typography>
                <Typography variant="body2">
                  {roleToDelete.roleDescription || 'No description'}
                </Typography>
              </Box>
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                ⚠️ Warning: This action cannot be undone. Users with this role may lose their permissions.
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
        </>
      )}
    </Box>
  );
};

export default RoleManagement;
