package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Organizer;

@Repository
public interface OrganizerRepository extends JpaRepository<Organizer, UUID> {
    Optional<Organizer> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Organizer> findByParentOrganizer_OrganizerId(UUID parentOrganizerId);
    List<Organizer> findByIsEmployee(Boolean isEmployee);
    List<Organizer> findByIsVerified(Boolean isVerified);
    List<Organizer> findByActiveTrue();
    Page<Organizer> findByActiveTrue(Pageable pageable);
}
