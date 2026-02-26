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
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import RecycleBinService from '../../services/recycle-bin.service';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface RecycleBinItem {
  recycleId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  entityData: any;
  deletedBy: string;
  deletedByName: string;
  deletedAt: string;
  reason: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`recycle-bin-tabpanel-${index}`}
      aria-labelledby={`recycle-bin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const RecycleBin: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openReasonDialog, setOpenReasonDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [itemToDelete, setItemToDelete] = useState<RecycleBinItem | null>(null);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [itemToRestore, setItemToRestore] = useState<RecycleBinItem | null>(null);
  const [openEmptyDialog, setOpenEmptyDialog] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN;
  const isOrganizer = user?.role === UserRole.ORGANIZER || user?.role === UserRole.ROLE_ORGANIZER;
  const entityTypes = ['USER', 'EVENT', 'VENUE', 'SCHEDULE', 'EVENT_CATEGORY'];

  useEffect(() => {
    fetchRecycleBinItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue]);

  const fetchRecycleBinItems = async () => {
    try {
      setLoading(true);
      let data;
      if (tabValue === 0) {
        data = await RecycleBinService.getAllRecycleBinItems();
      } else {
        const entityType = entityTypes[tabValue - 1] as 'USER' | 'EVENT' | 'VENUE' | 'SCHEDULE' | 'EVENT_CATEGORY';
        data = await RecycleBinService.getRecycleBinItemsByType(entityType);
      }
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch recycle bin items');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRestore = async (item: RecycleBinItem) => {
    setItemToRestore(item);
    setOpenRestoreDialog(true);
  };

  const handleConfirmRestore = async () => {
    if (!itemToRestore) return;

    try {
      await RecycleBinService.restore(itemToRestore.recycleId);
      setSuccess(`${itemToRestore.entityType} "${itemToRestore.entityName}" restored successfully`);
      setOpenRestoreDialog(false);
      setItemToRestore(null);
      fetchRecycleBinItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to restore item');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleOpenDeleteDialog = (item: RecycleBinItem) => {
    setItemToDelete(item);
    setDeleteReason('');
    setOpenReasonDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenReasonDialog(false);
    setItemToDelete(null);
    setDeleteReason('');
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;

    try {
      await RecycleBinService.permanentlyDelete(itemToDelete.recycleId, deleteReason);
      setSuccess('Item permanently deleted');
      handleCloseDeleteDialog();
      fetchRecycleBinItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete item permanently');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (!isSuperAdmin) return;
    setOpenEmptyDialog(true);
  };

  const handleConfirmEmpty = async () => {
    try {
      if (tabValue === 0) {
        await RecycleBinService.emptyRecycleBin();
      } else {
        const entityType = entityTypes[tabValue - 1] as 'USER' | 'EVENT' | 'VENUE' | 'SCHEDULE' | 'EVENT_CATEGORY';
        await RecycleBinService.emptyRecycleBinByType(entityType);
      }
      setSuccess('Recycle bin emptied successfully');
      setOpenEmptyDialog(false);
      fetchRecycleBinItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to empty recycle bin');
      setTimeout(() => setError(null), 3000);
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'USER':
        return 'primary';
      case 'EVENT':
        return 'secondary';
      case 'VENUE':
        return 'success';
      case 'SCHEDULE':
        return 'warning';
      case 'EVENT_CATEGORY':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5 }}>
            Recycle Bin
          </Typography>
          {isSuperAdmin && (
            <Typography variant="caption" sx={{ color: '#9c27b0', fontWeight: 600 }}>
              SUPER ADMIN - Full Deletion Rights
            </Typography>
          )}
        </Box>
        {isSuperAdmin && items.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={handleEmptyRecycleBin}
            sx={{
              fontWeight: 600,
              boxShadow: '0 4px 6px rgba(211, 47, 47, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 8px rgba(211, 47, 47, 0.4)',
              }
            }}
          >
            Empty Recycle Bin ({items.length})
          </Button>
        )}
      </Box>

      {!isSuperAdmin && isOrganizer && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" component="span">
            <strong>Organizer Access:</strong> You can restore items and permanently delete EVENT and SCHEDULE items. Other item types can only be deleted by Super Admin.
          </Typography>
        </Alert>
      )}

      {isSuperAdmin && items.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" component="span">
            <strong>Super Admin Access:</strong> You can restore items to make them active again, or permanently delete them from the database. Use permanent deletion with caution.
          </Typography>
        </Alert>
      )}

      {isSuperAdmin && items.length === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2" component="span">
            <strong>Clean:</strong> Recycle bin is empty. No items to restore or delete.
          </Typography>
        </Alert>
      )}

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

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="recycle bin tabs">
          <Tab label="All Items" />
          <Tab label="Users" />
          <Tab label="Events" />
          <Tab label="Venues" />
          <Tab label="Schedules" />
          <Tab label="Event Categories" />
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TabPanel value={tabValue} index={tabValue}>
            {items.length === 0 ? (
              <Box textAlign="center" py={5}>
                <Typography variant="h6" color="text.secondary">
                  Recycle bin is empty
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Deleted By</TableCell>
                      <TableCell>Deleted At</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.recycleId}>
                        <TableCell>
                          <Chip
                            label={item.entityType}
                            color={getEntityTypeColor(item.entityType)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="bold">{item.entityName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {item.entityId}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.deletedByName || item.deletedBy}</TableCell>
                        <TableCell>
                          {new Date(item.deletedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{item.reason || '-'}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleRestore(item)}
                              title="Restore Item"
                              sx={{
                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                                }
                              }}
                            >
                              <RestoreIcon />
                            </IconButton>
                            {isSuperAdmin && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenDeleteDialog(item)}
                                title="Delete Permanently (SUPER ADMIN)"
                                sx={{
                                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(211, 47, 47, 0.2)',
                                  }
                                }}
                              >
                                <DeleteForeverIcon />
                              </IconButton>
                            )}
                            {!isSuperAdmin && isOrganizer && (item.entityType === 'EVENT' || item.entityType === 'SCHEDULE') && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenDeleteDialog(item)}
                                title="Delete Permanently"
                                sx={{
                                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(211, 47, 47, 0.2)',
                                  }
                                }}
                              >
                                <DeleteForeverIcon />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        )}
      </Paper>

      <Dialog open={openReasonDialog} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#d32f2f', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <DeleteForeverIcon />
          Confirm Permanent Deletion
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" component="div">
                <strong>WARNING:</strong> This action cannot be undone. The item will be permanently deleted from the database.
              </Typography>
            </Alert>
            <Typography variant="h6" sx={{ mb: 1, color: '#d32f2f' }}>
              Are you absolutely sure?
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              You are about to permanently delete:
            </Typography>
            <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Type:</strong> {itemToDelete?.entityType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Name:</strong> {itemToDelete?.entityName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>ID:</strong> {itemToDelete?.entityId}
              </Typography>
            </Paper>
            <TextField
              fullWidth
              label="Reason for permanent deletion (recommended for audit trail)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              multiline
              rows={3}
              placeholder="e.g., Data cleanup, User request, Compliance requirement..."
              helperText="Providing a reason helps maintain accountability"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#fafafa' }}>
          <Button onClick={handleCloseDeleteDialog} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handlePermanentDelete} 
            variant="contained" 
            color="error"
            startIcon={<DeleteForeverIcon />}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={openRestoreDialog} onClose={() => setOpenRestoreDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#1976d2', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <RestoreIcon />
          Confirm Restore
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" component="div">
                <strong>Confirm Restore:</strong> This will restore the item and make it active again in the system.
              </Typography>
            </Alert>
            <Typography variant="body1" sx={{ mb: 1 }}>
              You are about to restore:
            </Typography>
            <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Type:</strong> <Chip label={itemToRestore?.entityType} size="small" color={getEntityTypeColor(itemToRestore?.entityType || '')} sx={{ ml: 1 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Name:</strong> {itemToRestore?.entityName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>ID:</strong> {itemToRestore?.entityId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Deleted At:</strong> {itemToRestore && new Date(itemToRestore.deletedAt).toLocaleString()}
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#fafafa' }}>
          <Button onClick={() => setOpenRestoreDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRestore} 
            variant="contained" 
            color="primary"
            startIcon={<RestoreIcon />}
          >
            Restore Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Empty Recycle Bin Confirmation Dialog */}
      <Dialog open={openEmptyDialog} onClose={() => setOpenEmptyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#d32f2f', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <DeleteForeverIcon />
          Empty Recycle Bin
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" component="div">
                <strong>CRITICAL WARNING:</strong> This action cannot be undone! All items will be permanently deleted from the database.
              </Typography>
            </Alert>
            <Typography variant="h6" sx={{ mb: 2, color: '#d32f2f' }}>
              Are you absolutely sure?
            </Typography>
            <Paper sx={{ p: 2, mb: 2, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Target:</strong> {tabValue === 0 ? 'All items in recycle bin' : `All ${entityTypes[tabValue - 1]} items`}
              </Typography>
              <Typography variant="body1" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                <strong>Items to be deleted:</strong> {items.length}
              </Typography>
            </Paper>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will permanently remove all selected items from the database. This operation is irreversible.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Please ensure you have a backup if needed before proceeding.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#fafafa' }}>
          <Button 
            onClick={() => setOpenEmptyDialog(false)} 
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmEmpty} 
            variant="contained" 
            color="error"
            startIcon={<DeleteForeverIcon />}
            autoFocus
          >
            Yes, Empty Recycle Bin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecycleBin;
