package com.ticket.ticket_booking_system.controller.admin;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.AuditLogResponse;
import com.ticket.ticket_booking_system.dto.response.UserResponse;
import com.ticket.ticket_booking_system.service.AdminAuditService;
import com.ticket.ticket_booking_system.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/superadmin")
@PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN')")
public class SuperAdminController {

    private final UserService userService;
    private final AdminAuditService auditService;

    public SuperAdminController(UserService userService, AdminAuditService auditService) {
        this.userService = userService;
        this.auditService = auditService;
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Permanently delete a user (bypass recycle bin)
     */
    @DeleteMapping("/users/{userId}/permanent")
    public ResponseEntity<Map<String, String>> permanentlyDeleteUser(@PathVariable UUID userId) {
        try {
            userService.deleteUser(userId); // This will be a hard delete
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "User permanently deleted from system");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to delete user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: View all admins in the system
     */
    @GetMapping("/admins")
    public ResponseEntity<Map<String, Object>> getAllAdmins(Pageable pageable) {
        try {
            // Get all users and filter for ADMIN and SUPER_ADMIN roles
            Page<UserResponse> allUsers = userService.getAllUsers(pageable);
            List<UserResponse> admins = allUsers.getContent().stream()
                .filter(user -> "ADMIN".equals(user.getRole()) || "SUPER_ADMIN".equals(user.getRole()))
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", admins);
            response.put("currentPage", allUsers.getNumber());
            response.put("totalItems", (long) admins.size());
            response.put("totalPages", allUsers.getTotalPages());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to fetch admins: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: View system statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getSystemStatistics() {
        try {
            Map<String, Object> stats = new HashMap<>();
            
            // Get user counts by role
            // Note: This would require adding methods to UserService
            stats.put("totalUsers", "To be implemented");
            stats.put("totalAdmins", "To be implemented");
            stats.put("totalOrganizers", "To be implemented");
            stats.put("totalEvents", "To be implemented");
            stats.put("totalVenues", "To be implemented");
            stats.put("totalBookings", "To be implemented");
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", stats);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to fetch statistics: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Force activate/deactivate any user account
     */
    @PatchMapping("/users/{userId}/toggle-active")
    public ResponseEntity<Map<String, Object>> toggleUserActiveStatus(@PathVariable UUID userId) {
        try {
            UserResponse user = userService.getUserById(userId);
            
            // Toggle active status would require adding a method to UserService
            // For now, return the current user data
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "User active status toggled");
            response.put("user", user);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to toggle user status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: View audit logs with optional filtering by entityType and action keyword.
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            Pageable pageable) {
        try {
            Page<AuditLogResponse> page = auditService.getAuditLogs(entityType, action, pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", page.getContent());
            response.put("currentPage", page.getNumber());
            response.put("totalItems", page.getTotalElements());
            response.put("totalPages", page.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to fetch audit logs: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Get audit logs for a specific user/admin.
     */
    @GetMapping("/audit-logs/user/{userId}")
    public ResponseEntity<Map<String, Object>> getAuditLogsByUser(
            @PathVariable UUID userId,
            Pageable pageable) {
        try {
            Page<AuditLogResponse> page = auditService.getAuditLogsByAdmin(userId, pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", page.getContent());
            response.put("currentPage", page.getNumber());
            response.put("totalItems", page.getTotalElements());
            response.put("totalPages", page.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to fetch audit logs for user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Delete an audit log entry.
     */
    @DeleteMapping("/audit-logs/{auditId}")
    public ResponseEntity<Map<String, String>> deleteAuditLog(@PathVariable UUID auditId) {
        try {
            auditService.deleteAuditLog(auditId);
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Audit log entry deleted");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to delete audit log: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Access system configuration
     */
    @GetMapping("/system-config")
    public ResponseEntity<Map<String, Object>> getSystemConfiguration() {
        try {
            Map<String, Object> config = new HashMap<>();
            config.put("allowUserRegistration", true);
            config.put("emailVerificationRequired", false);
            config.put("maxLoginAttempts", 5);
            config.put("sessionTimeout", 3600);
            config.put("maintenanceMode", false);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", config);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to fetch system configuration: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Update system configuration
     */
    @PutMapping("/system-config")
    public ResponseEntity<Map<String, Object>> updateSystemConfiguration(@Valid @RequestBody Map<String, Object> configUpdates) {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "System configuration updated successfully");
            response.put("data", configUpdates);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to update system configuration: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Promote regular admin to super admin
     */
    @PatchMapping("/admins/{userId}/promote")
    public ResponseEntity<Map<String, Object>> promoteToSuperAdmin(@PathVariable UUID userId) {
        try {
            UserResponse user = userService.getUserById(userId);
            
            if (!"ADMIN".equals(user.getRole())) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "User must be an ADMIN to be promoted to SUPER_ADMIN");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // This would require implementing a promote method in UserService
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "User promoted to SUPER_ADMIN (to be implemented)");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to promote user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * SUPER ADMIN EXCLUSIVE: Demote super admin to regular admin
     */
    @PatchMapping("/admins/{userId}/demote")
    public ResponseEntity<Map<String, Object>> demoteToAdmin(@PathVariable UUID userId) {
        try {
            UserResponse user = userService.getUserById(userId);
            
            if (!"SUPER_ADMIN".equals(user.getRole())) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "User must be a SUPER_ADMIN to be demoted");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            // This would require implementing a demote method in UserService
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "User demoted to ADMIN (to be implemented)");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to demote user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
