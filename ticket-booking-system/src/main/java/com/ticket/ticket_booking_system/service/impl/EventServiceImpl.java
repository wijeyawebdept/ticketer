package com.ticket.ticket_booking_system.service.impl;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList; // Added import
import java.util.List; // Added import
import java.util.UUID;
import java.util.stream.Collectors; // Added import

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.EventCreateRequest;
import com.ticket.ticket_booking_system.dto.request.EventUpdateRequest;
import com.ticket.ticket_booking_system.dto.request.TicketCategoryRequest; // Added import
import com.ticket.ticket_booking_system.dto.response.EventResponse;
import com.ticket.ticket_booking_system.dto.response.TicketCategoryResponse; // Added import
import com.ticket.ticket_booking_system.dto.response.VenueBasicResponse;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.TicketCategory; // Added import
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository; // Added import
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.EventService;
import com.ticket.ticket_booking_system.service.FileUploadService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;
    private final TicketCategoryRepository ticketCategoryRepository; // Added repository

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

        // Handle ticket categories if provided
        if (request.getTicketCategories() != null && !request.getTicketCategories().isEmpty()) {
            List<TicketCategory> ticketCategories = request.getTicketCategories().stream()
                    .map(ticketCategoryRequest -> TicketCategory.builder()
                            .categoryName(ticketCategoryRequest.getCategoryName())
                            .price(ticketCategoryRequest.getPrice())
                            .capacity(ticketCategoryRequest.getCapacity())
                            .description(ticketCategoryRequest.getDescription())
                            .event(savedEvent)
                            .build())
                    .collect(Collectors.toList());

            // Save all ticket categories
            ticketCategoryRepository.saveAll(ticketCategories);
        }

        return mapEventToResponse(savedEvent);
    }

    @Override
    @Transactional(readOnly = true)
    public EventResponse getEventById(UUID id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id.toString()));

        return mapEventToResponse(event);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getAllEvents(Pageable pageable) {
        // Use JOIN FETCH to avoid LazyInitializationException
        return eventRepository.findAllWithVenueAndOrganizerAndTicketCategories(pageable)
                .map(this::mapEventToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getEventsByCategory(String category, Pageable pageable) {
        // Implement based on your data model
        // If there's no category field, you might search in the description
        return eventRepository.findAllWithVenueAndOrganizerAndTicketCategories(pageable) // Placeholder implementation
                .map(this::mapEventToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> searchEvents(String query, Pageable pageable) {
        // Implement search functionality
        return eventRepository.findAllWithVenueAndOrganizerAndTicketCategories(pageable) // Placeholder implementation
                .map(this::mapEventToResponse);
    }

    @Override
    @Transactional
    public EventResponse updateEvent(UUID id, EventUpdateRequest request) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id.toString()));

        if (request.getName() != null) {
            event.setName(request.getName());
        }

        if (request.getDescription() != null) {
            event.setDescription(request.getDescription());
        }

        if (request.getVenueId() != null) {
            Venue venue = venueRepository.findById(request.getVenueId())
                    .orElseThrow(() -> new ResourceNotFoundException("Venue", "id", request.getVenueId().toString()));
            event.setVenue(venue);
        }

        if (request.getStartDateTime() != null) {
            event.setStartDateTime(request.getStartDateTime());
        }

        if (request.getEndDateTime() != null) {
            event.setEndDateTime(request.getEndDateTime());
        }

        if (request.getBasePrice() != null) {
            event.setBasePrice(request.getBasePrice());
        }

        if (request.getTotalCapacity() != null) {
            event.setTotalCapacity(request.getTotalCapacity());
            // Update available seats if total capacity changes
            int capacityDifference = request.getTotalCapacity() - event.getTotalCapacity();
            event.setAvailableSeats(event.getAvailableSeats() + capacityDifference);
        }

        if (request.getStatus() != null) {
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
        // Delete associated ticket categories first
        ticketCategoryRepository.deleteByEventId(id);
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
    @Transactional(readOnly = true)
    public Page<EventResponse> getEventsByOrganizer(UUID organizerId, Pageable pageable) {
        User organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", organizerId.toString()));

        // Use JOIN FETCH to avoid LazyInitializationException
        return eventRepository.findByOrganizerWithVenueAndOrganizerAndTicketCategories(organizer, pageable)
                .map(this::mapEventToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getUpcomingEvents(Pageable pageable) {
        // This is a simplified implementation - you might want to implement a proper
        // query
        return eventRepository.findAllWithVenueAndOrganizerAndTicketCategories(pageable)
                .map(this::mapEventToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getPastEvents(Pageable pageable) {
        // This is a simplified implementation - you might want to implement a proper
        // query
        return eventRepository.findAllWithVenueAndOrganizerAndTicketCategories(pageable)
                .map(this::mapEventToResponse);
    }

    @Override
    @Transactional
    public String uploadEventImage(UUID eventId, MultipartFile file) throws IOException {
        // Find the event
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));

        // Delete old image if exists
        if (event.getImageUrl() != null && !event.getImageUrl().isEmpty()) {
            fileUploadService.deleteProfilePicture(event.getImageUrl());
        }

        // Upload new image
        String imageUrl = fileUploadService.uploadProfilePicture(file);

        // Update event with new image URL
        event.setImageUrl(imageUrl);
        eventRepository.save(event);

        return imageUrl;
    }

    private EventResponse mapEventToResponse(Event event) {
        VenueBasicResponse venueResponse = event.getVenue() != null ? VenueBasicResponse.builder()
                .id(event.getVenue().getId())
                .name(event.getVenue().getName())
                .address(event.getVenue().getAddress())
                .capacity(event.getVenue().getCapacity())
                .build() : null;

        // Map ticket categories if they exist
        List<TicketCategoryResponse> ticketCategoryResponses = new ArrayList<>();
        if (event.getTicketCategories() != null) {
            ticketCategoryResponses = event.getTicketCategories().stream()
                    .map(ticketCategory -> TicketCategoryResponse.builder()
                            .id(ticketCategory.getId())
                            .categoryName(ticketCategory.getCategoryName())
                            .price(ticketCategory.getPrice())
                            .capacity(ticketCategory.getCapacity())
                            .description(ticketCategory.getDescription())
                            .createdAt(ticketCategory.getCreatedAt())
                            .updatedAt(ticketCategory.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());
        }

        return EventResponse.builder()
                .id(event.getId())
                .name(event.getName())
                .description(event.getDescription())
                .venue(venueResponse)
                .startDateTime(event.getStartDateTime())
                .endDateTime(event.getEndDateTime())
                .basePrice(event.getBasePrice())
                .totalCapacity(event.getTotalCapacity())
                .availableSeats(event.getAvailableSeats())
                .status(event.getStatus().name())
                .imageUrl(event.getImageUrl())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .ticketCategories(ticketCategoryResponses) // Added ticket categories
                .build();
    }
}