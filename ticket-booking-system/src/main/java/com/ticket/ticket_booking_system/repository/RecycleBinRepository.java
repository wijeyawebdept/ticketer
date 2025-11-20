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
    
    // Filter by owner role
    List<RecycleBin> findByAdminIdOrderByDeletedAtDesc(UUID adminId);
    List<RecycleBin> findByOrganizerIdOrderByDeletedAtDesc(UUID organizerId);
    List<RecycleBin> findByOrganizerEmployeeIdOrderByDeletedAtDesc(UUID organizerEmployeeId);
    List<RecycleBin> findByUserIdOrderByDeletedAtDesc(UUID userId);
    
    // Filter by owner role and entity type
    List<RecycleBin> findByAdminIdAndEntityTypeOrderByDeletedAtDesc(UUID adminId, String entityType);
    List<RecycleBin> findByOrganizerIdAndEntityTypeOrderByDeletedAtDesc(UUID organizerId, String entityType);
    List<RecycleBin> findByOrganizerEmployeeIdAndEntityTypeOrderByDeletedAtDesc(UUID organizerEmployeeId, String entityType);
    List<RecycleBin> findByUserIdAndEntityTypeOrderByDeletedAtDesc(UUID userId, String entityType);
    
    // Delete operations by owner
    void deleteByAdminId(UUID adminId);
    void deleteByOrganizerId(UUID organizerId);
    void deleteByOrganizerEmployeeId(UUID organizerEmployeeId);
    void deleteByUserId(UUID userId);
    
    // Delete operations by owner and entity type
    void deleteByAdminIdAndEntityType(UUID adminId, String entityType);
    void deleteByOrganizerIdAndEntityType(UUID organizerId, String entityType);
    void deleteByOrganizerEmployeeIdAndEntityType(UUID organizerEmployeeId, String entityType);
    void deleteByUserIdAndEntityType(UUID userId, String entityType);
}
