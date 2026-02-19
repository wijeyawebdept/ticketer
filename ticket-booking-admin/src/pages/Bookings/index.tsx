import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Visibility as VisibilityIcon, Cancel as CancelIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { BookingService } from '../../services';
import { Booking, BookingStatus } from '../../types';

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState<boolean>(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await BookingService.getAllBookings();
      console.log('Fetched bookings:', data);
      console.log('First booking sample:', data[0]);
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailsDialogOpen(true);
  };

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCancelDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleCancelDialogClose = () => {
    setIsCancelDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;
    
    try {
      await BookingService.cancelBooking(selectedBooking.bookingId);
      fetchBookings();
      handleCancelDialogClose();
    } catch (error) {
      console.error('Error canceling booking:', error);
    }
  };

  const getStatusChipColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'success';
      case BookingStatus.PENDING:
        return 'warning';
      case BookingStatus.CANCELLED:
        return 'error';
      case BookingStatus.COMPLETED:
        return 'info';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'bookingId', headerName: 'Booking ID', width: 150 },
    { 
      field: 'eventName', 
      headerName: 'Event', 
      flex: 1, 
      valueGetter: (params) => params.row.eventName || params.row.event?.name || 'N/A' 
    },
    { 
      field: 'userName', 
      headerName: 'Customer', 
      flex: 1, 
      valueGetter: (params) => {
        if (params.row.userFirstName && params.row.userLastName) {
          return `${params.row.userFirstName} ${params.row.userLastName}`;
        }
        const user = params.row.user;
        return user ? `${user.firstName} ${user.lastName}` : 'N/A';
      }
    },
    { field: 'ticketCount', headerName: 'Tickets', width: 100 },
    { 
      field: 'totalAmount', 
      headerName: 'Amount', 
      width: 120, 
      valueFormatter: (params: any) => {
        return `LKR ${params.value}`;
      }
    },
    { 
      field: 'bookingTime', 
      headerName: 'Booking Date', 
      width: 150, 
      valueFormatter: (params: any) => {
        return new Date(params.value).toLocaleDateString();
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color={getStatusChipColor(params.value as BookingStatus)} 
          variant="outlined" 
          size="small" 
          sx={{ fontWeight: 500 }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const booking = params.row as Booking;
        const canCancel = booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING;
        
        return (
          <Box>
            <IconButton 
              onClick={() => handleViewDetails(booking)}
              size="small"
              color="primary"
              sx={{
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                },
                mr: 1
              }}
            >
              <VisibilityIcon />
            </IconButton>
            {canCancel && (
              <IconButton 
                onClick={() => handleCancelClick(booking)}
                size="small"
                color="error"
                sx={{
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                  }
                }}
              >
                <CancelIcon />
              </IconButton>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>Booking Management</Typography>
          <IconButton onClick={fetchBookings} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
        </Grid>
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 2,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            ) : (
              <DataGrid
                rows={bookings}
                columns={columns}
                getRowId={(row) => row.bookingId}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 10,
                    },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                autoHeight
                sx={{
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    borderRadius: '8px 8px 0 0',
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Booking Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onClose={handleDetailsDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1976d2' }}>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Booking ID</Typography>
                  <Typography variant="body1">{selectedBooking.bookingId}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={selectedBooking.status} 
                    color={getStatusChipColor(selectedBooking.status)} 
                    variant="outlined" 
                    size="small" 
                    sx={{ fontWeight: 500 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Event</Typography>
                  <Typography variant="body1">{selectedBooking.event?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Event Date</Typography>
                  <Typography variant="body1">
                    {selectedBooking.event?.startDateTime ? new Date(selectedBooking.event.startDateTime).toLocaleString() : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Customer</Typography>
                  <Typography variant="body1">
                    {selectedBooking.user ? `${selectedBooking.user.firstName} ${selectedBooking.user.lastName}` : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Email</Typography>
                  <Typography variant="body1">{selectedBooking.user?.email || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Number of Tickets</Typography>
                  <Typography variant="body1">{selectedBooking.ticketCount}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Total Amount</Typography>
                  <Typography variant="body1">LKR {selectedBooking.totalAmount}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Booking Date</Typography>
                  <Typography variant="body1">
                    {new Date(selectedBooking.bookingTime).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDetailsDialogClose}
            sx={{ fontWeight: 500 }}
          >
            Close
          </Button>
          {(selectedBooking?.status === BookingStatus.CONFIRMED || selectedBooking?.status === BookingStatus.PENDING) && (
            <Button 
              variant="contained" 
              color="error" 
              onClick={() => {
                handleDetailsDialogClose();
                setIsCancelDialogOpen(true);
              }}
              sx={{ fontWeight: 500 }}
            >
              Cancel Booking
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onClose={handleCancelDialogClose}>
        <DialogTitle sx={{ fontWeight: 600 }}>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDialogClose}
            sx={{ fontWeight: 500 }}
          >
            No, Keep Booking
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleCancelConfirm}
            sx={{ fontWeight: 500 }}
          >
            Yes, Cancel Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bookings;