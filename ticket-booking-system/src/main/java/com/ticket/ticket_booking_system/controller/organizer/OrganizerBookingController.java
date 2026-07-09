package com.ticket.ticket_booking_system.controller.organizer;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.BookingService;

import lombok.RequiredArgsConstructor;

/**
 * Organizer booking management controller
 * Allows organizers to view and manage bookings for their events
 */
@RestController
@RequestMapping("/api/organizer/bookings")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class OrganizerBookingController {

    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final EventRepository eventRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;

    /**
     * Get all bookings for organizer's events with pagination and optional filters
     */
    @GetMapping
    public ResponseEntity<?> getAllBookings(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        // Filter bookings by organizer's events with proper eager loading and filters
        Page<Booking> bookings = bookingService.getAllBookingsForOrganizer(organizerId, eventId, userId, status, search, pageable);
        return ResponseEntity.ok(bookings);
    }

    /**
     * Get booking details by ID
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<?> getBookingById(
            @PathVariable String bookingId,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        Booking booking = bookingService.getBookingById(bookingId);
        
        // Verify booking belongs to organizer's event
        if (!verifyBookingOwnership(booking, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to access this booking");
        }
        
        return ResponseEntity.ok(booking);
    }

    /**
     * Update booking status (cancel, confirm, etc.)
     */
    @PutMapping("/{bookingId}/status")
    public ResponseEntity<?> updateBookingStatus(
            @PathVariable String bookingId,
            @RequestParam String status,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        Booking booking = bookingService.getBookingById(bookingId);
        
        // Verify booking belongs to organizer's event
        if (!verifyBookingOwnership(booking, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to update this booking");
        }
        
        Booking updatedBooking = bookingService.updateBookingStatus(bookingId, status);
        return ResponseEntity.ok(updatedBooking);
    }

    /**
     * Cancel a booking
     */
    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<?> cancelBooking(
            @PathVariable String bookingId,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        Booking booking = bookingService.getBookingById(bookingId);
        
        // Verify booking belongs to organizer's event
        if (!verifyBookingOwnership(booking, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to cancel this booking");
        }
        
        Booking cancelledBooking = bookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(cancelledBooking);
    }

    /**
     * Mark booking as attended
     */
    @PutMapping("/{bookingId}/attend")
    public ResponseEntity<?> markAsAttended(
            @PathVariable String bookingId,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        Booking booking = bookingService.getBookingById(bookingId);
        
        // Verify booking belongs to organizer's event
        if (!verifyBookingOwnership(booking, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to mark this booking as attended");
        }
        
        Booking attendedBooking = bookingService.markAsAttended(bookingId);
        return ResponseEntity.ok(attendedBooking);
    }

    /**
     * Get bookings by event ID
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<?> getBookingsByEvent(
            @PathVariable String eventId,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        // Verify event belongs to organizer
        if (!verifyEventOwnership(UUID.fromString(eventId), organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view bookings for this event");
        }
        
        List<Booking> bookings = bookingService.getBookingsByEventId(eventId);
        return ResponseEntity.ok(bookings);
    }

    /**
     * Get booking statistics for organizer's events
     */
    @GetMapping("/statistics")
    public ResponseEntity<?> getBookingStatistics(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        // Filter statistics by organizer's events
        long totalBookings = bookingRepository.countByEvent_Organizer_OrganizerId(organizerId);
        long confirmedBookings = bookingRepository.countByEvent_Organizer_OrganizerIdAndStatus(
                organizerId, Booking.BookingStatus.CONFIRMED);
        long cancelledBookings = bookingRepository.countByEvent_Organizer_OrganizerIdAndStatus(
                organizerId, Booking.BookingStatus.CANCELLED);
        long pendingBookings = bookingRepository.countByEvent_Organizer_OrganizerIdAndStatus(
                organizerId, Booking.BookingStatus.PENDING);

        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalBookings", totalBookings);
        statistics.put("confirmedBookings", confirmedBookings);
        statistics.put("cancelledBookings", cancelledBookings);
        statistics.put("pendingBookings", pendingBookings);
        
        return ResponseEntity.ok(statistics);
    }

    /**
     * Export bookings to CSV
     */
    @GetMapping("/export")
    public ResponseEntity<Map<String, String>> exportBookings(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication authentication) {
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "CSV export feature coming soon");
        response.put("note", "This feature requires implementing CSV generation in BookingService");
        return ResponseEntity.ok(response);
    }

    /**
     * Get recent bookings for organizer's events
     */
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentBookings(
            @RequestParam(defaultValue = "10") int count,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        List<Booking> recentBookings = bookingRepository.findTopByEvent_Organizer_OrganizerIdOrderByBookingTimeDesc(
                organizerId, org.springframework.data.domain.PageRequest.of(0, count));
        
        return ResponseEntity.ok(recentBookings);
    }

    /**
     * Get pending bookings for organizer's events
     */
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingBookings(
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        List<Booking> pendingBookings = bookingRepository.findByEvent_Organizer_OrganizerIdAndStatus(
                organizerId, Booking.BookingStatus.PENDING);
        
        return ResponseEntity.ok(pendingBookings);
    }

    /**
     * Get confirmed bookings for organizer's events
     */
    @GetMapping("/confirmed")
    public ResponseEntity<?> getConfirmedBookings(
            Pageable pageable,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        Page<Booking> confirmedBookings = bookingRepository.findByEvent_Organizer_OrganizerIdAndStatus(
                organizerId, Booking.BookingStatus.CONFIRMED, pageable);
        
        return ResponseEntity.ok(confirmedBookings);
    }

    /**
     * Get cancelled bookings for organizer's events
     */
    @GetMapping("/cancelled")
    public ResponseEntity<?> getCancelledBookings(
            Pageable pageable,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        Page<Booking> cancelledBookings = bookingRepository.findByEvent_Organizer_OrganizerIdAndStatus(
                organizerId, Booking.BookingStatus.CANCELLED, pageable);
        
        return ResponseEntity.ok(cancelledBookings);
    }

    /**
     * Helper method to extract organizer ID from authentication
     * Supports both Organizer and OrganizerEmployee principals
     */
    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null) {
            return null;
        }

        // Try to get from Organizer principal
        if (authentication.getPrincipal() instanceof Organizer) {
            Organizer organizer = (Organizer) authentication.getPrincipal();
            return organizer.getOrganizerId();
        }

        // Try to get from OrganizerEmployee principal
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee employee = (OrganizerEmployee) authentication.getPrincipal();
            return employee.getOrganizer() != null ? employee.getOrganizer().getOrganizerId() : null;
        }

        // Extract email from authentication principal (JWT token)
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            // Try organizer repository first
            UUID organizerId = organizerRepository.findByEmail(email)
                    .map(org -> org.getOrganizerId())
                    .orElse(null);
            if (organizerId != null) {
                return organizerId;
            }
            
            // Try employee repository and get their organizer's ID
            return employeeRepository.findByEmail(email)
                    .map(emp -> emp.getOrganizer() != null ? emp.getOrganizer().getOrganizerId() : null)
                    .orElse(null);
        }

        return null;
    }

    /**
     * Verify that a booking belongs to the organizer's event
     */
    private boolean verifyBookingOwnership(Booking booking, UUID organizerId) {
        if (booking == null || booking.getEvent() == null) {
            return false;
        }
        return booking.getEvent().getOrganizer() != null &&
               booking.getEvent().getOrganizer().getOrganizerId().equals(organizerId);
    }

    /**
     * Verify that an event belongs to the organizer
     */
    private boolean verifyEventOwnership(UUID eventId, UUID organizerId) {
        return eventRepository.findById(eventId)
                .map(event -> event.getOrganizer() != null &&
                             event.getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }
}
