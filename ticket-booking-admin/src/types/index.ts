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
  ORGANIZER_EMPLOYEE = 'ORGANIZER_EMPLOYEE',
  ROLE_ORGANIZER_EMPLOYEE = 'ROLE_ORGANIZER_EMPLOYEE',
  ADMIN = 'ADMIN',
  ROLE_ADMIN = 'ROLE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN'
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
export interface EventCategory {
  id: string;
  categoryName: string;
  description?: string;
  icon?: string;
  colorCode?: string;
  active: number;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface EventCategoryRequest {
  categoryName: string;
  description?: string;
}

export interface TicketCategory {
  categoryName: string;
  description?: string;
  price: number;
  capacity: number;
  isSharedArea?: boolean;
  sharedAreaNumber?: number;
}

export interface Event {
  id: string;
  eventId: string; // For backward compatibility
  name: string;
  description: string;
  startDateTime: string; // Next/earliest schedule date-time
  endDateTime: string;   // Next/earliest schedule end time
  nextSchedule?: EventSchedule; // Next upcoming schedule
  venue: Venue;
  category?: EventCategory; // Event category (FK relationship)
  status: EventStatus;
  active?: number; // 1=active, 0=inactive, -1=deleted
  createdBy: User;
  createdAt: string;
  updatedAt: string | null;
  imageUrl?: string;
  basePrice: number;
  ticketsAvailable: number;
  totalCapacity: number; // Event's configured capacity
  availableSeats: number; // Current available seats for the event
  ticketPrice: number;
  ticketCategories?: TicketCategory[]; // Added ticket categories
  hasDeal?: boolean; // Indicates if event has special deals
  dealType?: string; // e.g., 'DISCOUNT', 'BUY_X_GET_Y', 'CREDIT_CARD', 'EARLY_BIRD'
  dealDescription?: string; // e.g., "Buy 11 Get 1 Off", "20% Off with Visa"
  discountPercentage?: number; // Percentage discount if applicable
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// Event Schedule types
export enum ScheduleStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  SOLD_OUT = 'SOLD_OUT',
  COMPLETED = 'COMPLETED'
}

export interface EventSchedule {
  scheduleId: string;
  eventId: string;
  eventName: string;
  scheduleDate: string; // LocalDate from backend
  startTime: string; // LocalTime from backend
  endTime: string;
  capacity: number;
  availableSeats: number;
  bookedSeats: number;
  priceAdjustment: number;
  finalPrice: number;
  status: ScheduleStatus;
  notes?: string;
  isBookable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventScheduleRequest {
  scheduleDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  priceAdjustment?: number;
  notes?: string;
}

// Venue related types
export interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  capacity: number;
  status?: number; // 1=active, 0=inactive, -1=soft deleted
  seatingLayout?: { [key: string]: any };
  // Shared/Common areas (standing areas without seats)
  hasSharedAreas?: boolean;
  sharedAreaCount?: number;
  sharedAreaTotalCapacity?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Booking related types
export interface Booking {
  bookingId: string;
  bookingReference: string;
  bookingTime: string; // Changed from bookingDate to match API
  bookingDate?: string; // Keep for backward compatibility
  status: BookingStatus;
  totalAmount: number;
  ticketCount: number;
  attended?: boolean;
  
  // User information
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  user?: User; // Keep for backward compatibility
  
  // Event information
  eventId?: string;
  eventName?: string;
  eventDescription?: string;
  eventImageUrl?: string;
  event?: Event; // Keep for backward compatibility
  
  // Schedule information
  scheduleId?: string;
  scheduleDate?: string;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  scheduleFinalPrice?: number;
  scheduleStatus?: string;
  
  // Venue information
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  
  // Booking seats
  seats?: BookingSeatInfo[];
  
  // Cancellation info
  cancelledAt?: string;
  cancellationReason?: string;
  
  // Legacy field for backward compatibility
  id?: string;
}

export interface BookingSeatInfo {
  seatId?: string;
  seatNumber?: string;
  seatRow?: string;
  section?: string;
  price: number;
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
  // SUPER_ADMIN exclusive fields
  superAdminCount?: number;
  adminCount?: number;
  organizerCount?: number;
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
  loginEmailEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  marketingEmailsEnabled: boolean;
}

export interface ProfileUpdateDTO {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePicture?: string;
}

// Role Management types
export interface Role {
  roleId: string;
  roleName: string;
  roleDescription: string;
  isSystemRole: boolean;
  canManageUsers: boolean;
  canManageEvents: boolean;
  canManageVenues: boolean;
  canManageBookings: boolean;
  canViewReports: boolean;
  canManageRoles: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}