package com.ticket.ticket_booking_system.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.entity.OrganizerEmployee;

@Repository
public interface OrganizerEmployeeRepository extends JpaRepository<OrganizerEmployee, UUID>, JpaSpecificationExecutor<OrganizerEmployee> {
    Optional<OrganizerEmployee> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<OrganizerEmployee> findByResetPasswordToken(String token);
    
    // Update last login timestamp
    @Modifying
    @Transactional
    @Query("UPDATE OrganizerEmployee oe SET oe.lastLoginAt = :timestamp WHERE oe.employeeId = :employeeId")
    int updateLastLoginAt(@Param("employeeId") UUID employeeId, @Param("timestamp") LocalDateTime timestamp);
    
    Page<OrganizerEmployee> findByActive(int active, Pageable pageable);
    
    Page<OrganizerEmployee> findByOrganizer_OrganizerId(UUID organizerId, Pageable pageable);
    
    Page<OrganizerEmployee> findByOrganizer_OrganizerIdAndActive(UUID organizerId, int active, Pageable pageable);
    
    long countByActive(int active);
    
    long countByOrganizer_OrganizerId(UUID organizerId);
    
    long countByOrganizer_OrganizerIdAndActive(UUID organizerId, int active);
    
    // Legacy methods - deprecated, use methods with int active parameter instead
    default Page<OrganizerEmployee> findByActiveTrue(Pageable pageable) {
        return findByActive(1, pageable);
    }
    
    default Page<OrganizerEmployee> findByOrganizer_OrganizerIdAndActiveTrue(UUID organizerId, Pageable pageable) {
        return findByOrganizer_OrganizerIdAndActive(organizerId, 1, pageable);
    }
    
    default long countByActiveTrue() {
        return countByActive(1);
    }
    
    default long countByOrganizer_OrganizerIdAndActiveTrue(UUID organizerId) {
        return countByOrganizer_OrganizerIdAndActive(organizerId, 1);
    }
    
    // Find all employees of a specific organizer (including inactive ones)
    List<OrganizerEmployee> findByOrganizer_OrganizerId(UUID organizerId);
    
    // Delete all employees of a specific organizer
    void deleteByOrganizer_OrganizerId(UUID organizerId);
    
    // Find all employees except soft-deleted ones
    @org.springframework.data.jpa.repository.Query("SELECT e FROM OrganizerEmployee e WHERE e.active <> :excludeStatus")
    Page<OrganizerEmployee> findByActiveNot(@org.springframework.data.repository.query.Param("excludeStatus") int excludeStatus, Pageable pageable);
    
    // Find employees by organizer excluding soft-deleted ones
    @org.springframework.data.jpa.repository.Query("SELECT e FROM OrganizerEmployee e WHERE e.organizer.organizerId = :organizerId AND e.active <> -1")
    Page<OrganizerEmployee> findByOrganizer_OrganizerIdAndActiveNot(@org.springframework.data.repository.query.Param("organizerId") UUID organizerId, Pageable pageable);
}
