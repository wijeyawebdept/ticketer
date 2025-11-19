package com.ticket.ticket_booking_system.controller.organizer;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.VenueCreateRequest;
import com.ticket.ticket_booking_system.dto.VenueResponse;
import com.ticket.ticket_booking_system.dto.VenueUpdateRequest;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.service.VenueService;

import jakarta.validation.Valid;

/**
 * Organizer venue management controller
 */
@RestController
@RequestMapping("/api/organizer/venues")
@PreAuthorize("hasAnyRole('ADMIN','ORGANIZER','SUPER_ADMIN') or hasAuthority('ADMIN') or hasAuthority('ORGANIZER') or hasAuthority('SUPER_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_ORGANIZER') or hasAuthority('ROLE_SUPER_ADMIN')")
public class OrganizerVenueController {

    private final VenueService venueService;

    public OrganizerVenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    /**
     * Get all venues - Organizer perspective
     * Returns venue information for organizer view
     */
    @GetMapping
    public ResponseEntity<List<VenueResponse>> getAllVenues() {
        List<Venue> venues = venueService.getAllVenues();
        List<VenueResponse> venueResponses = venues.stream()
                .map(this::convertToResponse)
                .toList();
        return ResponseEntity.ok(venueResponses);
    }

    /**
     * Get venue by ID - Organizer perspective
     * Returns venue information for organizer view
     */
    @GetMapping("/{id}")
    public ResponseEntity<VenueResponse> getVenueById(@PathVariable UUID id) {
        Venue venue = venueService.getVenueById(id);
        return ResponseEntity.ok(convertToResponse(venue));
    }

    /**
     * Create new venue - Organizer
     * Allows organizers to add new venues to the system
     */
    @PostMapping
    public ResponseEntity<VenueResponse> createVenue(@Valid @RequestBody VenueCreateRequest request) {
        Venue venue = convertToEntity(request);
        Venue createdVenue = venueService.createVenue(venue);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToResponse(createdVenue));
    }

    /**
     * Update venue - Organizer
     * Allows organizers to modify venue details
     */
    @PutMapping("/{id}")
    public ResponseEntity<VenueResponse> updateVenue(@PathVariable UUID id,
            @Valid @RequestBody VenueUpdateRequest request) {
        Venue venue = convertToEntity(request);
        Venue updatedVenue = venueService.updateVenue(id, venue);
        return ResponseEntity.ok(convertToResponse(updatedVenue));
    }

    /**
     * Delete venue - Organizer
     * Allows organizers to remove venues from the system
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVenue(@PathVariable UUID id) {
        venueService.deleteVenue(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Search venues by name - Organizer perspective
     */
    @GetMapping("/search")
    public ResponseEntity<List<VenueResponse>> searchVenuesByName(@RequestParam String name) {
        List<Venue> venues = venueService.searchVenuesByName(name);
        List<VenueResponse> venueResponses = venues.stream()
                .map(this::convertToResponse)
                .toList();
        return ResponseEntity.ok(venueResponses);
    }

    /**
     * Find venues by location - Organizer perspective
     */
    @GetMapping("/location")
    public ResponseEntity<List<VenueResponse>> findVenuesByCityAndState(
            @RequestParam String city,
            @RequestParam String state) {
        List<Venue> venues = venueService.findVenuesByCityAndState(city, state);
        List<VenueResponse> venueResponses = venues.stream()
                .map(this::convertToResponse)
                .toList();
        return ResponseEntity.ok(venueResponses);
    }

    /**
     * Find venues by minimum capacity - Organizer perspective
     */
    @GetMapping("/capacity")
    public ResponseEntity<List<VenueResponse>> findVenuesByMinimumCapacity(@RequestParam int minCapacity) {
        List<Venue> venues = venueService.findVenuesByMinimumCapacity(minCapacity);
        List<VenueResponse> venueResponses = venues.stream()
                .map(this::convertToResponse)
                .toList();
        return ResponseEntity.ok(venueResponses);
    }

    /**
     * Convert Venue entity to VenueResponse DTO
     */
    private VenueResponse convertToResponse(Venue venue) {
        VenueResponse response = new VenueResponse();
        response.setId(venue.getVenueId());
        response.setName(venue.getName());
        response.setDescription(venue.getDescription());
        response.setAddress(venue.getAddress());
        response.setCity(venue.getCity());
        response.setState(venue.getState());
        response.setZipCode(venue.getZipCode());
        response.setCapacity(venue.getCapacity());
        response.setLayoutType(venue.getLayoutType());
        response.setSeatingLayout(venue.getSeatingLayout());
        response.setCreatedAt(venue.getCreatedAt());
        response.setUpdatedAt(venue.getUpdatedAt());
        return response;
    }

    /**
     * Convert VenueCreateRequest DTO to Venue entity
     */
    private Venue convertToEntity(VenueCreateRequest request) {
        Venue venue = new Venue();
        venue.setName(request.getName());
        venue.setDescription(request.getDescription());
        venue.setAddress(request.getAddress());
        venue.setCity(request.getCity());
        venue.setState(request.getState());
        venue.setZipCode(request.getZipCode());
        venue.setCapacity(request.getCapacity());
        venue.setSeatingLayout(request.getSeatingLayout());
        return venue;
    }

    /**
     * Convert VenueUpdateRequest DTO to Venue entity
     */
    private Venue convertToEntity(VenueUpdateRequest request) {
        Venue venue = new Venue();
        venue.setName(request.getName());
        venue.setDescription(request.getDescription());
        venue.setAddress(request.getAddress());
        venue.setCity(request.getCity());
        venue.setState(request.getState());
        venue.setZipCode(request.getZipCode());
        venue.setCapacity(request.getCapacity());
        venue.setSeatingLayout(request.getSeatingLayout());
        return venue;
    }
}