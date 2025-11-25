package com.ticket.ticket_booking_system.security;

/**
 * Centralized permission constants for the system
 * Use these constants with @AdminPermission annotation
 */
public final class Permissions {

    private Permissions() {} // Prevent instantiation

    // User Management Permissions
    public static final String MANAGE_USERS = "MANAGE_USERS";
    public static final String DELETE_USERS = "DELETE_USERS";
    public static final String VIEW_USERS = "VIEW_USERS";
    
    // Event Management Permissions
    public static final String MANAGE_EVENTS = "MANAGE_EVENTS";
    public static final String APPROVE_EVENTS = "APPROVE_EVENTS";
    public static final String DELETE_EVENTS = "DELETE_EVENTS";
    
    // Venue Management Permissions
    public static final String MANAGE_VENUES = "MANAGE_VENUES";
    public static final String DELETE_VENUES = "DELETE_VENUES";
    
    // Booking Management Permissions
    public static final String MANAGE_BOOKINGS = "MANAGE_BOOKINGS";
    public static final String CANCEL_BOOKINGS = "CANCEL_BOOKINGS";
    public static final String REFUND_BOOKINGS = "REFUND_BOOKINGS";
    
    // System Permissions
    public static final String MODIFY_SETTINGS = "MODIFY_SETTINGS";
    public static final String VIEW_REPORTS = "VIEW_REPORTS";
    public static final String MANAGE_ROLES = "MANAGE_ROLES";
    public static final String VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS";
    
    // Organizer Management
    public static final String MANAGE_ORGANIZERS = "MANAGE_ORGANIZERS";
    public static final String APPROVE_ORGANIZERS = "APPROVE_ORGANIZERS";
    
    // Payment & Transaction
    public static final String MANAGE_PAYMENTS = "MANAGE_PAYMENTS";
    public static final String VIEW_TRANSACTIONS = "VIEW_TRANSACTIONS";
}
