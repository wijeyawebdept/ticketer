package com.ticket.ticket_booking_system.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.ticket.ticket_booking_system.dto.response.AuditLogResponse;

/**
 * Service for tracking admin actions across the system.
 * Logs all administrative operations for security and compliance.
 */
public interface AdminAuditService {

    /**
     * Log an admin/system action with basic details.
     */
    void logAction(UUID performedBy, String action, String entityType, UUID entityId, String details);

    void logAction(UUID performedBy, String action, String entityType, UUID entityId, String details, String ipAddress);

    /**
     * Log an action with full old/new value diff and IP address capture.
     */
    void logActionWithDetails(UUID performedBy, String action, String entityType,
                              UUID entityId, String oldValues, String newValues, String ipAddress);

    /**
     * Get all audit logs with pagination (filtered by optional entityType and action).
     */
    Page<AuditLogResponse> getAuditLogs(String entityType, String action, Pageable pageable);

    /**
     * Get all audit logs with pagination.
     */
    Page<AuditLogResponse> getAllAuditLogs(Pageable pageable);

    /**
     * Get audit logs for a specific admin/user.
     */
    Page<AuditLogResponse> getAuditLogsByAdmin(UUID performedBy, Pageable pageable);

    /**
     * Get audit logs for a specific entity type.
     */
    Page<AuditLogResponse> getAuditLogsByEntityType(String entityType, Pageable pageable);

    /**
     * Get audit logs for a specific entity.
     */
    Page<AuditLogResponse> getAuditLogsByEntity(String entityType, UUID entityId, Pageable pageable);

    void deleteAuditLog(UUID auditId);
    
    /**
     * Purge audit logs older than a certain number of days.
     * Returns the number of logs deleted.
     */
    int purgeOldAuditLogs(int daysToKeep);
}
