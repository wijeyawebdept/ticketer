package com.ticket.ticket_booking_system.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final EventRepository eventRepository;

    /**
     * Get all bookings for admin with filters
     */
    public Page<Booking> getAllBookingsForAdmin(String eventId, String userId, String status, String search, Pageable pageable) {
        Specification<Booking> spec = createBookingSpecification(eventId, userId, status, search);
        return bookingRepository.findAll(spec, pageable);
    }

    /**
     * Get booking by ID
     */
    public Booking getBookingById(String bookingId) {
        UUID uuid = UUID.fromString(bookingId);
        return bookingRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("Booking not found with ID: " + bookingId));
    }

    /**
     * Update booking status
     */
    public Booking updateBookingStatus(String bookingId, String status) {
        Booking booking = getBookingById(bookingId);
        
        try {
            Booking.BookingStatus bookingStatus = Booking.BookingStatus.valueOf(status.toUpperCase());
            booking.setStatus(bookingStatus);
            
            if (bookingStatus == Booking.BookingStatus.CANCELLED) {
                booking.setCancelledAt(LocalDateTime.now());
                booking.setCancellationReason("Cancelled by admin");
            }
            
            return bookingRepository.save(booking);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid booking status: " + status);
        }
    }

    /**
     * Cancel a booking
     */
    public Booking cancelBooking(String bookingId) {
        return updateBookingStatus(bookingId, "CANCELLED");
    }

    /**
     * Mark booking as attended
     */
    public Booking markAsAttended(String bookingId) {
        Booking booking = getBookingById(bookingId);
        booking.setAttended(true);
        return bookingRepository.save(booking);
    }

    /**
     * Get bookings by event ID
     */
    public List<Booking> getBookingsByEventId(String eventId) {
        UUID uuid = UUID.fromString(eventId);
        Event event = eventRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("Event not found with ID: " + eventId));
        
        return bookingRepository.findByEvent(event, Pageable.unpaged()).getContent();
    }

    /**
     * Get booking statistics
     */
    public Map<String, Object> getBookingStatistics(String eventId, String dateFrom, String dateTo) {
        Map<String, Object> statistics = new HashMap<>();
        
        try {
            // Total bookings
            long totalBookings = bookingRepository.count();
            statistics.put("totalBookings", totalBookings);
            
            // Today's bookings
            LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
            long todayBookings = bookingRepository.countTodayBookings(startOfDay);
            statistics.put("todayBookings", todayBookings);
            
            // Confirmed bookings
            long confirmedBookings = bookingRepository.findByStatus(Booking.BookingStatus.CONFIRMED, Pageable.unpaged()).getTotalElements();
            statistics.put("confirmedBookings", confirmedBookings);
            
            // Cancelled bookings
            long cancelledBookings = bookingRepository.findByStatus(Booking.BookingStatus.CANCELLED, Pageable.unpaged()).getTotalElements();
            statistics.put("cancelledBookings", cancelledBookings);
            
            // Date range statistics if provided
            if (dateFrom != null && dateTo != null) {
                LocalDateTime fromDate = LocalDateTime.parse(dateFrom + "T00:00:00");
                LocalDateTime toDate = LocalDateTime.parse(dateTo + "T23:59:59");
                
                long rangeBookings = bookingRepository.countBookingsBetweenDates(fromDate, toDate);
                statistics.put("dateRangeBookings", rangeBookings);
                statistics.put("dateFrom", dateFrom);
                statistics.put("dateTo", dateTo);
            }
            
            // Event specific statistics if provided
            if (eventId != null) {
                UUID uuid = UUID.fromString(eventId);
                Event event = eventRepository.findById(uuid).orElse(null);
                if (event != null) {
                    long eventBookings = bookingRepository.countConfirmedBookingsForEvent(event);
                    statistics.put("eventBookings", eventBookings);
                    statistics.put("eventName", event.getName());
                }
            }
            
        } catch (Exception e) {
            log.error("Error calculating booking statistics", e);
            statistics.put("error", "Error calculating statistics: " + e.getMessage());
        }
        
        return statistics;
    }

    /**
     * Delete a booking (admin only)
     */
    public void deleteBooking(String bookingId) {
        UUID uuid = UUID.fromString(bookingId);
        if (!bookingRepository.existsById(uuid)) {
            throw new RuntimeException("Booking not found with ID: " + bookingId);
        }
        bookingRepository.deleteById(uuid);
    }

    /**
     * Create specification for dynamic filtering
     */
    private Specification<Booking> createBookingSpecification(String eventId, String userId, String status, String search) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by event ID
            if (eventId != null && !eventId.trim().isEmpty()) {
                try {
                    UUID eventUuid = UUID.fromString(eventId);
                    predicates.add(criteriaBuilder.equal(root.get("event").get("eventId"), eventUuid));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid event ID format: " + eventId);
                }
            }

            // Filter by user ID
            if (userId != null && !userId.trim().isEmpty()) {
                try {
                    UUID userUuid = UUID.fromString(userId);
                    predicates.add(criteriaBuilder.equal(root.get("user").get("id"), userUuid));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid user ID format: " + userId);
                }
            }

            // Filter by status
            if (status != null && !status.trim().isEmpty()) {
                try {
                    Booking.BookingStatus bookingStatus = Booking.BookingStatus.valueOf(status.toUpperCase());
                    predicates.add(criteriaBuilder.equal(root.get("status"), bookingStatus));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid booking status: " + status);
                }
            }

            // Search in booking reference, user details, or event title
            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                Predicate searchPredicate = criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("bookingReference")), searchPattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("user").get("firstName")), searchPattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("user").get("lastName")), searchPattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("user").get("email")), searchPattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("event").get("name")), searchPattern)
                );
                predicates.add(searchPredicate);
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}