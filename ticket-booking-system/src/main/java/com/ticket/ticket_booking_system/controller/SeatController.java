package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.SeatResponse;
import com.ticket.ticket_booking_system.entity.Seat;
import com.ticket.ticket_booking_system.service.SeatService;
import com.ticket.ticket_booking_system.service.SeatService.SeatAvailabilityStats;

/*
REST Controller for seat management
Provides endpoints for seat layout, availability, and booking operations
 */
@RestController
@RequestMapping("/api/seats")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    /*
     * Get all seats for an event (public endpoint for seat map display)
     * GET /api/seats?eventId={eventId}
     */
    @GetMapping
    public ResponseEntity<List<SeatResponse>> getSeats(@RequestParam UUID eventId) {
        List<SeatResponse> seats = seatService.getSeatsByEventAsResponse(eventId);
        return ResponseEntity.ok(seats);
    }

    /**
     * Get only available seats for an event
     * GET /api/seats/available?eventId={eventId}
     */
    @GetMapping("/available")
    public ResponseEntity<List<Seat>> getAvailableSeats(@RequestParam UUID eventId) {
        List<Seat> seats = seatService.getAvailableSeatsByEvent(eventId);
        return ResponseEntity.ok(seats);
    }

    /**
     * Get seat availability statistics for an event
     * GET /api/seats/stats?eventId={eventId}
     */
    @GetMapping("/stats")
    public ResponseEntity<SeatAvailabilityStats> getAvailabilityStats(@RequestParam UUID eventId) {
        SeatAvailabilityStats stats = seatService.getAvailabilityStats(eventId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Block or unblock a seat (Admin, Organizer only)
     * PUT /api/seats/{seatId}/block?block=true
     */
    @PutMapping("/{seatId}/block")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Void> blockSeat(@PathVariable UUID seatId, @RequestParam boolean block) {
        seatService.toggleBlock(seatId, block);
        return ResponseEntity.ok().build();
    }

    /**
     * Hold seats temporarily for a user
     * POST /api/seats/hold
     */
    @PostMapping("/hold")
    public ResponseEntity<Void> holdSeats(@RequestBody SeatHoldRequest request) {
        // If userId is null, use a placeholder for admin holds
        UUID userId = request.getUserId();
        if (userId == null) {
            // For admin holds without specific user, use a special UUID or null
            userId = null;
        }
        seatService.holdSeats(request.getSeatIds(), userId, request.getHoldDurationMinutes());
        return ResponseEntity.ok().build();
    }

    /**
     * Reserve seats (mark as unavailable/booked)
     * POST /api/seats/reserve
     */
    @PostMapping("/reserve")
    public ResponseEntity<Void> reserveSeats(@RequestBody List<UUID> seatIds) {
        seatService.reserveSeats(seatIds);
        return ResponseEntity.ok().build();
    }

    /**
     * Unreserve seats (mark as available again) - Admin only
     * POST /api/seats/unreserve
     */
    @PostMapping("/unreserve")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Void> unreserveSeats(@RequestBody List<UUID> seatIds) {
        seatService.unreserveSeats(seatIds);
        return ResponseEntity.ok().build();
    }

    /**
     * Permanently hold seats until event ends (Admin only)
     * POST /api/seats/permanent-hold
     */
    @PostMapping("/permanent-hold")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Void> permanentHoldSeats(@RequestBody List<UUID> seatIds) {
        seatService.permanentHoldSeats(seatIds);
        return ResponseEntity.ok().build();
    }

    /**
     * Release permanent hold (Admin only)
     * POST /api/seats/release-permanent-hold
     */
    @PostMapping("/release-permanent-hold")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Void> releasePermanentHold(@RequestBody List<UUID> seatIds) {
        seatService.releasePermanentHold(seatIds);
        return ResponseEntity.ok().build();
    }

    /**
     * Release seat holds for a user
     * POST /api/seats/release-holds
     */
    @PostMapping("/release-holds")
    public ResponseEntity<Void> releaseSeatHolds(@RequestParam UUID userId) {
        seatService.releaseSeatHolds(userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Generate seats for an event from venue layout (Admin, Organizer only)
     * POST /api/seats/generate?venueId={venueId}&eventId={eventId}
     */
    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Void> generateSeatsForEvent(@RequestParam UUID venueId, @RequestParam UUID eventId) {
        seatService.generateSeatsForEvent(venueId, eventId);
        return ResponseEntity.ok().build();
    }

    /**
     * Request DTO for seat hold operations
     */
    public static class SeatHoldRequest {
        private List<UUID> seatIds;
        private UUID userId;
        private int holdDurationMinutes = 15; // Default 15 minutes

        // Constructors
        public SeatHoldRequest() {
        }

        public SeatHoldRequest(List<UUID> seatIds, UUID userId, int holdDurationMinutes) {
            this.seatIds = seatIds;
            this.userId = userId;
            this.holdDurationMinutes = holdDurationMinutes;
        }

        // Getters and setters
        public List<UUID> getSeatIds() {
            return seatIds;
        }

        public void setSeatIds(List<UUID> seatIds) {
            this.seatIds = seatIds;
        }

        public UUID getUserId() {
            return userId;
        }

        public void setUserId(UUID userId) {
            this.userId = userId;
        }

        public int getHoldDurationMinutes() {
            return holdDurationMinutes;
        }

        public void setHoldDurationMinutes(int holdDurationMinutes) {
            this.holdDurationMinutes = holdDurationMinutes;
        }
    }
}