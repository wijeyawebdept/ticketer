import api from './api';
import type {
  Seat,
  SeatDTO,
  SeatWithStatus,
  HoldSeatsRequest,
  ConfirmBookingRequest,
  BookingResponse,
  SeatAvailabilityStats,
  SeatAvailabilityWithSharedAreas,
  SeatsGroupedByRow,
  SeatStatus
} from '../types/seat';

class SeatBookingService {
  
  /**
   * Get all seats for an event
   */
  async getEventSeats(eventId: string): Promise<Seat[]> {
    const response = await api.get<Seat[]>(`/api/bookings/seats?eventId=${eventId}`);
    return response.data;
  }

  /**
   * Get venue template seats (for admins/organizers)
   */
  async getVenueSeats(venueId: string): Promise<Seat[]> {
    const response = await api.get<Seat[]>(`/api/bookings/venue/${venueId}/seats`);
    return response.data;
  }

  /**
   * Hold/lock seats temporarily
   */
  async holdSeats(request: HoldSeatsRequest): Promise<BookingResponse> {
    const response = await api.post<BookingResponse>('/api/bookings/hold-seats', request);
    return response.data;
  }

  /**
   * Confirm booking after payment
   */
  async confirmBooking(request: ConfirmBookingRequest): Promise<BookingResponse> {
    const response = await api.post<BookingResponse>('/api/bookings/confirm', request);
    return response.data;
  }

  /**
   * Release held seats for current user
   */
  async releaseHolds(): Promise<BookingResponse> {
    const response = await api.post<BookingResponse>('/api/bookings/release-holds');
    return response.data;
  }

  /**
   * Get seat availability statistics
   */
  async getAvailabilityStats(eventId: string): Promise<SeatAvailabilityStats> {
    const response = await api.get<SeatAvailabilityStats>(`/api/bookings/stats?eventId=${eventId}`);
    return response.data;
  }

  /**
   * Get full seat availability including shared areas for a schedule
   */
  async getSeatAvailabilityWithSharedAreas(scheduleId: string): Promise<SeatAvailabilityWithSharedAreas> {
    const response = await api.get<SeatAvailabilityWithSharedAreas>(`/api/venue-seats/availability/${scheduleId}`);
    return response.data;
  }

  /**
   * Transform SeatDTO from availability endpoint to SeatWithStatus
   */
  transformSeatDTOsWithStatus(seats: SeatDTO[], selectedSeatIds: Set<string>): SeatWithStatus[] {
    return seats.map(seat => {
      // Map status from backend
      let status: SeatStatus = 'available';
      const backendStatus = seat.status?.toUpperCase() || 'AVAILABLE';
      
      if (backendStatus === 'LOCKED' || backendStatus === 'BLOCKED') {
        status = 'blocked';
      } else if (backendStatus === 'BOOKED') {
        status = 'booked';
      } else if (backendStatus === 'HELD') {
        status = 'held';
      } else if (selectedSeatIds.has(seat.seatId)) {
        status = 'selected';
      }

      // Convert SeatDTO to SeatWithStatus compatible format
      return {
        seatId: seat.seatId,
        venueId: '',
        venueName: '',
        eventId: '',
        eventName: '',
        section: seat.section,
        rowNumber: seat.rowLabel,
        seatNumber: String(seat.seatNumber),
        xPosition: seat.xPosition,
        yPosition: seat.yPosition,
        seatType: seat.categoryName?.toUpperCase().includes('VIP') ? 'VIP' : 
                  seat.categoryName?.toUpperCase().includes('PREMIUM') ? 'PREMIUM' : 'REGULAR',
        price: seat.currentPrice || 0,
        isAvailable: status === 'available' || status === 'selected',
        isBlocked: status === 'blocked',
        isPermanentHold: false,
        categoryName: seat.categoryName,
        colorCode: seat.colorCode,
        notes: seat.notes,
        status,
        displayLabel: `${seat.rowLabel}${seat.seatNumber}`
      } as SeatWithStatus;
    });
  }

  /**
   * Transform backend seats to UI seats with status
   */
  transformSeatsWithStatus(seats: Seat[], selectedSeatIds: Set<string>, currentUserId?: string): SeatWithStatus[] {
    return seats.map(seat => {
      let status: SeatStatus = 'available';
      
      if (seat.isBlocked) {
        status = 'blocked';
      } else if (!seat.isAvailable) {
        status = 'booked';
      } else if (seat.holdExpiresAt && seat.heldByUser) {
        // Check if hold is still valid
        const holdExpires = new Date(seat.holdExpiresAt);
        if (holdExpires > new Date()) {
          status = seat.heldByUser === currentUserId ? 'selected' : 'held';
        }
      } else if (selectedSeatIds.has(seat.seatId)) {
        status = 'selected';
      }

      return {
        ...seat,
        status,
        displayLabel: `${seat.rowNumber}${seat.seatNumber}`
      };
    });
  }

  /**
   * Group seats by row for rendering
   */
  groupSeatsByRow(seats: SeatWithStatus[]): SeatsGroupedByRow {
    const grouped: SeatsGroupedByRow = {};
    
    seats.forEach(seat => {
      const row = seat.rowNumber;
      if (!grouped[row]) {
        grouped[row] = [];
      }
      grouped[row].push(seat);
    });

    // Sort seats within each row by seat number
    Object.keys(grouped).forEach(row => {
      grouped[row].sort((a, b) => {
        const numA = parseInt(a.seatNumber);
        const numB = parseInt(b.seatNumber);
        return numA - numB;
      });
    });

    return grouped;
  }

  /**
   * Calculate total price for selected seats
   */
  calculateTotalPrice(seats: SeatWithStatus[], selectedSeatIds: Set<string>): number {
    return seats
      .filter(seat => selectedSeatIds.has(seat.seatId))
      .reduce((total, seat) => total + seat.price, 0);
  }

  /**
   * Get color class for seat status
   */
  getSeatColorClass(status: SeatStatus): string {
    const colorMap: Record<SeatStatus, string> = {
      available: 'seat-available',
      selected: 'seat-selected',
      booked: 'seat-booked',
      held: 'seat-held',
      blocked: 'seat-blocked'
    };
    return colorMap[status] || 'seat-available';
  }

  /**
   * Get seat type color
   */
  getSeatTypeColor(seatType: string): string {
    const typeColorMap: Record<string, string> = {
      REGULAR: '#4CAF50',    // Green
      PREMIUM: '#2196F3',    // Blue
      VIP: '#FF9800',        // Orange
      ACCESSIBLE: '#9C27B0'  // Purple
    };
    return typeColorMap[seatType] || '#4CAF50';
  }
}

export const seatBookingService = new SeatBookingService();
export default seatBookingService;
