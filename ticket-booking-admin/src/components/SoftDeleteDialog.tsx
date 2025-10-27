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
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This item will be moved to the recycle bin. You can restore it later if needed.
        </Alert>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          Type: <strong>{entityType}</strong>
          <br />
          Name: <strong>{entityName}</strong>
        </Typography>

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
