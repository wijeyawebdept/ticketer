// User related types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export enum UserRole {
  USER = 'USER',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN'
}

export interface UserCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string; // Optional for updates
  role?: UserRole;
}

// Event related types
export interface Event {
  id: string;
  eventId: string; // For backward compatibility
  name: string;
  description: string;
  eventDate: string;
  venue: Venue;
  category: string;
  status: EventStatus;
  createdBy: User;
  createdAt: string;
  updatedAt: string | null;
  imageUrl?: string;
  basePrice: number;
  ticketsAvailable: number;
  ticketPrice: number;
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// Venue related types
export interface Venue {
  venueId: string;
  name: string;
  address: string;
  capacity: number;
  seatingArrangement: string;
}

// Booking related types
export interface Booking {
  id: string;
  bookingId: string; // For backward compatibility
  user: User;
  event: Event;
  bookingDate: string;
  status: BookingStatus;
  totalAmount: number;
  ticketCount: number;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// Transaction related types
export interface Transaction {
  id: string;
  transactionId: string; // For backward compatibility
  booking: Booking;
  amount: number;
  status: TransactionStatus;
  paymentMethod: string;
  createdAt: string;
  completedAt: string | null;
  transactionDate: string; // Date of transaction
  paymentReference?: string; // Reference number for payment
  notes?: string; // Additional notes
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// Dashboard related types
export interface DashboardOverview {
  totalRevenue: number;
  totalUsers: number;
  activeEventsCount: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
}

export interface Analytics {
  revenue: number;
  bookingsCount: number;
  newUsersCount: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
}