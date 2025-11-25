package com.ticket.ticket_booking_system.security;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.repository.AdminRepository;

import lombok.RequiredArgsConstructor;

/**
 * Aspect for handling @AdminPermission annotation
 * Intercepts method calls and validates admin permissions
 */
@Aspect
@Component
@RequiredArgsConstructor
public class AdminPermissionAspect {

    private final AdminRepository adminRepository;

    @Around("@annotation(adminPermission)")
    public Object checkAdminPermission(ProceedingJoinPoint joinPoint, AdminPermission adminPermission) throws Throwable {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User not authenticated");
        }

        // Get the current admin from database
        String email = authentication.getName();
        Admin admin = adminRepository.findByEmail(email)
            .orElseThrow(() -> new AccessDeniedException("Admin not found"));

        // Super admin bypass check
        if (adminPermission.superAdminBypass() && admin.getRole() == Admin.Role.SUPER_ADMIN) {
            return joinPoint.proceed();
        }

        // Check access level
        String requiredLevel = adminPermission.accessLevel();
        if (!hasRequiredAccessLevel(admin, requiredLevel)) {
            throw new AccessDeniedException("Insufficient access level. Required: " + requiredLevel);
        }

        // Check specific permission if specified
        String permission = adminPermission.value();
        if (!permission.isEmpty() && !hasPermission(admin, permission)) {
            throw new AccessDeniedException("Missing required permission: " + permission);
        }

        return joinPoint.proceed();
    }

    private boolean hasRequiredAccessLevel(Admin admin, String requiredLevel) {
        Admin.AccessLevel adminLevel = admin.getAccessLevel();
        Admin.AccessLevel required = Admin.AccessLevel.valueOf(requiredLevel);
        
        // SUPER > SENIOR > STANDARD
        return adminLevel.ordinal() >= required.ordinal();
    }

    private boolean hasPermission(Admin admin, String permission) {
        return switch (permission) {
            case "DELETE_USERS" -> admin.getCanDeleteUsers();
            case "MODIFY_SETTINGS" -> admin.getCanModifySystemSettings();
            case "MANAGE_USERS", "VIEW_USERS", "MANAGE_EVENTS", "MANAGE_VENUES", "MANAGE_BOOKINGS", "VIEW_REPORTS", 
                 "APPROVE_EVENTS", "DELETE_EVENTS", "DELETE_VENUES", "CANCEL_BOOKINGS", "REFUND_BOOKINGS",
                 "MANAGE_ROLES", "VIEW_AUDIT_LOGS", "MANAGE_ORGANIZERS", "APPROVE_ORGANIZERS",
                 "MANAGE_PAYMENTS", "VIEW_TRANSACTIONS" -> 
                admin.getRole() == Admin.Role.SUPER_ADMIN || admin.getRole() == Admin.Role.ADMIN;
            default -> true; // If permission not specified or empty, allow all admins
        };
    }
}
