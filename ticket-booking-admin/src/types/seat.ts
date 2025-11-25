// Seat interface matching backend SeatResponse
export interface Seat {
  seatId: string;
  venueId: string;
  venueName: string;
  eventId: string;
  eventName: string;
  section: string;
  rowNumber: string;
  seatNumber: string;
  xPosition?: number;
  yPosition?: number;
  seatType: 'REGULAR' | 'PREMIUM' | 'VIP' | 'ACCESSIBLE';
  price: number;
  isAvailable: boolean;
  isBlocked: boolean;
  holdExpiresAt?: string;
  heldByUser?: string;
  createdAt?: string;
}

// Seat status for frontend rendering
export type SeatStatus = 'available' | 'selected' | 'booked' | 'held' | 'blocked';

// Enhanced seat with UI state
export interface SeatWithStatus extends Seat {
  status: SeatStatus;
  displayLabel: string; // e.g., "A1"
}

// Request to hold seats
export interface HoldSeatsRequest {
  eventId: string;
  seatIds: string[];
  holdDurationMinutes?: number;
}

// Request to confirm booking
export interface ConfirmBookingRequest {
  eventId: string;
  seatIds: string[];
  paymentId: string;
  paymentMethod: string;
}

// API response for hold/confirm
export interface BookingResponse {
  success: boolean;
  message: string;
  heldSeats?: number;
  bookedSeats?: number;
  holdDurationMinutes?: number;
  paymentId?: string;
  bookingReference?: string;
}

// Seat availability statistics
export interface SeatAvailabilityStats {
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  heldSeats: number;
  blockedSeats: number;
}

// Grouped seats by row for rendering
export interface SeatsGroupedByRow {
  [rowLabel: string]: SeatWithStatus[];
}
