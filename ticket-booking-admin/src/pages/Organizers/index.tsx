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
  Tooltip,
  Divider,
  Grid,
  Avatar,
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
  Visibility as ViewIcon,
  Business as BusinessIcon,
  AccountBalance as BankIcon,
  Person as PersonIcon,
  CheckCircle as VerifiedIcon,
  Cancel as UnverifiedIcon,
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
  dateOfBirth?: string;
  organizationName?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  businessAddress?: string;
  businessPhone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  role: 'ORGANIZER';
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  updatedAt?: string;
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

const Organizers: React.FC = () => {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState<boolean>(false);
  const [viewOrganizer, setViewOrganizer] = useState<Organizer | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrganizerIds, setSelectedOrganizerIds] = useState<string[]>([]);

  const fetchOrganizers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('active', statusFilter === 'active' ? '1' : '0');
      
      const url = params.toString() ? `/api/admin/organizers?${params.toString()}` : '/api/admin/organizers';
      const response = await api.get<{ content: Organizer[] }>(url);
      setOrganizers(response.data.content || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => { fetchOrganizers(); }, [fetchOrganizers]);

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => { fetchOrganizers(); }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleViewClick = async (organizer: Organizer) => {
    try {
      // Fetch full detail from GET /{id} endpoint to get all fields
      const res = await api.get<Organizer>(`/api/admin/organizers/${organizer.organizerId}`);
      setViewOrganizer(res.data);
    } catch {
      setViewOrganizer(organizer);
    }
    setIsViewDialogOpen(true);
  };

  const handleCreateClick = () => { setSelectedOrganizer(null); setIsDialogOpen(true); };
  const handleEditClick = (organizer: Organizer) => { setSelectedOrganizer(organizer); setIsDialogOpen(true); };
  const handleDeleteClick = (organizer: Organizer) => { setSelectedOrganizer(organizer); setIsDeleteDialogOpen(true); };
  const handleDialogClose = () => { setIsDialogOpen(false); setSelectedOrganizer(null); };
  const handleDeleteDialogClose = () => { setIsDeleteDialogOpen(false); setSelectedOrganizer(null); };

  const handleDeleteConfirm = async () => {
    if (!selectedOrganizer) return;
    try { await api.delete(`/api/admin/organizers/${selectedOrganizer.organizerId}`); fetchOrganizers(); handleDeleteDialogClose(); } catch {}
  };

  const handleActivateOrganizer = async (organizerId: string) => {
    try { await api.patch(`/api/admin/organizers/${organizerId}/activate`); fetchOrganizers(); } catch {}
  };

  const handleDeactivateOrganizer = async (organizerId: string) => {
    try { await api.patch(`/api/admin/organizers/${organizerId}/deactivate`); fetchOrganizers(); } catch {}
  };

  const handleBulkOperation = async (operation: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE') => {
    if (selectedOrganizerIds.length === 0) return;
    try {
      for (const organizerId of selectedOrganizerIds) {
        if (operation === 'ACTIVATE') await api.patch(`/api/admin/organizers/${organizerId}/activate`);
        else if (operation === 'DEACTIVATE') await api.patch(`/api/admin/organizers/${organizerId}/deactivate`);
        else if (operation === 'DELETE') await api.delete(`/api/admin/organizers/${organizerId}`);
      }
      setSelectedOrganizerIds([]);
      fetchOrganizers();
    } catch {}
  };

  const handleSelectionChange = (newSelection: string[]) => { setSelectedOrganizerIds(newSelection); };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { 
      field: 'phoneNumber', headerName: 'Phone', flex: 1,
      renderCell: (params: GridRenderCellParams) => <Typography variant="body2">{formatPhoneNumber(params.value)}</Typography>
    },
    { 
      field: 'organizationName', headerName: 'Organization', flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.value || 'N/A'} arrow placement="top">
          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
            {params.value || 'N/A'}
          </Typography>
        </Tooltip>
      )
    },
    { 
      field: 'role', headerName: 'Role', flex: 0.8,
      renderCell: () => <Chip label="ORGANIZER" color="warning" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
    },
    {
      field: 'active', headerName: 'Status', flex: 0.8,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} size="small" sx={{ fontWeight: 500 }} />
      )
    },
    {
      field: 'lastLoginAt', headerName: 'Last Login', flex: 1.2,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={formatDateTime(params.value)} arrow placement="top">
          <Typography variant="body2" sx={{ color: params.value ? 'text.primary' : 'text.secondary', cursor: params.value ? 'help' : 'default' }}>
            {formatDateShort(params.value)}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'createdAt', headerName: 'Created At', flex: 1.2,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={formatDateTime(params.value)} arrow placement="top">
          <Typography variant="body2" sx={{ cursor: 'help' }}>{formatDateShort(params.value)}</Typography>
        </Tooltip>
      )
    },
    {
      field: 'actions', headerName: 'Actions', flex: 1.2, sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          {/* View Details */}
          <Tooltip title="View Full Details" arrow>
            <IconButton onClick={() => handleViewClick(params.row as Organizer)} size="small" color="info"
              sx={{ backgroundColor: 'rgba(2,136,209,0.1)', '&:hover': { backgroundColor: 'rgba(2,136,209,0.2)' }, mr: 0.5 }}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Edit */}
          <Tooltip title="Edit Organizer" arrow>
            <IconButton onClick={() => handleEditClick(params.row as Organizer)} size="small" color="primary"
              sx={{ backgroundColor: 'rgba(25,118,210,0.1)', '&:hover': { backgroundColor: 'rgba(25,118,210,0.2)' }, mr: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Activate / Deactivate */}
          {params.row.active ? (
            <Tooltip title="Deactivate Organizer" arrow>
              <IconButton onClick={() => handleDeactivateOrganizer(params.row.organizerId)} size="small" color="error"
                sx={{ backgroundColor: 'rgba(211,47,47,0.1)', '&:hover': { backgroundColor: 'rgba(211,47,47,0.2)' }, mr: 0.5 }}>
                <DeactivateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Activate Organizer" arrow>
              <IconButton onClick={() => handleActivateOrganizer(params.row.organizerId)} size="small" color="success"
                sx={{ backgroundColor: 'rgba(46,125,50,0.1)', '&:hover': { backgroundColor: 'rgba(46,125,50,0.2)' }, mr: 0.5 }}>
                <ActivateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {/* Delete */}
          <Tooltip title="Move to Recycle Bin" arrow>
            <IconButton onClick={() => handleDeleteClick(params.row as Organizer)} size="small" color="warning"
              sx={{ backgroundColor: 'rgba(255,152,0,0.1)', '&:hover': { backgroundColor: 'rgba(255,152,0,0.2)' } }}>
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const o = viewOrganizer;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#ed6c02' }}>Organizer Management</Typography>
        <Box>
          <IconButton onClick={fetchOrganizers} sx={{ mr: 1 }}><RefreshIcon /></IconButton>
          <Button variant="contained" color="warning" startIcon={<AddIcon />} onClick={handleCreateClick}
            sx={{ borderRadius: 2, padding: '8px 16px', fontWeight: 600, boxShadow: '0 4px 6px rgba(237,108,2,0.2)', '&:hover': { boxShadow: '0 6px 8px rgba(237,108,2,0.3)' } }}>
            Add New Organizer
          </Button>
        </Box>
      </Box>

      {selectedOrganizerIds.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(25,118,210,0.05)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={500}>{selectedOrganizerIds.length} organizer(s) selected</Typography>
            <Box>
              <Button variant="outlined" color="success" size="small" onClick={() => handleBulkOperation('ACTIVATE')} sx={{ mr: 1 }}>Activate Selected</Button>
              <Button variant="outlined" color="error" size="small" onClick={() => handleBulkOperation('DEACTIVATE')} sx={{ mr: 1 }}>Deactivate Selected</Button>
              <Button variant="outlined" color="warning" size="small" onClick={() => handleBulkOperation('DELETE')}>Delete Selected</Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField placeholder="Search by name, email, or organization..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} sx={{ flex: 1 }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
        {!loading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Showing {organizers.length} organizer{organizers.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
        <Box sx={{ height: '70vh' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}><CircularProgress size={40} thickness={4} /></Box>
          ) : (
            <DataGrid
              rows={organizers} columns={columns} getRowId={(row) => row.organizerId}
              checkboxSelection rowSelectionModel={selectedOrganizerIds}
              onRowSelectionModelChange={(s) => handleSelectionChange(s as string[])}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] } }}
              pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick autoHeight
              sx={{
                '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(237,108,2,0.1)', borderRadius: '8px 8px 0 0' },
                '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(0,0,0,0.05)' },
                '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(237,108,2,0.04)' },
              }}
            />
          )}
        </Box>
      </Paper>

      {/* ── View Full Details Dialog ───────────────────────────────────────────── */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#1976d2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Organizer Details
          <IconButton onClick={() => setIsViewDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {o && (
            <Box>
              {/* Header */}
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ width: 72, height: 72, bgcolor: '#ed6c02', fontSize: '1.8rem', fontWeight: 700 }}>
                  {o.firstName?.[0]}{o.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{o.firstName} {o.lastName}</Typography>
                  {o.organizationName && <Typography color="text.secondary" variant="body2">{o.organizationName}</Typography>}
                  <Box display="flex" gap={1} mt={0.5}>
                    <Chip label={o.active ? 'Active' : 'Inactive'} color={o.active ? 'success' : 'default'} size="small" />
                    <Chip
                      icon={o.emailVerified ? <VerifiedIcon fontSize="small" /> : <UnverifiedIcon fontSize="small" />}
                      label={o.emailVerified ? 'Email Verified' : 'Email Unverified'}
                      color={o.emailVerified ? 'success' : 'warning'} size="small" variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Personal Info */}
              <SectionTitle icon={<PersonIcon />} title="Personal Information" color="#1976d2" />
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}><DetailRow label="First Name" value={o.firstName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Last Name" value={o.lastName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Email" value={o.email} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Phone Number" value={formatPhoneNumber(o.phoneNumber)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Date of Birth" value={o.dateOfBirth ? new Date(o.dateOfBirth).toLocaleDateString() : undefined} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Organizer ID" value={o.organizerId} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Registered On" value={formatDateTime(o.createdAt)} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Last Login" value={o.lastLoginAt ? formatDateTime(o.lastLoginAt) : 'Never'} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Last Updated" value={o.updatedAt ? formatDateTime(o.updatedAt) : 'N/A'} /></Grid>
              </Grid>

              <Divider sx={{ mb: 2.5 }} />

              {/* Business Info */}
              <SectionTitle icon={<BusinessIcon />} title="Business Information" color="#ed6c02" />
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}><DetailRow label="Organization Name" value={o.organizationName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Business Registration No." value={o.businessRegistrationNumber} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Tax ID / VAT Number" value={o.taxId} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Business Phone" value={o.businessPhone} /></Grid>
                <Grid item xs={12}><DetailRow label="Business Address" value={o.businessAddress} /></Grid>
              </Grid>

              <Divider sx={{ mb: 2.5 }} />

              {/* Banking Info */}
              <SectionTitle icon={<BankIcon />} title="Banking & Payout Details" color="#2e7d32" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><DetailRow label="Bank Name" value={o.bankName} /></Grid>
                <Grid item xs={12} sm={6}><DetailRow label="Routing / IFSC Code" value={o.bankRoutingNumber} /></Grid>
                <Grid item xs={12}>
                  <DetailRow
                    label="Account Number"
                    value={o.bankAccountNumber}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsViewDialogOpen(false)} sx={{ borderRadius: 2 }}>Close</Button>
          <Button variant="contained" onClick={() => { setIsViewDialogOpen(false); if (o) handleEditClick(o); }}
            startIcon={<EditIcon />} sx={{ borderRadius: 2, fontWeight: 600 }}>
            Edit Organizer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit / Create Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#ed6c02' }}>
          {selectedOrganizer ? 'Edit Organizer' : 'Create New Organizer'}
          <IconButton aria-label="close" onClick={handleDialogClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <OrganizerForm organizer={selectedOrganizer || undefined} onClose={handleDialogClose}
              onSuccess={() => { fetchOrganizers(); handleDialogClose(); }} />
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      <Dialog open={isDeleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Move Organizer to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move "<strong>{selectedOrganizer?.firstName} {selectedOrganizer?.lastName}</strong>"
            ({selectedOrganizer?.organizationName}) to the recycle bin? You can restore it later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} sx={{ fontWeight: 500 }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleDeleteConfirm} sx={{ fontWeight: 500 }}>Move to Recycle Bin</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Organizers;
