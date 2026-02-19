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
  Chip,
  Container,
} from '@mui/material';
import { Visibility as VisibilityIcon, Cancel as CancelIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PublicNavbar from '../../../components/public/PublicNavbar';
import { BookingService } from '../../../services';
import { Booking, BookingStatus } from '../../../types';

const UserBookings: React.FC = () => {
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
      valueGetter: (params: any) => params.row.eventName || params.row.event?.name || 'N/A' 
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
      valueFormatter: (params: any) => new Date(params.value).toLocaleDateString()
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params: any) => (
        <Chip 
          label={params.value} 
          color={getStatusChipColor(params.value)}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton 
            size="small" 
            onClick={() => handleViewDetails(params.row)}
            color="primary"
          >
            <VisibilityIcon />
          </IconButton>
          {params.row.status === BookingStatus.CONFIRMED && (
            <IconButton 
              size="small" 
              onClick={() => handleCancelClick(params.row)}
              color="error"
            >
              <CancelIcon />
            </IconButton>
          )}
        </Box>
      )
    },
  ];

  return (
    <Box
      sx={{
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
      }}
    >
      <PublicNavbar />
      <Container maxWidth="lg" sx={{ pt: 12, pb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h2">
              My Bookings
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchBookings}
              sx={{ backgroundColor: '#ff1955' }}
            >
              Refresh
            </Button>
          </Box>

          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={bookings}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.bookingId}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
            />
          </Box>
        </Paper>

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onClose={handleDetailsDialogClose} maxWidth="md" fullWidth>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogContent>
            {selectedBooking && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Booking ID:</Typography>
                  <Typography>{selectedBooking.bookingId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip 
                    label={selectedBooking.status} 
                    color={getStatusChipColor(selectedBooking.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Event:</Typography>
                  <Typography>{selectedBooking.event?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Ticket Count:</Typography>
                  <Typography>{selectedBooking.ticketCount}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Total Amount:</Typography>
                  <Typography>LKR {selectedBooking.totalAmount}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Booking Date:</Typography>
                  <Typography>{new Date(selectedBooking.bookingTime).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDetailsDialogClose}>Close</Button>
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
            <Button onClick={handleCancelDialogClose}>No, Keep It</Button>
            <Button onClick={handleCancelConfirm} color="error" variant="contained">
              Yes, Cancel Booking
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default UserBookings;
