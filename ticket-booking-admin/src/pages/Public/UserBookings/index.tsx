import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Container,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PublicNavbar from '../../../components/public/PublicNavbar';
import { BookingService } from '../../../services';
import { Booking, BookingStatus } from '../../../types';

const UserBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await BookingService.getAllBookings();
      setBookings(data);
    } catch (error) {
    } finally {
      setLoading(false);
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
      </Container>
    </Box>
  );
};

export default UserBookings;
