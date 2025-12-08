package com.ticket.ticket_booking_system.controller.admin;

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
import com.ticket.ticket_booking_system.service.EventService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/events")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER')")
public class AdminEventController {

    private final EventService eventService;

    public AdminEventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventCreateRequest request) {
        try {
            System.out.println("=== AdminEventController: Creating event ===");
            EventResponse createdEvent = eventService.createEvent(request);
            return new ResponseEntity<>(createdEvent, HttpStatus.CREATED);
        } catch (Exception e) {
            System.err.println("❌ ERROR creating event: " + e.getClass().getName());
            System.err.println("❌ ERROR message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping
    public ResponseEntity<Page<EventResponse>> getAllEvents(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<EventResponse> events;

        if (category != null && !category.isEmpty()) {
            events = eventService.getEventsByCategory(category, pageable);
        } else if (query != null && !query.isEmpty()) {
            events = eventService.searchEvents(query, pageable);
        } else {
            events = eventService.getAllEvents(pageable);
        }

        return ResponseEntity.ok(events);
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable UUID eventId) {
        EventResponse event = eventService.getEventById(eventId);
        return ResponseEntity.ok(event);
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable UUID eventId,
            @Valid @RequestBody EventUpdateRequest request) {

        EventResponse updatedEvent = eventService.updateEvent(eventId, request);
        return ResponseEntity.ok(updatedEvent);
    }

    @DeleteMapping("/{eventId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID eventId) {
        eventService.softDeleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{eventId}/soft")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> softDeleteEvent(@PathVariable UUID eventId) {
        eventService.softDeleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{eventId}/permanent")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> permanentlyDeleteEvent(@PathVariable UUID eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{eventId}/change-status")
    public ResponseEntity<EventResponse> changeEventStatus(
            @PathVariable UUID eventId,
            @RequestParam String status) {

        EventResponse event = eventService.changeEventStatus(eventId, status);
        return ResponseEntity.ok(event);
    }

    @GetMapping("/upcoming")
    public ResponseEntity<Page<EventResponse>> getUpcomingEvents(
            @PageableDefault(size = 20, sort = "startDateTime") Pageable pageable) {
        Page<EventResponse> events = eventService.getUpcomingEvents(pageable);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/past")
    public ResponseEntity<Page<EventResponse>> getPastEvents(
            @PageableDefault(size = 20, sort = "startDateTime") Pageable pageable) {
        Page<EventResponse> events = eventService.getPastEvents(pageable);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/by-organizer/{organizerId}")
    public ResponseEntity<Page<EventResponse>> getEventsByOrganizer(
            @PathVariable UUID organizerId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<EventResponse> events = eventService.getEventsByOrganizer(organizerId, pageable);
        return ResponseEntity.ok(events);
    }

    @PostMapping("/{eventId}/image")
    public ResponseEntity<Map<String, String>> uploadEventImage(
            @PathVariable UUID eventId,
            @RequestParam("file") MultipartFile file) throws IOException {

        String imageUrl = eventService.uploadEventImage(eventId, file);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Event image uploaded successfully");
        response.put("imageUrl", imageUrl);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{eventId}/assign-organizer")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<EventResponse> assignOrganizerToEvent(
            @PathVariable UUID eventId,
            @RequestParam UUID organizerId) {
        
        EventResponse event = eventService.assignOrganizerToEvent(eventId, organizerId);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Organizer assigned successfully");
        
        return ResponseEntity.ok(event);
    }

    @DeleteMapping("/{eventId}/remove-organizer")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<EventResponse> removeOrganizerFromEvent(@PathVariable UUID eventId) {
        
        EventResponse event = eventService.removeOrganizerFromEvent(eventId);
        
        return ResponseEntity.ok(event);
    }
}