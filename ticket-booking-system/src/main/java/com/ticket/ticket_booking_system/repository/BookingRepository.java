package com.ticket.ticket_booking_system.repository;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
    
    Page<Booking> findByUser(User user, Pageable pageable);
    
    Page<Booking> findByEvent(Event event, Pageable pageable);
    
    Page<Booking> findByStatus(Booking.BookingStatus status, Pageable pageable);
    
    Optional<Booking> findByBookingReference(String bookingReference);
    
    @Query("SELECT b FROM Booking b WHERE b.bookingTime BETWEEN :startDate AND :endDate")
    List<Booking> findByBookingDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.event = :event AND b.status = 'CONFIRMED'")
    Long countConfirmedBookingsForEvent(Event event);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.bookingTime >= :today AND b.status = 'CONFIRMED'")
    Long countTodayBookings(LocalDateTime today);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.bookingTime BETWEEN :startDate AND :endDate AND b.status = 'CONFIRMED'")
    Long countBookingsBetweenDates(LocalDateTime startDate, LocalDateTime endDate);
}