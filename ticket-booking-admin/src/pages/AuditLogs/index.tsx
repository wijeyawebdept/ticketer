import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  TextField,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';
import { auditLogService } from '../../services';
import { AuditLog } from '../../services/auditLog.service';
import { useTranslation } from 'react-i18next';

interface AuditLogsProps {
  isMyLogs?: boolean;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ isMyLogs = false }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [auditIdToDelete, setAuditIdToDelete] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState<string>('');
  const [actionKeyword, setActionKeyword] = useState<string>('');

  const entityTypes = [
    { value: '', label: t('auditLogs.allEntities') },
    { value: 'USER', label: t('auditLogs.user') },
    { value: 'EVENT', label: t('auditLogs.event') },
    { value: 'VENUE', label: t('auditLogs.venue') },
    { value: 'BOOKING', label: t('auditLogs.booking') },
    { value: 'TRANSACTION', label: t('auditLogs.transaction') },
    { value: 'BANNER', label: t('auditLogs.banner') },
    { value: 'BLOG', label: t('auditLogs.blog') },
    { value: 'GALLERY', label: t('auditLogs.gallery') },
    { value: 'DEAL', label: t('auditLogs.deal') },
    { value: 'FAQ', label: t('auditLogs.faq') },
    { value: 'PAGE_CONTENT', label: t('auditLogs.pageContent') },
  ];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = isMyLogs 
        ? await auditLogService.getMyAuditLogs(
            paginationModel.page,
            paginationModel.pageSize,
            entityType || undefined,
            actionKeyword || undefined
          )
        : await auditLogService.getAuditLogs(
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
  }, [isMyLogs, paginationModel.page, paginationModel.pageSize, entityType, actionKeyword]);

  // Reset pagination to page 0 when filters change
  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [entityType, actionKeyword]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setSelectedLog(null);
  };
  
  const handleDeleteClick = (auditId: string) => {
    setAuditIdToDelete(auditId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!auditIdToDelete) return;
    
    try {
      await auditLogService.deleteAuditLog(auditIdToDelete);
      fetchLogs();
    } catch (error) {
      console.error('Failed to delete audit log', error);
    } finally {
      setIsDeleteConfirmOpen(false);
      setAuditIdToDelete(null);
    }
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
      headerName: t('auditLogs.timestamp'), 
      width: 180, 
      valueFormatter: (params) => new Date(params.value as string).toLocaleString() 
    },
    { 
      field: 'performedByName', 
      headerName: t('auditLogs.performedBy'), 
      flex: 1, minWidth: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.row.performedByName || t('auditLogs.system', 'System')}</Typography>
          <Typography variant="caption" color="textSecondary">{params.row.performedByEmail || ''}</Typography>
        </Box>
      )
    },
    { 
      field: 'action', 
      headerName: t('auditLogs.action'), 
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
      headerName: t('auditLogs.filterEntityType'), 
      width: 130 
    },
    { 
      field: 'ipAddress', 
      headerName: t('auditLogs.ipAddress'), 
      width: 130 
    },
    {
      field: 'actions',
      headerName: t('auditLogs.actions', 'Actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1}>
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
          {!isMyLogs && (
            <IconButton 
              onClick={() => handleDeleteClick(params.row.auditId)}
              size="small"
              color="error"
              sx={{
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(211, 47, 47, 0.2)',
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
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
          <Typography variant="h4" sx={{ fontWeight: 600, color: isMyLogs ? '#1976d2' : '#c62828' }}>
            {isMyLogs ? t('auditLogs.myLogsTitle') : t('auditLogs.title')}
          </Typography>
          <Tooltip title={t('auditLogs.refreshLogs')}>
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
                  label={t('auditLogs.filterEntityType')}
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
                  label={t('auditLogs.filterAction')}
                  size="small"
                  placeholder={t('auditLogs.filterActionPlaceholder')}
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
                  {t('auditLogs.clearFilters')}
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
                  backgroundColor: isMyLogs ? 'rgba(25, 118, 210, 0.05)' : 'rgba(198, 40, 40, 0.05)',
                  color: isMyLogs ? '#1976d2' : '#c62828',
                  fontWeight: 'bold',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: isMyLogs ? 'rgba(25, 118, 210, 0.02)' : 'rgba(198, 40, 40, 0.02)',
                },
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Audit Log Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onClose={handleDetailsDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: isMyLogs ? '#1976d2' : '#c62828', borderBottom: '1px solid #eee' }}>
          {t('auditLogs.detailsTitle')}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedLog && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">{t('auditLogs.logId')}</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedLog.auditId}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">{t('auditLogs.timestamp')}</Typography>
                  <Typography variant="body1">{new Date(selectedLog.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">{t('auditLogs.performedBy')}</Typography>
                  <Typography variant="body1">{selectedLog.performedByName || t('auditLogs.system', 'System')} ({selectedLog.performedByEmail || t('auditLogs.na', 'N/A')})</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">{t('auditLogs.ipAddress')}</Typography>
                  <Typography variant="body1">{selectedLog.ipAddress || t('auditLogs.unknown', 'Unknown')}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">{t('auditLogs.action')}</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedLog.action} size="small" color={getActionColor(selectedLog.action)} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">{t('auditLogs.entity')}</Typography>
                  <Typography variant="body1">{selectedLog.entityType || t('auditLogs.na', 'N/A')} {selectedLog.entityId ? `(${selectedLog.entityId})` : ''}</Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" gutterBottom color="primary">{t('auditLogs.changesData')}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="textSecondary">{t('auditLogs.oldValues')}</Typography>
                    <Paper variant="outlined" sx={{ p: 1, backgroundColor: '#fafafa', maxHeight: 300, overflow: 'auto' }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {formatJson(selectedLog.oldValues)}
                      </pre>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="textSecondary">{t('auditLogs.newValues')}</Typography>
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
            {t('auditLogs.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={isDeleteConfirmOpen} 
        onClose={() => setIsDeleteConfirmOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#c62828' }}>
          {t('auditLogs.confirmDeletion')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('auditLogs.deleteConfirmMsg')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsDeleteConfirmOpen(false)} variant="outlined" color="inherit">
            {t('auditLogs.cancel')}
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" autoFocus>
            {t('auditLogs.deletePermanently')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogs;
