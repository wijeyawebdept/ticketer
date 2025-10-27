package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Organizer;

@Repository
public interface OrganizerRepository extends JpaRepository<Organizer, UUID> {
    Optional<Organizer> findByUser_Id(UUID userId);
    boolean existsByUser_Id(UUID userId);
    List<Organizer> findByParentOrganizer_OrganizerId(UUID parentOrganizerId);
    List<Organizer> findByIsEmployee(Boolean isEmployee);
    List<Organizer> findByIsVerified(Boolean isVerified);
}
