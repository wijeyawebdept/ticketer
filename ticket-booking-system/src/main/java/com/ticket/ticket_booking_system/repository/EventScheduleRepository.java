package com.ticket.ticket_booking_system.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.EventSchedule.ScheduleStatus;

@Repository
public interface EventScheduleRepository extends JpaRepository<EventSchedule, UUID> {

    // Find all schedules for a specific event (not deleted)
    List<EventSchedule> findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(UUID eventId);

    // Find active schedules for an event
    List<EventSchedule> findByEvent_EventIdAndStatusAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(
        UUID eventId, ScheduleStatus status
    );

    // Find schedules by date range
    @Query("SELECT es FROM EventSchedule es WHERE es.event.eventId = :eventId " +
           "AND es.scheduleDate BETWEEN :startDate AND :endDate " +
           "AND es.isDeleted = false " +
           "ORDER BY es.scheduleDate ASC, es.startTime ASC")
    List<EventSchedule> findSchedulesByDateRange(
        @Param("eventId") UUID eventId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    // Find upcoming schedules for an event
    @Query("SELECT es FROM EventSchedule es WHERE es.event.eventId = :eventId " +
           "AND es.scheduleDate >= :today " +
           "AND es.status = 'ACTIVE' " +
           "AND es.isDeleted = false " +
           "ORDER BY es.scheduleDate ASC, es.startTime ASC")
    List<EventSchedule> findUpcomingSchedules(
        @Param("eventId") UUID eventId,
        @Param("today") LocalDate today
    );

    // Find bookable schedules (active with available seats)
    @Query("SELECT es FROM EventSchedule es WHERE es.event.eventId = :eventId " +
           "AND es.scheduleDate >= :today " +
           "AND es.status = 'ACTIVE' " +
           "AND es.availableSeats > 0 " +
           "AND es.isDeleted = false " +
           "ORDER BY es.scheduleDate ASC, es.startTime ASC")
    List<EventSchedule> findBookableSchedules(
        @Param("eventId") UUID eventId,
        @Param("today") LocalDate today
    );

    // Count active schedules for an event
    long countByEvent_EventIdAndStatusAndIsDeletedFalse(UUID eventId, ScheduleStatus status);

    // Check if event has any schedules
    boolean existsByEvent_EventIdAndIsDeletedFalse(UUID eventId);

    // Find schedules for organizer's events
    @Query("SELECT es FROM EventSchedule es WHERE es.event.organizer.organizerId = :organizerId " +
           "AND es.isDeleted = false " +
           "ORDER BY es.scheduleDate ASC, es.startTime ASC")
    List<EventSchedule> findByOrganizerId(@Param("organizerId") UUID organizerId);

    // Find schedule by ID and organizer (for ownership verification)
    Optional<EventSchedule> findByScheduleIdAndEvent_Organizer_OrganizerIdAndIsDeletedFalse(
        UUID scheduleId, UUID organizerId
    );

    // Get total capacity for an event across all schedules
    @Query("SELECT COALESCE(SUM(es.capacity), 0) FROM EventSchedule es " +
           "WHERE es.event.eventId = :eventId AND es.isDeleted = false")
    Integer getTotalCapacityForEvent(@Param("eventId") UUID eventId);

    // Get total available seats for an event across all schedules
    @Query("SELECT COALESCE(SUM(es.availableSeats), 0) FROM EventSchedule es " +
           "WHERE es.event.eventId = :eventId " +
           "AND es.status = 'ACTIVE' " +
           "AND es.isDeleted = false")
    Integer getTotalAvailableSeatsForEvent(@Param("eventId") UUID eventId);

    // Delete all schedules for a specific event (for permanent deletion)
    void deleteByEvent_EventId(UUID eventId);
}
