package com.ticket.ticket_booking_system.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.OrganizerEmployee;

@Repository
public interface OrganizerEmployeeRepository extends JpaRepository<OrganizerEmployee, UUID> {
    Optional<OrganizerEmployee> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    Page<OrganizerEmployee> findByActiveTrue(Pageable pageable);
    
    Page<OrganizerEmployee> findByOrganizer_OrganizerId(UUID organizerId, Pageable pageable);
    
    Page<OrganizerEmployee> findByOrganizer_OrganizerIdAndActiveTrue(UUID organizerId, Pageable pageable);
    
    long countByActiveTrue();
    
    long countByOrganizer_OrganizerId(UUID organizerId);
    
    long countByOrganizer_OrganizerIdAndActiveTrue(UUID organizerId);
}
