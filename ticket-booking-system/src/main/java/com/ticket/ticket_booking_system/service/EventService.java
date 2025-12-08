package com.ticket.ticket_booking_system.service;

import java.io.IOException;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.EventCreateRequest;
import com.ticket.ticket_booking_system.dto.request.EventUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.EventResponse;

public interface EventService {

    EventResponse createEvent(EventCreateRequest request);

    EventResponse getEventById(UUID id);

    Page<EventResponse> getAllEvents(Pageable pageable);

    Page<EventResponse> getEventsByCategory(String category, Pageable pageable);

    Page<EventResponse> searchEvents(String query, Pageable pageable);

    EventResponse updateEvent(UUID id, EventUpdateRequest request);

    void softDeleteEvent(UUID id);

    void deleteEvent(UUID id);

    EventResponse changeEventStatus(UUID id, String status);

    Page<EventResponse> getEventsByOrganizer(UUID organizerId, Pageable pageable);

    Page<EventResponse> getUpcomingEvents(Pageable pageable);

    Page<EventResponse> getPastEvents(Pageable pageable);

    // Add image upload method
    String uploadEventImage(UUID eventId, MultipartFile file) throws IOException;

    // Organizer assignment methods
    EventResponse assignOrganizerToEvent(UUID eventId, UUID organizerId);

    EventResponse removeOrganizerFromEvent(UUID eventId);
}