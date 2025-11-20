package com.ticket.ticket_booking_system.util;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.User;

/**
 * Utility class for extracting authenticated user information from Spring Security context
 */
public class AuthenticationUtil {

    /**
     * Get the currently authenticated organizer's ID
     * @return Organizer UUID or null if not authenticated as organizer
     */
    public static UUID getAuthenticatedOrganizerId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof Organizer) {
            Organizer organizer = (Organizer) authentication.getPrincipal();
            return organizer.getOrganizerId();
        }
        
        return null;
    }

    /**
     * Get the currently authenticated admin's ID
     * @return Admin UUID or null if not authenticated as admin
     */
    public static UUID getAuthenticatedAdminId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof Admin) {
            Admin admin = (Admin) authentication.getPrincipal();
            return admin.getAdminId();
        }
        
        return null;
    }

    /**
     * Get the currently authenticated user's ID
     * @return User UUID or null if not authenticated as user
     */
    public static UUID getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            User user = (User) authentication.getPrincipal();
            return user.getUserId();
        }
        
        return null;
    }

    /**
     * Get the currently authenticated user's email
     * @return Email or null if not authenticated
     */
    public static String getAuthenticatedUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() != null) {
            Object principal = authentication.getPrincipal();
            
            if (principal instanceof Organizer) {
                return ((Organizer) principal).getEmail();
            } else if (principal instanceof Admin) {
                return ((Admin) principal).getEmail();
            } else if (principal instanceof User) {
                return ((User) principal).getEmail();
            }
        }
        
        return null;
    }

    /**
     * Check if the current user is an organizer
     * @return true if authenticated as organizer
     */
    public static boolean isOrganizer() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof Organizer;
    }

    /**
     * Check if the current user is an admin
     * @return true if authenticated as admin
     */
    public static boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof Admin;
    }

    /**
     * Check if the current user is a regular user
     * @return true if authenticated as user
     */
    public static boolean isUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof User;
    }
}
