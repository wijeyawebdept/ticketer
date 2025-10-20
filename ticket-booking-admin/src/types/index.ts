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
  ROLE_USER = 'ROLE_USER',
  ORGANIZER = 'ORGANIZER',
  ROLE_ORGANIZER = 'ROLE_ORGANIZER',
  ADMIN = 'ADMIN',
  ROLE_ADMIN = 'ROLE_ADMIN'
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
export interface TicketCategory {
  categoryName: string;
  description?: string;
  price: number;
  capacity: number;
}

export interface Event {
  id: string;
  eventId: string; // For backward compatibility
  name: string;
  description: string;
  startDateTime: string; // Changed from eventDate to match backend
  endDateTime: string;   // Added to match backend
  venue: Venue;
  category?: string; // Made optional since backend doesn't support event categories
  status: EventStatus;
  createdBy: User;
  createdAt: string;
  updatedAt: string | null;
  imageUrl?: string;
  basePrice: number;
  ticketsAvailable: number;
  ticketPrice: number;
  ticketCategories?: TicketCategory[]; // Added ticket categories
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// Venue related types
export enum VenueLayoutType {
  THEATER = 'THEATER',
  GENERAL_ADMISSION = 'GENERAL_ADMISSION', 
  STADIUM = 'STADIUM',
  CUSTOM = 'CUSTOM'
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  capacity: number;
  layoutType: VenueLayoutType;
  seatingLayout?: { [key: string]: any };
  createdAt?: string;
  updatedAt?: string;
}

// Booking related types
export interface Booking {
  id: string;
  bookingId: string;
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

// Profile related types
export interface ProfileDTO {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  role: string;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  updatedAt?: string;
}

export interface ProfileUpdateDTO {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePicture?: string;
}