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
  CardGiftcard as PromoIcon,
  DateRange as DateRangeIcon,
  Schedule as ScheduleIcon
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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
    b.seatNumbers.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.promoCode && b.promoCode.toLowerCase().includes(searchTerm.toLowerCase()))
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
        label: 'Early Bird Sold',
        data: report.categorySummaries.map(c => c.earlyBirdTicketsSold || 0),
        backgroundColor: '#ff9800',
      },
      {
        label: 'Tickets Remaining',
        data: report.categorySummaries.map(c => c.ticketsAvailable),
        backgroundColor: '#2196f3',
      },
      {
        label: 'Held / Reserved',
        data: report.categorySummaries.map(c => c.ticketsHeld),
        backgroundColor: '#9c27b0',
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

  // --- Chart 4: Daily Sales & Revenue Timeline Chart ---
  const dailySalesTimeline = report.dailySales && report.dailySales.length > 0
    ? [...report.dailySales].reverse()
    : [];

  const dailyTrendChartData = {
    labels: dailySalesTimeline.map(d => d.formattedDate || d.date),
    datasets: [
      {
        label: 'Revenue (LKR)',
        data: dailySalesTimeline.map(d => d.totalRevenue),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.15)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        type: 'line' as const,
      },
      {
        label: 'Tickets Sold',
        data: dailySalesTimeline.map(d => d.totalTicketsSold),
        backgroundColor: '#4caf50',
        yAxisID: 'y1',
        type: 'bar' as const,
      }
    ]
  };

  const dailyTrendChartOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'Revenue (LKR)' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Tickets Sold' } },
    }
  };

  // --- Seat Map Diagram ---
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
    <Box sx={{ width: '100%' }}>
      {/* Print Styles for Dedicated Executive PDF Output */}
      <style>{`
        .official-print-event-document {
          display: none !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 14mm 14mm;
          }

          body, html, #root, main {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .screen-only-event-dashboard,
          .MuiDrawer-root,
          .MuiAppBar-root,
          header,
          nav,
          aside,
          .no-print {
            display: none !important;
          }

          .official-print-event-document {
            display: block !important;
            width: 100% !important;
          }

          .print-header {
            border-bottom: 2.5px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }

          .print-header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .print-brand-title {
            font-size: 26pt;
            font-weight: 900;
            color: #1e3a8a;
            letter-spacing: -0.5px;
            margin: 0;
            line-height: 1;
          }

          .print-brand-sub {
            font-size: 8.5pt;
            color: #64748b;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-weight: 700;
            margin-top: 3px;
          }

          .print-meta-box {
            text-align: right;
            font-size: 8.5pt;
            color: #334155;
            line-height: 1.4;
          }

          .print-doc-badge {
            display: inline-block;
            background: #1e3a8a;
            color: #ffffff;
            font-size: 8.5pt;
            font-weight: 800;
            padding: 3px 10px;
            border-radius: 4px;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }

          .print-scope-strip {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 12px;
            margin-top: 10px;
            font-size: 9pt;
            color: #1e293b;
          }

          .print-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-section-heading {
            font-size: 11pt;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }

          .print-kpi-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }

          .print-kpi-grid td {
            width: 25%;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            background: #ffffff;
          }

          .print-kpi-label {
            font-size: 7.5pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }

          .print-kpi-value {
            font-size: 13pt;
            font-weight: 800;
            color: #0f172a;
          }

          .print-kpi-sub {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 2px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-bottom: 12px;
          }

          .print-table th {
            background: #1e293b !important;
            color: #ffffff !important;
            font-weight: 700;
            text-align: left;
            padding: 6px 8px;
            border: 1px solid #1e293b;
            font-size: 8pt;
            text-transform: uppercase;
          }

          .print-table th.num, .print-table td.num {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .print-table td {
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
            color: #1e293b;
          }

          .print-table tr:nth-child(even) td {
            background: #f8fafc;
          }

          .print-table tr.total-row td {
            background: #e2e8f0 !important;
            font-weight: 800;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
          }

          .print-signoff {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 15px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .signoff-box {
            width: 42%;
            text-align: center;
          }

          .signoff-line {
            border-bottom: 1px solid #0f172a;
            height: 40px;
            margin-bottom: 5px;
          }

          .signoff-title {
            font-size: 8.5pt;
            font-weight: 700;
            color: #1e293b;
          }

          .print-footer {
            margin-top: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            font-size: 7.5pt;
            color: #94a3b8;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. OFFICIAL PRINT DOCUMENT FOR SINGLE EVENT REPORT                        */}
      {/* ========================================================================= */}
      <div className="official-print-event-document">
        <div className="print-header">
          <div className="print-header-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 10V6C22 4.89543 21.1046 4 20 4H4C2.89543 4 2 4.89543 2 6V10C3.10457 10 4 10.8954 4 12C4 13.1046 3.10457 14 2 14V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V14C20.8954 14 20 13.1046 20 12C20 10.8954 20.8954 10 22 10Z" fill="#ff1955"/>
                <path d="M12 4V20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
              </svg>
              <div>
                <h1 className="print-brand-title">Ticketer<span style={{ color: '#ff1955' }}>.lk</span></h1>
                <div className="print-brand-sub">Official Event Analytics & Sales Statement</div>
              </div>
            </div>
            <div className="print-meta-box">
              <div className="print-doc-badge">EVENT AUDIT REPORT</div>
              <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
              <div><strong>Organizer:</strong> {report.organizerName}</div>
              <div><strong>Status:</strong> {report.eventStatus}</div>
            </div>
          </div>

          <div className="print-scope-strip">
            <div><strong>Event:</strong> {report.eventTitle} ({report.categoryName})</div>
            <div><strong>Venue:</strong> {report.venueName}, {report.venueCity}</div>
            <div><strong>Scope:</strong> {report.selectedScheduleId ? report.selectedScheduleLabel : 'All Show Times (Aggregated)'}</div>
          </div>
        </div>

        {/* Section 1: Executive KPI Summary */}
        <div className="print-section">
          <div className="print-section-heading">1. Executive Sales & Capacity Summary</div>
          <table className="print-kpi-grid">
            <tbody>
              <tr>
                <td>
                  <div className="print-kpi-label">Gross Ticket Sales</div>
                  <div className="print-kpi-value">{formatCurrency(report.grossRevenue, 'LKR')}</div>
                  <div className="print-kpi-sub">Total revenue billed</div>
                </td>
                <td>
                  <div className="print-kpi-label">Refunds Paid</div>
                  <div className="print-kpi-value" style={{ color: '#dc2626' }}>
                    {report.totalRefunds > 0 ? `-${formatCurrency(report.totalRefunds, 'LKR')}` : 'LKR 0.00'}
                  </div>
                  <div className="print-kpi-sub">Approved refunds</div>
                </td>
                <td style={{ background: '#f8fafc', border: '1.5px solid #1e3a8a' }}>
                  <div className="print-kpi-label" style={{ color: '#1e3a8a' }}>Net Revenue Earned</div>
                  <div className="print-kpi-value" style={{ color: '#1e3a8a' }}>{formatCurrency(report.totalRevenue, 'LKR')}</div>
                  <div className="print-kpi-sub">Net proceeds</div>
                </td>
                <td>
                  <div className="print-kpi-label">Tickets Sold / Capacity</div>
                  <div className="print-kpi-value">{report.totalTicketsSold} / {report.totalCapacity}</div>
                  <div className="print-kpi-sub">{report.occupancyRate}% occupancy</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="print-kpi-label">Early Bird Sold</div>
                  <div className="print-kpi-value">{report.earlyBirdTotalTicketsSold || 0}</div>
                  <div className="print-kpi-sub">Early Bird tickets</div>
                </td>
                <td>
                  <div className="print-kpi-label">Early Bird Savings</div>
                  <div className="print-kpi-value" style={{ color: '#d97706' }}>{formatCurrency(report.earlyBirdTotalSavings || 0, 'LKR')}</div>
                  <div className="print-kpi-sub">Customer discount value</div>
                </td>
                <td>
                  <div className="print-kpi-label">Deals & Promo Discounts</div>
                  <div className="print-kpi-value">{formatCurrency(report.totalDiscounts, 'LKR')}</div>
                  <div className="print-kpi-sub">Promo: {formatCurrency(report.totalPromoDiscounts || 0, 'LKR')}</div>
                </td>
                <td>
                  <div className="print-kpi-label">Venue Seat Inventory</div>
                  <div className="print-kpi-value">{report.totalVenueCapacity}</div>
                  <div className="print-kpi-sub">{report.totalTicketsHeld} Held | {report.totalTicketsLocked} Locked</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Seated Category Ticket Breakdown */}
        <div className="print-section">
          <div className="print-section-heading">2. Seated Categories & Early Bird Performance</div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Category</th>
                <th className="num" style={{ width: '13%' }}>Regular Price</th>
                <th className="num" style={{ width: '13%' }}>Early Bird Price</th>
                <th style={{ width: '10%' }}>EB Status</th>
                <th className="num" style={{ width: '10%' }}>EB Sold</th>
                <th className="num" style={{ width: '10%' }}>Total Seats</th>
                <th className="num" style={{ width: '10%' }}>Sold</th>
                <th className="num" style={{ width: '12%' }}>Revenue (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {report.categorySummaries.map(cat => (
                <tr key={cat.categoryName}>
                  <td><strong>{cat.categoryName}</strong></td>
                  <td className="num">{formatCurrency(cat.unitPrice, 'LKR')}</td>
                  <td className="num">{cat.earlyBirdPrice ? formatCurrency(cat.earlyBirdPrice, 'LKR') : 'N/A'}</td>
                  <td>{cat.earlyBirdPrice ? (cat.earlyBirdActive ? 'Active' : 'Ended') : '-'}</td>
                  <td className="num">{cat.earlyBirdTicketsSold || 0}</td>
                  <td className="num">{cat.totalSeats}</td>
                  <td className="num"><strong>{cat.ticketsSold}</strong></td>
                  <td className="num"><strong>{formatCurrency(cat.categoryRevenue, 'LKR')}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Shared Areas Breakdown (if present) */}
        {report.sharedAreaSummaries && report.sharedAreaSummaries.length > 0 && (
          <div className="print-section">
            <div className="print-section-heading">3. Shared Standing / General Admission Areas</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Zone / Area</th>
                  <th className="num" style={{ width: '15%' }}>Unit Price</th>
                  <th className="num" style={{ width: '15%' }}>Early Bird Price</th>
                  <th className="num" style={{ width: '15%' }}>Capacity</th>
                  <th className="num" style={{ width: '15%' }}>Sold</th>
                  <th className="num" style={{ width: '15%' }}>Revenue (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {report.sharedAreaSummaries.map(sa => (
                  <tr key={sa.categoryId || sa.sharedAreaNumber}>
                    <td><strong>{sa.categoryName}</strong></td>
                    <td className="num">{formatCurrency(sa.unitPrice, 'LKR')}</td>
                    <td className="num">{sa.earlyBirdPrice ? formatCurrency(sa.earlyBirdPrice, 'LKR') : '-'}</td>
                    <td className="num">{sa.totalCapacity}</td>
                    <td className="num"><strong>{sa.ticketsSold}</strong></td>
                    <td className="num"><strong>{formatCurrency(sa.totalRevenue, 'LKR')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Daily Sales Breakdown (if present) */}
        {report.dailySales && report.dailySales.length > 0 && (
          <div className="print-section">
            <div className="print-section-heading">4. Daily Sales Timeline Breakdown</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Date</th>
                  <th className="num" style={{ width: '15%' }}>Tickets Sold</th>
                  <th className="num" style={{ width: '20%' }}>Gross Sales (LKR)</th>
                  <th className="num" style={{ width: '15%' }}>Discounts (LKR)</th>
                  <th className="num" style={{ width: '15%' }}>Refunds (LKR)</th>
                  <th className="num" style={{ width: '15%' }}>Net Revenue (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {report.dailySales.map(d => (
                  <tr key={d.date}>
                    <td><strong>{d.formattedDate || d.date}</strong></td>
                    <td className="num">{d.totalTicketsSold}</td>
                    <td className="num">{formatCurrency(d.grossRevenue, 'LKR')}</td>
                    <td className="num">{d.totalDiscounts > 0 ? `-${formatCurrency(d.totalDiscounts, 'LKR')}` : '0.00'}</td>
                    <td className="num" style={{ color: d.totalRefunds > 0 ? '#dc2626' : 'inherit' }}>
                      {d.totalRefunds > 0 ? `-${formatCurrency(d.totalRefunds, 'LKR')}` : '0.00'}
                    </td>
                    <td className="num"><strong>{formatCurrency(d.totalRevenue, 'LKR')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 5: Sign-off */}
        <div className="print-signoff">
          <div className="signoff-box">
            <div className="signoff-line"></div>
            <div className="signoff-title">Event Operations Lead</div>
            <div style={{ fontSize: '7.5pt', color: '#64748b' }}>Date & Signature</div>
          </div>
          <div className="signoff-box">
            <div className="signoff-line"></div>
            <div className="signoff-title">Auditor / Finance Manager</div>
            <div style={{ fontSize: '7.5pt', color: '#64748b' }}>Date & Signature</div>
          </div>
        </div>

        <div className="print-footer">
          <div>Confidential • Ticketer Enterprise Ticketing System</div>
          <div>Official Event Sales Statement</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE SCREEN DASHBOARD VIEW                                      */}
      {/* ========================================================================= */}
      <Box className="screen-only-event-dashboard" sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header & Controls Toolbar */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                <Chip label={report.categoryName} color="primary" size="small" variant="outlined" />
                <Chip label={report.eventStatus} color={report.eventStatus === 'PUBLISHED' ? 'success' : 'warning'} size="small" variant="outlined" />
                {report.earlyBirdTotalTicketsSold && report.earlyBirdTotalTicketsSold > 0 ? (
                  <Chip icon={<ScheduleIcon />} label={`Early Bird: ${report.earlyBirdTotalTicketsSold} sold`} size="small" color="warning" />
                ) : null}
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
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button variant="contained" size="small" startIcon={<PdfIcon />} onClick={() => printPDFReport(report)} sx={{ bgcolor: '#1976d2' }}>
                Print Official PDF
              </Button>
              <Button variant="outlined" size="small" startIcon={<ExcelIcon />} onClick={() => exportEventReportToExcel(report)}>
                Export Excel
              </Button>
              <Button variant="outlined" size="small" startIcon={<CsvIcon />} onClick={() => exportEventReportToCSV(report)}>
                Export CSV
              </Button>
              <IconButton onClick={() => fetchReportData(report.eventId, selectedScheduleId === 'ALL' ? undefined : selectedScheduleId)}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Show Times Filter */}
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon fontSize="small" /> Select Show Time (Schedule):
            </Typography>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <Select value={selectedScheduleId} onChange={handleScheduleChange}>
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
            <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)', border: '1px solid rgba(0,0,0,0.05)' }}>
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
                  <Typography variant="caption" color="text.secondary">Discounts & Deals</Typography>
                  <Typography variant="caption" fontWeight={600} sx={{ color: '#f59e0b' }}>{formatCurrency(report.totalDiscounts, 'LKR')}</Typography>
                </Box>
                {report.totalPromoDiscounts && report.totalPromoDiscounts > 0 ? (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Promo Savings</Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#ec4899' }}>{formatCurrency(report.totalPromoDiscounts, 'LKR')}</Typography>
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)', border: '1px solid rgba(0,0,0,0.05)' }}>
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
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Early Bird Sold</Typography>
                  <Typography variant="caption" fontWeight={600} sx={{ color: '#f59e0b' }}>{report.earlyBirdTotalTicketsSold || 0} tickets</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Remaining Seats</Typography>
                  <Typography variant="caption" fontWeight={600}>{report.totalTicketsAvailable}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)', border: '1px solid rgba(0,0,0,0.05)' }}>
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
                {report.earlyBirdTotalSavings && report.earlyBirdTotalSavings > 0 ? (
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" color="text.secondary">Early Bird Savings</Typography>
                    <Typography variant="caption" fontWeight={600} color="warning.main">{formatCurrency(report.earlyBirdTotalSavings, 'LKR')}</Typography>
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)', border: '1px solid rgba(0,0,0,0.05)' }}>
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
                <Divider sx={{ my: 1 }} />
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
                  Category Ticket Inventory & Early Bird
                </Typography>
                <Chip label="Bar Chart" size="small" color="primary" variant="outlined" />
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Breakdown of standard tickets sold, early bird tickets, remaining, and held seats.
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
            <Grid item xs={12} md={12}>
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
        </Grid>

        {/* Sales By Date Timeline Section for this Event */}
        {report.dailySales && report.dailySales.length > 0 && (
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <DateRangeIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Sales by Date Timeline
                </Typography>
              </Box>
              <Chip label={`${report.dailySales.length} Active Sales Days`} size="small" color="primary" variant="outlined" />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Daily trajectory of ticket sales and revenue earned for this event.
            </Typography>

            <Box height={280} sx={{ mb: 3 }}>
              <Line data={dailyTrendChartData as any} options={dailyTrendChartOptions as any} />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Sales (LKR)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Discounts (LKR)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Refunds (LKR)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Net Revenue (LKR)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Orders Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.dailySales.map((d) => (
                    <TableRow key={d.date} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{d.formattedDate || d.date}</TableCell>
                      <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>{d.totalTicketsSold}</TableCell>
                      <TableCell align="right">{formatCurrency(d.grossRevenue, 'LKR')}</TableCell>
                      <TableCell align="right" sx={{ color: '#f59e0b' }}>{d.totalDiscounts > 0 ? `-${formatCurrency(d.totalDiscounts, 'LKR')}` : '0.00'}</TableCell>
                      <TableCell align="right" sx={{ color: '#ef4444' }}>{d.totalRefunds > 0 ? `-${formatCurrency(d.totalRefunds, 'LKR')}` : '0.00'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#1976d2' }}>{formatCurrency(d.totalRevenue, 'LKR')}</TableCell>
                      <TableCell align="right">{d.bookingCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Category Ticket Sales Breakdown Table */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Category-Wise Ticket Sales & Early Bird Breakdown
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Category / Tier</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Regular Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Early Bird Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Early Bird Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Early Bird Sold</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Seats</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining</TableCell>
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
                    <TableCell align="right">
                      {cat.earlyBirdPrice ? formatCurrency(cat.earlyBirdPrice, 'LKR') : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      {cat.earlyBirdPrice ? (
                        <Chip
                          label={cat.earlyBirdActive ? 'Active' : 'Ended'}
                          size="small"
                          color={cat.earlyBirdActive ? 'success' : 'default'}
                          variant="outlined"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#ff9800', fontWeight: 600 }}>
                      {cat.earlyBirdTicketsSold || 0}
                    </TableCell>
                    <TableCell align="right">{cat.totalSeats}</TableCell>
                    <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>{cat.ticketsSold}</TableCell>
                    <TableCell align="right" sx={{ color: '#2196f3', fontWeight: 700 }}>{cat.ticketsAvailable}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(cat.categoryRevenue, 'LKR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

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
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Early Bird Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total Capacity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining</TableCell>
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
                      <TableCell align="right">
                        {sa.earlyBirdPrice ? formatCurrency(sa.earlyBirdPrice, 'LKR') : '-'}
                      </TableCell>
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

          <Box id="seat-map-canvas" sx={{ border: '2px solid #e2e8f0', borderRadius: 2, bgcolor: '#0f172a', p: 2, minHeight: 400, overflow: 'auto', textAlign: 'center' }}>
            {normalizedSeatPoints.length > 0 || hasSharedAreas ? (
              <svg width="100%" height="450" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="xMidYMid meet">
                <rect x={contentCenterX - 250} y="20" width="500" height={STAGE_HEIGHT - 10} rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text x={contentCenterX} y={20 + (STAGE_HEIGHT - 10) / 2 + 6} fill="#38bdf8" fontSize="20" fontWeight="bold" textAnchor="middle">STAGE</text>

                {normalizedSeatPoints.filter(({ seat }) => seat.status !== 'LOCKED').map(({ seat, plotX, plotY }) => {
                  let color = seat.colorCode || '#4caf50';
                  if (seat.status === 'BOOKED') color = '#ff5722';
                  else if (seat.status === 'TEMPORARY_HOLD') color = '#ffc107';
                  else if (seat.status === 'VIP_RESERVED') color = '#9c27b0';

                  return (
                    <g key={seat.seatId}>
                      <circle cx={plotX} cy={plotY} r="8" fill={color} stroke="#ffffff" strokeWidth="1.5" />
                      <title>{`Seat: ${seat.section}-${seat.rowLabel}${seat.seatNumber} | Status: ${seat.status} | Category: ${seat.categoryName}`}</title>
                    </g>
                  );
                })}

                {hasSharedAreas && report.sharedAreaSummaries.map((sa, idx) => {
                  const boxX = sharedAreaStartX + idx * (SHARED_BOX_WIDTH + SHARED_BOX_GAP);
                  return (
                    <g key={sa.categoryId || sa.sharedAreaNumber || idx}>
                      <rect x={boxX} y={sharedAreaTop} width={SHARED_BOX_WIDTH} height={SHARED_BOX_HEIGHT} rx="10" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2" />
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
              placeholder="Search by customer name, email, ref, seat, promo..."
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
                  <TableCell sx={{ fontWeight: 700 }}>Early Bird</TableCell>
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
                      <TableCell>
                        {bk.isEarlyBird ? (
                          <Chip label="Early Bird" size="small" color="warning" />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Standard</Typography>
                        )}
                      </TableCell>
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
                    <TableCell colSpan={9} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      No bookings found matching search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default EventReportView;
