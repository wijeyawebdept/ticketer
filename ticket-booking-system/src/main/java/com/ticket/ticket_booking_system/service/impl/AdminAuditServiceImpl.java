package com.ticket.ticket_booking_system.service.impl;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.response.AuditLogResponse;
import com.ticket.ticket_booking_system.entity.SystemAuditLog;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.SystemAuditLogRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.AdminAuditService;

@Service
@Transactional
public class AdminAuditServiceImpl implements AdminAuditService {

    private static final Logger logger = LoggerFactory.getLogger(AdminAuditServiceImpl.class);

    private final SystemAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AdminAuditServiceImpl(SystemAuditLogRepository auditLogRepository,
                                 UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void logAction(UUID performedBy, String action, String entityType,
                          UUID entityId, String details) {
        logAction(performedBy, action, entityType, entityId, details, null);
    }

    @Override
    public void logAction(UUID performedBy, String action, String entityType,
                          UUID entityId, String details, String ipAddress) {
        // Wrap plain text details in a JSON object to satisfy the JSONB column requirement
        String jsonDetails = null;
        if (details != null) {
            jsonDetails = "{\"message\": \"" + details.replace("\"", "\\\"").replace("\n", "\\n") + "\"}";
        }
        logActionWithDetails(performedBy, action, entityType, entityId, null, jsonDetails, ipAddress);
    }

    @Override
    public void logActionWithDetails(UUID performedBy, String action, String entityType,
                                     UUID entityId, String oldValues, String newValues,
                                     String ipAddress) {
        try {
            // Ensure values are valid JSON if they aren't already
            String processedOld = ensureJson(oldValues);
            String processedNew = ensureJson(newValues);

            SystemAuditLog log = SystemAuditLog.builder()
                    .performedBy(performedBy)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .oldValues(processedOld)
                    .newValues(processedNew)
                    .ipAddress(ipAddress)
                    .build();
            auditLogRepository.save(log);
            logger.debug("Audit log created: action={}, entityType={}, entityId={}",
                    action, entityType, entityId);
        } catch (Exception e) {
            // Never let audit logging failure break the main operation
            logger.error("Failed to save audit log for action={}, entityType={}: {}",
                    action, entityType, e.getMessage());
        }
    }

    /**
     * Simple helper to ensure a string is valid JSON for PostgreSQL JSONB columns.
     * If it doesn't look like JSON (doesn't start with { or [), wrap it in a message object.
     */
    private String ensureJson(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String trimmed = value.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || 
            (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            return trimmed;
        }
        // Not a JSON object/array, wrap it
        return "{\"message\": \"" + value.replace("\"", "\\\"").replace("\n", "\\n") + "\"}";
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(String entityType, String action, Pageable pageable) {
        Page<SystemAuditLog> logs = auditLogRepository.findByFilters(entityType, action, pageable);
        return logs.map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAllAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByAdmin(UUID performedBy, Pageable pageable) {
        return auditLogRepository.findByPerformedBy(performedBy, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByEntityType(String entityType, Pageable pageable) {
        return auditLogRepository.findByEntityType(entityType, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByEntity(String entityType, UUID entityId, Pageable pageable) {
        return auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId, pageable)
                .map(this::toResponse);
    }

    @Override
    public void deleteAuditLog(UUID auditId) {
        if (!auditLogRepository.existsById(auditId)) {
            throw new RuntimeException("Audit log not found with ID: " + auditId);
        }
        auditLogRepository.deleteById(auditId);
        logger.info("Audit log deleted: {}", auditId);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private AuditLogResponse toResponse(SystemAuditLog log) {
        String performedByName = null;
        String performedByEmail = null;

        if (log.getPerformedBy() != null) {
            try {
                User user = userRepository.findById(log.getPerformedBy()).orElse(null);
                if (user != null) {
                    performedByName = user.getFirstName() + " " + user.getLastName();
                    performedByEmail = user.getEmail();
                }
            } catch (Exception e) {
                logger.warn("Could not resolve user for audit log {}: {}", log.getAuditId(), e.getMessage());
            }
        }

        return AuditLogResponse.builder()
                .auditId(log.getAuditId())
                .performedBy(log.getPerformedBy())
                .performedByName(performedByName)
                .performedByEmail(performedByEmail)
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .oldValues(log.getOldValues())
                .newValues(log.getNewValues())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
