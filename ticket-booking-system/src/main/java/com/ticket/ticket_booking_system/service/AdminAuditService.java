package com.ticket.ticket_booking_system.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.ticket.ticket_booking_system.dto.response.AuditLogResponse;

/**
 * Service for tracking admin actions across the system
 * Logs all administrative operations for security and compliance
 */
public interface AdminAuditService {
    
    /**
     * Log an admin action
     * @param adminId
     * @param action
     * @param entityType
     * @param entityId
     * @param details
     */
    void logAction(UUID adminId, String action, String entityType, UUID entityId, String details);
    
    /**
     * Get all audit logs with pagination
     */
    Page<AuditLogResponse> getAllAuditLogs(Pageable pageable);
    
    /**
     * Get audit logs for a specific admin
     */
    Page<AuditLogResponse> getAuditLogsByAdmin(UUID adminId, Pageable pageable);
    
    /**
     * Get audit logs for a specific entity type
     */
    Page<AuditLogResponse> getAuditLogsByEntityType(String entityType, Pageable pageable);
    
    /**
     * Get audit logs for a specific entity
     */
    Page<AuditLogResponse> getAuditLogsByEntity(String entityType, UUID entityId, Pageable pageable);
}
