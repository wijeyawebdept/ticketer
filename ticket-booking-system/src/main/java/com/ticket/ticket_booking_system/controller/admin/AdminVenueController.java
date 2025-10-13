package com.ticket.ticket_booking_system.controller.admin;

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
 * Admin-only venue management controller
 * Provides CRUD operations for venue management with admin access control
 */
@RestController
@RequestMapping("/api/admin/venues")
@PreAuthorize("hasRole('ADMIN')")
public class AdminVenueController {
    
    private final VenueService venueService;
    
    public AdminVenueController(VenueService venueService) {
        this.venueService = venueService;
    }
    
    /**
     * Get all venues - Admin perspective
     * Returns complete venue information for administrative purposes
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
     * Get venue by ID - Admin perspective
     * Returns detailed venue information including administrative data
     */
    @GetMapping("/{id}")
    public ResponseEntity<VenueResponse> getVenueById(@PathVariable UUID id) {
        Venue venue = venueService.getVenueById(id);
        return ResponseEntity.ok(convertToResponse(venue));
    }
    
    /**
     * Create new venue - Admin only
     * Allows admins to add new venues to the system
     */
    @PostMapping
    public ResponseEntity<VenueResponse> createVenue(@Valid @RequestBody VenueCreateRequest request) {
        Venue venue = convertToEntity(request);
        Venue createdVenue = venueService.createVenue(venue);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToResponse(createdVenue));
    }
    
    /**
     * Update venue - Admin only
     * Allows admins to modify venue details
     */
    @PutMapping("/{id}")
    public ResponseEntity<VenueResponse> updateVenue(@PathVariable UUID id, @Valid @RequestBody VenueUpdateRequest request) {
        Venue venue = convertToEntity(request);
        Venue updatedVenue = venueService.updateVenue(id, venue);
        return ResponseEntity.ok(convertToResponse(updatedVenue));
    }
    
    /**
     * Delete venue - Admin only
     * Allows admins to remove venues from the system
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVenue(@PathVariable UUID id) {
        venueService.deleteVenue(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Search venues by name - Admin perspective
     * Provides search functionality for venue management
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
     * Find venues by location - Admin perspective
     * Helps admins filter venues by geographic location
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
     * Find venues by minimum capacity - Admin perspective
     * Helps admins find venues that meet capacity requirements
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
     * Includes all venue information for admin view
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
     * Used for creating new venues
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
     * Used for updating existing venues
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
