package com.ticket.ticket_booking_system.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Admin;

@Repository
public interface AdminRepository extends JpaRepository<Admin, UUID> {
    Optional<Admin> findByUser_Id(UUID userId);
    boolean existsByUser_Id(UUID userId);
    Optional<Admin> findByEmployeeId(String employeeId);
    boolean existsByEmployeeId(String employeeId);
}
