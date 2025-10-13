package com.ticket.ticket_booking_system.controller.admin;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.service.VenueService;

/**
 * Admin-only controller for venue seating arrangement management
 * Provides endpoints for configuring and managing venue seating layouts
 */
@RestController
@RequestMapping("/api/admin/venues/{venueId}/seating")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSeatingController {

    private final VenueService venueService;

    public AdminSeatingController(VenueService venueService) {
        this.venueService = venueService;
    }

    /**
     * Get current seating layout for a venue
     * GET /api/admin/venues/{venueId}/seating
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSeatingLayout(@PathVariable UUID venueId) {
        Venue venue = venueService.getVenueById(venueId);
        return ResponseEntity.ok(venue.getSeatingLayout());
    }

    /**
     * Update seating layout for a venue
     * PUT /api/admin/venues/{venueId}/seating
     */
    @PutMapping
    public ResponseEntity<Map<String, Object>> updateSeatingLayout(
            @PathVariable UUID venueId,
            @RequestBody Map<String, Object> seatingLayout) {

        Venue updatedVenue = venueService.updateSeatingLayout(venueId, seatingLayout);
        return ResponseEntity.ok(updatedVenue.getSeatingLayout());
    }

    /**
     * Get real-time seat status updates
     * WebSocket endpoint: /ws/venue/{venueId}/seats
     * This would be handled by WebSocketConfig
     */
}