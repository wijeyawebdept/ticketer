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
import { Visibility as VisibilityIcon, Cancel as CancelIcon } from '@mui/icons-material';
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
      await BookingService.cancelBooking(selectedBooking.id);
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
    { field: 'id', headerName: 'Booking ID', width: 150 },
    { field: 'eventName', headerName: 'Event', flex: 1, valueGetter: (params) => params.row.event?.name || 'N/A' },
    { field: 'userName', headerName: 'Customer', flex: 1, valueGetter: (params) => {
      const user = params.row.user;
      return user ? `${user.firstName} ${user.lastName}` : 'N/A';
    }},
    { field: 'ticketCount', headerName: 'Tickets', width: 100 },
    { field: 'totalAmount', headerName: 'Amount', width: 120, valueFormatter: (params) => {
      return `$${params.value}`;
    }},
    { field: 'bookingDate', headerName: 'Booking Date', width: 150, valueFormatter: (params) => {
      return new Date(params.value as string).toLocaleDateString();
    }},
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
            <IconButton onClick={() => handleViewDetails(booking)}>
              <VisibilityIcon />
            </IconButton>
            {canCancel && (
              <IconButton onClick={() => handleCancelClick(booking)}>
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
          <Typography variant="h4">Booking Management</Typography>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={bookings}
                columns={columns}
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
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Booking Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onClose={handleDetailsDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Booking ID</Typography>
                  <Typography variant="body1">{selectedBooking.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={selectedBooking.status} 
                    color={getStatusChipColor(selectedBooking.status)} 
                    variant="outlined" 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Event</Typography>
                  <Typography variant="body1">{selectedBooking.event?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Event Date</Typography>
                  <Typography variant="body1">
                    {selectedBooking.event?.eventDate ? new Date(selectedBooking.event.eventDate).toLocaleString() : 'N/A'}
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
                  <Typography variant="body1">${selectedBooking.totalAmount}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Booking Date</Typography>
                  <Typography variant="body1">
                    {new Date(selectedBooking.bookingDate).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsDialogClose}>Close</Button>
          {(selectedBooking?.status === BookingStatus.CONFIRMED || selectedBooking?.status === BookingStatus.PENDING) && (
            <Button variant="contained" color="error" onClick={() => {
              handleDetailsDialogClose();
              setIsCancelDialogOpen(true);
            }}>
              Cancel Booking
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onClose={handleCancelDialogClose}>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose}>No, Keep Booking</Button>
          <Button variant="contained" color="error" onClick={handleCancelConfirm}>
            Yes, Cancel Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bookings;