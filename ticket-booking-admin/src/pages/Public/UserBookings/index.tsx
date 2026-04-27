import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
        backgroundColor: '#242a33',
        minHeight: '100vh',
      }}
    >
      <PublicNavbar />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#fff' }}>
          My Bookings
        </Typography>

        <Card sx={{ 
          backgroundColor: '#1a1f28', 
          border: '1px solid rgba(255, 25, 85, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.8)',
          borderRadius: 2
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" sx={{ color: '#fcd0a5', fontWeight: 600 }}>
                Recent Bookings
              </Typography>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={fetchBookings}
                sx={{ 
                  backgroundColor: '#ff1955',
                  '&:hover': {
                    backgroundColor: '#e01545'
                  },
                  fontWeight: 600
                }}
              >
                Refresh
              </Button>
            </Box>

            <Box sx={{ 
              height: 600, 
              width: '100%',
              '& .MuiDataGrid-root': {
                border: 'none',
                color: '#fff',
                backgroundColor: 'transparent',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.8)',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 600,
                color: '#fcd0a5',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
              },
              '& .MuiTablePagination-root': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
              '& .MuiDataGrid-virtualScroller': {
                backgroundColor: 'transparent',
              },
              '& .MuiIconButton-root': {
                color: 'rgba(255, 255, 255, 0.7)',
              }
            }}>
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
                sx={{
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default UserBookings;
