package com.ticket.ticket_booking_system.controller.organizer;

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
 * Organizer controller for venue seating arrangement management
 * Provides endpoints for configuring and managing venue seating layouts
 * Organizers can create and modify seating arrangements for venues they manage
 */
@RestController
@RequestMapping("/api/organizer/venues/{venueId}/seating")
@PreAuthorize("hasAnyRole('ADMIN','ORGANIZER','SUPER_ADMIN') or hasAuthority('ADMIN') or hasAuthority('ORGANIZER') or hasAuthority('SUPER_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_ORGANIZER') or hasAuthority('ROLE_SUPER_ADMIN')")
public class OrganizerSeatingController {

    private final VenueService venueService;

    public OrganizerSeatingController(VenueService venueService) {
        this.venueService = venueService;
    }

    /**
     * Get current seating layout for a venue
     * GET /api/organizer/venues/{venueId}/seating
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSeatingLayout(@PathVariable UUID venueId) {
        Venue venue = venueService.getVenueById(venueId);
        return ResponseEntity.ok(venue.getSeatingLayout());
    }

    /**
     * Update seating layout for a venue
     * PUT /api/organizer/venues/{venueId}/seating
     */
    @PutMapping
    public ResponseEntity<Map<String, Object>> updateSeatingLayout(
            @PathVariable UUID venueId,
            @RequestBody Map<String, Object> seatingLayout) {

        Venue updatedVenue = venueService.updateSeatingLayout(venueId, seatingLayout);
        return ResponseEntity.ok(updatedVenue.getSeatingLayout());
    }
}