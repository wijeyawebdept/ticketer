import axiosInstance from './api';

export interface Seat {
  seatId: string;
  venueId: string;
  venueName: string;
  eventId: string;
  eventName: string;
  section: string;
  rowNumber: string;
  seatNumber: string;
  seatType: string;
  price: number;
  isAvailable: boolean;
  isBlocked: boolean;
  holdExpiresAt?: string;
  heldByUser?: string;
  createdAt?: string;
}

export interface SeatAvailabilityStats {
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  heldSeats: number;
  blockedSeats: number;
  timestamp: number;
}

export interface SeatUpdateMessage {
  seatId: string;
  section: string;
  rowNumber: string;
  seatNumber: string;
  isAvailable: boolean;
  isBlocked: boolean;
  isHeld: boolean;
  action: 'BLOCKED' | 'UNBLOCKED' | 'HELD' | 'RESERVED' | 'RELEASED';
  timestamp: number;
}

export interface SeatHoldNotification {
  eventId: string;
  message: string;
  type: 'HOLD_CONFIRMED' | 'HOLD_EXPIRED' | 'HOLD_RELEASED';
  expiresAt: number;
}

export interface VenueSeatingConfig {
  layoutType: 'theater' | 'stadium' | 'standard' | 'custom';
  sections: {
    name: string;
    rows: {
      name: string;
      seats: number;
      priceMultiplier: number;
    }[];
  }[];
  basePrice: number;
}

export interface HoldSeatsRequest {
  seatIds: string[];
  holdDurationMinutes?: number;
}

// API Service for Seat Management
export const SeatService = {
  // Get all seats for an event
  getSeatsByEvent: async (eventId: string): Promise<Seat[]> => {
    const response = await axiosInstance.get<Seat[]>(`/api/seats?eventId=${eventId}`);
    return response.data;
  },

  // Get available seats for an event
  getAvailableSeatsByEvent: async (eventId: string): Promise<Seat[]> => {
    const response = await axiosInstance.get<Seat[]>(`/api/seats/available?eventId=${eventId}`);
    return response.data;
  },

  // Get seat availability statistics
  getAvailabilityStats: async (eventId: string): Promise<SeatAvailabilityStats> => {
    const response = await axiosInstance.get<SeatAvailabilityStats>(`/api/seats/stats?eventId=${eventId}`);
    return response.data;
  },

  // Get individual seat details
  getSeatById: async (seatId: string): Promise<Seat> => {
    const response = await axiosInstance.get<Seat>(`/api/seats/${seatId}`);
    return response.data;
  },

  // Admin: Block/unblock a seat
  toggleSeatBlock: async (seatId: string, block: boolean): Promise<void> => {
    await axiosInstance.put(`/api/seats/${seatId}/block?block=${block}`);
  },

  // User: Hold seats temporarily
  holdSeats: async (request: HoldSeatsRequest): Promise<void> => {
    await axiosInstance.post('/api/seats/hold', request);
  },

  // User: Reserve held seats
  reserveSeats: async (seatIds: string[]): Promise<void> => {
    await axiosInstance.post('/api/seats/reserve', seatIds);
  },

  // User: Release user's seat holds
  releaseSeatHolds: async (userId: string): Promise<void> => {
    await axiosInstance.post(`/api/seats/release-holds?userId=${userId}`);
  },

  // Admin: Generate seats for an event from venue layout
  generateSeatsForEvent: async (venueId: string, eventId: string): Promise<void> => {
    await axiosInstance.post(`/api/seats/generate?venueId=${venueId}&eventId=${eventId}`);
  },
};

export default SeatService;