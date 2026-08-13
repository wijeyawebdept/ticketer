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
    { Property: 'Selected Show Time', Value: report.selectedScheduleLabel },
    { Property: 'Total Capacity', Value: report.totalCapacity },
    { Property: 'Tickets Sold', Value: report.totalTicketsSold },
    { Property: 'Tickets Available', Value: report.totalTicketsAvailable },
    { Property: 'Tickets Held', Value: report.totalTicketsHeld },
    { Property: 'Tickets Locked', Value: report.totalTicketsLocked },
    { Property: 'Occupancy Rate (%)', Value: `${report.occupancyRate}%` },
    { Property: 'Total Revenue (LKR)', Value: report.totalRevenue },
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

  // Sheet 5: Customer Bookings List
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

  const safeFileName = report.eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(workbook, `Event_Report_${safeFileName}.xlsx`);
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

  const safeFileName = report.eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  exportToCSV(bookingData, `Event_Bookings_${safeFileName}`);
};

/**
 * Trigger print dialog for formatted PDF Report export
 */
export const printPDFReport = () => {
  window.print();
};
