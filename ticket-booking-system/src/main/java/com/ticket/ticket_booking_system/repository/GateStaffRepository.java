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

import com.ticket.ticket_booking_system.entity.GateStaff;

@Repository
public interface GateStaffRepository extends JpaRepository<GateStaff, UUID>, JpaSpecificationExecutor<GateStaff> {

    Optional<GateStaff> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<GateStaff> findByResetPasswordToken(String token);

    @Modifying
    @Transactional
    @Query("UPDATE GateStaff g SET g.lastLoginAt = :timestamp WHERE g.gateStaffId = :gateStaffId")
    int updateLastLoginAt(@Param("gateStaffId") UUID gateStaffId, @Param("timestamp") LocalDateTime timestamp);

    List<GateStaff> findByActive(int active);

    Page<GateStaff> findByActive(int active, Pageable pageable);

    @Query("SELECT g FROM GateStaff g WHERE g.active <> :excludeStatus")
    Page<GateStaff> findByActiveNot(@Param("excludeStatus") int excludeStatus, Pageable pageable);

    @Query("SELECT g FROM GateStaff g WHERE g.active <> :excludeStatus AND (" +
           "LOWER(g.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<GateStaff> searchGateStaff(@Param("search") String search, @Param("excludeStatus") int excludeStatus, Pageable pageable);

    @Query("SELECT g FROM GateStaff g WHERE g.active = :active AND (" +
           "LOWER(g.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<GateStaff> searchGateStaffByActive(@Param("search") String search, @Param("active") int active, Pageable pageable);
}
