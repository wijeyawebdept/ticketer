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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Refresh as RefreshIcon, Search as SearchIcon, FilterAlt as FilterIcon, Undo as RefundIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';
import { BookingService, paymentService } from '../../services';
import { Booking, BookingStatus } from '../../types';
import { toast } from 'react-toastify';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import { FileDownload as DownloadIcon } from '@mui/icons-material';

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
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState<boolean>(false);
  
  // Refund states
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState<boolean>(false);
  const [selectedBookingForRefund, setSelectedBookingForRefund] = useState<Booking | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [isRefundProcessing, setIsRefundProcessing] = useState<boolean>(false);

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
      console.error('Failed to fetch bookings:', error);
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

  const handleBulkDelete = () => {
    if (selectedBookingIds.length === 0) return;
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(false);
    try {
      await Promise.all(
        selectedBookingIds.map(id => BookingService.deleteBooking(id))
      );
      setSelectedBookingIds([]);
      toast.success('Bookings deleted successfully');
      fetchBookings(paginationModel.page, paginationModel.pageSize);
    } catch (error) {
      console.error('Failed to delete bookings:', error);
      toast.error('Failed to delete bookings');
    }
  };

  const handleOpenRefundDialog = (booking: Booking) => {
    setSelectedBookingForRefund(booking);
    setRefundReason('');
    setIsRefundDialogOpen(true);
  };

  const handleCloseRefundDialog = () => {
    setIsRefundDialogOpen(false);
    setSelectedBookingForRefund(null);
    setRefundReason('');
  };

  const processRefund = async () => {
    if (!selectedBookingForRefund || !refundReason.trim()) {
      toast.warning('Please provide a reason for the refund');
      return;
    }

    setIsRefundProcessing(true);
    try {
      const response = await paymentService.initiateRefund({
        bookingId: selectedBookingForRefund.bookingId,
        reason: refundReason,
        amount: selectedBookingForRefund.totalAmount // Full refund by default
      });

      if (response.success) {
        toast.success(`Refund processed successfully for booking ${selectedBookingForRefund.bookingReference}`);
        handleCloseRefundDialog();
        fetchBookings(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(response.message || 'Refund failed');
      }
    } catch (error: any) {
      console.error('Refund error:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund. Please try again.');
    } finally {
      setIsRefundProcessing(false);
    }
  };

  const prepareExportData = () => {
    return bookings.map(b => ({
      'Booking Reference': b.bookingReference,
      'Event Name': b.eventName || b.event?.name || 'N/A',
      'Customer Name': b.userFirstName && b.userLastName ? `${b.userFirstName} ${b.userLastName}` : (b.user ? `${b.user.firstName} ${b.user.lastName}` : 'N/A'),
      'Tickets': b.ticketCount || 0,
      'Total Amount (Rs.)': b.totalAmount || 0,
      'Booking Date': b.bookingTime ? new Date(b.bookingTime).toLocaleDateString() : 'N/A',
      'Booking Time': b.bookingTime ? new Date(b.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      'Status': b.status
    }));
  };

  const handleExportExcel = () => {
    const data = prepareExportData();
    exportToExcel(data, `Bookings_Export_${new Date().toLocaleDateString()}`);
    toast.success('Exporting to Excel...');
  };

  const handleExportCSV = () => {
    const data = prepareExportData();
    exportToCSV(data, `Bookings_Export_${new Date().toLocaleDateString()}`);
    toast.success('Exporting to CSV...');
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
      case BookingStatus.REFUNDED:
        return 'secondary';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'bookingReference', headerName: 'Booking Ref', width: 130 },
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
    { 
      field: 'ticketCount', 
      headerName: 'Tickets', 
      width: 80,
      valueGetter: (params) => {
        return params.row.numberOfTickets || params.row.ticketCount || 0;
      }
    },
    { 
      field: 'totalAmount', 
      headerName: 'Amount', 
      width: 100,
      valueFormatter: (params) => {
        return params.value ? `Rs. ${params.value.toLocaleString()}` : 'N/A';
      }
    },
    { 
      field: 'bookingTime', 
      headerName: 'Date', 
      width: 110, 
      valueFormatter: (params: any) => {
        return params.value ? new Date(params.value).toLocaleDateString() : 'N/A';
      }
    },
    { 
      field: 'bookingTime_time', 
      headerName: 'Time', 
      width: 100, 
      valueGetter: (params) => params.row.bookingTime,
      valueFormatter: (params: any) => {
        return params.value ? new Date(params.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 110,
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
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const booking = params.row as Booking;
        const canRefund = booking.status === BookingStatus.CONFIRMED;
        
        return (
          <Box>
            <IconButton 
              size="small" 
              color="secondary" 
              onClick={() => handleOpenRefundDialog(booking)}
              disabled={!canRefund}
              title={canRefund ? "Process Refund" : "Only confirmed bookings can be refunded"}
            >
              <RefundIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>Booking Management</Typography>
          <Box display="flex" alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              sx={{ mr: 1 }}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              sx={{ mr: 2 }}
            >
              CSV
            </Button>
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Box>
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
                    <MenuItem value="REFUNDED">Refunded</MenuItem>
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

        {/* Bulk Actions Toolbar */}
        {selectedBookingIds.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                  {selectedBookingIds.length} booking(s) selected
                </Typography>
                <Box>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )}

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
                checkboxSelection
                rowSelectionModel={selectedBookingIds}
                onRowSelectionModelChange={(newSelection) => {
                  setSelectedBookingIds(newSelection as string[]);
                }}
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={isBulkDeleteDialogOpen}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 600 }}>
          Confirm Bulk Delete
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography>
            Are you sure you want to delete {selectedBookingIds.length} booking(s)?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Button 
            onClick={() => setIsBulkDeleteDialogOpen(false)}
            sx={{ fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={confirmBulkDelete}
            sx={{ fontWeight: 500 }}
          >
            Delete {selectedBookingIds.length} Booking(s)
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Refund Confirmation Dialog */}
      <Dialog
        open={isRefundDialogOpen}
        onClose={handleCloseRefundDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 600 }}>
          Process Refund
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to refund booking <strong>{selectedBookingForRefund?.bookingReference}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This will refund the full amount of <strong>Rs. {selectedBookingForRefund?.totalAmount?.toLocaleString()}</strong> to the customer.
          </Typography>
          
          <TextField
            fullWidth
            label="Refund Reason"
            placeholder="Enter the reason for this refund (e.g., Event cancelled, Customer request)"
            multiline
            rows={3}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            required
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Button 
            onClick={handleCloseRefundDialog}
            disabled={isRefundProcessing}
            sx={{ fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={processRefund}
            disabled={isRefundProcessing || !refundReason.trim()}
            startIcon={isRefundProcessing ? <CircularProgress size={20} color="inherit" /> : <RefundIcon />}
            sx={{ fontWeight: 500 }}
          >
            {isRefundProcessing ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bookings;