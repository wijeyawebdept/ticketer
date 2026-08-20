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
  // Early Bird fields
  earlyBirdPrice?: number | null;
  earlyBirdCapacity?: number | null;
  earlyBirdTicketsSold?: number;
  salesStartDate?: string | null;
  salesEndDate?: string | null;
  earlyBirdActive?: boolean;
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
  // Early Bird fields
  earlyBirdPrice?: number | null;
  earlyBirdCapacity?: number | null;
  earlyBirdTicketsSold?: number;
  salesStartDate?: string | null;
  salesEndDate?: string | null;
  earlyBirdActive?: boolean;
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
  discountAmount?: number;
  discountInfo?: string;
  promoCode?: string;
  bookingDate: string;
  status: string;
  paymentMethod: string;
  isEarlyBird?: boolean;
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

export interface DealConfig {
  categoryId: string;
  categoryName: string;
  dealActive: boolean;
  dealType: 'PERCENTAGE_DISCOUNT' | 'BUY_X_GET_Y_FREE' | string;
  dealLabel: string;
  dealDiscountPercentage: number | null;
  dealBuyQuantity: number | null;
  dealFreeQuantity: number | null;
}

export interface DealUsage {
  label: string;
  timesUsed: number;
  totalDiscountGiven: number;
}

export interface PromoCodeConfig {
  id: string;
  code: string;
  description: string;
  scope: string; // ALL_EVENTS, EVENT, TICKET_CATEGORY
  discountPercentage: number;
  maxDiscountAmount: number | null;
  ticketCategoryName: string | null;
  usageLimit: number | null;
  usageCount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  statusLabel: string; // ACTIVE, EXPIRED, EXHAUSTED, UPCOMING, INACTIVE
}

export interface PromoCodeUsage {
  code: string;
  timesUsed: number;
  totalDiscountGiven: number;
}

export interface DailyEventSales {
  eventId: string;
  eventTitle: string;
  organizerName: string;
  categoryName: string;
  venueName: string;
  ticketsSold: number;
  earlyBirdTicketsSold: number;
  revenue: number;
  grossRevenue: number;
  discounts: number;
  promoDiscounts: number;
  refunds: number;
  bookingCount: number;
}

export interface DailySalesSummary {
  date: string;
  formattedDate: string;
  totalTicketsSold: number;
  earlyBirdTicketsSold: number;
  totalRevenue: number;
  grossRevenue: number;
  totalRefunds: number;
  totalDiscounts: number;
  promoDiscounts: number;
  bookingCount: number;
  activeEventsCount: number;
  eventBreakdowns: DailyEventSales[];
}

export interface EventSalesSummary {
  eventId: string;
  eventTitle: string;
  organizerName: string;
  categoryName: string;
  venueName: string;
  status: string;
  totalTicketsSold: number;
  earlyBirdTicketsSold: number;
  earlyBirdCapacity?: number | null;
  earlyBirdPrice?: number | null;
  earlyBirdActive?: boolean;
  regularPrice: number;
  totalRevenue: number;
  grossRevenue: number;
  totalDiscounts: number;
  promoDiscounts: number;
  totalRefunds: number;
  bookingCount: number;
  configuredPromoCodesCount: number;
}

export interface SalesByDateReportData {
  startDate: string | null;
  endDate: string | null;
  dateRangeLabel: string;
  totalRevenue: number;
  grossRevenue: number;
  totalRefunds: number;
  totalDiscounts: number;
  totalPromoDiscounts: number;
  totalEarlyBirdSavings: number;
  totalTicketsSold: number;
  earlyBirdTicketsSold: number;
  totalBookingsCount: number;
  promoBookingsCount: number;
  activeEventsCount: number;
  dailySales: DailySalesSummary[];
  eventSummaries: EventSalesSummary[];
  bookingDetails: CustomerBookingRow[];
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
  grossRevenue: number;
  totalDiscounts: number;
  totalRefunds: number;
  totalPromoDiscounts?: number;
  earlyBirdTotalSavings?: number;
  totalCapacity: number;
  totalTicketsSold: number;
  earlyBirdTotalTicketsSold?: number;
  earlyBirdTotalRevenue?: number;
  totalTicketsAvailable: number;
  totalTicketsHeld: number;
  totalTicketsLocked: number;
  occupancyRate: number;
  dailySales?: DailySalesSummary[];
  schedules: ScheduleSummary[];
  categorySummaries: CategorySummary[];
  sharedAreaSummaries: SharedAreaSummary[];
  bookingDetails: CustomerBookingRow[];
  seatAvailabilityMap: SeatStatus[];
  configuredDeals: DealConfig[];
  dealUsageSummaries: DealUsage[];
  configuredPromoCodes?: PromoCodeConfig[];
  promoCodeUsageSummaries?: PromoCodeUsage[];
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
  },

  getSalesByDateReport: async (params?: { startDate?: string; endDate?: string; eventId?: string }): Promise<SalesByDateReportData> => {
    const response = await api.get<SalesByDateReportData>('/api/reports/sales-by-date', { params });
    return response.data;
  }
};

export default reportService;
