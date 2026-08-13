import api from './api';

export interface ScheduleSummary {
  scheduleId: string;
  startTime: string;
  endTime: string;
  status: string;
  totalCapacity: number;
  ticketsSold: number;
  ticketsAvailable: number;
  revenue: number;
  occupancyRate: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  colorCode: string;
  unitPrice: number;
  totalSeats: number;
  ticketsSold: number;
  ticketsAvailable: number;
  ticketsHeld: number;
  categoryRevenue: number;
  occupancyRate: number;
}

export interface SharedAreaSummary {
  categoryId: string;
  categoryName: string;
  sharedAreaNumber: number;
  unitPrice: number;
  totalCapacity: number;
  ticketsSold: number;
  ticketsAvailable: number;
  totalRevenue: number;
  occupancyRate: number;
}

export interface CustomerBookingRow {
  bookingId: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  showTimeLabel: string;
  seatNumbers: string;
  ticketCategory: string;
  ticketCount: number;
  totalAmount: number;
  bookingDate: string;
  status: string;
  paymentMethod: string;
}

export interface SeatStatus {
  seatId: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  categoryName: string;
  colorCode: string;
  xposition: number;
  yposition: number;
  status: 'BOOKED' | 'AVAILABLE' | 'LOCKED' | 'TEMPORARY_HOLD' | 'VIP_RESERVED' | string;
  price: number;
  customerName?: string;
}

export interface EventReportData {
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  categoryName: string;
  eventStatus: string;
  bannerUrl: string;
  organizerName: string;
  organizerEmail: string;
  venueId: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueType: string;
  totalVenueCapacity: number;
  hasSharedAreas?: boolean;
  selectedScheduleId: string | null;
  selectedScheduleLabel: string;
  totalRevenue: number;
  totalCapacity: number;
  totalTicketsSold: number;
  totalTicketsAvailable: number;
  totalTicketsHeld: number;
  totalTicketsLocked: number;
  occupancyRate: number;
  schedules: ScheduleSummary[];
  categorySummaries: CategorySummary[];
  sharedAreaSummaries: SharedAreaSummary[];
  bookingDetails: CustomerBookingRow[];
  seatAvailabilityMap: SeatStatus[];
}

export interface ReportableEvent {
  eventId: string;
  title: string;
  status: string;
  venueName: string;
  organizerName: string;
  totalSchedules: number;
}

export const reportService = {
  getEventReport: async (eventId: string, scheduleId?: string): Promise<EventReportData> => {
    const params: any = {};
    if (scheduleId) {
      params.scheduleId = scheduleId;
    }
    const response = await api.get<EventReportData>(`/api/reports/events/${eventId}`, { params });
    return response.data;
  },

  getReportableEvents: async (): Promise<ReportableEvent[]> => {
    const response = await api.get<ReportableEvent[]>('/api/reports/events');
    return response.data;
  }
};

export default reportService;
