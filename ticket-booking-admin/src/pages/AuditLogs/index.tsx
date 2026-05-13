import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  TextField,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  FilterList as FilterListIcon,
  Refresh as RefreshIcon 
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';
import { auditLogService } from '../../services';
import { AuditLog } from '../../services/auditLog.service';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState<boolean>(false);

  // Filters
  const [entityType, setEntityType] = useState<string>('');
  const [actionKeyword, setActionKeyword] = useState<string>('');

  const entityTypes = [
    { value: '', label: 'All Entities' },
    { value: 'USER', label: 'User' },
    { value: 'EVENT', label: 'Event' },
    { value: 'VENUE', label: 'Venue' },
    { value: 'BOOKING', label: 'Booking' },
    { value: 'TRANSACTION', label: 'Transaction' },
    { value: 'BANNER', label: 'Banner' },
    { value: 'BLOG', label: 'Blog' },
  ];

  useEffect(() => {
    fetchLogs();
  }, [paginationModel, entityType, actionKeyword]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await auditLogService.getAuditLogs(
        paginationModel.page,
        paginationModel.pageSize,
        entityType || undefined,
        actionKeyword || undefined
      );
      // Map auditId to id for DataGrid
      const rows = response.data.map((log) => ({
        ...log,
        id: log.auditId,
      }));
      setLogs(rows);
      setTotalItems(response.totalItems);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setSelectedLog(null);
  };

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add')) return 'success';
    if (act.includes('update') || act.includes('edit') || act.includes('patch')) return 'info';
    if (act.includes('delete') || act.includes('remove')) return 'error';
    if (act.includes('login') || act.includes('auth')) return 'warning';
    return 'default';
  };

  const columns: GridColDef[] = [
    { 
      field: 'createdAt', 
      headerName: 'Timestamp', 
      width: 180, 
      valueFormatter: (params) => new Date(params.value as string).toLocaleString() 
    },
    { 
      field: 'performedByName', 
      headerName: 'Performed By', 
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.row.performedByName || 'System'}</Typography>
          <Typography variant="caption" color="textSecondary">{params.row.performedByEmail || ''}</Typography>
        </Box>
      )
    },
    { 
      field: 'action', 
      headerName: 'Action', 
      width: 180,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          color={getActionColor(params.value as string)}
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      )
    },
    { 
      field: 'entityType', 
      headerName: 'Entity Type', 
      width: 130 
    },
    { 
      field: 'ipAddress', 
      headerName: 'IP Address', 
      width: 130 
    },
    {
      field: 'actions',
      headerName: 'Details',
      width: 80,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton 
          onClick={() => handleViewDetails(params.row as AuditLog)}
          size="small"
          color="primary"
          sx={{
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.2)',
            }
          }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const formatJson = (jsonStr: string | undefined) => {
    if (!jsonStr) return 'None';
    try {
      const obj = JSON.parse(jsonStr);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return jsonStr;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#c62828' }}>System Audit Logs</Typography>
          <Tooltip title="Refresh Logs">
            <IconButton onClick={fetchLogs} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  select
                  label="Entity Type"
                  size="small"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                >
                  {entityTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={8} md={6}>
                <TextField
                  fullWidth
                  label="Search Action"
                  size="small"
                  placeholder="e.g. Create, Update, Login..."
                  value={actionKeyword}
                  onChange={(e) => setActionKeyword(e.target.value)}
                  InputProps={{
                    startAdornment: <FilterListIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3} display="flex" justifyContent="flex-end">
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setEntityType('');
                    setActionKeyword('');
                  }}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper 
            sx={{ 
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}
          >
            <DataGrid
              rows={logs}
              columns={columns}
              loading={loading}
              rowCount={totalItems}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(198, 40, 40, 0.05)',
                  color: '#c62828',
                  fontWeight: 'bold',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'rgba(198, 40, 40, 0.02)',
                },
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Audit Log Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onClose={handleDetailsDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#c62828', borderBottom: '1px solid #eee' }}>
          Audit Log Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedLog && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Log ID</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedLog.auditId}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Timestamp</Typography>
                  <Typography variant="body1">{new Date(selectedLog.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Performed By</Typography>
                  <Typography variant="body1">{selectedLog.performedByName || 'System'} ({selectedLog.performedByEmail || 'N/A'})</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">IP Address</Typography>
                  <Typography variant="body1">{selectedLog.ipAddress || 'Unknown'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Action</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedLog.action} size="small" color={getActionColor(selectedLog.action)} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Entity</Typography>
                  <Typography variant="body1">{selectedLog.entityType || 'N/A'} {selectedLog.entityId ? `(${selectedLog.entityId})` : ''}</Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" gutterBottom color="primary">Changes / Data</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="textSecondary">Old Values</Typography>
                    <Paper variant="outlined" sx={{ p: 1, backgroundColor: '#fafafa', maxHeight: 300, overflow: 'auto' }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {formatJson(selectedLog.oldValues)}
                      </pre>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="textSecondary">New Values</Typography>
                    <Paper variant="outlined" sx={{ p: 1, backgroundColor: '#f0fff4', maxHeight: 300, overflow: 'auto' }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {formatJson(selectedLog.newValues)}
                      </pre>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button onClick={handleDetailsDialogClose} variant="contained" color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogs;
