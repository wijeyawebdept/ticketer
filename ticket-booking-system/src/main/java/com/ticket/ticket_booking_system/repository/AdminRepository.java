package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Admin;

@Repository
public interface AdminRepository extends JpaRepository<Admin, UUID> {
    Optional<Admin> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<Admin> findByEmployeeId(String employeeId);
    boolean existsByEmployeeId(String employeeId);
    
    List<Admin> findByActive(int active);
    Page<Admin> findByActive(int active, Pageable pageable);
    
    // Legacy methods - deprecated, use findByActive instead
    default List<Admin> findByActiveTrue() {
        return findByActive(1);
    }
    
    default Page<Admin> findByActiveTrue(Pageable pageable) {
        return findByActive(1, pageable);
    }
    
    // Find all admins except soft-deleted ones
    @Query("SELECT a FROM Admin a WHERE a.active <> :excludeStatus")
    Page<Admin> findByActiveNot(@Param("excludeStatus") int excludeStatus, Pageable pageable);
}
