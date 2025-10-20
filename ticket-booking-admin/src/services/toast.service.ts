import { toast, ToastOptions } from 'react-toastify';

/**
 * Toast notification service for consistent user feedback across the application
 */

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const ToastService = {
  /**
   * Show success message
   */
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, { ...defaultOptions, ...options });
  },

  /**
   * Show error message
   */
  error: (message: string, options?: ToastOptions) => {
    toast.error(message, { ...defaultOptions, ...options });
  },

  /**
   * Show info message
   */
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, { ...defaultOptions, ...options });
  },

  /**
   * Show warning message
   */
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, { ...defaultOptions, ...options });
  },

  /**
   * Show loading message
   */
  loading: (message: string) => {
    return toast.loading(message, defaultOptions);
  },

  /**
   * Update loading toast to success
   */
  updateSuccess: (toastId: any, message: string) => {
    toast.update(toastId, {
      render: message,
      type: 'success',
      isLoading: false,
      autoClose: 4000,
    });
  },

  /**
   * Update loading toast to error
   */
  updateError: (toastId: any, message: string) => {
    toast.update(toastId, {
      render: message,
      type: 'error',
      isLoading: false,
      autoClose: 4000,
    });
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

// Predefined messages for common operations
export const ToastMessages = {
  // Authentication
  LOGIN_SUCCESS: 'Welcome back! You have successfully logged in.',
  LOGOUT_SUCCESS: 'You have been successfully logged out. See you soon!',
  REGISTER_SUCCESS: 'Registration successful! Welcome to Ticket Booking System.',
  
  // Venue
  VENUE_CREATED: (name: string, seats: number) => 
    `Venue "${name}" has been created successfully with ${seats} seats!`,
  VENUE_UPDATED: (name: string) => 
    `Venue "${name}" has been updated successfully.`,
  VENUE_DELETED: (name: string) => 
    `Venue "${name}" has been deleted successfully.`,
  VENUE_SEATS_GENERATED: (count: number, name: string) => 
    `Successfully generated ${count} seats for venue "${name}".`,
  
  // Event
  EVENT_CREATED: (name: string, seats: number) => 
    `Event "${name}" has been created successfully with ${seats} seats!`,
  EVENT_UPDATED: (name: string) => 
    `Event "${name}" has been updated successfully.`,
  EVENT_DELETED: (name: string) => 
    `Event "${name}" has been deleted successfully.`,
  EVENT_PUBLISHED: (name: string) => 
    `Event "${name}" has been published and is now visible to users!`,
  
  // Seats
  SEATS_LOADED: (count: number) => 
    `Successfully loaded ${count} seats for the event.`,
  SEAT_UPDATED: (seatId: string) => 
    `Seat ${seatId} has been updated successfully.`,
  
  // Booking
  BOOKING_CREATED: (bookingId: string) => 
    `Booking confirmed! Your booking ID is ${bookingId}.`,
  BOOKING_CANCELLED: (bookingId: string) => 
    `Booking ${bookingId} has been cancelled successfully.`,
  
  // User
  PROFILE_UPDATED: 'Your profile has been updated successfully!',
  PASSWORD_CHANGED: 'Your password has been changed successfully.',
  PROFILE_PICTURE_UPDATED: 'Profile picture updated successfully!',
  
  // Generic
  OPERATION_SUCCESS: 'Operation completed successfully!',
  OPERATION_FAILED: 'Operation failed. Please try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
};
