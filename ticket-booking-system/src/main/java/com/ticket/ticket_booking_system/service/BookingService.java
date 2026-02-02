package com.ticket.ticket_booking_system.service;

import java.math.BigDecimal;
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

import com.ticket.ticket_booking_system.dto.request.ConfirmBookingRequest;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.BookingSeat;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.Seat;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;

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
    private final EventScheduleRepository eventScheduleRepository;
    private final EventScheduleService eventScheduleService;
    private final UserRepository userRepository;
    private final SeatRepository seatRepository;

    /**
     * Get all bookings for admin with filters
     */
    public Page<Booking> getAllBookingsForAdmin(String eventId, String userId, String status, String search, Pageable pageable) {
        Specification<Booking> spec = createBookingSpecification(eventId, userId, status, search, null);
        return bookingRepository.findAll(spec, pageable);
    }
    
    /**
     * Get all bookings for admin with schedule filter
     */
    public Page<Booking> getAllBookingsForAdmin(String eventId, String userId, String status, String search, String scheduleId, Pageable pageable) {
        Specification<Booking> spec = createBookingSpecification(eventId, userId, status, search, scheduleId);
        return bookingRepository.findAll(spec, pageable);
    }
    
    /**
     * Create a booking with seats and/or shared area tickets
     */
    public Booking createBookingWithSeatsAndSharedAreas(
            UUID userId, 
            ConfirmBookingRequest request, 
            String paymentId) {
        
        log.info("Creating booking for user {} with event {} and schedule {}", 
                userId, request.getEventId(), request.getScheduleId());
        
        // Fetch required entities
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found with ID: " + request.getEventId()));
        
        EventSchedule schedule = eventScheduleRepository.findById(request.getScheduleId())
                .orElseThrow(() -> new RuntimeException("Schedule not found with ID: " + request.getScheduleId()));
        
        // Create booking
        Booking booking = Booking.builder()
                .user(user)
                .event(event)
                .eventSchedule(schedule)
                .totalAmount(request.getTotalAmount())
                .status(Booking.BookingStatus.CONFIRMED)
                .bookingReference(generateBookingReference())
                .attended(false)
                .build();
        
        // Add seat bookings if any
        if (request.getSeatIds() != null && !request.getSeatIds().isEmpty()) {
            for (UUID seatId : request.getSeatIds()) {
                Seat seat = seatRepository.findById(seatId)
                        .orElseThrow(() -> new RuntimeException("Seat not found with ID: " + seatId));
                
                BookingSeat bookingSeat = BookingSeat.builder()
                        .seat(seat)
                        .priceAtBooking(seat.getPrice())
                        .ticketCode(generateTicketCode())
                        .isSharedAreaTicket(false)
                        .build();
                
                booking.addSeat(bookingSeat);
            }
        }
        
        // Add shared area tickets if any
        if (request.getSharedAreaTickets() != null && !request.getSharedAreaTickets().isEmpty()) {
            for (ConfirmBookingRequest.SharedAreaTicketRequest sharedAreaTicket : request.getSharedAreaTickets()) {
                // Create one BookingSeat entry per ticket
                for (int i = 0; i < sharedAreaTicket.getTicketCount(); i++) {
                    BookingSeat bookingSeat = BookingSeat.builder()
                            .seat(null) // No seat for shared area tickets
                            .priceAtBooking(sharedAreaTicket.getPricePerTicket())
                            .ticketCode(generateTicketCode())
                            .isSharedAreaTicket(true)
                            .sharedAreaNumber(sharedAreaTicket.getSharedAreaNumber())
                            .build();
                    
                    booking.addSeat(bookingSeat);
                }
                
                log.info("Added {} shared area tickets for area {} ({})", 
                        sharedAreaTicket.getTicketCount(), 
                        sharedAreaTicket.getSharedAreaNumber(),
                        sharedAreaTicket.getCategoryName());
            }
        }
        
        // Update schedule availability
        int totalTickets = booking.getBookingSeats().size();
        eventScheduleService.reserveSeats(schedule.getScheduleId(), totalTickets);
        
        Booking savedBooking = bookingRepository.save(booking);
        log.info("Booking created successfully with reference: {}", savedBooking.getBookingReference());
        
        return savedBooking;
    }
    
    /**
     * Generate a unique booking reference
     */
    private String generateBookingReference() {
        return "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
    
    /**
     * Generate a unique ticket code
     */
    private String generateTicketCode() {
        return "TK-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
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
        Booking.BookingStatus oldStatus = booking.getStatus();
        
        try {
            Booking.BookingStatus bookingStatus = Booking.BookingStatus.valueOf(status.toUpperCase());
            booking.setStatus(bookingStatus);
            
            if (bookingStatus == Booking.BookingStatus.CANCELLED) {
                booking.setCancelledAt(LocalDateTime.now());
                booking.setCancellationReason("Cancelled by admin");
                
                // Release seats back to schedule if booking was previously confirmed
                if (oldStatus == Booking.BookingStatus.CONFIRMED && booking.getEventSchedule() != null) {
                    int seatsToRelease = booking.getBookingSeats().size();
                    eventScheduleService.releaseSeats(booking.getEventSchedule().getScheduleId(), seatsToRelease);
                }
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
     * Get bookings by schedule ID
     */
    public Page<Booking> getBookingsByScheduleId(String scheduleId, Pageable pageable) {
        UUID uuid = UUID.fromString(scheduleId);
        EventSchedule schedule = eventScheduleRepository.findById(uuid)
                .orElseThrow(() -> new RuntimeException("Schedule not found with ID: " + scheduleId));
        
        return bookingRepository.findByEventSchedule_ScheduleId(uuid, pageable);
    }
    
    /**
     * Get bookings by event and schedule
     */
    public List<Booking> getBookingsByEventAndSchedule(String eventId, String scheduleId) {
        UUID eventUuid = UUID.fromString(eventId);
        UUID scheduleUuid = UUID.fromString(scheduleId);
        
        return bookingRepository.findByEventAndSchedule(eventUuid, scheduleUuid);
    }
    
    /**
     * Get bookings by user ID
     */
    public List<Booking> getBookingsByUserId(UUID userId) {
        log.info("Fetching bookings for user: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        
        return bookingRepository.findByUser(user, Pageable.unpaged()).getContent();
    }

    /**
     * Get booking statistics
     */
    public Map<String, Object> getBookingStatistics(String eventId, String dateFrom, String dateTo) {
        return getBookingStatistics(eventId, null, dateFrom, dateTo);
    }
    
    /**
     * Get booking statistics with schedule filter
     */
    public Map<String, Object> getBookingStatistics(String eventId, String scheduleId, String dateFrom, String dateTo) {
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
            
            // Schedule specific statistics if provided
            if (scheduleId != null) {
                UUID uuid = UUID.fromString(scheduleId);
                EventSchedule schedule = eventScheduleRepository.findById(uuid).orElse(null);
                if (schedule != null) {
                    long scheduleBookings = bookingRepository.countConfirmedBookingsForSchedule(uuid);
                    long allScheduleBookings = bookingRepository.countAllBookingsForSchedule(uuid);
                    statistics.put("scheduleConfirmedBookings", scheduleBookings);
                    statistics.put("scheduleTotalBookings", allScheduleBookings);
                    statistics.put("scheduleDate", schedule.getScheduleDate().toString());
                    statistics.put("scheduleTime", schedule.getStartTime() + " - " + schedule.getEndTime());
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
    private Specification<Booking> createBookingSpecification(String eventId, String userId, String status, String search, String scheduleId) {
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
            
            // Filter by schedule ID
            if (scheduleId != null && !scheduleId.trim().isEmpty()) {
                try {
                    UUID scheduleUuid = UUID.fromString(scheduleId);
                    predicates.add(criteriaBuilder.equal(root.get("eventSchedule").get("scheduleId"), scheduleUuid));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid schedule ID format: " + scheduleId);
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