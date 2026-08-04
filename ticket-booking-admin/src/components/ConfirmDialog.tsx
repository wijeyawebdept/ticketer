import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  content,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: { xs: '92%', sm: '450px' },
          maxWidth: '100%',
          m: { xs: 1.5, sm: 2 },
          p: { xs: 1, sm: 1.5 },
        },
      }}
    >
      <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 700 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {content}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}>
          {cancelText}
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained" autoFocus sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' }, fontWeight: 700, backgroundColor: '#ff1955', '&:hover': { backgroundColor: '#d01443' } }}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
