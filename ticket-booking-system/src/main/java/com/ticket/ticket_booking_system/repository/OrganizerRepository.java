package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Organizer;

@Repository
public interface OrganizerRepository extends JpaRepository<Organizer, UUID>, JpaSpecificationExecutor<Organizer> {
    Optional<Organizer> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Organizer> findByParentOrganizer_OrganizerId(UUID parentOrganizerId);
    List<Organizer> findByIsEmployee(Boolean isEmployee);
    List<Organizer> findByIsVerified(Boolean isVerified);
    
    List<Organizer> findByActive(int active);
    Page<Organizer> findByActive(int active, Pageable pageable);
    
    // Legacy methods - deprecated, use findByActive instead
    default List<Organizer> findByActiveTrue() {
        return findByActive(1);
    }
    
    default Page<Organizer> findByActiveTrue(Pageable pageable) {
        return findByActive(1, pageable);
    }
    
    // Find all organizers except soft-deleted ones
    @Query("SELECT o FROM Organizer o WHERE o.active <> :excludeStatus")
    Page<Organizer> findByActiveNot(@Param("excludeStatus") int excludeStatus, Pageable pageable);
}
