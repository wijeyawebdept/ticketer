import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { TransactionService } from '../../services';
import { Transaction, TransactionStatus } from '../../types';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await TransactionService.getAllTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setSelectedTransaction(null);
  };

  const getStatusChipColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return 'success';
      case TransactionStatus.PENDING:
        return 'warning';
      case TransactionStatus.FAILED:
        return 'error';
      case TransactionStatus.REFUNDED:
        return 'info';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'Transaction ID', width: 150 },
    { field: 'bookingId', headerName: 'Booking ID', width: 150, valueGetter: (params) => params.row.booking?.id || 'N/A' },
    { 
      field: 'userName', 
      headerName: 'Customer', 
      flex: 1, 
      valueGetter: (params) => {
        const user = params.row.booking?.user;
        return user ? `${user.firstName} ${user.lastName}` : 'N/A';
      }
    },
    { 
      field: 'amount', 
      headerName: 'Amount', 
      width: 120, 
      valueFormatter: (params) => {
        return `$${params.value}`;
      }
    },
    { 
      field: 'paymentMethod', 
      headerName: 'Payment Method', 
      width: 150 
    },
    { 
      field: 'transactionDate', 
      headerName: 'Date', 
      width: 150, 
      valueFormatter: (params) => {
        return new Date(params.value as string).toLocaleString();
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color={getStatusChipColor(params.value as TransactionStatus)} 
          variant="outlined" 
          size="small" 
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton onClick={() => handleViewDetails(params.row as Transaction)}>
          <VisibilityIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Transaction History</Typography>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={transactions}
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

      {/* Transaction Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onClose={handleDetailsDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Transaction ID</Typography>
                  <Typography variant="body1">{selectedTransaction.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={selectedTransaction.status} 
                    color={getStatusChipColor(selectedTransaction.status)} 
                    variant="outlined" 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Booking ID</Typography>
                  <Typography variant="body1">{selectedTransaction.booking?.id || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Event</Typography>
                  <Typography variant="body1">{selectedTransaction.booking?.event?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Customer</Typography>
                  <Typography variant="body1">
                    {selectedTransaction.booking?.user ? 
                      `${selectedTransaction.booking.user.firstName} ${selectedTransaction.booking.user.lastName}` : 
                      'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Amount</Typography>
                  <Typography variant="body1">${selectedTransaction.amount}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Payment Method</Typography>
                  <Typography variant="body1">{selectedTransaction.paymentMethod}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Transaction Date</Typography>
                  <Typography variant="body1">
                    {new Date(selectedTransaction.transactionDate).toLocaleString()}
                  </Typography>
                </Grid>
                {selectedTransaction.paymentReference && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Payment Reference</Typography>
                    <Typography variant="body1">{selectedTransaction.paymentReference}</Typography>
                  </Grid>
                )}
                {selectedTransaction.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Notes</Typography>
                    <Typography variant="body1">{selectedTransaction.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Transactions;