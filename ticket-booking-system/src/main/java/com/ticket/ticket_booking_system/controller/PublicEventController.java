package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.EventResponse;
import com.ticket.ticket_booking_system.dto.response.EventScheduleResponse;
import com.ticket.ticket_booking_system.service.EventScheduleService;
import com.ticket.ticket_booking_system.service.EventService;

import lombok.RequiredArgsConstructor;

/**
 * Public event controller for customer-facing pages
 * No authentication required - returns only PUBLISHED events
 */
@RestController
@RequestMapping("/api/public/events")
@RequiredArgsConstructor
public class PublicEventController {
    
    private final EventService eventService;
    private final EventScheduleService eventScheduleService;
    
    /**
     * Get all published events (publicly accessible)
     * Returns only events with PUBLISHED status
     */
    @GetMapping
    public ResponseEntity<Page<EventResponse>> getPublishedEvents(
            @RequestParam(required = false) UUID categoryId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<EventResponse> events = eventService.getPublishedEvents(categoryId, pageable);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get upcoming published events (publicly accessible)
     * Returns only PUBLISHED events that haven't started yet
     */
    @GetMapping("/upcoming")
    public ResponseEntity<Page<EventResponse>> getUpcomingPublishedEvents(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<EventResponse> events = eventService.getUpcomingPublishedEvents(pageable);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get published event by ID (publicly accessible)
     * Returns only if event is PUBLISHED
     */
    @GetMapping("/{identifier}")
    public ResponseEntity<EventResponse> getPublishedEvent(@PathVariable String identifier) {
        try {
            // Try to parse as UUID first
            UUID uuid = UUID.fromString(identifier);
            EventResponse event = eventService.getPublishedEventById(uuid);
            return ResponseEntity.ok(event);
        } catch (IllegalArgumentException e) {
            // Not a UUID, try as slug
            try {
                EventResponse event = eventService.getPublishedEventBySlug(identifier);
                return ResponseEntity.ok(event);
            } catch (ResourceNotFoundException ex) {
                return ResponseEntity.notFound().build();
            }
        }
    }
    
    /**
     * Search published events (publicly accessible)
     */
    @GetMapping("/search")
    public ResponseEntity<Page<EventResponse>> searchPublishedEvents(
            @RequestParam String query,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<EventResponse> events = eventService.searchPublishedEvents(query, pageable);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get bookable schedules for a public event (publicly accessible)
     * Returns only schedules that are ACTIVE and have available seats
     */
    @GetMapping("/{eventId}/schedules/bookable")
    public ResponseEntity<List<EventScheduleResponse>> getBookableSchedules(@PathVariable UUID eventId) {
        List<EventScheduleResponse> schedules = eventScheduleService.getBookableSchedulesForEvent(eventId);
        return ResponseEntity.ok(schedules);
    }

    /**
     * Get event schedule details by UUID (publicly accessible)
     * Used by customers on seat selection page to get venue information
     */
    @GetMapping("/schedules/{scheduleId}")
    public ResponseEntity<EventScheduleResponse> getPublicScheduleByUUID(@PathVariable UUID scheduleId) {
        EventScheduleResponse schedule = eventScheduleService.getScheduleById(scheduleId);
        return ResponseEntity.ok(schedule);
    }
}
