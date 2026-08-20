import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Avatar,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Divider,
  CardActions
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Search as SearchIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  ArrowForward as ArrowIcon,
  AttachMoney as MoneyIcon,
  ConfirmationNumber as TicketIcon,
  TrendingUp as TrendingIcon,
  BarChart as BarChartIcon,
  DateRange as DateRangeIcon,
  Today as TodayIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  FileDownload as CsvIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CardGiftcard as PromoIcon
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
import { Line, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import reportService, {
  ReportableEvent,
  SalesByDateReportData,
  DailySalesSummary,
  EventSalesSummary,
  CustomerBookingRow
} from '../../services/report.service';
import { exportSalesByDateToExcel, exportSalesByDateToCSV, printSalesByDatePDF } from '../../utils/exportUtils';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

// Register ChartJS
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

type PresetFilter = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'all' | 'custom';

const ReportsIndex: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Events list for Directory & Dropdown
  const [events, setEvents] = useState<ReportableEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sales by Date State
  const [salesReport, setSalesReport] = useState<SalesByDateReportData | null>(null);
  const [salesLoading, setSalesLoading] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [preset, setPreset] = useState<PresetFilter>('last30');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [bookingsSearchTerm, setBookingsSearchTerm] = useState<string>('');

  const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ROLE_ADMIN);

  useEffect(() => {
    fetchEvents();
    loadSalesByDate('last30');
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getReportableEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to fetch reportable events:', err);
      setError(err.response?.data?.message || 'Failed to load events for reporting');
    } finally {
      setLoading(false);
    }
  };

  const getPresetDates = (p: PresetFilter): { startDate?: string; endDate?: string } => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (p) {
      case 'today':
        return { startDate: formatDate(today), endDate: formatDate(today) };
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { startDate: formatDate(y), endDate: formatDate(y) };
      }
      case 'last7': {
        const d7 = new Date(today);
        d7.setDate(d7.getDate() - 6);
        return { startDate: formatDate(d7), endDate: formatDate(today) };
      }
      case 'last30': {
        const d30 = new Date(today);
        d30.setDate(d30.getDate() - 29);
        return { startDate: formatDate(d30), endDate: formatDate(today) };
      }
      case 'thisMonth': {
        const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: formatDate(mStart), endDate: formatDate(today) };
      }
      case 'custom':
        return {
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        };
      case 'all':
      default:
        return {};
    }
  };

  const loadSalesByDate = async (p: PresetFilter = preset, evtId: string = selectedEventId) => {
    try {
      setSalesLoading(true);
      setError(null);
      const { startDate, endDate } = getPresetDates(p);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (evtId && evtId !== 'ALL') params.eventId = evtId;

      const data = await reportService.getSalesByDateReport(params);
      setSalesReport(data);
    } catch (err: any) {
      console.error('Failed to load sales by date report:', err);
      setError(err.response?.data?.message || 'Failed to load sales report');
    } finally {
      setSalesLoading(false);
    }
  };

  const handlePresetChange = (newPreset: PresetFilter) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      loadSalesByDate(newPreset, selectedEventId);
    }
  };

  const handleEventFilterChange = (evtId: string) => {
    setSelectedEventId(evtId);
    loadSalesByDate(preset, evtId);
  };

  const handleCustomDateSubmit = () => {
    if (customStartDate && customEndDate) {
      setPreset('custom');
      loadSalesByDate('custom', selectedEventId);
    }
  };

  const toggleDateExpand = (dateStr: string) => {
    setExpandedDate(expandedDate === dateStr ? null : dateStr);
  };

  // Filter events in Directory tab
  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.organizerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter bookings in Sales by Date tab
  const filteredBookings = salesReport && salesReport.bookingDetails
    ? salesReport.bookingDetails.filter((b: CustomerBookingRow) =>
        b.customerName.toLowerCase().includes(bookingsSearchTerm.toLowerCase()) ||
        b.customerEmail.toLowerCase().includes(bookingsSearchTerm.toLowerCase()) ||
        b.bookingReference.toLowerCase().includes(bookingsSearchTerm.toLowerCase()) ||
        b.ticketCategory.toLowerCase().includes(bookingsSearchTerm.toLowerCase()) ||
        (b.promoCode && b.promoCode.toLowerCase().includes(bookingsSearchTerm.toLowerCase()))
      )
    : [];

  // Chart data for Sales by Date
  const chronologicalDailySales = salesReport && salesReport.dailySales
    ? [...salesReport.dailySales].reverse()
    : [];

  // Daily Trend Chart (Line for Revenue, Bar for Tickets Sold)
  const dailyTrendData = {
    labels: chronologicalDailySales.map(d => d.formattedDate || d.date),
    datasets: [
      {
        label: 'Net Revenue (LKR)',
        data: chronologicalDailySales.map(d => d.totalRevenue),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.15)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        type: 'line' as const,
      },
      {
        label: 'Standard Tickets Sold',
        data: chronologicalDailySales.map(d => Math.max(0, d.totalTicketsSold - (d.earlyBirdTicketsSold || 0))),
        backgroundColor: '#4caf50',
        yAxisID: 'y1',
        type: 'bar' as const,
      },
      {
        label: 'Early Bird Tickets Sold',
        data: chronologicalDailySales.map(d => d.earlyBirdTicketsSold || 0),
        backgroundColor: '#ff9800',
        yAxisID: 'y1',
        type: 'bar' as const,
      }
    ]
  };

  const dailyTrendOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'Revenue (LKR)' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Tickets Sold' } },
    }
  };

  // Event Share of Revenue Doughnut Chart
  const eventShareData = salesReport && salesReport.eventSummaries
    ? {
        labels: salesReport.eventSummaries.slice(0, 7).map(e => e.eventTitle),
        datasets: [
          {
            data: salesReport.eventSummaries.slice(0, 7).map(e => e.totalRevenue),
            backgroundColor: [
              '#1976d2', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#607d8b'
            ],
            borderWidth: 2,
          }
        ]
      }
    : null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Styles for Official Print Document vs Interactive Screen View */}
      <style>{`
        /* Hide print-only document on regular screen */
        .official-print-document {
          display: none !important;
        }

        /* When printing, hide screen dashboard and display official document */
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

          .screen-only-dashboard,
          .MuiDrawer-root,
          .MuiAppBar-root,
          header,
          nav,
          aside,
          .no-print {
            display: none !important;
          }

          .official-print-document {
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

          /* Financial Summary Grid Box */
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

          /* Tables in Print */
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

          .sub-breakdown-row td {
            background: #f1f5f9 !important;
            padding: 4px 8px 4px 24px;
            font-size: 8pt;
            color: #334155;
          }

          /* Signoff Block */
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
      {/* 1. OFFICIAL EXECUTIVE PRINT REPORT DOCUMENT (VISIBLE ONLY IN PRINT / PDF)  */}
      {/* ========================================================================= */}
      {salesReport && (
        <div className="official-print-document">
          {/* Header */}
          <div className="print-header">
            <div className="print-header-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 10V6C22 4.89543 21.1046 4 20 4H4C2.89543 4 2 4.89543 2 6V10C3.10457 10 4 10.8954 4 12C4 13.1046 3.10457 14 2 14V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V14C20.8954 14 20 13.1046 20 12C20 10.8954 20.8954 10 22 10Z" fill="#ff1955"/>
                  <path d="M12 4V20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
                </svg>
                <div>
                  <h1 className="print-brand-title">Ticketer<span style={{ color: '#ff1955' }}>.lk</span></h1>
                  <div className="print-brand-sub">Enterprise Ticketing Management & Financial Analytics</div>
                </div>
              </div>
              <div className="print-meta-box">
                <div className="print-doc-badge">OFFICIAL FINANCIAL REPORT</div>
                <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
                <div><strong>Account:</strong> {isAdmin ? 'System Administrator' : (user?.email || 'Organizer')}</div>
                <div><strong>Ref ID:</strong> RPT-SALES-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}</div>
              </div>
            </div>

            <div className="print-scope-strip">
              <div><strong>Report Period:</strong> {salesReport.dateRangeLabel}</div>
              <div><strong>Event Scope:</strong> {selectedEventId !== 'ALL' ? (events.find(e => e.eventId === selectedEventId)?.title || 'Single Event') : 'All Events Portfolio (Aggregated)'}</div>
              <div><strong>Currency:</strong> Sri Lankan Rupee (LKR)</div>
            </div>
          </div>

          {/* Section 1: Executive Financial Summary */}
          <div className="print-section">
            <div className="print-section-heading">1. Executive Financial & Sales KPI Summary</div>
            <table className="print-kpi-grid">
              <tbody>
                <tr>
                  <td>
                    <div className="print-kpi-label">Gross Ticket Sales</div>
                    <div className="print-kpi-value">{formatCurrency(salesReport.grossRevenue, 'LKR')}</div>
                    <div className="print-kpi-sub">Total billed sales</div>
                  </td>
                  <td>
                    <div className="print-kpi-label">Refunds Paid</div>
                    <div className="print-kpi-value" style={{ color: '#dc2626' }}>
                      {salesReport.totalRefunds > 0 ? `-${formatCurrency(salesReport.totalRefunds, 'LKR')}` : 'LKR 0.00'}
                    </div>
                    <div className="print-kpi-sub">Successful refunds</div>
                  </td>
                  <td style={{ background: '#f8fafc', border: '1.5px solid #1e3a8a' }}>
                    <div className="print-kpi-label" style={{ color: '#1e3a8a' }}>Net Revenue Earned</div>
                    <div className="print-kpi-value" style={{ color: '#1e3a8a' }}>{formatCurrency(salesReport.totalRevenue, 'LKR')}</div>
                    <div className="print-kpi-sub">After refunds deducted</div>
                  </td>
                  <td>
                    <div className="print-kpi-label">Total Tickets Sold</div>
                    <div className="print-kpi-value">{salesReport.totalTicketsSold}</div>
                    <div className="print-kpi-sub">{salesReport.earlyBirdTicketsSold} Early Bird | {salesReport.totalTicketsSold - salesReport.earlyBirdTicketsSold} Standard</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="print-kpi-label">Customer Orders</div>
                    <div className="print-kpi-value">{salesReport.totalBookingsCount}</div>
                    <div className="print-kpi-sub">Avg. {salesReport.totalBookingsCount > 0 ? (salesReport.totalTicketsSold / salesReport.totalBookingsCount).toFixed(1) : 0} tix / order</div>
                  </td>
                  <td>
                    <div className="print-kpi-label">Avg. Order Value</div>
                    <div className="print-kpi-value">
                      {salesReport.totalBookingsCount > 0 ? formatCurrency(salesReport.grossRevenue / salesReport.totalBookingsCount, 'LKR') : 'LKR 0.00'}
                    </div>
                    <div className="print-kpi-sub">Per checkout transaction</div>
                  </td>
                  <td>
                    <div className="print-kpi-label">Customer Discounts</div>
                    <div className="print-kpi-value">{formatCurrency(salesReport.totalDiscounts, 'LKR')}</div>
                    <div className="print-kpi-sub">Promo: {formatCurrency(salesReport.totalPromoDiscounts, 'LKR')} ({salesReport.promoBookingsCount} orders)</div>
                  </td>
                  <td>
                    <div className="print-kpi-label">Early Bird Savings</div>
                    <div className="print-kpi-value" style={{ color: '#d97706' }}>{formatCurrency(salesReport.totalEarlyBirdSavings, 'LKR')}</div>
                    <div className="print-kpi-sub">{salesReport.earlyBirdTicketsSold} Early Bird tickets</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Daily Sales Breakdown Table */}
          <div className="print-section">
            <div className="print-section-heading">2. Daily Ticket Sales & Net Revenue Breakdown</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '10%' }}>Active Events</th>
                  <th className="num" style={{ width: '10%' }}>Tickets Sold</th>
                  <th className="num" style={{ width: '10%' }}>Early Bird</th>
                  <th className="num" style={{ width: '14%' }}>Gross Sales (LKR)</th>
                  <th className="num" style={{ width: '11%' }}>Discounts (LKR)</th>
                  <th className="num" style={{ width: '11%' }}>Refunds (LKR)</th>
                  <th className="num" style={{ width: '14%' }}>Net Revenue (LKR)</th>
                  <th className="num" style={{ width: '5%' }}>Orders</th>
                </tr>
              </thead>
              <tbody>
                {salesReport.dailySales.length > 0 ? (
                  salesReport.dailySales.map((d: DailySalesSummary) => (
                    <React.Fragment key={d.date}>
                      <tr>
                        <td><strong>{d.formattedDate || d.date}</strong></td>
                        <td>{d.activeEventsCount} Event{d.activeEventsCount !== 1 ? 's' : ''}</td>
                        <td className="num"><strong>{d.totalTicketsSold}</strong></td>
                        <td className="num">{d.earlyBirdTicketsSold || 0}</td>
                        <td className="num">{formatCurrency(d.grossRevenue, 'LKR')}</td>
                        <td className="num">{d.totalDiscounts > 0 ? `-${formatCurrency(d.totalDiscounts, 'LKR')}` : '0.00'}</td>
                        <td className="num" style={{ color: d.totalRefunds > 0 ? '#dc2626' : 'inherit' }}>
                          {d.totalRefunds > 0 ? `-${formatCurrency(d.totalRefunds, 'LKR')}` : '0.00'}
                        </td>
                        <td className="num"><strong>{formatCurrency(d.totalRevenue, 'LKR')}</strong></td>
                        <td className="num">{d.bookingCount}</td>
                      </tr>
                      {/* Sub-breakdown for events on this date */}
                      {d.eventBreakdowns && d.eventBreakdowns.length > 0 && d.eventBreakdowns.map((ev) => (
                        <tr key={ev.eventId} className="sub-breakdown-row">
                          <td colSpan={2}>
                            ↳ <em>{ev.eventTitle}</em> {isAdmin ? `(${ev.organizerName})` : ''}
                          </td>
                          <td className="num">{ev.ticketsSold}</td>
                          <td className="num">{ev.earlyBirdTicketsSold || 0}</td>
                          <td className="num">{formatCurrency(ev.grossRevenue, 'LKR')}</td>
                          <td className="num">{ev.discounts > 0 ? `-${formatCurrency(ev.discounts, 'LKR')}` : '0.00'}</td>
                          <td className="num">{ev.refunds > 0 ? `-${formatCurrency(ev.refunds, 'LKR')}` : '0.00'}</td>
                          <td className="num"><strong>{formatCurrency(ev.revenue, 'LKR')}</strong></td>
                          <td className="num">{ev.bookingCount}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '15px' }}>No sales records found for this period.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={2}>TOTAL PERIOD SUMMARY</td>
                  <td className="num">{salesReport.totalTicketsSold}</td>
                  <td className="num">{salesReport.earlyBirdTicketsSold}</td>
                  <td className="num">{formatCurrency(salesReport.grossRevenue, 'LKR')}</td>
                  <td className="num">{salesReport.totalDiscounts > 0 ? `-${formatCurrency(salesReport.totalDiscounts, 'LKR')}` : '0.00'}</td>
                  <td className="num" style={{ color: salesReport.totalRefunds > 0 ? '#dc2626' : 'inherit' }}>
                    {salesReport.totalRefunds > 0 ? `-${formatCurrency(salesReport.totalRefunds, 'LKR')}` : '0.00'}
                  </td>
                  <td className="num">{formatCurrency(salesReport.totalRevenue, 'LKR')}</td>
                  <td className="num">{salesReport.totalBookingsCount}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 3: Event Portfolio Performance Summary */}
          {salesReport.eventSummaries && salesReport.eventSummaries.length > 0 && (
            <div className="print-section">
              <div className="print-section-heading">3. Event Portfolio Performance Overview</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Event Title</th>
                    {isAdmin && <th style={{ width: '15%' }}>Organizer</th>}
                    <th style={{ width: '12%' }}>Category</th>
                    <th className="num" style={{ width: '10%' }}>Tickets Sold</th>
                    <th className="num" style={{ width: '10%' }}>Early Bird</th>
                    <th className="num" style={{ width: '14%' }}>Gross Sales (LKR)</th>
                    <th className="num" style={{ width: '14%' }}>Net Revenue (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReport.eventSummaries.map((ev: EventSalesSummary) => (
                    <tr key={ev.eventId}>
                      <td><strong>{ev.eventTitle}</strong></td>
                      {isAdmin && <td>{ev.organizerName}</td>}
                      <td>{ev.categoryName}</td>
                      <td className="num"><strong>{ev.totalTicketsSold}</strong></td>
                      <td className="num">{ev.earlyBirdTicketsSold || 0}</td>
                      <td className="num">{formatCurrency(ev.grossRevenue, 'LKR')}</td>
                      <td className="num"><strong>{formatCurrency(ev.totalRevenue, 'LKR')}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 4: Sign-off & Audit Block */}
          <div className="print-signoff">
            <div className="signoff-box">
              <div className="signoff-line"></div>
              <div className="signoff-title">Prepared By (Finance / Operations)</div>
              <div style={{ fontSize: '7.5pt', color: '#64748b' }}>Date & Signature</div>
            </div>
            <div className="signoff-box">
              <div className="signoff-line"></div>
              <div className="signoff-title">Authorized Approval (Management)</div>
              <div style={{ fontSize: '7.5pt', color: '#64748b' }}>Date & Signature</div>
            </div>
          </div>

          {/* Footer */}
          <div className="print-footer">
            <div>Confidential • Ticketer Enterprise Ticketing System</div>
            <div>Official Report • Valid for Financial Auditing & Reconciliation</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE SCREEN DASHBOARD VIEW (VISIBLE ON SCREEN, HIDDEN IN PRINT) */}
      {/* ========================================================================= */}
      <Box className="screen-only-dashboard" p={{ xs: 2, md: 3 }}>
        {/* Screen Header Banner */}
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(0,0,0,0.06)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: isAdmin ? '#1976d2' : '#ed6c02', width: 56, height: 56 }}>
                <ReportIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#1976d2' }}>
                  Event Analytics & Reports Hub
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {isAdmin
                    ? 'Real-time sales by date, daily ticket volume, Early Bird performance, promo codes, and detailed event reports.'
                    : 'Track daily ticket sales and revenue earned across all your events, Early Bird quotas, and customer bookings.'}
                </Typography>
              </Box>
            </Box>

            {activeTab === 0 && salesReport && (
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ExcelIcon />}
                  onClick={() => exportSalesByDateToExcel(salesReport)}
                >
                  Export Excel
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CsvIcon />}
                  onClick={() => exportSalesByDateToCSV(salesReport)}
                >
                  Export CSV
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PdfIcon />}
                  onClick={() => printSalesByDatePDF(salesReport)}
                  sx={{ fontWeight: 600, bgcolor: '#1976d2' }}
                >
                  Print Official PDF
                </Button>
                <IconButton onClick={() => loadSalesByDate(preset, selectedEventId)} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Tab Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
            <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
              <Tab
                icon={<DateRangeIcon />}
                iconPosition="start"
                label="Sales by Date Analytics"
                sx={{ fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}
              />
              <Tab
                icon={<EventIcon />}
                iconPosition="start"
                label={`Event Reports Directory (${events.length})`}
                sx={{ fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}
              />
            </Tabs>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* TAB 0: Sales by Date */}
        {activeTab === 0 && (
          <Box>
            {/* Controls / Filter Panel */}
            <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
              <Grid container spacing={2} alignItems="center">
                {/* Presets Button Group */}
                <Grid item xs={12} lg={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                    DATE FILTER PRESETS
                  </Typography>
                  <ButtonGroup size="small" variant="outlined" sx={{ flexWrap: 'wrap' }}>
                    <Button
                      variant={preset === 'today' ? 'contained' : 'outlined'}
                      onClick={() => handlePresetChange('today')}
                      startIcon={<TodayIcon />}
                    >
                      Today
                    </Button>
                    <Button
                      variant={preset === 'yesterday' ? 'contained' : 'outlined'}
                      onClick={() => handlePresetChange('yesterday')}
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant={preset === 'last7' ? 'contained' : 'outlined'}
                      onClick={() => handlePresetChange('last7')}
                    >
                      Last 7 Days
                    </Button>
                    <Button
                      variant={preset === 'last30' ? 'contained' : 'outlined'}
                      onClick={() => handlePresetChange('last30')}
                    >
                      Last 30 Days
                    </Button>
                    <Button
                      variant={preset === 'thisMonth' ? 'contained' : 'outlined'}
                      onClick={() => handlePresetChange('thisMonth')}
                    >
                      This Month
                    </Button>
                    <Button
                      variant={preset === 'all' ? 'contained' : 'outlined'}
                      onClick={() => handlePresetChange('all')}
                    >
                      All Time
                    </Button>
                  </ButtonGroup>
                </Grid>

                {/* Event Selector Filter */}
                <Grid item xs={12} sm={6} lg={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                    FILTER BY EVENT
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={selectedEventId}
                      onChange={(e) => handleEventFilterChange(e.target.value)}
                    >
                      <MenuItem value="ALL">All Events (Portfolio View)</MenuItem>
                      {events.map((evt) => (
                        <MenuItem key={evt.eventId} value={evt.eventId}>
                          {evt.title} ({evt.organizerName})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Custom Date Pickers */}
                <Grid item xs={12} sm={6} lg={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                    CUSTOM DATE RANGE
                  </Typography>
                  <Box display="flex" gap={1} alignItems="center">
                    <TextField
                      type="date"
                      size="small"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      sx={{ width: '50%' }}
                    />
                    <TextField
                      type="date"
                      size="small"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      sx={{ width: '50%' }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleCustomDateSubmit}
                      disabled={!customStartDate || !customEndDate}
                      sx={{ minWidth: '40px', px: 1.5 }}
                    >
                      Go
                    </Button>
                  </Box>
                </Grid>
              </Grid>

              {salesReport && (
                <Box display="flex" alignItems="center" gap={1.5} mt={2} pt={1.5} sx={{ borderTop: '1px dashed #e2e8f0' }}>
                  <Chip
                    label={`Active Scope: ${salesReport.dateRangeLabel}`}
                    color="primary"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  {selectedEventId !== 'ALL' && (
                    <Chip
                      label={`Filtered Event: ${events.find(e => e.eventId === selectedEventId)?.title || 'Single Event'}`}
                      color="secondary"
                      size="small"
                      onDelete={() => handleEventFilterChange('ALL')}
                    />
                  )}
                </Box>
              )}
            </Paper>

            {salesLoading ? (
              <Box display="flex" justifyContent="center" py={6}>
                <CircularProgress size={50} />
              </Box>
            ) : salesReport ? (
              <>
                {/* Executive Summary KPI Cards */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {/* KPI 1: Net Revenue */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box sx={{ bgcolor: '#4CAF50', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                            <MoneyIcon sx={{ color: '#fff', fontSize: 28 }} />
                          </Box>
                          <Chip label={salesReport.dateRangeLabel} size="small" variant="outlined" />
                        </Box>
                        <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                          {formatCurrency(salesReport.totalRevenue, 'LKR')}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, mb: 1 }}>
                          Net Revenue Earned
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Gross Sales</Typography>
                          <Typography variant="caption" fontWeight={600}>{formatCurrency(salesReport.grossRevenue, 'LKR')}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Refunds Paid</Typography>
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#ef4444' }}>-{formatCurrency(salesReport.totalRefunds, 'LKR')}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* KPI 2: Total Tickets Sold & Early Bird */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box sx={{ bgcolor: '#2196F3', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                            <TicketIcon sx={{ color: '#fff', fontSize: 28 }} />
                          </Box>
                          <Chip icon={<ScheduleIcon />} label={`${salesReport.earlyBirdTicketsSold} Early Bird`} size="small" color="warning" />
                        </Box>
                        <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                          {salesReport.totalTicketsSold}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, mb: 1 }}>
                          Total Tickets Sold
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Standard Tickets</Typography>
                          <Typography variant="caption" fontWeight={600}>{salesReport.totalTicketsSold - salesReport.earlyBirdTicketsSold}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Early Bird Savings</Typography>
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#f59e0b' }}>{formatCurrency(salesReport.totalEarlyBirdSavings, 'LKR')}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* KPI 3: Discounts & Promo Codes */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box sx={{ bgcolor: '#ec4899', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                            <PromoIcon sx={{ color: '#fff', fontSize: 28 }} />
                          </Box>
                          <Chip label={`${salesReport.promoBookingsCount} Promo Orders`} size="small" color="secondary" />
                        </Box>
                        <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                          {formatCurrency(salesReport.totalDiscounts, 'LKR')}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, mb: 1 }}>
                          Total Customer Discounts
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Promo Code Savings</Typography>
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#ec4899' }}>{formatCurrency(salesReport.totalPromoDiscounts, 'LKR')}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Deal Savings</Typography>
                          <Typography variant="caption" fontWeight={600}>{formatCurrency(salesReport.totalDiscounts - salesReport.totalPromoDiscounts, 'LKR')}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* KPI 4: Orders & Active Events */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box sx={{ bgcolor: '#9C27B0', borderRadius: '16px', p: 1.5, display: 'flex', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                            <TrendingIcon sx={{ color: '#fff', fontSize: 28 }} />
                          </Box>
                          <Chip label={`${salesReport.activeEventsCount} Active Events`} size="small" color="primary" />
                        </Box>
                        <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                          {salesReport.totalBookingsCount}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5, mb: 1 }}>
                          Total Customer Bookings
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Avg. Order Value</Typography>
                          <Typography variant="caption" fontWeight={600}>
                            {salesReport.totalBookingsCount > 0
                              ? formatCurrency(salesReport.grossRevenue / salesReport.totalBookingsCount, 'LKR')
                              : '0.00'}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Avg. Tickets / Order</Typography>
                          <Typography variant="caption" fontWeight={600}>
                            {salesReport.totalBookingsCount > 0
                              ? (salesReport.totalTicketsSold / salesReport.totalBookingsCount).toFixed(1)
                              : '0'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Visual Charts */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {/* Daily Revenue & Volume Chart */}
                  <Grid item xs={12} md={eventShareData && eventShareData.labels.length > 1 ? 8 : 12}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
                          <BarChartIcon color="primary" /> Daily Ticket Sales & Revenue Trajectory
                        </Typography>
                        <Chip label={salesReport.dateRangeLabel} size="small" color="primary" variant="outlined" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Day-by-day progression of net revenue (LKR) and ticket sales volume (Standard vs Early Bird).
                      </Typography>
                      <Box height={300}>
                        {chronologicalDailySales.length > 0 ? (
                          <Line data={dailyTrendData as any} options={dailyTrendOptions as any} />
                        ) : (
                          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                            <Typography color="text.secondary">No sales recorded in this period.</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Event Share Doughnut */}
                  {eventShareData && eventShareData.labels.length > 1 && (
                    <Grid item xs={12} md={4}>
                      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6" fontWeight={700}>
                            Event Revenue Share
                          </Typography>
                          <Chip label="Top Events" size="small" color="secondary" variant="outlined" />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Share of revenue generated per event in this timeframe.
                        </Typography>
                        <Box height={280} display="flex" justifyContent="center">
                          <Doughnut data={eventShareData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </Box>
                      </Paper>
                    </Grid>
                  )}
                </Grid>

                {/* Day-by-Day Table with Per-Event Breakdown */}
                <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
                        <DateRangeIcon color="primary" /> Daily Ticket Sales & Revenue Breakdown ({salesReport.dailySales.length} Days)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click the expand arrow on any date to inspect the <strong>per-event breakdown on that day</strong>.
                      </Typography>
                    </Box>
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ width: '40px' }} />
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Active Events</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Early Bird Sold</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Sales (LKR)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Discounts (LKR)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Refunds (LKR)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Net Revenue (LKR)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Orders</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {salesReport.dailySales.length > 0 ? (
                          salesReport.dailySales.map((d: DailySalesSummary) => {
                            const isExpanded = expandedDate === d.date;
                            return (
                              <React.Fragment key={d.date}>
                                <TableRow
                                  hover
                                  sx={{
                                    bgcolor: isExpanded ? 'rgba(25, 118, 210, 0.04)' : 'inherit',
                                    '& > *': { borderBottom: isExpanded ? 'unset' : undefined }
                                  }}
                                >
                                  <TableCell>
                                    <IconButton size="small" onClick={() => toggleDateExpand(d.date)}>
                                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700, color: '#1976d2' }}>
                                    {d.formattedDate || d.date}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip label={`${d.activeEventsCount} Events`} size="small" variant="outlined" />
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>
                                    {d.totalTicketsSold}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: '#ff9800', fontWeight: 600 }}>
                                    {d.earlyBirdTicketsSold || 0}
                                  </TableCell>
                                  <TableCell align="right">{formatCurrency(d.grossRevenue, 'LKR')}</TableCell>
                                  <TableCell align="right" sx={{ color: '#f59e0b' }}>
                                    {d.totalDiscounts > 0 ? `-${formatCurrency(d.totalDiscounts, 'LKR')}` : '0.00'}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: '#ef4444' }}>
                                    {d.totalRefunds > 0 ? `-${formatCurrency(d.totalRefunds, 'LKR')}` : '0.00'}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                    {formatCurrency(d.totalRevenue, 'LKR')}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                                    {d.bookingCount}
                                  </TableCell>
                                </TableRow>

                                {/* Nested Per-Event Breakdown Row on that day */}
                                <TableRow>
                                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                      <Box sx={{ margin: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <EventIcon fontSize="small" color="primary" /> Event Breakdown on {d.formattedDate || d.date}
                                        </Typography>
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow sx={{ bgcolor: '#ffffff' }}>
                                              <TableCell sx={{ fontWeight: 700 }}>Event Title</TableCell>
                                              {isAdmin && <TableCell sx={{ fontWeight: 700 }}>Organizer</TableCell>}
                                              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 700 }}>Early Bird</TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Sales (LKR)</TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 700 }}>Discounts (LKR)</TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 700 }}>Net Revenue (LKR)</TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 700 }}>Orders</TableCell>
                                              <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {d.eventBreakdowns && d.eventBreakdowns.length > 0 ? (
                                              d.eventBreakdowns.map((ev) => (
                                                <TableRow key={ev.eventId} hover sx={{ bgcolor: '#ffffff' }}>
                                                  <TableCell sx={{ fontWeight: 600 }}>{ev.eventTitle}</TableCell>
                                                  {isAdmin && <TableCell>{ev.organizerName}</TableCell>}
                                                  <TableCell><Chip label={ev.categoryName} size="small" variant="outlined" /></TableCell>
                                                  <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>{ev.ticketsSold}</TableCell>
                                                  <TableCell align="right" sx={{ color: '#ff9800', fontWeight: 600 }}>{ev.earlyBirdTicketsSold || 0}</TableCell>
                                                  <TableCell align="right">{formatCurrency(ev.grossRevenue, 'LKR')}</TableCell>
                                                  <TableCell align="right" sx={{ color: '#f59e0b' }}>
                                                    {ev.discounts > 0 ? `-${formatCurrency(ev.discounts, 'LKR')}` : '0.00'}
                                                  </TableCell>
                                                  <TableCell align="right" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                                    {formatCurrency(ev.revenue, 'LKR')}
                                                  </TableCell>
                                                  <TableCell align="right">{ev.bookingCount}</TableCell>
                                                  <TableCell align="center">
                                                    <Button
                                                      size="small"
                                                      variant="text"
                                                      onClick={() => navigate(isAdmin ? `/admin/reports/event/${ev.eventId}` : `/organizer/reports/event/${ev.eventId}`)}
                                                      sx={{ textTransform: 'none' }}
                                                    >
                                                      View Report
                                                    </Button>
                                                  </TableCell>
                                                </TableRow>
                                              ))
                                            ) : (
                                              <TableRow>
                                                <TableCell colSpan={isAdmin ? 10 : 9} align="center">No event breakdowns available.</TableCell>
                                              </TableRow>
                                            )}
                                          </TableBody>
                                        </Table>
                                      </Box>
                                    </Collapse>
                                  </TableCell>
                                </TableRow>
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                              No sales records found for the selected period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* Event Performance Summary Table */}
                <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Event Performance Summary (Across Selected Date Range)
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Event Title</TableCell>
                          {isAdmin && <TableCell sx={{ fontWeight: 700 }}>Organizer</TableCell>}
                          <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Early Bird Sold</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Promo Codes</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Sales (LKR)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Net Revenue (LKR)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {salesReport.eventSummaries.length > 0 ? (
                          salesReport.eventSummaries.map((ev: EventSalesSummary) => (
                            <TableRow key={ev.eventId} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{ev.eventTitle}</TableCell>
                              {isAdmin && <TableCell>{ev.organizerName}</TableCell>}
                              <TableCell><Chip label={ev.categoryName} size="small" variant="outlined" /></TableCell>
                              <TableCell>
                                <Chip label={ev.status} size="small" color={ev.status === 'PUBLISHED' ? 'success' : 'default'} />
                              </TableCell>
                              <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 700 }}>{ev.totalTicketsSold}</TableCell>
                              <TableCell align="right" sx={{ color: '#ff9800', fontWeight: 600 }}>
                                {ev.earlyBirdTicketsSold || 0}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  icon={<PromoIcon />}
                                  label={`${ev.configuredPromoCodesCount} Active`}
                                  size="small"
                                  color={ev.configuredPromoCodesCount > 0 ? 'secondary' : 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">{formatCurrency(ev.grossRevenue, 'LKR')}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                {formatCurrency(ev.totalRevenue, 'LKR')}
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => navigate(isAdmin ? `/admin/reports/event/${ev.eventId}` : `/organizer/reports/event/${ev.eventId}`)}
                                  sx={{ textTransform: 'none', borderRadius: 2 }}
                                >
                                  View Report
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={isAdmin ? 10 : 9} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                              No events found matching search criteria.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* Customer Bookings Drilldown List */}
                <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                    <Typography variant="h6" fontWeight={700}>
                      Customer Bookings in this Period ({filteredBookings.length} bookings)
                    </Typography>
                    <TextField
                      size="small"
                      placeholder="Search by customer, email, ref, promo..."
                      value={bookingsSearchTerm}
                      onChange={(e) => setBookingsSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 280 }}
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
                          <TableCell sx={{ fontWeight: 700 }}>Seats / Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Early Bird</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Paid (LKR)</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredBookings.length > 0 ? (
                          filteredBookings.map((bk: CustomerBookingRow) => (
                            <TableRow key={bk.bookingId} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1976d2' }}>
                                {bk.bookingReference}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{bk.customerName}</TableCell>
                              <TableCell>{bk.customerEmail}</TableCell>
                              <TableCell>{bk.showTimeLabel}</TableCell>
                              <TableCell>
                                <Typography variant="body2">{bk.ticketCategory}</Typography>
                                <Typography variant="caption" color="text.secondary">{bk.seatNumbers}</Typography>
                              </TableCell>
                              <TableCell>
                                {bk.isEarlyBird ? (
                                  <Chip label="Early Bird" size="small" color="warning" />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">Standard</Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>
                                {formatCurrency(bk.totalAmount, 'LKR')}
                              </TableCell>
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
                              No customer bookings found in this period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </>
            ) : null}
          </Box>
        )}

        {/* TAB 1: Event Reports Directory */}
        {activeTab === 1 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
              <Typography variant="h6" fontWeight={700}>
                Select Event for Full Report & Seat Map ({filteredEvents.length} Events)
              </Typography>
              <TextField
                size="small"
                placeholder="Search by event title, venue, or organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 320 }}
              />
            </Box>

            {loading ? (
              <Box display="flex" justifyContent="center" py={5}>
                <CircularProgress size={50} />
              </Box>
            ) : filteredEvents.length === 0 ? (
              <Alert severity="info">No events found matching search criteria.</Alert>
            ) : (
              <Grid container spacing={3}>
                {filteredEvents.map((evt) => (
                  <Grid item xs={12} sm={6} md={4} key={evt.eventId}>
                    <Card
                      elevation={3}
                      sx={{
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Chip label={evt.status} size="small" color={evt.status === 'PUBLISHED' ? 'success' : 'default'} />
                          <Chip icon={<EventIcon />} label={`${evt.totalSchedules} Show Times`} size="small" variant="outlined" />
                        </Box>

                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
                          {evt.title}
                        </Typography>

                        <Box display="flex" flexDirection="column" gap={1} mt={2}>
                          <Typography variant="body2" color="textSecondary" display="flex" alignItems="center" gap={1}>
                            <LocationIcon fontSize="small" color="action" />
                            {evt.venueName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" display="flex" alignItems="center" gap={1}>
                            <PeopleIcon fontSize="small" color="action" />
                            Organizer: {evt.organizerName}
                          </Typography>
                        </Box>
                      </CardContent>

                      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color={isAdmin ? 'primary' : 'warning'}
                          endIcon={<ArrowIcon />}
                          onClick={() => navigate(isAdmin ? `/admin/reports/event/${evt.eventId}` : `/organizer/reports/event/${evt.eventId}`)}
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        >
                          View & Export Report
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ReportsIndex;
