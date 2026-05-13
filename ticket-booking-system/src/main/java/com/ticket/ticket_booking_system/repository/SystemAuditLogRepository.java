package com.ticket.ticket_booking_system.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.SystemAuditLog;

@Repository
public interface SystemAuditLogRepository extends JpaRepository<SystemAuditLog, UUID> {

    Page<SystemAuditLog> findByPerformedBy(UUID performedBy, Pageable pageable);

    Page<SystemAuditLog> findByEntityType(String entityType, Pageable pageable);

    Page<SystemAuditLog> findByEntityTypeAndEntityId(String entityType, UUID entityId, Pageable pageable);

    @Query(value = "SELECT * FROM system_audit_log s WHERE " +
           "(CAST(:entityType AS TEXT) IS NULL OR s.entity_type = CAST(:entityType AS TEXT)) AND " +
           "(CAST(:action AS TEXT) IS NULL OR s.action ILIKE CONCAT('%', CAST(:action AS TEXT), '%'))",
           countQuery = "SELECT count(*) FROM system_audit_log s WHERE " +
                        "(CAST(:entityType AS TEXT) IS NULL OR s.entity_type = CAST(:entityType AS TEXT)) AND " +
                        "(CAST(:action AS TEXT) IS NULL OR s.action ILIKE CONCAT('%', CAST(:action AS TEXT), '%'))",
           nativeQuery = true)
    Page<SystemAuditLog> findByFilters(
            @Param("entityType") String entityType,
            @Param("action") String action,
            Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM SystemAuditLog s WHERE s.createdAt < :cutoffDate")
    int deleteByCreatedAtBefore(@Param("cutoffDate") java.time.LocalDateTime cutoffDate);
}
