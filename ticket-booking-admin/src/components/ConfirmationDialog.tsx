import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import InfoIcon from '@mui/icons-material/Info';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <DeleteForeverIcon sx={{ fontSize: 60, color: 'error.main' }} />;
      case 'warning':
        return <WarningAmberIcon sx={{ fontSize: 60, color: 'warning.main' }} />;
      case 'info':
        return <InfoIcon sx={{ fontSize: 60, color: 'info.main' }} />;
      default:
        return <WarningAmberIcon sx={{ fontSize: 60, color: 'warning.main' }} />;
    }
  };

  const getConfirmButtonColor = () => {
    switch (variant) {
      case 'danger':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="confirmation-dialog-title">
        <Box display="flex" alignItems="center" gap={2}>
          {getIcon()}
          <Typography variant="h5" component="div">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          color="inherit"
          size="large"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={getConfirmButtonColor()}
          size="large"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;

// Predefined confirmation messages
export const ConfirmationMessages = {
  DELETE_VENUE: {
    title: 'Move Venue to Recycle Bin',
    message: 'Are you sure you want to move this venue to the recycle bin? You can restore it later from the recycle bin.',
    confirmText: 'Move to Recycle Bin',
    variant: 'warning' as const,
  },
  DELETE_EVENT: {
    title: 'Move Event to Recycle Bin',
    message: 'Are you sure you want to move this event to the recycle bin? You can restore it later from the recycle bin.',
    confirmText: 'Move to Recycle Bin',
    variant: 'warning' as const,
  },
  DELETE_USER: {
    title: 'Move User to Recycle Bin',
    message: 'Are you sure you want to move this user account to the recycle bin? You can restore it later from the recycle bin.',
    confirmText: 'Move to Recycle Bin',
    variant: 'warning' as const,
  },
  CANCEL_BOOKING: {
    title: 'Cancel Booking',
    message: 'Are you sure you want to cancel this booking? Refund will be processed according to our cancellation policy.',
    confirmText: 'Cancel Booking',
    variant: 'warning' as const,
  },
  LOGOUT: {
    title: 'Logout',
    message: 'Are you sure you want to log out?',
    confirmText: 'Logout',
    variant: 'info' as const,
  },
  PUBLISH_EVENT: {
    title: 'Publish Event',
    message: 'Are you sure you want to publish this event? It will be visible to all users.',
    confirmText: 'Publish Event',
    variant: 'info' as const,
  },
  GENERATE_SEATS: {
    title: 'Generate Seats',
    message: 'This will delete existing template seats and generate new ones based on venue capacity. Continue?',
    confirmText: 'Generate Seats',
    variant: 'warning' as const,
  },
};
