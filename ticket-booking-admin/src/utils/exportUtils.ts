import * as XLSX from 'xlsx';
import { EventReportData } from '../services/report.service';

/**
 * Export data to Excel (.xlsx)
 * @param data Array of objects to export
 * @param fileName Desired file name (without extension)
 * @param sheetName Name of the sheet in the excel file
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export data to CSV (.csv)
 * @param data Array of objects to export
 * @param fileName Desired file name (without extension)
 */
export const exportToCSV = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Build a filesystem-safe filename stem that includes WHICH show time the report/export is
 * scoped to, so exporting the same event for different show times never produces identical
 * filenames (and never silently overwrites a previous export for a different show time).
 */
const buildReportFileNameStem = (report: EventReportData): string => {
  const safeEventName = report.eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const scopeLabel = report.selectedScheduleId
    ? report.selectedScheduleLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    : 'all_showtimes';
  return `${safeEventName}_${scopeLabel}`;
};

/**
 * Export Event Report to multi-sheet Excel (.xlsx)
 */
export const exportEventReportToExcel = (report: EventReportData) => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Executive Overview & Show Times
  const overviewData = [
    { Property: 'Event Title', Value: report.eventTitle },
    { Property: 'Category', Value: report.categoryName },
    { Property: 'Status', Value: report.eventStatus },
    { Property: 'Organizer', Value: report.organizerName },
    { Property: 'Venue', Value: report.venueName },
    { Property: 'Address', Value: `${report.venueAddress}, ${report.venueCity}` },
    { Property: 'Report Scope', Value: report.selectedScheduleId ? `Single Show Time: ${report.selectedScheduleLabel}` : 'All Show Times (Aggregated)' },
    { Property: 'Total Capacity', Value: report.totalCapacity },
    { Property: 'Tickets Sold', Value: report.totalTicketsSold },
    { Property: 'Tickets Available', Value: report.totalTicketsAvailable },
    { Property: 'Tickets Held', Value: report.totalTicketsHeld },
    { Property: 'Tickets Locked', Value: report.totalTicketsLocked },
    { Property: 'Occupancy Rate (%)', Value: `${report.occupancyRate}%` },
    { Property: 'Gross Sales (LKR)', Value: report.grossRevenue },
    { Property: 'Refunds Paid (LKR)', Value: report.totalRefunds },
    { Property: 'Net Revenue (LKR)', Value: report.totalRevenue },
    { Property: 'Customer Savings via Deals (LKR)', Value: report.totalDiscounts },
  ];
  const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Event Overview');

  // Sheet 2: Show Times (Schedules) Breakdown
  if (report.schedules && report.schedules.length > 0) {
    const schedulesData = report.schedules.map(sch => ({
      'Start Time': new Date(sch.startTime).toLocaleString(),
      'End Time': new Date(sch.endTime).toLocaleString(),
      'Status': sch.status,
      'Total Capacity': sch.totalCapacity,
      'Tickets Sold': sch.ticketsSold,
      'Tickets Available': sch.ticketsAvailable,
      'Occupancy Rate (%)': `${sch.occupancyRate}%`,
      'Revenue (LKR)': sch.revenue,
    }));
    const schedulesSheet = XLSX.utils.json_to_sheet(schedulesData);
    XLSX.utils.book_append_sheet(workbook, schedulesSheet, 'Show Times');
  }

  // Sheet 3: Category Ticket Breakdown (Seated)
  if (report.categorySummaries && report.categorySummaries.length > 0) {
    const categoryData = report.categorySummaries.map(cat => ({
      'Category Name': cat.categoryName,
      'Unit Price (LKR)': cat.unitPrice,
      'Total Seats': cat.totalSeats,
      'Tickets Sold': cat.ticketsSold,
      'Tickets Available': cat.ticketsAvailable,
      'Tickets Held': cat.ticketsHeld,
      'Occupancy Rate (%)': `${cat.occupancyRate}%`,
      'Category Revenue (LKR)': cat.categoryRevenue,
    }));
    const categorySheet = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Seated Ticket Sales');
  }

  // Sheet 4: Shared Standing Areas Breakdown
  if (report.sharedAreaSummaries && report.sharedAreaSummaries.length > 0) {
    const sharedAreaData = report.sharedAreaSummaries.map(sa => ({
      'Shared Area Name': sa.categoryName,
      'Area Number': sa.sharedAreaNumber,
      'Unit Price (LKR)': sa.unitPrice,
      'Total Capacity': sa.totalCapacity,
      'Tickets Sold': sa.ticketsSold,
      'Tickets Available': sa.ticketsAvailable,
      'Occupancy Rate (%)': `${sa.occupancyRate}%`,
      'Total Revenue (LKR)': sa.totalRevenue,
    }));
    const sharedAreaSheet = XLSX.utils.json_to_sheet(sharedAreaData);
    XLSX.utils.book_append_sheet(workbook, sharedAreaSheet, 'Shared Areas');
  }

  // Sheet 5: Deals configured for this event
  if (report.configuredDeals && report.configuredDeals.length > 0) {
    const dealsData = report.configuredDeals.map(deal => ({
      'Category': deal.categoryName,
      'Deal': deal.dealLabel || (deal.dealType === 'BUY_X_GET_Y_FREE'
        ? `Buy ${deal.dealBuyQuantity} Get ${deal.dealFreeQuantity} Free`
        : `${deal.dealDiscountPercentage ?? 0}% Off`),
      'Type': deal.dealType === 'BUY_X_GET_Y_FREE' ? 'Buy X Get Y Free' : 'Percentage Discount',
      'Status': deal.dealActive ? 'Active' : 'Inactive',
    }));
    const dealsSheet = XLSX.utils.json_to_sheet(dealsData);
    XLSX.utils.book_append_sheet(workbook, dealsSheet, 'Deals Configured');
  }

  // Sheet 6: Deal usage (approximate, grouped by discount label - see report UI for the caveat)
  if (report.dealUsageSummaries && report.dealUsageSummaries.length > 0) {
    const dealUsageData = report.dealUsageSummaries.map(usage => ({
      'Deal / Discount Label': usage.label,
      'Times Used': usage.timesUsed,
      'Total Savings Given (LKR)': usage.totalDiscountGiven,
    }));
    const dealUsageSheet = XLSX.utils.json_to_sheet(dealUsageData);
    XLSX.utils.book_append_sheet(workbook, dealUsageSheet, 'Deal Usage');
  }

  // Sheet 7: Customer Bookings List
  if (report.bookingDetails && report.bookingDetails.length > 0) {
    const bookingData = report.bookingDetails.map(bk => ({
      'Booking Reference': bk.bookingReference,
      'Customer Name': bk.customerName,
      'Customer Email': bk.customerEmail,
      'Show Time': bk.showTimeLabel,
      'Ticket Category': bk.ticketCategory,
      'Seat Numbers': bk.seatNumbers,
      'Ticket Count': bk.ticketCount,
      'Total Paid (LKR)': bk.totalAmount,
      'Booking Date': new Date(bk.bookingDate).toLocaleString(),
      'Status': bk.status,
      'Payment Status': bk.paymentMethod,
    }));
    const bookingSheet = XLSX.utils.json_to_sheet(bookingData);
    XLSX.utils.book_append_sheet(workbook, bookingSheet, 'Customer Bookings');
  }

  XLSX.writeFile(workbook, `Event_Report_${buildReportFileNameStem(report)}.xlsx`);
};

/**
 * Export Customer Bookings List to CSV
 */
export const exportEventReportToCSV = (report: EventReportData) => {
  if (!report.bookingDetails || report.bookingDetails.length === 0) {
    alert('No booking details available to export.');
    return;
  }

  const bookingData = report.bookingDetails.map(bk => ({
    'Booking Reference': bk.bookingReference,
    'Customer Name': bk.customerName,
    'Customer Email': bk.customerEmail,
    'Show Time': bk.showTimeLabel,
    'Ticket Category': bk.ticketCategory,
    'Seat Numbers': bk.seatNumbers,
    'Ticket Count': bk.ticketCount,
    'Total Amount (LKR)': bk.totalAmount,
    'Booking Date': new Date(bk.bookingDate).toLocaleString(),
    'Status': bk.status,
    'Payment Status': bk.paymentMethod,
  }));

  exportToCSV(bookingData, `Event_Bookings_${buildReportFileNameStem(report)}`);
};

/**
 * Trigger print dialog for formatted PDF Report export.
 * Browsers default the "Save as PDF" filename to document.title, so we temporarily set it to
 * something that identifies the event AND the specific show time being reported on - otherwise
 * every export for every show time suggests the same generic filename and is easy to mix up.
 */
export const printPDFReport = (report: EventReportData) => {
  const previousTitle = document.title;
  const scopeLabel = report.selectedScheduleId ? report.selectedScheduleLabel : 'All Show Times';
  document.title = `${report.eventTitle} - ${scopeLabel} - Event Report`;

  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);

  window.print();
};
