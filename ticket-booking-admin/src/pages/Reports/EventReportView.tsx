import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  FileDownload as CsvIcon,
  Search as SearchIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  ConfirmationNumber as TicketIcon,
  People as PeopleIcon,
  TrendingUp as TrendingIcon,
  BarChart as BarChartIcon,
  EventSeat as SeatIcon,
  Refresh as RefreshIcon,
  LocalOffer as LocalOfferIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useParams, useNavigate } from 'react-router-dom';
import reportService, { EventReportData, CustomerBookingRow } from '../../services/report.service';
import { exportEventReportToExcel, exportEventReportToCSV, printPDFReport } from '../../utils/exportUtils';
import { formatCurrency } from '../../utils/formatters';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const EventReportView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EventReportData | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (eventId) {
      fetchReportData(eventId, selectedScheduleId === 'ALL' ? undefined : selectedScheduleId);
    }
  }, [eventId, selectedScheduleId]);

  const fetchReportData = async (id: string, schedId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getEventReport(id, schedId);
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load event report:', err);
      setError(err.response?.data?.message || 'Failed to load event report details');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = (e: any) => {
    const val = e.target.value;
    setSelectedScheduleId(val);
  };

  if (loading && !report) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="500px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Event report not found'}</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
      </Box>
    );
  }

  // Filter booking details by search term
  const filteredBookings = report.bookingDetails.filter((b: CustomerBookingRow) =>
    b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.bookingReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.ticketCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.seatNumbers.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Chart 1: Category Ticket Sales (Bar Chart) ---
  const categoryBarData = {
    labels: report.categorySummaries.map(c => c.categoryName),
    datasets: [
      {
        label: 'Tickets Sold',
        data: report.categorySummaries.map(c => c.ticketsSold),
        backgroundColor: '#4caf50',
      },
      {
        label: 'Tickets Remaining',
        data: report.categorySummaries.map(c => c.ticketsAvailable),
        backgroundColor: '#2196f3',
      },
      {
        label: 'Held / Reserved',
        data: report.categorySummaries.map(c => c.ticketsHeld),
        backgroundColor: '#ffc107',
      }
    ]
  };

  // --- Chart 2: Category Revenue Contribution (Doughnut Chart) ---
  const categoryRevenueData = {
    labels: report.categorySummaries.map(c => c.categoryName),
    datasets: [
      {
        data: report.categorySummaries.map(c => c.categoryRevenue),
        backgroundColor: [
          '#8bc34a', '#9c27b0', '#2196f3', '#ff9800', '#e91e63', '#00bcd4', '#607d8b'
        ],
        borderWidth: 2,
      }
    ]
  };

  // --- Chart 3: Show Times Attendance & Revenue Comparison (Bar Chart) ---
  const scheduleBarData = {
    labels: report.schedules.map(s => new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Tickets Sold',
        data: report.schedules.map(s => s.ticketsSold),
        backgroundColor: '#ff9800',
        yAxisID: 'y',
      },
      {
        label: 'Revenue (LKR)',
        data: report.schedules.map(s => s.revenue),
        backgroundColor: '#3f51b5',
        yAxisID: 'y1',
      }
    ]
  };

  const scheduleBarOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'Tickets Sold' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Revenue (LKR)' } },
    }
  };

  // --- Chart 4: Booking Status Breakdown (Doughnut Chart) ---
  const statusCounts = report.bookingDetails.reduce((acc: any, bk) => {
    acc[bk.status] = (acc[bk.status] || 0) + 1;
    return acc;
  }, {});

  const bookingStatusData = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#9c27b0'],
      }
    ]
  };

  // --- Seat Map Diagram: normalize raw seat coordinates into a balanced, centered layout ---
  const seatPoints = report.seatAvailabilityMap.map((seat: any) => ({
    seat,
    x: Number(seat.xposition ?? seat.xPosition ?? 0),
    y: Number(seat.yposition ?? seat.yPosition ?? 0),
  })).filter(p => !isNaN(p.x) && !isNaN(p.y));

  const hasSharedAreas = !!(report.sharedAreaSummaries && report.sharedAreaSummaries.length > 0);

  const STAGE_HEIGHT = 60;
  const PADDING = 60;
  const CONTENT_WIDTH = 1000;
  const SHARED_BOX_WIDTH = 220;
  const SHARED_BOX_HEIGHT = 90;
  const SHARED_BOX_GAP = 20;

  const minX = seatPoints.length ? Math.min(...seatPoints.map(p => p.x)) : 0;
  const maxX = seatPoints.length ? Math.max(...seatPoints.map(p => p.x)) : 0;
  const minY = seatPoints.length ? Math.min(...seatPoints.map(p => p.y)) : 0;
  const maxY = seatPoints.length ? Math.max(...seatPoints.map(p => p.y)) : 0;
  const rawWidth = Math.max(1, maxX - minX);
  const rawHeight = Math.max(1, maxY - minY);
  const seatScale = seatPoints.length ? CONTENT_WIDTH / rawWidth : 0;
  const scaledSeatHeight = rawHeight * seatScale;

  const seatBlockTop = STAGE_HEIGHT + PADDING;
  const seatBlockBottom = seatPoints.length ? seatBlockTop + scaledSeatHeight : seatBlockTop;

  const sharedAreaRowWidth = hasSharedAreas
    ? report.sharedAreaSummaries.length * SHARED_BOX_WIDTH + (report.sharedAreaSummaries.length - 1) * SHARED_BOX_GAP
    : 0;
  const sharedAreaTop = seatBlockBottom + (seatPoints.length ? PADDING : 0);
  const sharedAreaBottom = hasSharedAreas ? sharedAreaTop + SHARED_BOX_HEIGHT : sharedAreaTop;

  const canvasWidth = Math.max(CONTENT_WIDTH, sharedAreaRowWidth) + PADDING * 2;
  const canvasHeight = sharedAreaBottom + PADDING;
  const contentCenterX = canvasWidth / 2;

  const normalizedSeatPoints = seatPoints.map(p => ({
    ...p,
    plotX: contentCenterX - CONTENT_WIDTH / 2 + (p.x - minX) * seatScale,
    plotY: seatBlockTop + (p.y - minY) * seatScale,
  }));

  const sharedAreaStartX = contentCenterX - sharedAreaRowWidth / 2;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, id: 'printable-event-report' }}>
      {/* Print Styles for clean PDF export */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .MuiPaper-root { box-shadow: none !important; border: 1px solid #ddd !important; }
          .print-full-width { width: 100% !important; }

          /* Hide admin/organizer layout chrome so only the report content prints */
          .MuiDrawer-root, .MuiAppBar-root, header {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          /* Preserve the seat map's dark canvas + status colors instead of the browser stripping backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #seat-map-canvas, #seat-map-canvas svg {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Header & Controls Toolbar */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
              <Chip label={report.categoryName} color="primary" size="small" variant="outlined" />
              <Chip label={report.eventStatus} color={report.eventStatus === 'PUBLISHED' ? 'success' : 'warning'} size="small" variant="outlined" />
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#1976d2' }}>
              {report.eventTitle} - Event Report
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <span><LocationIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> {report.venueName} ({report.venueCity})</span>
              <span><PeopleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> Organizer: {report.organizerName}</span>
            </Typography>
          </Box>

          {/* Export Action Buttons */}
          <Box display="flex" gap={1} flexWrap="wrap" className="no-print">
            <Button
              variant="outlined"
              size="small"
              startIcon={<PdfIcon />}
              onClick={() => printPDFReport(report)}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExcelIcon />}
              onClick={() => exportEventReportToExcel(report)}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CsvIcon />}
              onClick={() => exportEventReportToCSV(report)}
            >
              Export CSV
            </Button>
            <IconButton onClick={() => fetchReportData(report.eventId, selectedScheduleId === 'ALL' ? undefined : selectedScheduleId)}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Show Times / Schedule Filter */}
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon fontSize="small" /> Select Show Time (Schedule):
          </Typography>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <Select
              value={selectedScheduleId}
              onChange={handleScheduleChange}
            >
              <MenuItem value="ALL">All Show Times (Aggregated Summary)</MenuItem>
              {report.schedules.map(sch => (
                <MenuItem key={sch.scheduleId} value={sch.scheduleId}>
                  {new Date(sch.startTime).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} ({sch.ticketsSold} / {sch.totalCapacity} sold)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedScheduleId !== 'ALL' && (
            <Chip
              label={`Filter Active: ${report.selectedScheduleLabel}`}
              onDelete={() => setSelectedScheduleId('ALL')}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
      </Paper>

      {/* KPI Overview Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ bgcolor: '#4CAF50', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                  <MoneyIcon sx={{ color: '#fff', fontSize: 28 }} />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                {formatCurrency(report.totalRevenue, 'LKR')}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, mb: 1 }}>
                Net Revenue (after refunds)
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Gross Sales</Typography>
                <Typography variant="caption" fontWeight={600}>{formatCurrency(report.grossRevenue, 'LKR')}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Refunds Paid</Typography>
                <Typography variant="caption" fontWeight={600} sx={{ color: '#ef4444' }}>-{formatCurrency(report.totalRefunds, 'LKR')}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Customer Savings (Deals)*</Typography>
                <Typography variant="caption" fontWeight={600} sx={{ color: '#f59e0b' }}>{formatCurrency(report.totalDiscounts, 'LKR')}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontStyle: 'italic' }}>
                *already reflected in Gross Sales, not subtracted again
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ bgcolor: '#2196F3', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                  <TicketIcon sx={{ color: '#fff', fontSize: 28 }} />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                {report.totalTicketsSold} <Typography component="span" variant="h6" color="text.secondary">/ {report.totalCapacity}</Typography>
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                Tickets Sold
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {report.totalCapacity - report.totalTicketsSold} tickets available
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ bgcolor: '#FF9800', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                  <TrendingIcon sx={{ color: '#fff', fontSize: 28 }} />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                {report.occupancyRate}%
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, mb: 1 }}>
                Occupancy Rate
              </Typography>
              <LinearProgress variant="determinate" value={Math.min(100, report.occupancyRate)} sx={{ height: 6, borderRadius: 3 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ bgcolor: '#9C27B0', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                  <SeatIcon sx={{ color: '#fff', fontSize: 28 }} />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                {report.totalVenueCapacity}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                Venue Seats
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {report.totalTicketsHeld} on hold | {report.totalTicketsLocked} locked
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visual Chart Report Panels */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BarChartIcon color="primary" /> Visual Analytics & Chart Report Panels
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Panel 1: Category Ticket Inventory (Bar Chart) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Category Ticket Inventory
              </Typography>
              <Chip label="Bar Chart" size="small" color="primary" variant="outlined" />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Breakdown of tickets sold, remaining, and held across each seat tier category.
            </Typography>
            <Box height={280}>
              <Bar data={categoryBarData} options={{ responsive: true, maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>

        {/* Panel 2: Category Revenue Contribution (Doughnut Chart) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Revenue Share by Category (LKR)
              </Typography>
              <Chip label="Doughnut Chart" size="small" color="secondary" variant="outlined" />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Proportion of total revenue generated by each ticket tier category (LKR).
            </Typography>
            <Box height={280} display="flex" justifyContent="center">
              <Doughnut data={categoryRevenueData} options={{ responsive: true, maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>

        {/* Panel 3: Show Times Performance Comparison */}
        {report.schedules.length > 1 && (
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>
                  Show Times Performance Comparison
                </Typography>
                <Chip label="Multi-Showtime" size="small" color="info" />
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Comparing ticket sales volume and total revenue (LKR) across all show times.
              </Typography>
              <Box height={300}>
                <Bar data={scheduleBarData} options={scheduleBarOptions} />
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Panel 4: Customer Booking Status */}
        <Grid item xs={12} md={report.schedules.length > 1 ? 4 : 6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Booking Status Breakdown
              </Typography>
              <Chip label="Pie Chart" size="small" color="warning" variant="outlined" />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Distribution of confirmed, pending, and cancelled customer bookings.
            </Typography>
            <Box height={250} display="flex" justifyContent="center">
              <Doughnut data={bookingStatusData} options={{ responsive: true, maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Show Times (Event Schedules) Performance Table */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Show Times (Schedules) Performance Summary
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Show Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Capacity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Occupancy %</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Revenue (LKR)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.schedules.map((sch) => (
                <TableRow key={sch.scheduleId} hover selected={selectedScheduleId === sch.scheduleId}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {new Date(sch.startTime).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <Chip label={sch.status} size="small" color={sch.status === 'ACTIVE' ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">{sch.totalCapacity}</TableCell>
                  <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>{sch.ticketsSold}</TableCell>
                  <TableCell align="right">{sch.ticketsAvailable}</TableCell>
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                      <span>{sch.occupancyRate}%</span>
                      <LinearProgress variant="determinate" value={Math.min(100, sch.occupancyRate)} sx={{ width: 50, height: 6, borderRadius: 3 }} />
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(sch.revenue, 'LKR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Category Ticket Sales Breakdown Table */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Category-Wise Ticket Sales & Remaining Breakdown
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Category / Tier</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Price (LKR)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Seats</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Left</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Held Seats</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Category Revenue (LKR)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.categorySummaries.map((cat) => (
                <TableRow key={cat.categoryName} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: cat.colorCode || '#1976d2' }} />
                      <Typography fontWeight={600}>{cat.categoryName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(cat.unitPrice, 'LKR')}</TableCell>
                  <TableCell align="right">{cat.totalSeats}</TableCell>
                  <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>{cat.ticketsSold}</TableCell>
                  <TableCell align="right" sx={{ color: '#2196f3', fontWeight: 700 }}>{cat.ticketsAvailable}</TableCell>
                  <TableCell align="right">{cat.ticketsHeld}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(cat.categoryRevenue, 'LKR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Deals & Discounts */}
      {((report.configuredDeals && report.configuredDeals.length > 0) || (report.dealUsageSummaries && report.dealUsageSummaries.length > 0)) && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LocalOfferIcon color="primary" fontSize="small" />
            <Typography variant="h6" fontWeight={700}>
              Deals & Discounts
            </Typography>
          </Box>

          {report.configuredDeals && report.configuredDeals.length > 0 && (
            <Box mb={report.dealUsageSummaries?.length ? 3 : 0}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Deals Configured for This Event
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Deal</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.configuredDeals.map((deal) => (
                      <TableRow key={deal.categoryId} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{deal.categoryName}</TableCell>
                        <TableCell>
                          {deal.dealLabel || (deal.dealType === 'BUY_X_GET_Y_FREE'
                            ? `Buy ${deal.dealBuyQuantity} Get ${deal.dealFreeQuantity} Free`
                            : `${deal.dealDiscountPercentage ?? 0}% Off`)}
                        </TableCell>
                        <TableCell>{deal.dealType === 'BUY_X_GET_Y_FREE' ? 'Buy X Get Y Free' : 'Percentage Discount'}</TableCell>
                        <TableCell>
                          <Chip
                            label={deal.dealActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={deal.dealActive ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {report.dealUsageSummaries && report.dealUsageSummaries.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                Deal Usage (Confirmed & Refunded Bookings)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Grouped by the discount label recorded at checkout - an approximate view, not an exact per-deal ledger.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Deal / Discount Label</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Times Used</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total Savings Given (LKR)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.dealUsageSummaries.map((usage) => (
                      <TableRow key={usage.label} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{usage.label}</TableCell>
                        <TableCell align="right">{usage.timesUsed}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(usage.totalDiscountGiven, 'LKR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>
      )}

      {/* Shared Standing Areas Breakdown Table */}
      {report.sharedAreaSummaries && report.sharedAreaSummaries.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Chip label="Shared Areas" color="info" size="small" />
            <Typography variant="h6" fontWeight={700}>
              Shared Standing / General Admission Areas Breakdown
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Area Name / Zone</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Area #</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Price (LKR)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Capacity</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Left</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Occupancy %</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Area Revenue (LKR)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.sharedAreaSummaries.map((sa) => (
                  <TableRow key={sa.categoryId || sa.sharedAreaNumber} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{sa.categoryName}</TableCell>
                    <TableCell align="right">{sa.sharedAreaNumber || 1}</TableCell>
                    <TableCell align="right">{formatCurrency(sa.unitPrice, 'LKR')}</TableCell>
                    <TableCell align="right">{sa.totalCapacity}</TableCell>
                    <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>{sa.ticketsSold}</TableCell>
                    <TableCell align="right" sx={{ color: '#2196f3', fontWeight: 700 }}>{sa.ticketsAvailable}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        <span>{sa.occupancyRate}%</span>
                        <LinearProgress variant="determinate" value={Math.min(100, sa.occupancyRate)} sx={{ width: 45, height: 5, borderRadius: 3 }} />
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(sa.totalRevenue, 'LKR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Visual Venue Seat Map Diagram Panel */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Visual Venue Seat Map Layout
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Real-time visual map showing customer booked seats, available seats, and held seats.
            </Typography>
          </Box>
          <Box display="flex" gap={1.5} flexWrap="wrap">
            <Chip label="Sold (Booked)" sx={{ bgcolor: '#ff5722', color: '#fff', fontWeight: 600 }} size="small" />
            <Chip label="Available" sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 600 }} size="small" />
            <Chip label="VIP Reserved" sx={{ bgcolor: '#9c27b0', color: '#fff', fontWeight: 600 }} size="small" />
            <Chip label="Temporary Hold" sx={{ bgcolor: '#ffc107', color: '#000', fontWeight: 600 }} size="small" />
            {hasSharedAreas && (
              <Chip label="Shared / Standing Area" sx={{ bgcolor: '#0ea5e9', color: '#fff', fontWeight: 600 }} size="small" />
            )}
          </Box>
        </Box>

        {/* SVG Seat Diagram */}
        <Box id="seat-map-canvas" sx={{ border: '2px solid #e2e8f0', borderRadius: 2, bgcolor: '#0f172a', p: 2, minHeight: 400, overflow: 'auto', textAlign: 'center' }}>
          {normalizedSeatPoints.length > 0 || hasSharedAreas ? (
            <svg width="100%" height="450" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="xMidYMid meet">
              {/* Stage Graphic */}
              <rect x={contentCenterX - 250} y="20" width="500" height={STAGE_HEIGHT - 10} rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <text x={contentCenterX} y={20 + (STAGE_HEIGHT - 10) / 2 + 6} fill="#38bdf8" fontSize="20" fontWeight="bold" textAnchor="middle">STAGE</text>

              {/* Render Seat Circles (normalized to a balanced, centered grid) */}
              {normalizedSeatPoints.filter(({ seat }) => seat.status !== 'LOCKED').map(({ seat, plotX, plotY }) => {
                let color = seat.colorCode || '#4caf50';
                if (seat.status === 'BOOKED') color = '#ff5722';
                else if (seat.status === 'TEMPORARY_HOLD') color = '#ffc107';
                else if (seat.status === 'VIP_RESERVED') color = '#9c27b0';

                return (
                  <g key={seat.seatId}>
                    <circle
                      cx={plotX}
                      cy={plotY}
                      r="8"
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <title>{`Seat: ${seat.section}-${seat.rowLabel}${seat.seatNumber} | Status: ${seat.status} | Category: ${seat.categoryName}`}</title>
                  </g>
                );
              })}

              {/* Shared / Standing Area Zones */}
              {hasSharedAreas && report.sharedAreaSummaries.map((sa, idx) => {
                const boxX = sharedAreaStartX + idx * (SHARED_BOX_WIDTH + SHARED_BOX_GAP);
                return (
                  <g key={sa.categoryId || sa.sharedAreaNumber || idx}>
                    <rect
                      x={boxX}
                      y={sharedAreaTop}
                      width={SHARED_BOX_WIDTH}
                      height={SHARED_BOX_HEIGHT}
                      rx="10"
                      fill="#1e293b"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                    <text x={boxX + SHARED_BOX_WIDTH / 2} y={sharedAreaTop + 28} fill="#e2e8f0" fontSize="14" fontWeight="700" textAnchor="middle">
                      {sa.categoryName}
                    </text>
                    <text x={boxX + SHARED_BOX_WIDTH / 2} y={sharedAreaTop + 52} fill="#38bdf8" fontSize="18" fontWeight="800" textAnchor="middle">
                      {sa.ticketsSold} / {sa.totalCapacity}
                    </text>
                    <text x={boxX + SHARED_BOX_WIDTH / 2} y={sharedAreaTop + 74} fill="#94a3b8" fontSize="12" textAnchor="middle">
                      {sa.occupancyRate}% occupied
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <Box p={5} color="#94a3b8">
              <Typography>General Admission / Shared Standing Area (No static seats map)</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Customer Booking Details List Table */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Customer Bookings List ({filteredBookings.length} bookings)
          </Typography>
          <TextField
            size="small"
            placeholder="Search by customer name, email, ref, seat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Booking Ref</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Show Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Seats Booked</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Paid (LKR)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((bk) => (
                  <TableRow key={bk.bookingId} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1976d2' }}>
                      {bk.bookingReference}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{bk.customerName}</TableCell>
                    <TableCell>{bk.customerEmail}</TableCell>
                    <TableCell>{bk.showTimeLabel}</TableCell>
                    <TableCell>{bk.seatNumbers}</TableCell>
                    <TableCell><Chip label={bk.ticketCategory} size="small" variant="outlined" /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(bk.totalAmount, 'LKR')}</TableCell>
                    <TableCell>
                      <Chip
                        label={bk.status}
                        size="small"
                        color={bk.status === 'CONFIRMED' ? 'success' : bk.status === 'PENDING' ? 'warning' : 'error'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                    No bookings found matching search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default EventReportView;
