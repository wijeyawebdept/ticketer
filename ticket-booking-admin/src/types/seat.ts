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
  isPermanentHold: boolean;
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

// Shared area from backend
export interface SharedAreaDTO {
  categoryId: string;
  categoryName: string;
  price: number;
  capacity: number;
  sharedAreaNumber: number;
  availableTickets: number;
}

// SeatDTO from venue-seats availability endpoint
export interface SeatDTO {
  seatId: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  categoryName: string;
  colorCode: string;
  xPosition: number;
  yPosition: number;
  isAisleSeat: boolean;
  isAccessible: boolean;
  status: string;
  currentPrice: number;
  notes: string;
}

// Full seat availability response including shared areas
export interface SeatAvailabilityWithSharedAreas {
  seats: SeatDTO[];
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  heldSeats: number;
  sharedAreas?: SharedAreaDTO[];
}
