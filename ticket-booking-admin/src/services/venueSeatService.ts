import axiosInstance from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export interface SeatDTO {
  seatId: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  category: string;
  colorCode: string;
  xPosition: number;
  yPosition: number;
  isAisleSeat: boolean;
  isAccessible: boolean;
  status: 'AVAILABLE' | 'BOOKED' | 'TEMPORARY_HOLD' | 'LOCKED' | 'NOT_FOR_SALE';
  currentPrice: number;
}

export interface SeatAvailabilityResponse {
  seats: SeatDTO[];
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  temporaryHolds: number;
}

export interface SeatHoldRequest {
  eventScheduleId: string | number;
  seatIds: string[];
  userId: number;
}

export interface SeatHoldResponse {
  success: boolean;
  message: string;
  expiresIn?: number;
}

// VenueSeat interface matching backend entity
export interface VenueSeat {
  seatId: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  category: {
    categoryId: number;
    categoryName: string;
    basePrice: number;
    colorCode: string;
    displayOrder: number;
  };
  xPosition: number;
  yPosition: number;
  isAisleSeat: boolean;
  isAccessible: boolean;
  notes?: string;
}

export const venueSeatService = {
  /**
   * Get venue layout (all seats with positions)
   */
  getVenueLayout: async () => {
    const response = await axiosInstance.get('/api/venue-seats/layout');
    return response.data;
  },

  /**
   * Get venue layout for a specific venue by venue ID
   */
  getVenueLayoutByVenueId: async (venueId: string): Promise<VenueSeat[]> => {
    const response = await axiosInstance.get<VenueSeat[]>(`/api/venue-seats/layout/${venueId}`);
    return response.data;
  },

  /**
   * Get seat availability for a specific event schedule
   */
  getSeatAvailability: async (eventScheduleId: string | number): Promise<SeatAvailabilityResponse> => {
    const response = await axiosInstance.get<SeatAvailabilityResponse>(
      `/api/venue-seats/availability/${eventScheduleId}`
    );
    return response.data;
  },

  /**
   * Hold seats temporarily (5-minute timer)
   */
  holdSeats: async (request: SeatHoldRequest): Promise<SeatHoldResponse> => {
    const response = await axiosInstance.post<SeatHoldResponse>('/api/venue-seats/hold', request);
    return response.data;
  },

  /**
   * Release seat holds manually
   */
  releaseHolds: async (eventScheduleId: string | number, seatIds: string[]) => {
    const response = await axiosInstance.post(
      `/api/venue-seats/release?eventScheduleId=${eventScheduleId}`,
      seatIds
    );
    return response.data;
  },

  /**
   * Confirm booking (convert hold to booked)
   */
  confirmBooking: async (
    eventScheduleId: string | number,
    bookingRefId: number,
    userId: number,
    seatIds: string[]
  ) => {
    const response = await axiosInstance.post(
      `/api/venue-seats/confirm?eventScheduleId=${eventScheduleId}&bookingRefId=${bookingRefId}&userId=${userId}`,
      seatIds
    );
    return response.data;
  },

  /**
   * Initialize seats for a new event schedule
   */
  initializeEventSeats: async (eventScheduleId: string | number) => {
    const response = await axiosInstance.post(
      `/api/venue-seats/initialize/${eventScheduleId}`
    );
    return response.data;
  },

  /**
   * Lock a seat (admin only)
   */
  lockSeat: async (seatId: string): Promise<{ message: string; seatId: string }> => {
    const response = await axiosInstance.put<{ message: string; seatId: string }>(
      `/api/venue-seats/${seatId}/lock`
    );
    return response.data;
  },

  /**
   * Unlock a seat (admin only)
   */
  unlockSeat: async (seatId: string): Promise<{ message: string; seatId: string }> => {
    const response = await axiosInstance.put<{ message: string; seatId: string }>(
      `/api/venue-seats/${seatId}/unlock`
    );
    return response.data;
  },

  /**
   * Mark a seat as accessible (admin only)
   */
  markAccessible: async (seatId: string): Promise<{ message: string; seatId: string }> => {
    const response = await axiosInstance.put<{ message: string; seatId: string }>(
      `/api/venue-seats/${seatId}/accessible`
    );
    return response.data;
  },

  /**
   * Remove accessible marking from a seat (admin only)
   */
  removeAccessible: async (seatId: string): Promise<{ message: string; seatId: string }> => {
    const response = await axiosInstance.put<{ message: string; seatId: string }>(
      `/api/venue-seats/${seatId}/remove-accessible`
    );
    return response.data;
  },

  /**
   * Reserve a seat for VIP (admin only)
   */
  reserveForVIP: async (seatId: string): Promise<{ message: string; seatId: string }> => {
    const response = await axiosInstance.put<{ message: string; seatId: string }>(
      `/api/venue-seats/${seatId}/reserve-vip`
    );
    return response.data;
  },

  /**
   * Remove VIP reservation from a seat (admin only)
   */
  removeVIPReservation: async (seatId: string): Promise<{ message: string; seatId: string }> => {
    const response = await axiosInstance.put<{ message: string; seatId: string }>(
      `/api/venue-seats/${seatId}/remove-vip`
    );
    return response.data;
  },
};

/**
 * WebSocket service for real-time seat updates
 */
export class SeatWebSocketService {
  private socket: WebSocket | null = null;
  private eventScheduleId: number;
  private onUpdate: (updatedSeats: SeatDTO[]) => void;

  constructor(eventScheduleId: number, onUpdate: (updatedSeats: SeatDTO[]) => void) {
    this.eventScheduleId = eventScheduleId;
    this.onUpdate = onUpdate;
  }

  connect() {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/seats/${this.eventScheduleId}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected for event:', this.eventScheduleId);
    };

    this.socket.onmessage = (event) => {
      try {
        const updatedSeats: SeatDTO[] = JSON.parse(event.data);
        this.onUpdate(updatedSeats);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}

export default venueSeatService;
