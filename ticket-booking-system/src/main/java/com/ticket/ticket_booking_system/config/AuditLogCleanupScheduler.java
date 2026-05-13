package com.ticket.ticket_booking_system.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.ticket.ticket_booking_system.service.AdminAuditService;

import lombok.RequiredArgsConstructor;

/**
 * Scheduled task to manage the growth of the audit log table.
 * Periodically removes old logs based on a retention policy.
 */
@Component
@RequiredArgsConstructor
public class AuditLogCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogCleanupScheduler.class);
    private final AdminAuditService auditService;

    @Value("${audit.log.retention.days:90}")
    private int daysToKeep;

    /**
     * Purge old audit logs daily at 3:00 AM.
     * Cron expression: "0 0 3 * * *" (Second Minute Hour Day Month DayOfWeek)
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupOldLogs() {
        logger.info("Running scheduled audit log cleanup task...");
        try {
            int deletedCount = auditService.purgeOldAuditLogs(daysToKeep);
            logger.info("Scheduled audit log cleanup completed. Deleted {} logs.", deletedCount);
        } catch (Exception e) {
            logger.error("Error during scheduled audit log cleanup: {}", e.getMessage());
        }
    }
}
