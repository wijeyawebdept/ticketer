package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.service.BookingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/bookings")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminBookingController {

    private final BookingService bookingService;

    /**
     * Get all bookings with pagination and optional filters
     */
    @GetMapping
    public ResponseEntity<Page<Booking>> getAllBookings(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        
        Page<Booking> bookings = bookingService.getAllBookingsForAdmin(eventId, userId, status, search, pageable);
        return ResponseEntity.ok(bookings);
    }

    /**
     * Get booking details by ID
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<Booking> getBookingById(@PathVariable String bookingId) {
        Booking booking = bookingService.getBookingById(bookingId);
        return ResponseEntity.ok(booking);
    }

    /**
     * Update booking status (cancel, confirm, etc.)
     */
    @PutMapping("/{bookingId}/status")
    public ResponseEntity<Booking> updateBookingStatus(
            @PathVariable String bookingId,
            @RequestParam String status) {
        
        Booking updatedBooking = bookingService.updateBookingStatus(bookingId, status);
        return ResponseEntity.ok(updatedBooking);
    }

    /**
     * Cancel a booking
     */
    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable String bookingId) {
        Booking cancelledBooking = bookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(cancelledBooking);
    }

    /**
     * Mark booking as attended
     */
    @PutMapping("/{bookingId}/attend")
    public ResponseEntity<Booking> markAsAttended(@PathVariable String bookingId) {
        Booking attendedBooking = bookingService.markAsAttended(bookingId);
        return ResponseEntity.ok(attendedBooking);
    }

    /**
     * Get all bookings for a specific event
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<Booking>> getBookingsByEvent(@PathVariable String eventId) {
        List<Booking> bookings = bookingService.getBookingsByEventId(eventId);
        return ResponseEntity.ok(bookings);
    }

    /**
     * Get booking statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getBookingStatistics(
            @RequestParam(required = false) String eventId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        
        var statistics = bookingService.getBookingStatistics(eventId, dateFrom, dateTo);
        return ResponseEntity.ok(statistics);
    }

    /**
     * Delete a booking (admin only - use with caution)
     */
    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Void> deleteBooking(@PathVariable String bookingId) {
        bookingService.deleteBooking(bookingId);
        return ResponseEntity.ok().build();
    }
}