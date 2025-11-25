package com.ticket.ticket_booking_system.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Custom annotation for admin permission-based authorization
 * Use this on controller methods to restrict access based on admin roles and permissions
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
public @interface AdminPermission {
    /**
     * Specific permission required (optional)
     * Examples: "MANAGE_USERS", "MANAGE_EVENTS", "MANAGE_VENUES", "DELETE_USERS", "MODIFY_SETTINGS"
     */
    String value() default "";
    
    /**
     * Minimum access level required
     */
    String accessLevel() default "STANDARD";
    
    /**
     * Allow super admin to bypass permission checks
     */
    boolean superAdminBypass() default true;
}
