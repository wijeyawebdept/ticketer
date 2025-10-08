package com.ticket.ticket_booking_system.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Seat;

@Repository
public interface SeatRepository extends JpaRepository<Seat, UUID> {
    
    // Legacy methods (keeping for backward compatibility)
    List<Seat> findByEventAndIsBlockedFalse(Event event);
    
    @Query("SELECT s FROM Seat s WHERE s.event = :event AND s.section = :section")
    List<Seat> findByEventAndSection(Event event, String section);
    
    @Query("SELECT s FROM Seat s WHERE s.event = :event AND s.price <= :maxPrice")
    List<Seat> findByEventAndMaxPrice(Event event, BigDecimal maxPrice);
    
    // New methods for dynamic seat management
    List<Seat> findByEvent_EventId(UUID eventId);
    
    List<Seat> findByVenue_VenueIdAndEventIsNull(UUID venueId);
    
    List<Seat> findByVenue_VenueId(UUID venueId);
    
    @Query("SELECT s FROM Seat s WHERE s.event.eventId = :eventId AND s.isAvailable = true AND s.isBlocked = false")
    List<Seat> findAvailableSeatsByEventId(@Param("eventId") UUID eventId);
    
    @Query("SELECT s FROM Seat s WHERE s.holdExpiresAt IS NOT NULL AND s.holdExpiresAt < :now")
    List<Seat> findExpiredHolds(@Param("now") LocalDateTime now);
    
    @Modifying
    @Query("UPDATE Seat s SET s.isAvailable = true, s.holdExpiresAt = null, s.heldByUser = null WHERE s.holdExpiresAt < :now")
    int releaseExpiredHolds(@Param("now") LocalDateTime now);
    
    @Query("SELECT COUNT(s) FROM Seat s WHERE s.event.eventId = :eventId AND s.isAvailable = false")
    long countBookedSeatsByEventId(@Param("eventId") UUID eventId);
    
    @Query("SELECT COUNT(s) FROM Seat s WHERE s.event.eventId = :eventId")
    long countTotalSeatsByEventId(@Param("eventId") UUID eventId);
    
    @Query("SELECT COUNT(s) FROM Seat s WHERE s.event = :event AND s.isAvailable = true AND s.isBlocked = false")
    Long countAvailableSeats(Event event);
}