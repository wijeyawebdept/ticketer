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
    
    // Fetch bookings with all relationships eagerly loaded to avoid lazy loading issues
    @Query("SELECT DISTINCT b FROM Booking b " +
           "LEFT JOIN FETCH b.user " +
           "LEFT JOIN FETCH b.event e " +
           "LEFT JOIN FETCH e.venue " +
           "LEFT JOIN FETCH b.eventSchedule " +
           "LEFT JOIN FETCH b.bookingSeats " +
           "WHERE b.user = :user " +
           "ORDER BY b.bookingTime DESC")
    List<Booking> findByUserWithDetails(User user);
    
    Page<Booking> findByUser(User user, Pageable pageable);
    
    Page<Booking> findByEvent(Event event, Pageable pageable);
    
    Page<Booking> findByStatus(Booking.BookingStatus status, Pageable pageable);
    
    Optional<Booking> findByBookingReference(String bookingReference);
    
    @Query("SELECT b FROM Booking b WHERE b.bookingTime BETWEEN :startDate AND :endDate")
    List<Booking> findByBookingDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.event = :event AND b.status = 'CONFIRMED'")
    Long countConfirmedBookingsForEvent(Event event);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.bookingTime >= :today AND b.status != 'CANCELLED'")
    Long countTodayBookings(LocalDateTime today);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.bookingTime BETWEEN :startDate AND :endDate AND b.status != 'CANCELLED'")
    Long countBookingsBetweenDates(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT COUNT(b) FROM Booking b JOIN b.event e WHERE e.organizer.organizerId = :organizerId " +
           "AND b.bookingTime BETWEEN :startDate AND :endDate AND b.status != 'CANCELLED'")
    Long countBookingsBetweenDatesByOrganizer(LocalDateTime startDate, LocalDateTime endDate, UUID organizerId);
    
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
    
    // Count booked shared area tickets for a schedule and shared area number
    @Query("SELECT COUNT(bs) FROM BookingSeat bs WHERE bs.booking.eventSchedule.scheduleId = :scheduleId " +
           "AND bs.isSharedAreaTicket = true AND bs.sharedAreaNumber = :sharedAreaNumber " +
           "AND bs.booking.status IN ('CONFIRMED', 'PENDING')")
    Long countBookedSharedAreaTickets(UUID scheduleId, Integer sharedAreaNumber);

    // Fetch a single booking with ALL lazy associations eagerly loaded (for email / receipt)
    @Query("SELECT DISTINCT b FROM Booking b " +
           "LEFT JOIN FETCH b.user " +
           "LEFT JOIN FETCH b.event e " +
           "LEFT JOIN FETCH e.venue " +
           "LEFT JOIN FETCH e.organizer " +
           "LEFT JOIN FETCH b.eventSchedule " +
           "LEFT JOIN FETCH b.bookingSeats bs " +
           "WHERE b.bookingId = :bookingId")
    Optional<Booking> findByIdWithDetails(UUID bookingId);

    // Stale PENDING bookings whose payment was never completed (abandoned/failed checkout) -
    // used to auto-release their seats back to availability.
    @Query("SELECT b FROM Booking b WHERE b.status = 'PENDING' AND b.bookingTime < :cutoff")
    List<Booking> findStalePendingBookings(LocalDateTime cutoff);

    // Used when permanently deleting an event (recycle bin) - its bookings must be
    // removed first (cascades to BookingSeat/Transaction) to avoid an FK violation.
    List<Booking> findByEvent_EventId(UUID eventId);

    // Used when permanently deleting a user (recycle bin) - their bookings are kept
    // for revenue/audit history but detached from the user record being removed.
    List<Booking> findByUser_Id(UUID userId);
}