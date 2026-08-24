import api from './api';

export interface CheckInTicketDetail {
  bookingSeatId: string;
  ticketCode: string;
  venueSeatId?: string;
  section?: string;
  rowLabel?: string;
  seatNumber?: string;
  isSharedAreaTicket: boolean;
  sharedAreaNumber?: number;
  categoryName?: string;
  price?: number;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface CheckInResponse {
  valid: boolean;
  alreadyCheckedIn: boolean;
  message: string;
  statusType: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID_EVENT' | 'CANCELLED' | 'ERROR' | string;
  bookingId?: string;
  bookingReference?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNic?: string;
  eventId?: string;
  eventName?: string;
  scheduleId?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  venueName?: string;
  totalTickets?: number;
  checkedInTickets?: number;
  checkedInAt?: string;
  checkedInByName?: string;
  allTickets?: CheckInTicketDetail[];
  seatedTickets?: CheckInTicketDetail[];
  sharedAreaTickets?: CheckInTicketDetail[];
}

export interface SharedAreaStats {
  sharedAreaNumber: number;
  categoryName: string;
  capacity: number;
  booked: number;
  checkedIn: number;
  pending: number;
}

export interface RecentCheckInItem {
  customerName: string;
  bookingReference: string;
  ticketCode: string;
  seatIdentifier: string;
  checkedInAtTime: string;
  isSharedArea: boolean;
}

export interface CheckInStatsResponse {
  eventId: string;
  eventName: string;
  scheduleId: string;
  scheduleDate: string;
  scheduleTime: string;
  totalCapacity?: number;
  totalBooked: number;
  totalCheckedIn: number;
  totalPendingArrival: number;
  checkInPercentage: number;
  totalSeatedBooked: number;
  totalSeatedCheckedIn: number;
  totalSharedBooked: number;
  totalSharedCheckedIn: number;
  sharedAreaBreakdown: Record<number, SharedAreaStats>;
  recentCheckIns: RecentCheckInItem[];
}

export interface CheckInAttendee {
  bookingSeatId: string;
  bookingId: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNic?: string;
  ticketCode: string;
  venueSeatId?: string;
  section?: string;
  rowLabel?: string;
  seatNumber?: string;
  isSharedAreaTicket: boolean;
  sharedAreaNumber?: number;
  categoryName?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInByName?: string;
}

export interface CheckInScanPayload {
  qrData: string;
  eventScheduleId?: string;
  eventId?: string;
  checkInAll?: boolean;
  ticketCode?: string;
}

export const checkInService = {
  /**
   * Scan QR data or search code
   */
  async scanTicket(payload: CheckInScanPayload): Promise<CheckInResponse> {
    const response = await api.post<CheckInResponse>('/api/checkin/scan', payload);
    return response.data;
  },

  /**
   * Toggle individual seat check-in status
   */
  async toggleSeatCheckIn(bookingSeatId: string, checkIn: boolean = true): Promise<CheckInResponse> {
    const response = await api.post<CheckInResponse>(
      `/api/checkin/seat/${bookingSeatId}/toggle?checkIn=${checkIn}`
    );
    return response.data;
  },

  /**
   * Get real-time stats for schedule
   */
  async getScheduleStats(scheduleId: string): Promise<CheckInStatsResponse> {
    const response = await api.get<CheckInStatsResponse>(`/api/checkin/schedule/${scheduleId}/stats`);
    return response.data;
  },

  /**
   * Get attendees for schedule
   */
  async getScheduleAttendees(
    scheduleId: string,
    search?: string,
    checkedInOnly?: boolean
  ): Promise<CheckInAttendee[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (checkedInOnly !== undefined) params.append('checkedInOnly', String(checkedInOnly));

    const response = await api.get<CheckInAttendee[]>(
      `/api/checkin/schedule/${scheduleId}/attendees${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data;
  },
};

export default checkInService;
