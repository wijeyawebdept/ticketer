import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
} from '@mui/material';
import { Refresh as RefreshIcon, Search as SearchIcon, FilterAlt as FilterIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';
import { BookingService } from '../../services';
import { Booking, BookingStatus } from '../../types';

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 25,
    page: 0,
  });

  const fetchBookings = useCallback(async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await BookingService.getAllBookings(params);
      console.log('Fetched bookings:', response);
      
      // Handle both array (legacy) and Page object responses
      if (Array.isArray(response)) {
        setBookings(response);
        setTotalBookings(response.length);
      } else if (response && response.content && Array.isArray(response.content)) {
        // This is a Page object from the admin endpoint
        setBookings(response.content);
        setTotalBookings(response.totalElements || 0);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Reset to page 0 when search/filter changes
      fetchBookings(0, paginationModel.pageSize);
    }, 300); // Debounce search

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, statusFilter, paginationModel.pageSize, fetchBookings]);

  const handlePaginationChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
    fetchBookings(newModel.page, newModel.pageSize);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaginationModel({ pageSize: 25, page: 0 });
  };

  const handleRefresh = () => {
    fetchBookings(paginationModel.page, paginationModel.pageSize);
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
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>Booking Management</Typography>
          <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
        </Grid>
        {/* Search and Filter Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by booking ID, customer name, or event"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<FilterIcon />}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
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
                rowCount={totalBookings}
                paginationModel={paginationModel}
                onPaginationModelChange={handlePaginationChange}
                pageSizeOptions={[10, 25, 50, 100]}
                getRowId={(row) => row.bookingId}
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
    </Box>
  );
};

export default Bookings;