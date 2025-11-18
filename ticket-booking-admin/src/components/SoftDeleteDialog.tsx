import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
} from '@mui/material';
import recycleBinService, { SoftDeleteRequest } from '../services/recycle-bin.service';

interface SoftDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  entityType: 'USER' | 'EVENT' | 'VENUE';
  entityId: string;
  entityName: string;
  entityData: any;
}

const SoftDeleteDialog: React.FC<SoftDeleteDialogProps> = ({
  open,
  onClose,
  onSuccess,
  entityType,
  entityId,
  entityName,
  entityData,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    const request: SoftDeleteRequest = {
      entityType,
      entityId,
      entityName,
      entityData,
      reason: reason.trim() || undefined,
    };

    try {
      await recycleBinService.moveToRecycleBin(request);
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data || 'Failed to move item to recycle bin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#ed6c02', color: 'white', pb: 2 }}>
        Move to Recycle Bin
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Are you sure?</strong> This item will be moved to the recycle bin. It will become inactive but can be restored later if needed.
        </Alert>
        
        <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
          Item Details:
        </Typography>
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Type:</strong> {entityType}
          </Typography>
          <Typography variant="body2">
            <strong>Name:</strong> {entityName}
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Reason for deletion (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          rows={3}
          placeholder="Provide a reason for auditing purposes..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="warning" disabled={loading}>
          {loading ? 'Moving...' : 'Move to Recycle Bin'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SoftDeleteDialog;
