import * as XLSX from 'xlsx';
import { EventReportData, SalesByDateReportData } from '../services/report.service';

/**
 * Auto-calculate column widths for XLSX worksheet to prevent ### or truncated text
 */
const autoFitColumns = (worksheet: XLSX.WorkSheet, data: any[]) => {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0] || {});
  const colWidths = keys.map((key) => {
    let maxLen = key.toString().length;
    data.forEach((row) => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const len = val.toString().length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(60, Math.max(12, maxLen + 3)) };
  });
  worksheet['!cols'] = colWidths;
};

/**
 * Export data to Excel (.xlsx) with professional formatting and column autofitting
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  autoFitColumns(worksheet, data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export data to CSV (.csv) with UTF-8 BOM and metadata header for perfect Excel compatibility
 */
export const exportToCSV = (data: any[], fileName: string, reportTitle?: string) => {
  const rawCsv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(data));
  const headerBlock = [
    `# ==============================================================================`,
    `# TICKETER ENTERPRISE MANAGEMENT SYSTEM - OFFICIAL REPORT EXPORT`,
    reportTitle ? `# Report: ${reportTitle}` : `# Export File: ${fileName}`,
    `# Generated On: ${new Date().toLocaleString()} (UTC)`,
    `# Currency: Sri Lankan Rupee (LKR)`,
    `# ==============================================================================`,
    '',
  ].join('\r\n');

  const fullContent = headerBlock + rawCsv;
  // Prepend UTF-8 BOM (\uFEFF) so Excel opens CSVs without character encoding issues
  const blob = new Blob(['\uFEFF' + fullContent], { type: 'text/csv;charset=utf-8;' });
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
 * Build a filesystem-safe filename stem that includes WHICH show time the report/export is scoped to.
 */
const buildReportFileNameStem = (report: EventReportData): string => {
  const safeEventName = report.eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const scopeLabel = report.selectedScheduleId
    ? report.selectedScheduleLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    : 'all_showtimes';
  return `${safeEventName}_${scopeLabel}`;
};

/**
 * Export Event Report to multi-sheet Excel (.xlsx) with auto-fitted columns and audit summaries
 */
export const exportEventReportToExcel = (report: EventReportData) => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Executive Overview & Show Times
  const overviewData = [
    { 'Report Metric': 'Company / Organization', 'Value': 'TICKETER ENTERPRISE' },
    { 'Report Metric': 'Event Title', 'Value': report.eventTitle },
    { 'Report Metric': 'Category', 'Value': report.categoryName },
    { 'Report Metric': 'Status', 'Value': report.eventStatus },
    { 'Report Metric': 'Organizer', 'Value': report.organizerName },
    { 'Report Metric': 'Organizer Email', 'Value': report.organizerEmail || 'N/A' },
    { 'Report Metric': 'Venue', 'Value': report.venueName },
    { 'Report Metric': 'Address', 'Value': `${report.venueAddress}, ${report.venueCity}` },
    { 'Report Metric': 'Report Scope', 'Value': report.selectedScheduleId ? `Single Show Time: ${report.selectedScheduleLabel}` : 'All Show Times (Aggregated)' },
    { 'Report Metric': 'Generated On', 'Value': new Date().toLocaleString() },
    { 'Report Metric': '-----------------------------', 'Value': '-----------------------------' },
    { 'Report Metric': 'Total Venue Capacity', 'Value': report.totalVenueCapacity },
    { 'Report Metric': 'Total Scheduled Capacity', 'Value': report.totalCapacity },
    { 'Report Metric': 'Total Tickets Sold', 'Value': report.totalTicketsSold },
    { 'Report Metric': 'Early Bird Tickets Sold', 'Value': report.earlyBirdTotalTicketsSold || 0 },
    { 'Report Metric': 'Early Bird Revenue (LKR)', 'Value': report.earlyBirdTotalRevenue || 0 },
    { 'Report Metric': 'Early Bird Savings Given (LKR)', 'Value': report.earlyBirdTotalSavings || 0 },
    { 'Report Metric': 'Tickets Available', 'Value': report.totalTicketsAvailable },
    { 'Report Metric': 'Tickets Held', 'Value': report.totalTicketsHeld },
    { 'Report Metric': 'Tickets Locked', 'Value': report.totalTicketsLocked },
    { 'Report Metric': 'Occupancy Rate (%)', 'Value': `${report.occupancyRate}%` },
    { 'Report Metric': '-----------------------------', 'Value': '-----------------------------' },
    { 'Report Metric': 'Gross Ticket Sales (LKR)', 'Value': report.grossRevenue },
    { 'Report Metric': 'Total Refunds Paid (LKR)', 'Value': report.totalRefunds },
    { 'Report Metric': 'Net Revenue Earned (LKR)', 'Value': report.totalRevenue },
    { 'Report Metric': 'Customer Savings via Deals (LKR)', 'Value': report.totalDiscounts },
    { 'Report Metric': 'Promo Code Discounts (LKR)', 'Value': report.totalPromoDiscounts || 0 },
  ];
  const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
  autoFitColumns(overviewSheet, overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Event Overview');

  // Sheet 2: Daily Sales Timeline Breakdown (if present)
  if (report.dailySales && report.dailySales.length > 0) {
    const dailyData = report.dailySales.map(d => ({
      'Date': d.formattedDate || d.date,
      'Tickets Sold': d.totalTicketsSold,
      'Early Bird Sold': d.earlyBirdTicketsSold || 0,
      'Gross Sales (LKR)': d.grossRevenue,
      'Discounts (LKR)': d.totalDiscounts,
      'Promo Discounts (LKR)': d.promoDiscounts || 0,
      'Refunds Paid (LKR)': d.totalRefunds,
      'Net Revenue (LKR)': d.totalRevenue,
      'Orders Count': d.bookingCount,
    }));
    const dailySheet = XLSX.utils.json_to_sheet(dailyData);
    autoFitColumns(dailySheet, dailyData);
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Sales Timeline');
  }

  // Sheet 3: Show Times (Schedules) Breakdown
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
    autoFitColumns(schedulesSheet, schedulesData);
    XLSX.utils.book_append_sheet(workbook, schedulesSheet, 'Show Times');
  }

  // Sheet 4: Category Ticket Breakdown (Seated)
  if (report.categorySummaries && report.categorySummaries.length > 0) {
    const categoryData = report.categorySummaries.map(cat => ({
      'Category Name': cat.categoryName,
      'Unit Price (LKR)': cat.unitPrice,
      'Early Bird Price (LKR)': cat.earlyBirdPrice || 'N/A',
      'Early Bird Capacity': cat.earlyBirdCapacity || 'N/A',
      'Early Bird Sold': cat.earlyBirdTicketsSold || 0,
      'Early Bird Active': cat.earlyBirdActive ? 'Yes' : 'No',
      'Total Seats': cat.totalSeats,
      'Tickets Sold': cat.ticketsSold,
      'Tickets Available': cat.ticketsAvailable,
      'Tickets Held': cat.ticketsHeld,
      'Occupancy Rate (%)': `${cat.occupancyRate}%`,
      'Category Revenue (LKR)': cat.categoryRevenue,
    }));
    const categorySheet = XLSX.utils.json_to_sheet(categoryData);
    autoFitColumns(categorySheet, categoryData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Seated Ticket Sales');
  }

  // Sheet 5: Shared Standing Areas Breakdown
  if (report.sharedAreaSummaries && report.sharedAreaSummaries.length > 0) {
    const sharedAreaData = report.sharedAreaSummaries.map(sa => ({
      'Shared Area Name': sa.categoryName,
      'Area Number': sa.sharedAreaNumber,
      'Unit Price (LKR)': sa.unitPrice,
      'Early Bird Price (LKR)': sa.earlyBirdPrice || 'N/A',
      'Early Bird Capacity': sa.earlyBirdCapacity || 'N/A',
      'Early Bird Sold': sa.earlyBirdTicketsSold || 0,
      'Total Capacity': sa.totalCapacity,
      'Tickets Sold': sa.ticketsSold,
      'Tickets Available': sa.ticketsAvailable,
      'Occupancy Rate (%)': `${sa.occupancyRate}%`,
      'Total Revenue (LKR)': sa.totalRevenue,
    }));
    const sharedAreaSheet = XLSX.utils.json_to_sheet(sharedAreaData);
    autoFitColumns(sharedAreaSheet, sharedAreaData);
    XLSX.utils.book_append_sheet(workbook, sharedAreaSheet, 'Shared Areas');
  }

  // Sheet 6: Deals configured for this event
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
    autoFitColumns(dealsSheet, dealsData);
    XLSX.utils.book_append_sheet(workbook, dealsSheet, 'Deals Configured');
  }

  // Sheet 7: Configured Promo Codes
  if (report.configuredPromoCodes && report.configuredPromoCodes.length > 0) {
    const promoData = report.configuredPromoCodes.map(promo => ({
      'Code': promo.code,
      'Description': promo.description || '',
      'Scope': promo.scope,
      'Discount %': `${promo.discountPercentage}%`,
      'Max Discount (LKR)': promo.maxDiscountAmount || 'No Cap',
      'Category Scope': promo.ticketCategoryName || 'All Categories',
      'Usage Count': promo.usageCount,
      'Usage Limit': promo.usageLimit || 'Unlimited',
      'Start Date': promo.startDate ? new Date(promo.startDate).toLocaleDateString() : 'Immediate',
      'End Date': promo.endDate ? new Date(promo.endDate).toLocaleDateString() : 'Never',
      'Status': promo.statusLabel,
    }));
    const promoSheet = XLSX.utils.json_to_sheet(promoData);
    autoFitColumns(promoSheet, promoData);
    XLSX.utils.book_append_sheet(workbook, promoSheet, 'Configured Promo Codes');
  }

  // Sheet 8: Promo Code Usage
  if (report.promoCodeUsageSummaries && report.promoCodeUsageSummaries.length > 0) {
    const promoUsageData = report.promoCodeUsageSummaries.map(usage => ({
      'Promo Code': usage.code,
      'Times Used': usage.timesUsed,
      'Total Savings Given (LKR)': usage.totalDiscountGiven,
    }));
    const promoUsageSheet = XLSX.utils.json_to_sheet(promoUsageData);
    autoFitColumns(promoUsageSheet, promoUsageData);
    XLSX.utils.book_append_sheet(workbook, promoUsageSheet, 'Promo Code Usage');
  }

  // Sheet 9: Customer Bookings List
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
      'Discount (LKR)': bk.discountAmount || 0,
      'Promo/Discount Info': bk.discountInfo || 'None',
      'Early Bird': bk.isEarlyBird ? 'Yes' : 'No',
      'Booking Date': new Date(bk.bookingDate).toLocaleString(),
      'Status': bk.status,
      'Payment Status': bk.paymentMethod,
    }));
    const bookingSheet = XLSX.utils.json_to_sheet(bookingData);
    autoFitColumns(bookingSheet, bookingData);
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
    'Discount Amount (LKR)': bk.discountAmount || 0,
    'Promo/Discount Info': bk.discountInfo || 'None',
    'Early Bird': bk.isEarlyBird ? 'Yes' : 'No',
    'Booking Date': new Date(bk.bookingDate).toLocaleString(),
    'Status': bk.status,
    'Payment Status': bk.paymentMethod,
  }));

  exportToCSV(bookingData, `Event_Bookings_${buildReportFileNameStem(report)}`, `Bookings List - ${report.eventTitle}`);
};

/**
 * Export Sales By Date Report to multi-sheet Excel (.xlsx) with auto-fitted columns and audit summaries
 */
export const exportSalesByDateToExcel = (report: SalesByDateReportData) => {
  const workbook = XLSX.utils.book_new();
  const safeDateLabel = (report.dateRangeLabel || 'sales_by_date').replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // Sheet 1: Sales By Date Executive Overview
  const overviewData = [
    { 'Report Metric': 'Company / Organization', 'Value': 'TICKETER ENTERPRISE' },
    { 'Report Metric': 'Report Title', 'Value': 'SALES BY DATE PERFORMANCE REPORT' },
    { 'Report Metric': 'Reporting Period', 'Value': report.dateRangeLabel },
    { 'Report Metric': 'Start Date', 'Value': report.startDate || 'All Time' },
    { 'Report Metric': 'End Date', 'Value': report.endDate || 'Present' },
    { 'Report Metric': 'Generated On', 'Value': new Date().toLocaleString() },
    { 'Report Metric': 'Currency', 'Value': 'Sri Lankan Rupee (LKR)' },
    { 'Report Metric': '-----------------------------', 'Value': '-----------------------------' },
    { 'Report Metric': 'Gross Ticket Sales (LKR)', 'Value': report.grossRevenue },
    { 'Report Metric': 'Total Refunds Paid (LKR)', 'Value': report.totalRefunds },
    { 'Report Metric': 'Net Revenue Earned (LKR)', 'Value': report.totalRevenue },
    { 'Report Metric': 'Total Discounts Given (LKR)', 'Value': report.totalDiscounts },
    { 'Report Metric': 'Promo Code Discounts (LKR)', 'Value': report.totalPromoDiscounts },
    { 'Report Metric': 'Early Bird Savings Given (LKR)', 'Value': report.totalEarlyBirdSavings },
    { 'Report Metric': '-----------------------------', 'Value': '-----------------------------' },
    { 'Report Metric': 'Total Tickets Sold', 'Value': report.totalTicketsSold },
    { 'Report Metric': 'Early Bird Tickets Sold', 'Value': report.earlyBirdTicketsSold },
    { 'Report Metric': 'Total Customer Orders', 'Value': report.totalBookingsCount },
    { 'Report Metric': 'Orders with Promo Codes', 'Value': report.promoBookingsCount },
    { 'Report Metric': 'Active Selling Events', 'Value': report.activeEventsCount },
    { 'Report Metric': 'Average Order Value (LKR)', 'Value': report.totalBookingsCount > 0 ? Number((report.grossRevenue / report.totalBookingsCount).toFixed(2)) : 0 },
  ];
  const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
  autoFitColumns(overviewSheet, overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Sales Overview');

  // Sheet 2: Daily Sales Timeline Summary
  if (report.dailySales && report.dailySales.length > 0) {
    const dailyData = report.dailySales.map(d => ({
      'Date': d.formattedDate || d.date,
      'Active Events': d.activeEventsCount,
      'Tickets Sold': d.totalTicketsSold,
      'Early Bird Tickets Sold': d.earlyBirdTicketsSold || 0,
      'Gross Sales (LKR)': d.grossRevenue,
      'Discounts (LKR)': d.totalDiscounts,
      'Promo Discounts (LKR)': d.promoDiscounts || 0,
      'Refunds Paid (LKR)': d.totalRefunds,
      'Net Revenue (LKR)': d.totalRevenue,
      'Orders Count': d.bookingCount,
    }));
    const dailySheet = XLSX.utils.json_to_sheet(dailyData);
    autoFitColumns(dailySheet, dailyData);
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Breakdown');
  }

  // Sheet 3: Per-Event Daily Sales Breakdown (Detailed event-by-event on each day)
  if (report.dailySales && report.dailySales.length > 0) {
    const perEventDailyRows: any[] = [];
    report.dailySales.forEach(d => {
      if (d.eventBreakdowns && d.eventBreakdowns.length > 0) {
        d.eventBreakdowns.forEach(ev => {
          perEventDailyRows.push({
            'Date': d.formattedDate || d.date,
            'Event Title': ev.eventTitle,
            'Organizer': ev.organizerName,
            'Category': ev.categoryName,
            'Venue': ev.venueName,
            'Tickets Sold': ev.ticketsSold,
            'Early Bird Sold': ev.earlyBirdTicketsSold || 0,
            'Gross Sales (LKR)': ev.grossRevenue,
            'Discounts (LKR)': ev.discounts,
            'Promo Discounts (LKR)': ev.promoDiscounts || 0,
            'Refunds (LKR)': ev.refunds,
            'Net Revenue (LKR)': ev.revenue,
            'Orders Count': ev.bookingCount,
          });
        });
      }
    });
    if (perEventDailyRows.length > 0) {
      const perEventDailySheet = XLSX.utils.json_to_sheet(perEventDailyRows);
      autoFitColumns(perEventDailySheet, perEventDailyRows);
      XLSX.utils.book_append_sheet(workbook, perEventDailySheet, 'Event Daily Sales');
    }
  }

  // Sheet 4: Event Performance Summaries
  if (report.eventSummaries && report.eventSummaries.length > 0) {
    const eventSummaryData = report.eventSummaries.map(ev => ({
      'Event Title': ev.eventTitle,
      'Organizer': ev.organizerName,
      'Category': ev.categoryName,
      'Venue': ev.venueName,
      'Status': ev.status,
      'Tickets Sold': ev.totalTicketsSold,
      'Early Bird Sold': ev.earlyBirdTicketsSold || 0,
      'Early Bird Price (LKR)': ev.earlyBirdPrice || 'N/A',
      'Early Bird Active': ev.earlyBirdActive ? 'Yes' : 'No',
      'Regular Price (LKR)': ev.regularPrice,
      'Gross Sales (LKR)': ev.grossRevenue,
      'Discounts (LKR)': ev.totalDiscounts,
      'Promo Discounts (LKR)': ev.promoDiscounts || 0,
      'Refunds Paid (LKR)': ev.totalRefunds,
      'Net Revenue (LKR)': ev.totalRevenue,
      'Orders Count': ev.bookingCount,
      'Configured Promo Codes': ev.configuredPromoCodesCount,
    }));
    const eventSummarySheet = XLSX.utils.json_to_sheet(eventSummaryData);
    autoFitColumns(eventSummarySheet, eventSummaryData);
    XLSX.utils.book_append_sheet(workbook, eventSummarySheet, 'Event Summaries');
  }

  // Sheet 5: Customer Bookings in this period
  if (report.bookingDetails && report.bookingDetails.length > 0) {
    const bookingsData = report.bookingDetails.map(bk => ({
      'Booking Reference': bk.bookingReference,
      'Customer Name': bk.customerName,
      'Customer Email': bk.customerEmail,
      'Show Time': bk.showTimeLabel,
      'Ticket Category': bk.ticketCategory,
      'Seat Numbers': bk.seatNumbers,
      'Ticket Count': bk.ticketCount,
      'Total Amount (LKR)': bk.totalAmount,
      'Discount Amount (LKR)': bk.discountAmount || 0,
      'Promo/Discount Info': bk.discountInfo || 'None',
      'Early Bird': bk.isEarlyBird ? 'Yes' : 'No',
      'Booking Date': new Date(bk.bookingDate).toLocaleString(),
      'Status': bk.status,
      'Payment Status': bk.paymentMethod,
    }));
    const bookingsSheet = XLSX.utils.json_to_sheet(bookingsData);
    autoFitColumns(bookingsSheet, bookingsData);
    XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'Bookings List');
  }

  XLSX.writeFile(workbook, `Sales_By_Date_${safeDateLabel}.xlsx`);
};

/**
 * Export Sales By Date to CSV with metadata header
 */
export const exportSalesByDateToCSV = (report: SalesByDateReportData) => {
  if (!report.dailySales || report.dailySales.length === 0) {
    alert('No daily sales data available to export.');
    return;
  }

  const rows: any[] = [];
  report.dailySales.forEach(d => {
    if (d.eventBreakdowns && d.eventBreakdowns.length > 0) {
      d.eventBreakdowns.forEach(ev => {
        rows.push({
          'Date': d.formattedDate || d.date,
          'Event Title': ev.eventTitle,
          'Organizer': ev.organizerName,
          'Category': ev.categoryName,
          'Venue': ev.venueName,
          'Tickets Sold': ev.ticketsSold,
          'Early Bird Sold': ev.earlyBirdTicketsSold || 0,
          'Gross Sales (LKR)': ev.grossRevenue,
          'Discounts (LKR)': ev.discounts,
          'Promo Discounts (LKR)': ev.promoDiscounts || 0,
          'Refunds (LKR)': ev.refunds,
          'Net Revenue (LKR)': ev.revenue,
          'Orders Count': ev.bookingCount,
        });
      });
    } else {
      rows.push({
        'Date': d.formattedDate || d.date,
        'Event Title': 'All Events',
        'Organizer': 'All Organizers',
        'Category': 'All',
        'Venue': 'All',
        'Tickets Sold': d.totalTicketsSold,
        'Early Bird Sold': d.earlyBirdTicketsSold || 0,
        'Gross Sales (LKR)': d.grossRevenue,
        'Discounts (LKR)': d.totalDiscounts,
        'Promo Discounts (LKR)': d.promoDiscounts || 0,
        'Refunds (LKR)': d.totalRefunds,
        'Net Revenue (LKR)': d.totalRevenue,
        'Orders Count': d.bookingCount,
      });
    }
  });

  const safeDateLabel = (report.dateRangeLabel || 'sales_by_date').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  exportToCSV(rows, `Sales_By_Date_${safeDateLabel}`, `Sales by Date Performance - ${report.dateRangeLabel}`);
};

/**
 * Trigger print dialog for formatted PDF Report export.
 */
export const printPDFReport = (report: EventReportData) => {
  const previousTitle = document.title;
  const scopeLabel = report.selectedScheduleId ? report.selectedScheduleLabel : 'All Show Times';
  document.title = `Event Report - ${report.eventTitle} - ${scopeLabel}`;

  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);

  window.print();
};

/**
 * Trigger print dialog for Sales By Date PDF Report.
 */
export const printSalesByDatePDF = (report: SalesByDateReportData) => {
  const previousTitle = document.title;
  document.title = `Sales By Date Report - ${report.dateRangeLabel}`;

  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);

  window.print();
};
