package com.ticket.ticket_booking_system.service.impl;

import com.ticket.ticket_booking_system.dto.request.EventCreateRequest;
import com.ticket.ticket_booking_system.dto.request.EventUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.EventResponse;
import com.ticket.ticket_booking_system.dto.response.UserBasicResponse;
import com.ticket.ticket_booking_system.dto.response.VenueBasicResponse;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.EventService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final UserRepository userRepository;
    
    public EventServiceImpl(EventRepository eventRepository, VenueRepository venueRepository, UserRepository userRepository) {
        this.eventRepository = eventRepository;
        this.venueRepository = venueRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public EventResponse createEvent(EventCreateRequest request) {
        // Get current authenticated user as organizer
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User organizer = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new IllegalStateException("Current user not found"));
        
        // Find venue
        Venue venue = venueRepository.findById(request.getVenueId())
            .orElseThrow(() -> new ResourceNotFoundException("Venue", "id", request.getVenueId().toString()));
        
        // Build event entity
        Event event = Event.builder()
            .name(request.getName())
            .description(request.getDescription())
            .venue(venue)
            .startDateTime(request.getStartDateTime())
            .endDateTime(request.getEndDateTime())
            .basePrice(request.getBasePrice())
            .totalCapacity(request.getTotalCapacity())
            .availableSeats(request.getTotalCapacity()) // Initially all seats are available
            .status(Event.EventStatus.DRAFT) // Default status is DRAFT
            .imageUrl(request.getImageUrl())
            .organizer(organizer)
            .build();
        
        Event savedEvent = eventRepository.save(event);
        return mapEventToResponse(savedEvent);
    }

    @Override
    public EventResponse getEventById(UUID id) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id.toString()));
        
        return mapEventToResponse(event);
    }

    @Override
    public Page<EventResponse> getAllEvents(Pageable pageable) {
        return eventRepository.findAll(pageable)
            .map(this::mapEventToResponse);
    }

    @Override
    public Page<EventResponse> getEventsByCategory(String category, Pageable pageable) {
        // Implement based on your data model
        // If there's no category field, you might search in the description
        return eventRepository.findByNameContainingIgnoreCase(category, pageable)
            .map(this::mapEventToResponse);
    }

    @Override
    public Page<EventResponse> searchEvents(String query, Pageable pageable) {
        return eventRepository.findByNameContainingIgnoreCase(query, pageable)
            .map(this::mapEventToResponse);
    }

    @Override
    @Transactional
    public EventResponse updateEvent(UUID id, EventUpdateRequest request) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id.toString()));
        
        // Update fields if provided
        if (request.getName() != null && !request.getName().isEmpty()) {
            event.setName(request.getName());
        }
        
        if (request.getDescription() != null && !request.getDescription().isEmpty()) {
            event.setDescription(request.getDescription());
        }
        
        if (request.getStartDateTime() != null) {
            event.setStartDateTime(request.getStartDateTime());
        }
        
        if (request.getEndDateTime() != null) {
            event.setEndDateTime(request.getEndDateTime());
        }
        
        if (request.getVenueId() != null) {
            Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "id", request.getVenueId().toString()));
            event.setVenue(venue);
        }
        
        if (request.getBasePrice() != null) {
            event.setBasePrice(request.getBasePrice());
        }
        
        if (request.getTotalCapacity() != null) {
            int difference = request.getTotalCapacity() - event.getTotalCapacity();
            event.setTotalCapacity(request.getTotalCapacity());
            // Update available seats accordingly
            event.setAvailableSeats(Math.max(0, event.getAvailableSeats() + difference));
        }
        
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            try {
                Event.EventStatus status = Event.EventStatus.valueOf(request.getStatus().toUpperCase());
                event.setStatus(status);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid event status: " + request.getStatus());
            }
        }
        
        if (request.getImageUrl() != null) {
            event.setImageUrl(request.getImageUrl());
        }
        
        Event savedEvent = eventRepository.save(event);
        return mapEventToResponse(savedEvent);
    }

    @Override
    @Transactional
    public void deleteEvent(UUID id) {
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Event", "id", id.toString());
        }
        eventRepository.deleteById(id);
    }

    @Override
    @Transactional
    public EventResponse changeEventStatus(UUID id, String status) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id.toString()));
        
        try {
            Event.EventStatus eventStatus = Event.EventStatus.valueOf(status.toUpperCase());
            event.setStatus(eventStatus);
            Event savedEvent = eventRepository.save(event);
            return mapEventToResponse(savedEvent);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid event status: " + status);
        }
    }

    @Override
    public Page<EventResponse> getEventsByOrganizer(UUID organizerId, Pageable pageable) {
        User organizer = userRepository.findById(organizerId)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", organizerId.toString()));
        
        return eventRepository.findByOrganizer(organizer, pageable)
            .map(this::mapEventToResponse);
    }

    @Override
    public Page<EventResponse> getUpcomingEvents(Pageable pageable) {
        LocalDateTime now = LocalDateTime.now();
        List<Event> upcomingEvents = eventRepository.findUpcomingEvents(now, pageable);
        List<EventResponse> eventResponses = upcomingEvents.stream()
            .map(this::mapEventToResponse)
            .toList();
            
        return new org.springframework.data.domain.PageImpl<>(
            eventResponses, 
            pageable, 
            eventResponses.size()
        );
    }

    @Override
    public Page<EventResponse> getPastEvents(Pageable pageable) {
        LocalDateTime now = LocalDateTime.now();
        // Since there's no findPastEvents method in the repository, 
        // let's implement the logic here
        Page<Event> pastEvents = eventRepository.findAll(pageable);
        List<EventResponse> eventResponses = pastEvents.stream()
            .filter(event -> event.getEndDateTime() != null && 
                    event.getEndDateTime().isBefore(now))
            .map(this::mapEventToResponse)
            .toList();
            
        return new org.springframework.data.domain.PageImpl<>(
            eventResponses, 
            pageable, 
            eventResponses.size()
        );
    }
    
    // Helper method to map Event entity to EventResponse DTO
    private EventResponse mapEventToResponse(Event event) {
        EventResponse response = EventResponse.builder()
            .id(event.getId())
            .name(event.getName())
            .description(event.getDescription())
            .startDateTime(event.getStartDateTime())
            .endDateTime(event.getEndDateTime())
            .basePrice(event.getBasePrice())
            .totalCapacity(event.getTotalCapacity())
            .availableSeats(event.getAvailableSeats())
            .status(event.getStatus().name())
            .imageUrl(event.getImageUrl())
            .createdAt(event.getCreatedAt())
            .updatedAt(event.getUpdatedAt())
            .build();
        
        // Set venue information if available
        if (event.getVenue() != null) {
            response.setVenue(VenueBasicResponse.builder()
                .id(event.getVenue().getId())
                .name(event.getVenue().getName())
                .address("") // Add address field to Venue entity if needed
                .capacity(event.getVenue().getCapacity())
                .build());
        }
        
        // Set organizer information if available
        if (event.getOrganizer() != null) {
            response.setOrganizer(UserBasicResponse.builder()
                .id(event.getOrganizer().getId())
                .firstName(event.getOrganizer().getFirstName())
                .lastName(event.getOrganizer().getLastName())
                .email(event.getOrganizer().getUsername()) // Username is email in User entity
                .build());
        }
        
        return response;
    }
}