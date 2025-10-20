package com.ticket.ticket_booking_system.constants;

/**
 * Application-wide message constants for consistent user feedback
 */
public class Messages {
    
    // Authentication Messages
    public static final String LOGIN_SUCCESS = "Welcome back! You have successfully logged in.";
    public static final String LOGIN_FAILED = "Login failed. Please check your credentials and try again.";
    public static final String LOGOUT_SUCCESS = "You have been successfully logged out. See you soon!";
    public static final String REGISTER_SUCCESS = "Registration successful! Welcome to Ticket Booking System.";
    public static final String REGISTER_FAILED = "Registration failed. Please try again.";
    public static final String UNAUTHORIZED = "You are not authorized to perform this action.";
    
    // Venue Messages
    public static final String VENUE_CREATED = "Venue '%s' has been created successfully with %d seats!";
    public static final String VENUE_UPDATED = "Venue '%s' has been updated successfully.";
    public static final String VENUE_DELETED = "Venue '%s' has been deleted successfully along with all associated seats.";
    public static final String VENUE_NOT_FOUND = "Venue not found. It may have been deleted.";
    public static final String VENUE_SEATS_GENERATED = "Successfully generated %d seats for venue '%s'.";
    
    // Event Messages
    public static final String EVENT_CREATED = "Event '%s' has been created successfully with %d seats!";
    public static final String EVENT_UPDATED = "Event '%s' has been updated successfully.";
    public static final String EVENT_DELETED = "Event '%s' has been deleted successfully.";
    public static final String EVENT_PUBLISHED = "Event '%s' has been published and is now visible to users!";
    public static final String EVENT_NOT_FOUND = "Event not found. It may have been deleted.";
    
    // Seat Messages
    public static final String SEATS_LOADED = "Successfully loaded %d seats for the event.";
    public static final String SEAT_UPDATED = "Seat %s has been updated successfully.";
    public static final String SEAT_BLOCKED = "Seat %s has been blocked successfully.";
    public static final String SEAT_UNBLOCKED = "Seat %s has been unblocked successfully.";
    public static final String SEATS_DELETED = "Selected seats have been deleted successfully.";
    
    // Booking Messages
    public static final String BOOKING_CREATED = "Booking confirmed! Your booking ID is %s.";
    public static final String BOOKING_CANCELLED = "Booking %s has been cancelled successfully.";
    public static final String BOOKING_NOT_FOUND = "Booking not found. Please check your booking ID.";
    public static final String BOOKING_PAYMENT_SUCCESS = "Payment successful! Your booking is confirmed.";
    public static final String BOOKING_PAYMENT_FAILED = "Payment failed. Please try again.";
    
    // User Messages
    public static final String USER_CREATED = "User '%s' has been created successfully.";
    public static final String USER_UPDATED = "User profile has been updated successfully.";
    public static final String USER_DELETED = "User '%s' has been deleted successfully.";
    public static final String USER_NOT_FOUND = "User not found.";
    public static final String PROFILE_UPDATED = "Your profile has been updated successfully!";
    public static final String PASSWORD_CHANGED = "Your password has been changed successfully.";
    public static final String PROFILE_PICTURE_UPDATED = "Profile picture updated successfully!";
    
    // Transaction Messages
    public static final String TRANSACTION_SUCCESS = "Transaction completed successfully.";
    public static final String TRANSACTION_FAILED = "Transaction failed. Please try again.";
    public static final String REFUND_PROCESSED = "Refund has been processed successfully.";
    
    // Validation Messages
    public static final String INVALID_INPUT = "Please check your input and try again.";
    public static final String REQUIRED_FIELDS = "Please fill in all required fields.";
    public static final String CAPACITY_REQUIRED = "Venue capacity is required to generate seats.";
    
    // Confirmation Messages (for frontend dialogs)
    public static final String CONFIRM_DELETE_VENUE = "Are you sure you want to delete this venue? This will also delete all associated seats and cannot be undone.";
    public static final String CONFIRM_DELETE_EVENT = "Are you sure you want to delete this event? This action cannot be undone.";
    public static final String CONFIRM_DELETE_USER = "Are you sure you want to delete this user account?";
    public static final String CONFIRM_CANCEL_BOOKING = "Are you sure you want to cancel this booking?";
    public static final String CONFIRM_LOGOUT = "Are you sure you want to log out?";
    
    // Generic Messages
    public static final String OPERATION_SUCCESS = "Operation completed successfully!";
    public static final String OPERATION_FAILED = "Operation failed. Please try again.";
    public static final String SERVER_ERROR = "An unexpected error occurred. Please try again later.";
    public static final String NOT_FOUND = "The requested resource was not found.";
    
    private Messages() {
        // Private constructor to prevent instantiation
    }
}
