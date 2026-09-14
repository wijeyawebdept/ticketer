package com.ticket.ticket_booking_system.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.GateStaffAssignment;

@Repository
public interface GateStaffAssignmentRepository extends JpaRepository<GateStaffAssignment, UUID> {

    @Query("SELECT a FROM GateStaffAssignment a " +
           "JOIN FETCH a.gateStaff " +
           "JOIN FETCH a.event " +
           "LEFT JOIN FETCH a.eventSchedule " +
           "WHERE (a.isActive = true OR a.isActive IS NULL) " +
           "ORDER BY a.assignedAt DESC")
    List<GateStaffAssignment> findAllActiveWithDetails();

    @Query("SELECT a FROM GateStaffAssignment a " +
           "JOIN FETCH a.gateStaff " +
           "JOIN FETCH a.event " +
           "LEFT JOIN FETCH a.eventSchedule " +
           "WHERE a.event.eventId = :eventId AND (a.isActive = true OR a.isActive IS NULL)")
    List<GateStaffAssignment> findByEventId(@Param("eventId") UUID eventId);

    @Query("SELECT a FROM GateStaffAssignment a " +
           "JOIN FETCH a.gateStaff " +
           "JOIN FETCH a.event " +
           "LEFT JOIN FETCH a.eventSchedule " +
           "WHERE a.eventSchedule.scheduleId = :scheduleId AND (a.isActive = true OR a.isActive IS NULL)")
    List<GateStaffAssignment> findByScheduleId(@Param("scheduleId") UUID scheduleId);

    @Query("SELECT a FROM GateStaffAssignment a " +
           "JOIN FETCH a.event e " +
           "LEFT JOIN FETCH a.eventSchedule s " +
           "WHERE a.gateStaff.gateStaffId = :staffUserId AND (a.isActive = true OR a.isActive IS NULL)")
    List<GateStaffAssignment> findByStaffUserId(@Param("staffUserId") UUID staffUserId);

    @Query("SELECT DISTINCT a.event FROM GateStaffAssignment a " +
           "WHERE a.gateStaff.gateStaffId = :staffUserId AND (a.isActive = true OR a.isActive IS NULL)")
    List<Event> findAssignedEventsByStaffId(@Param("staffUserId") UUID staffUserId);

    @Query("SELECT COUNT(a) > 0 FROM GateStaffAssignment a " +
           "WHERE a.gateStaff.gateStaffId = :staffUserId " +
           "AND a.event.eventId = :eventId " +
           "AND (a.eventSchedule IS NULL OR a.eventSchedule.scheduleId = :scheduleId) " +
           "AND (a.isActive = true OR a.isActive IS NULL)")
    boolean isStaffAssignedToSchedule(
            @Param("staffUserId") UUID staffUserId,
            @Param("eventId") UUID eventId,
            @Param("scheduleId") UUID scheduleId);

    @Query("SELECT COUNT(a) > 0 FROM GateStaffAssignment a " +
           "WHERE a.gateStaff.gateStaffId = :staffUserId " +
           "AND a.event.eventId = :eventId " +
           "AND (a.isActive = true OR a.isActive IS NULL)")
    boolean isStaffAssignedToEvent(
            @Param("staffUserId") UUID staffUserId,
            @Param("eventId") UUID eventId);

    @Query("SELECT a FROM GateStaffAssignment a " +
           "WHERE a.gateStaff.gateStaffId = :staffUserId " +
           "AND a.event.eventId = :eventId " +
           "AND (a.eventSchedule IS NULL AND :scheduleId IS NULL OR a.eventSchedule.scheduleId = :scheduleId) " +
           "AND (a.isActive = true OR a.isActive IS NULL)")
    Optional<GateStaffAssignment> findExistingAssignment(
            @Param("staffUserId") UUID staffUserId,
            @Param("eventId") UUID eventId,
            @Param("scheduleId") UUID scheduleId);

    @Query("SELECT COUNT(a) > 0 FROM GateStaffAssignment a " +
           "WHERE a.gateStaff.gateStaffId = :staffUserId " +
           "AND (a.isActive = true OR a.isActive IS NULL)")
    boolean hasActiveAssignments(@Param("staffUserId") UUID staffUserId);

    void deleteByGateStaff_GateStaffId(UUID gateStaffId);
}
