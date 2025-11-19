package com.ticket.ticket_booking_system.controller.organizer;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
import com.ticket.ticket_booking_system.service.BookingService;

import lombok.RequiredArgsConstructor;

/**
 * Organizer booking management controller
 * Allows organizers to view and manage bookings for their events
 */
@RestController
@RequestMapping("/api/organizer/bookings")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class OrganizerBookingController {

    private final BookingService bookingService;

    /**
     * Get all bookings for organizer's events with pagination and optional filters
     */
    @GetMapping
    public ResponseEntity<Page<Booking>> getAllBookings(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable,
            Authentication authentication) {
        
        // TODO: In future, filter bookings by organizer's events only
        Page<Booking> bookings = bookingService.getAllBookingsForAdmin(eventId, userId, status, search, pageable);
        return ResponseEntity.ok(bookings);
    }

    /**
     * Get booking details by ID
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<Booking> getBookingById(
            @PathVariable String bookingId,
            Authentication authentication) {
        Booking booking = bookingService.getBookingById(bookingId);
        // TODO: Verify booking belongs to organizer's event
        return ResponseEntity.ok(booking);
    }

    /**
     * Update booking status (cancel, confirm, etc.)
     */
    @PutMapping("/{bookingId}/status")
    public ResponseEntity<Booking> updateBookingStatus(
            @PathVariable String bookingId,
            @RequestParam String status,
            Authentication authentication) {
        
        // TODO: Verify booking belongs to organizer's event
        Booking updatedBooking = bookingService.updateBookingStatus(bookingId, status);
        return ResponseEntity.ok(updatedBooking);
    }

    /**
     * Cancel a booking
     */
    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<Booking> cancelBooking(
            @PathVariable String bookingId,
            Authentication authentication) {
        // TODO: Verify booking belongs to organizer's event
        Booking cancelledBooking = bookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(cancelledBooking);
    }

    /**
     * Mark booking as attended
     */
    @PutMapping("/{bookingId}/attend")
    public ResponseEntity<Booking> markAsAttended(
            @PathVariable String bookingId,
            Authentication authentication) {
        // TODO: Verify booking belongs to organizer's event
        Booking attendedBooking = bookingService.markAsAttended(bookingId);
        return ResponseEntity.ok(attendedBooking);
    }

    /**
     * Get bookings by event ID
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<Booking>> getBookingsByEvent(
            @PathVariable String eventId,
            Authentication authentication) {
        // TODO: Verify event belongs to organizer
        List<Booking> bookings = bookingService.getBookingsByEventId(eventId);
        return ResponseEntity.ok(bookings);
    }

    /**
     * Get booking statistics for organizer's events
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getBookingStatistics(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            Authentication authentication) {
        // TODO: Filter statistics by organizer's events
        Map<String, Object> statistics = bookingService.getBookingStatistics(eventId, dateFrom, dateTo);
        return ResponseEntity.ok(statistics);
    }

    /**
     * Export bookings to CSV
     * TODO: Implement exportBookingsToCsv in BookingService
     */
    @GetMapping("/export")
    public ResponseEntity<Map<String, String>> exportBookings(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication authentication) {
        // TODO: Implement CSV export in BookingService
        Map<String, String> response = new HashMap<>();
        response.put("message", "CSV export feature coming soon");
        return ResponseEntity.ok(response);
    }

    /**
     * Get recent bookings for organizer's events
     * TODO: Implement getRecentBookings in BookingService
     */
    @GetMapping("/recent")
    public ResponseEntity<Map<String, String>> getRecentBookings(
            @RequestParam(defaultValue = "10") int count,
            Authentication authentication) {
        // TODO: Implement in BookingService
        Map<String, String> response = new HashMap<>();
        response.put("message", "Recent bookings feature coming soon");
        return ResponseEntity.ok(response);
    }

    /**
     * Get pending bookings for organizer's events
     * TODO: Implement getPendingBookings in BookingService
     */
    @GetMapping("/pending")
    public ResponseEntity<Map<String, String>> getPendingBookings(
            Authentication authentication) {
        // TODO: Implement in BookingService
        Map<String, String> response = new HashMap<>();
        response.put("message", "Pending bookings feature coming soon");
        return ResponseEntity.ok(response);
    }

    /**
     * Get confirmed bookings for organizer's events
     * TODO: Implement getConfirmedBookings in BookingService
     */
    @GetMapping("/confirmed")
    public ResponseEntity<Map<String, String>> getConfirmedBookings(
            Pageable pageable,
            Authentication authentication) {
        // TODO: Implement in BookingService
        Map<String, String> response = new HashMap<>();
        response.put("message", "Confirmed bookings feature coming soon");
        return ResponseEntity.ok(response);
    }

    /**
     * Get cancelled bookings for organizer's events
     * TODO: Implement getCancelledBookings in BookingService
     */
    @GetMapping("/cancelled")
    public ResponseEntity<Map<String, String>> getCancelledBookings(
            Pageable pageable,
            Authentication authentication) {
        // TODO: Implement in BookingService
        Map<String, String> response = new HashMap<>();
        response.put("message", "Cancelled bookings feature coming soon");
        return ResponseEntity.ok(response);
    }
}
