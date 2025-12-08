package com.ticket.ticket_booking_system.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.RecycleBin;

@Repository
public interface RecycleBinRepository extends JpaRepository<RecycleBin, UUID> {
    List<RecycleBin> findByEntityType(String entityType);
    List<RecycleBin> findByDeletedBy(UUID deletedBy);
    List<RecycleBin> findByDeletedAtAfter(LocalDateTime date);
    List<RecycleBin> findByEntityTypeOrderByDeletedAtDesc(String entityType);
    List<RecycleBin> findAllByOrderByDeletedAtDesc();
    java.util.Optional<RecycleBin> findByEntityTypeAndEntityId(String entityType, UUID entityId);
}
