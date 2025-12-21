import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon
} from '@mui/icons-material';
import UserService, { UserDetailResponse } from '../../../services/user.service';

// Phone formatter function (inline to avoid import issues)
const formatPhoneNumber = (phoneNumber: string | undefined | null): string => {
  if (!phoneNumber) return 'N/A';
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.substring(0, 3);
    const remaining = cleaned.substring(3);
    if (remaining.length >= 9) {
      return `${countryCode} ${remaining.substring(0, 2)} ${remaining.substring(2, 5)} ${remaining.substring(5)}`;
    }
    return cleaned;
  }
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  if (cleaned.length > 6) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  return cleaned || 'N/A';
};

interface UserDetailsDialogProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({ userId, open, onClose }) => {
  const [userDetails, setUserDetails] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const data = await UserService.getUserDetails(userId);
      setUserDetails(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && open) {
      fetchUserDetails();
    }
  }, [userId, open, fetchUserDetails]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, color: '#1976d2', pb: 1 }}>
        User Details
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : userDetails ? (
          <Box>
            {/* Basic Information Card */}
            <Card sx={{ mb: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2' }}>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <BadgeIcon sx={{ mr: 1, color: '#666' }} fontSize="small" />
                      <Typography variant="body2" color="textSecondary">Name:</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {userDetails.firstName} {userDetails.lastName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <EmailIcon sx={{ mr: 1, color: '#666' }} fontSize="small" />
                      <Typography variant="body2" color="textSecondary">Email:</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>{userDetails.email}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PhoneIcon sx={{ mr: 1, color: '#666' }} fontSize="small" />
                      <Typography variant="body2" color="textSecondary">Phone:</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {formatPhoneNumber(userDetails.phoneNumber)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CalendarIcon sx={{ mr: 1, color: '#666' }} fontSize="small" />
                      <Typography variant="body2" color="textSecondary">Member Since:</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {formatDate(userDetails.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="textSecondary">Role:</Typography>
                    </Box>
                    <Chip label={userDetails.role} color="primary" size="small" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="textSecondary">Status:</Typography>
                    </Box>
                    <Chip
                      icon={userDetails.active ? <ActiveIcon /> : <InactiveIcon />}
                      label={userDetails.active ? 'Active' : 'Inactive'}
                      color={userDetails.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Booking Statistics Card */}
            <Card sx={{ mb: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2' }}>
                  Booking Statistics
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {userDetails.totalBookings}
                  </Typography>
                  <Typography variant="body1" ml={1} color="textSecondary">
                    Total Bookings
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Recent Bookings */}
            {userDetails.recentBookings && userDetails.recentBookings.length > 0 && (
              <Card sx={{ mb: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2' }}>
                    Recent Bookings
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.1)' }}>
                          <TableCell><strong>Event</strong></TableCell>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Tickets</strong></TableCell>
                          <TableCell><strong>Amount</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userDetails.recentBookings.map((booking) => (
                          <TableRow key={booking.bookingId}>
                            <TableCell>{booking.eventName}</TableCell>
                            <TableCell>{formatDate(booking.bookingDate)}</TableCell>
                            <TableCell>{booking.ticketCount}</TableCell>
                            <TableCell>${booking.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                label={booking.status}
                                color={
                                  booking.status === 'CONFIRMED' ? 'success' :
                                  booking.status === 'PENDING' ? 'warning' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Activity Logs */}
            {userDetails.activityLogs && userDetails.activityLogs.length > 0 && (
              <Card sx={{ boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2' }}>
                    Activity Timeline
                  </Typography>
                  <Box>
                    {userDetails.activityLogs.map((log, index) => (
                      <Box
                        key={index}
                        sx={{
                          mb: 2,
                          pb: 2,
                          borderLeft: '3px solid #1976d2',
                          pl: 2,
                          '&:last-child': { mb: 0, pb: 0 }
                        }}
                      >
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {log.action.replace(/_/g, ' ')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {log.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDate(log.timestamp)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        ) : (
          <Typography variant="body1" color="textSecondary" textAlign="center">
            No user details available
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsDialog;
