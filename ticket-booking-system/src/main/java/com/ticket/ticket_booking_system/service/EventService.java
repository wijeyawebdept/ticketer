package com.ticket.ticket_booking_system.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
    
    void deleteEvent(UUID id);
    
    EventResponse changeEventStatus(UUID id, String status);
    
    Page<EventResponse> getEventsByOrganizer(UUID organizerId, Pageable pageable);
    
    Page<EventResponse> getUpcomingEvents(Pageable pageable);
    
    Page<EventResponse> getPastEvents(Pageable pageable);
}