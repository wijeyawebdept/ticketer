import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Refresh as RefreshIcon, ReceiptLong as ReceiptIcon, Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PublicNavbar from '../../../components/public/PublicNavbar';
import { BookingService } from '../../../services';
import { Booking, BookingStatus } from '../../../types';

const UserBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await BookingService.getAllBookings();
      setBookings(Array.isArray(data) ? data : data?.content ?? []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const renderStatusChip = (status: BookingStatus | string) => {
    const statusUpper = (status || '').toUpperCase();
    switch (statusUpper) {
      case 'CONFIRMED':
        return (
          <Chip
            label="CONFIRMED"
            size="small"
            sx={{
              backgroundColor: 'rgba(46, 125, 50, 0.25)',
              color: '#4caf50',
              border: '1px solid #4caf50',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      case 'PENDING':
        return (
          <Chip
            label="PENDING"
            size="small"
            sx={{
              backgroundColor: 'rgba(237, 108, 2, 0.25)',
              color: '#ff9800',
              border: '1px solid #ff9800',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      case 'REFUNDED':
        return (
          <Chip
            label="REFUNDED"
            size="small"
            sx={{
              backgroundColor: 'rgba(171, 71, 188, 0.25)',
              color: '#ce93d8',
              border: '1px solid #ab47bc',
              fontWeight: 700,
              fontSize: '0.75rem',
              boxShadow: '0 0 10px rgba(171, 71, 188, 0.4)',
            }}
          />
        );
      case 'CANCELLED':
        return (
          <Chip
            label="CANCELLED"
            size="small"
            sx={{
              backgroundColor: 'rgba(211, 47, 47, 0.25)',
              color: '#ef5350',
              border: '1px solid #ef5350',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      case 'COMPLETED':
        return (
          <Chip
            label="COMPLETED"
            size="small"
            sx={{
              backgroundColor: 'rgba(2, 136, 209, 0.25)',
              color: '#29b6f6',
              border: '1px solid #29b6f6',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      default:
        return (
          <Chip
            label={statusUpper || 'N/A'}
            size="small"
            sx={{
              backgroundColor: 'rgba(120, 144, 156, 0.25)',
              color: '#b0bec5',
              border: '1px solid #78909c',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
    }
  };

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
  const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  const fmtDateTime = (d?: string) => d ? `${fmt(d)} at ${fmtTime(d)}` : 'N/A';

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Booking Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
        h2 { color: #cc0033; } table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .label { color: #555; font-size: 12px; } .value { font-weight: 600; }
        .total { font-size: 16px; font-weight: 700; color: #cc0033; }
      </style></head><body>
      ${receiptRef.current.innerHTML}
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const columns: GridColDef[] = [
    { field: 'bookingReference', headerName: 'Booking Ref', width: 160 },
    {
      field: 'eventName', headerName: 'Event', flex: 1, minWidth: 150,
      valueGetter: (params: any) => params.row.eventName || params.row.event?.name || 'N/A'
    },
    { field: 'ticketCount', headerName: 'Tickets', width: 90 },
    {
      field: 'totalAmount', headerName: 'Amount', width: 120,
      valueFormatter: (params: any) => `LKR ${params.value?.toLocaleString() ?? 0}`
    },
    {
      field: 'bookingTime', headerName: 'Booking Date', width: 150,
      valueFormatter: (params: any) => new Date(params.value).toLocaleDateString()
    },
    {
      field: 'status', headerName: 'Status', width: 140,
      renderCell: (params: any) => renderStatusChip(params.value)
    },
    {
      field: 'actions', headerName: 'Receipt', width: 120, sortable: false,
      renderCell: (params: any) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ReceiptIcon sx={{ fontSize: '14px !important' }} />}
          onClick={() => setReceiptBooking(params.row as Booking)}
          sx={{
            borderColor: '#ff1955', color: '#ff1955', fontSize: '0.75rem',
            '&:hover': { bgcolor: 'rgba(255,25,85,0.08)', borderColor: '#ff1955' }
          }}
        >
          Receipt
        </Button>
      )
    },
  ];

  return (
    <Box sx={{ backgroundColor: '#242a33', minHeight: '100vh' }}>
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
                sx={{ backgroundColor: '#ff1955', '&:hover': { backgroundColor: '#e01545' }, fontWeight: 600 }}
              >
                Refresh
              </Button>
            </Box>

            <Box sx={{
              height: 600, width: '100%',
              '& .MuiDataGrid-root': { border: 'none', color: '#fff', backgroundColor: 'transparent' },
              '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.8)' },
              '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: '#fcd0a5' },
              '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' },
              '& .MuiTablePagination-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiDataGrid-virtualScroller': { backgroundColor: 'transparent' },
              '& .MuiIconButton-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
            }}>
              <DataGrid
                rows={bookings}
                columns={columns}
                loading={loading}
                getRowId={(row) => row.bookingId}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
              />
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* Receipt Dialog */}
      <Dialog
        open={!!receiptBooking}
        onClose={() => setReceiptBooking(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1f28', color: '#fff', borderRadius: 3,
            border: '1px solid rgba(255,25,85,0.3)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon sx={{ color: '#ff1955' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>Booking Receipt</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handlePrint} size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
              <PrintIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={() => setReceiptBooking(null)} size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {receiptBooking && (
            <Box ref={receiptRef}>
              {/* Header brand */}
              <Box sx={{
                background: 'linear-gradient(135deg, #ff1955 0%, #c8002f 100%)',
                borderRadius: 2, p: 2.5, mb: 3, textAlign: 'center'
              }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.4rem', color: '#fff', letterSpacing: 1 }}>
                  Ticketer.lk
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                  Official Booking Confirmation
                </Typography>
              </Box>

              {/* Ref & Status */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Booking Reference
                  </Typography>
                  <Typography sx={{ color: '#fcd0a5', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'monospace' }}>
                    {receiptBooking.bookingReference || receiptBooking.bookingId?.slice(0, 8).toUpperCase()}
                  </Typography>
                </Box>
                {renderStatusChip(receiptBooking.status)}
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />

              {/* Event Info */}
              <Typography sx={{ color: '#ff1955', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                Event Details
              </Typography>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, p: 2, mb: 3 }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', mb: 0.5 }}>
                  {receiptBooking.eventName || 'N/A'}
                </Typography>
                {receiptBooking.scheduleDate && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                     {fmt(receiptBooking.scheduleDate)}
                    {receiptBooking.scheduleStartTime && ` · ${receiptBooking.scheduleStartTime}`}
                    {receiptBooking.scheduleEndTime && ` – ${receiptBooking.scheduleEndTime}`}
                  </Typography>
                )}
                {receiptBooking.venueName && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', mt: 0.5 }}>
                     {receiptBooking.venueName}{receiptBooking.venueAddress ? `, ${receiptBooking.venueAddress}` : ''}
                  </Typography>
                )}
              </Box>

              {/* Seats */}
              {receiptBooking.seats && receiptBooking.seats.length > 0 && (
                <>
                  <Typography sx={{ color: '#ff1955', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                    Seats
                  </Typography>
                  <Table size="small" sx={{ mb: 3 }}>
                    <TableHead>
                      <TableRow>
                        {['Seat', 'Row', 'Section', 'Price'].map(h => (
                          <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', py: 0.8 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {receiptBooking.seats.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 0.8 }}>{s.seatNumber || '—'}</TableCell>
                          <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 0.8 }}>{s.seatRow || '—'}</TableCell>
                          <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 0.8 }}>{s.section || '—'}</TableCell>
                          <TableCell sx={{ color: '#fcd0a5', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 0.8 }}>LKR {s.price?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              {/* Amount Summary */}
              <Box sx={{ bgcolor: 'rgba(255,25,85,0.08)', border: '1px solid rgba(255,25,85,0.25)', borderRadius: 2, p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Tickets</Typography>
                  <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>{receiptBooking.ticketCount}</Typography>
                </Box>
                {Boolean(Number(receiptBooking.discountAmount || 0) > 0) && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                      Discount {receiptBooking.discountInfo ? `(${receiptBooking.discountInfo})` : ''}
                    </Typography>
                    <Typography sx={{ color: '#4caf50', fontSize: '0.9rem' }}>
                      - LKR {receiptBooking.discountAmount?.toLocaleString()}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Total Paid</Typography>
                  <Typography sx={{ color: '#ff1955', fontWeight: 900, fontSize: '1.1rem' }}>
                    LKR {receiptBooking.totalAmount?.toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              {/* Footer meta */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Booked on</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
                    {fmtDateTime(receiptBooking.bookingTime || receiptBooking.bookingDate)}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', textAlign: 'center', mt: 2.5 }}>
                Thank you for booking with Ticketer.lk · This is your official receipt
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default UserBookings;
