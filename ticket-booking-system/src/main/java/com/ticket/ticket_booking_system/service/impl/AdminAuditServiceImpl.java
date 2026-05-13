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
        logActionWithDetails(performedBy, action, entityType, entityId, null, details, null);
    }

    @Override
    public void logActionWithDetails(UUID performedBy, String action, String entityType,
                                     UUID entityId, String oldValues, String newValues,
                                     String ipAddress) {
        try {
            SystemAuditLog log = SystemAuditLog.builder()
                    .performedBy(performedBy)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .oldValues(oldValues)
                    .newValues(newValues)
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
