package com.ticket.ticket_booking_system.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.User;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID>, JpaSpecificationExecutor<Booking> {
    
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
    
    // Organizer-specific queries
    Page<Booking> findByEvent_Organizer_OrganizerId(UUID organizerId, Pageable pageable);
    
    long countByEvent_Organizer_OrganizerId(UUID organizerId);
    
    long countByEvent_Organizer_OrganizerIdAndStatus(UUID organizerId, Booking.BookingStatus status);
    
    List<Booking> findByEvent_Organizer_OrganizerIdAndStatus(UUID organizerId, Booking.BookingStatus status);
    
    // Schedule-specific queries
    Page<Booking> findByEventSchedule_ScheduleId(UUID scheduleId, Pageable pageable);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.eventSchedule.scheduleId = :scheduleId AND b.status = 'CONFIRMED'")
    Long countConfirmedBookingsForSchedule(UUID scheduleId);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.eventSchedule.scheduleId = :scheduleId")
    Long countAllBookingsForSchedule(UUID scheduleId);
    
    @Query("SELECT b FROM Booking b WHERE b.event.eventId = :eventId AND b.eventSchedule.scheduleId = :scheduleId")
    List<Booking> findByEventAndSchedule(UUID eventId, UUID scheduleId);
    
    Page<Booking> findByEvent_Organizer_OrganizerIdAndStatus(UUID organizerId, Booking.BookingStatus status, Pageable pageable);
    
    List<Booking> findTopByEvent_Organizer_OrganizerIdOrderByBookingTimeDesc(UUID organizerId, Pageable pageable);
}