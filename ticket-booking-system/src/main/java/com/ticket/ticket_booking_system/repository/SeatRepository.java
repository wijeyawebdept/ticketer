package com.ticket.ticket_booking_system.repository;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface SeatRepository extends JpaRepository<Seat, UUID> {
    
    List<Seat> findByEventAndStatus(Event event, Seat.SeatStatus status);
    
    List<Seat> findByEventAndIsBlockedFalse(Event event);
    
    @Query("SELECT s FROM Seat s WHERE s.event = :event AND s.section = :section")
    List<Seat> findByEventAndSection(Event event, String section);
    
    @Query("SELECT s FROM Seat s WHERE s.event = :event AND s.price <= :maxPrice")
    List<Seat> findByEventAndMaxPrice(Event event, BigDecimal maxPrice);
    
    @Query("SELECT COUNT(s) FROM Seat s WHERE s.event = :event AND s.status = 'AVAILABLE'")
    Long countAvailableSeats(Event event);
}