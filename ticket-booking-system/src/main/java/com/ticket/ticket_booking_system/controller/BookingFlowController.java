package com.ticket.ticket_booking_system.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.ConfirmBookingRequest;
import com.ticket.ticket_booking_system.dto.request.HoldSeatsRequest;
import com.ticket.ticket_booking_system.dto.response.SeatResponse;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.service.BookingService;
import com.ticket.ticket_booking_system.service.SeatService;
import com.ticket.ticket_booking_system.service.VenueSeatingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller for seat booking operations
 * Handles seat selection, holding, and confirmation
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingFlowController {
    
    private final SeatService seatService;
    private final VenueSeatingService venueSeatingService;
    private final BookingService bookingService;
    
    /**
     * Get all seats for an event with their availability status
     * GET /api/bookings/seats?eventId={eventId}
     */
    @GetMapping("/seats")
    public ResponseEntity<List<SeatResponse>> getEventSeats(@RequestParam UUID eventId) {
        log.info("Fetching seats for event: {}", eventId);
        List<SeatResponse> seats = seatService.getSeatsByEventAsResponse(eventId);
        return ResponseEntity.ok(seats);
    }
    
    /**
     * Get venue template seats (for admins/organizers to preview)
     * GET /api/bookings/venue/{venueId}/seats
     */
    @GetMapping("/venue/{venueId}/seats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE')")
    public ResponseEntity<List<SeatResponse>> getVenueSeats(@PathVariable UUID venueId) {
        log.info("Fetching venue template seats for venue: {}", venueId);
        List<SeatResponse> seats = venueSeatingService.getVenueSeatingTemplateAsResponse(venueId);
        return ResponseEntity.ok(seats);
    }
    
    /**
     * Hold/Lock seats temporarily for a user
     * POST /api/bookings/hold-seats
     * 
     * This prevents other users from selecting the same seats
     * Holds expire after specified duration (default 5 minutes)
     */
    @PostMapping("/hold-seats")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> holdSeats(
            @Valid @RequestBody HoldSeatsRequest request,
            Authentication authentication) {
        
        log.info("User {} requesting to hold {} seats for event {}", 
                authentication.getName(), request.getSeatIds().size(), request.getEventId());
        
        try {
            // Extract user ID from authentication
            UUID userId = extractUserIdFromAuth(authentication);
            
            // Release any existing holds for this user first
            seatService.releaseSeatHolds(userId);
            
            // Hold the selected seats
            seatService.holdSeats(request.getSeatIds(), userId, request.getHoldDurationMinutes());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Seats held successfully");
            response.put("heldSeats", request.getSeatIds().size());
            response.put("holdDurationMinutes", request.getHoldDurationMinutes());
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            log.error("Failed to hold seats: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
        }
    }
    
    /**
     * Confirm booking after successful payment
     * POST /api/bookings/confirm
     * 
     * This finalizes the booking and marks seats as booked
     */
    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> confirmBooking(
            @Valid @RequestBody ConfirmBookingRequest request,
            Authentication authentication) {
        
        log.info("User {} confirming booking for event {} with payment {}", 
                authentication.getName(), request.getEventId(), request.getPaymentId());
        
        try {
            // Extract user ID from authentication
            UUID userId = extractUserIdFromAuth(authentication);
            
            // Verify payment (this should integrate with your payment service)
            // For now, we'll assume payment is valid if paymentId is provided
            
            // Reserve the seats (mark as booked)
            seatService.reserveSeats(request.getSeatIds());
            
            // Create booking record
            // Note: You'll need to implement this in your BookingService
            // Booking booking = bookingService.createBookingWithSeats(
            //     userId, request.getEventId(), request.getSeatIds(), 
            //     request.getPaymentId(), request.getPaymentMethod()
            // );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Booking confirmed successfully");
            response.put("bookedSeats", request.getSeatIds().size());
            response.put("paymentId", request.getPaymentId());
            // response.put("bookingReference", booking.getBookingReference());
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            log.error("Failed to confirm booking: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
        }
    }
    
    /**
     * Release seat holds for current user
     * POST /api/bookings/release-holds
     */
    @PostMapping("/release-holds")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> releaseHolds(Authentication authentication) {
        UUID userId = extractUserIdFromAuth(authentication);
        
        log.info("Releasing seat holds for user: {}", userId);
        seatService.releaseSeatHolds(userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Holds released successfully");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get seat availability statistics for an event
     * GET /api/bookings/stats?eventId={eventId}
     */
    @GetMapping("/stats")
    public ResponseEntity<SeatService.SeatAvailabilityStats> getAvailabilityStats(
            @RequestParam UUID eventId) {
        
        log.info("Fetching availability stats for event: {}", eventId);
        SeatService.SeatAvailabilityStats stats = seatService.getAvailabilityStats(eventId);
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Extract user ID from authentication context
     * This needs to be adapted based on your authentication implementation
     */
    private UUID extractUserIdFromAuth(Authentication authentication) {
        // TODO: Implement based on your CustomUserDetails implementation
        // For now, returning a placeholder
        // You might have something like:
        // CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        // return userDetails.getUserId();
        
        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Invalid user ID format");
        }
    }
}
