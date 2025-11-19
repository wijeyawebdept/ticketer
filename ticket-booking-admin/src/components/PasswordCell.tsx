import React, { useState } from 'react';
import { Box, IconButton, Typography, Snackbar, Alert } from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

interface PasswordCellProps {
  password: string;
}

const PasswordCell: React.FC<PasswordCellProps> = ({ password }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const displayPassword = password || '••••••••';

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(displayPassword).then(() => {
      setSnackbarMessage('Password copied to clipboard successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }).catch(() => {
      setSnackbarMessage('Failed to copy password. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
      <Typography 
        variant="body2" 
        sx={{ 
          fontFamily: 'monospace',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0
        }}
      >
        {showPassword ? displayPassword : '••••••••'}
      </Typography>
      <IconButton
        size="small"
        onClick={() => setShowPassword(!showPassword)}
        sx={{ p: 0.5, flexShrink: 0 }}
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
      </IconButton>
      <IconButton
        size="small"
        onClick={handleCopyPassword}
        sx={{ p: 0.5, flexShrink: 0 }}
        title="Copy password"
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PasswordCell;
