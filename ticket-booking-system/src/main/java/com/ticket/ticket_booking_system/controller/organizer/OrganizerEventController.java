package com.ticket.ticket_booking_system.controller.organizer;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.EventCreateRequest;
import com.ticket.ticket_booking_system.dto.request.EventUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.EventResponse;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.EventService;

import jakarta.validation.Valid;

/**
 * Organizer event management controller
 * Allows organizers to create and manage their own events
 */
@RestController
@RequestMapping("/api/organizer/events")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class OrganizerEventController {

    private final EventService eventService;
    private final OrganizerRepository organizerRepository;

    public OrganizerEventController(EventService eventService, OrganizerRepository organizerRepository) {
        this.eventService = eventService;
        this.organizerRepository = organizerRepository;
    }

    /**
     * Create a new event - Organizer perspective
     * Organizers can create events for their venues
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody EventCreateRequest request,
            Authentication authentication) {
        try {
            System.out.println("OrganizerEventController: Creating event");
            EventResponse createdEvent = eventService.createEvent(request);
            return new ResponseEntity<>(createdEvent, HttpStatus.CREATED);
        } catch (Exception e) {
            System.err.println("ERROR creating event: " + e.getClass().getName());
            System.err.println("ERROR message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Get all events - Organizer perspective
     * Returns only events created by the current organizer
     */
    @GetMapping
    public ResponseEntity<Page<EventResponse>> getAllEvents(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            Authentication authentication) {

        // Get organizer ID from authentication
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Page.empty());
        }

        // Filter events by organizer - organizers should only see their own events
        Page<EventResponse> events = eventService.getEventsByOrganizer(organizerId, pageable);

        return ResponseEntity.ok(events);
    }

    /**
     * Get event by ID - Organizer perspective
     */
    @GetMapping("/{eventId}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable UUID eventId) {
        EventResponse event = eventService.getEventById(eventId);
        return ResponseEntity.ok(event);
    }

    /**
     * Update event - Organizer can update their own events
     */
    @PutMapping("/{eventId}")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable UUID eventId,
            @Valid @RequestBody EventUpdateRequest request,
            Authentication authentication) {
        try {
            System.out.println("=== OrganizerEventController: Updating event " + eventId + " ===");
            EventResponse updatedEvent = eventService.updateEvent(eventId, request);
            return ResponseEntity.ok(updatedEvent);
        } catch (Exception e) {
            System.err.println("ERROR updating event: " + e.getClass().getName());
            System.err.println("ERROR message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Delete event - Organizer can delete their own events
     */
    @DeleteMapping("/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID eventId, Authentication authentication) {
        System.out.println("OrganizerEventController: Deleting event " + eventId);
        eventService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Soft delete event - Organizer can soft delete their own events
     */
    @DeleteMapping("/{eventId}/soft")
    public ResponseEntity<Void> softDeleteEvent(@PathVariable UUID eventId, Authentication authentication) {
        System.out.println("OrganizerEventController: Soft deleting event " + eventId);
        eventService.softDeleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Change event status (published/draft/cancelled)
     */
    @PatchMapping("/{eventId}/status")
    public ResponseEntity<EventResponse> changeEventStatus(
            @PathVariable UUID eventId,
            @RequestParam String status,
            Authentication authentication) {
        EventResponse event = eventService.changeEventStatus(eventId, status);
        return ResponseEntity.ok(event);
    }

    /**
     * Upload event image
     */
    @PostMapping("/{eventId}/image")
    public ResponseEntity<Map<String, String>> uploadEventImage(
            @PathVariable UUID eventId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        
        String imageUrl = eventService.uploadEventImage(eventId, file);
        Map<String, String> response = new HashMap<>();
        response.put("imageUrl", imageUrl);
        return ResponseEntity.ok(response);
    }

    /**
     * Get event statistics - Organizer perspective
     * TODO: Implement getEventStatistics in EventService
     */
    @GetMapping("/{eventId}/statistics")
    public ResponseEntity<Map<String, Object>> getEventStatistics(
            @PathVariable UUID eventId,
            Authentication authentication) {
        // TODO: Add this method to EventService
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("message", "Event statistics coming soon");
        statistics.put("eventId", eventId.toString());
        return ResponseEntity.ok(statistics);
    }

    /**
     * Get events by venue - Organizer perspective
     * Returns only events created by the current organizer for the specified venue
     */
    @GetMapping("/venue/{venueId}")
    public ResponseEntity<Page<EventResponse>> getEventsByVenue(
            @PathVariable UUID venueId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            Authentication authentication) {
        
        // Get organizer ID from authentication
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Page.empty());
        }
        
        // Return only this organizer's events
        Page<EventResponse> events = eventService.getEventsByOrganizer(organizerId, pageable);
        return ResponseEntity.ok(events);
    }

    /**
     * Get active events - Organizer perspective
     * Returns only active events created by the current organizer
     */
    @GetMapping("/active")
    public ResponseEntity<Page<EventResponse>> getActiveEvents(
            @PageableDefault(size = 20, sort = "startDate") Pageable pageable,
            Authentication authentication) {
        
        // Get organizer ID from authentication
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Page.empty());
        }
        
        // Return only this organizer's events
        Page<EventResponse> events = eventService.getEventsByOrganizer(organizerId, pageable);
        return ResponseEntity.ok(events);
    }

    /**
     * Get upcoming events - Organizer perspective
     * Returns only upcoming events created by the current organizer
     */
    @GetMapping("/upcoming")
    public ResponseEntity<Page<EventResponse>> getUpcomingEvents(
            @PageableDefault(size = 20, sort = "startDate") Pageable pageable,
            Authentication authentication) {
        
        // Get organizer ID from authentication
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Page.empty());
        }
        
        // Return only this organizer's events
        Page<EventResponse> events = eventService.getEventsByOrganizer(organizerId, pageable);
        return ResponseEntity.ok(events);
    }

    /**
     * Helper method to extract organizer ID from authentication
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
        
        // Extract email from authentication principal (JWT token)
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            return organizerRepository.findByEmail(email)
                    .map(Organizer::getOrganizerId)
                    .orElse(null);
        }
        
        return null;
    }
}
