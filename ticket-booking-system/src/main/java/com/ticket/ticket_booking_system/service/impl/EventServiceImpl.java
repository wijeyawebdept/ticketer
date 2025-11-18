package com.ticket.ticket_booking_system.service.impl;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List; // Added import
import java.util.UUID; // Added import
import java.util.stream.Collectors;

import org.springframework.data.domain.Page; // Added import
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.request.EventCreateRequest;
import com.ticket.ticket_booking_system.dto.request.EventUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.EventResponse;
import com.ticket.ticket_booking_system.dto.response.TicketCategoryResponse;
import com.ticket.ticket_booking_system.dto.response.UserBasicResponse; // Added import
import com.ticket.ticket_booking_system.dto.response.VenueBasicResponse; // Added import
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.TicketCategory; // Added import
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException; // Added import
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.EventService; // Added import
import com.ticket.ticket_booking_system.service.FileUploadService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final FileUploadService fileUploadService;
    private final TicketCategoryRepository ticketCategoryRepository; // Added repository
    private final SeatRepository seatRepository; // Added repository for seat deletion
    private final RecycleBinService recycleBinService; // Added for soft delete

    @Override
    @Transactional
    public EventResponse createEvent(EventCreateRequest request) {
        System.out.println("CREATE EVENT START");
        System.out.println("Event Name: " + request.getName());
        System.out.println("Venue ID: " + request.getVenueId());

        // Get current authenticated user - check all three tables
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        // Determine which table the user is from and get their details
        UUID createdByUserId = null;
        String createdByType = null;
        Organizer eventOrganizer = null;
        
        // Check if user is in users table
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            createdByUserId = user.getUserId();
            createdByType = "USER";
            System.out.println("Current user: " + email + " (Role: USER)");
            throw new IllegalStateException("Users with USER role cannot create events");
        }
        
        // Check if admin
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            createdByUserId = admin.getAdminId();
            createdByType = admin.getRole().name(); // "ADMIN" or "SUPER_ADMIN"
            System.out.println("Current user: " + email + " (Role: " + admin.getRole() + ")");
        }
        
        // Check if organizer
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            createdByUserId = organizer.getOrganizerId();
            createdByType = "ORGANIZER";
            eventOrganizer = organizer;
            System.out.println("Current user: " + email + " (Role: ORGANIZER)");
        }
        
        if (createdByUserId == null) {
            throw new IllegalStateException("Current user not found in any authentication table");
        }

        // Find venue
        Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "id", request.getVenueId().toString()));

        System.out.println("Venue found: " + venue.getName() + " (Capacity: " + venue.getCapacity() + ")");

        // Build event entity - automatically populate venue name and address from the selected venue
        Event event = Event.builder()
                .name(request.getName())
                .description(request.getDescription())
                .venue(venue)
                .venueName(venue.getName()) // Auto-populate from selected venue
                .venueAddress(venue.getAddress()) // Auto-populate from selected venue
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .basePrice(request.getBasePrice())
                .totalCapacity(request.getTotalCapacity())
                .availableSeats(request.getTotalCapacity()) // Initially all seats are available
                .status(Event.EventStatus.DRAFT) // Default status is DRAFT
                .imageUrl(request.getImageUrl())
                .organizer(eventOrganizer) // Only set for ORGANIZER role
                .createdByUserId(createdByUserId) // Track creator ID
                .createdByType(createdByType) // Track creator type (USER/ADMIN/SUPER_ADMIN/ORGANIZER)
                .build();

        Event savedEvent;
        try {
            savedEvent = eventRepository.save(event);
            System.out.println("Event saved with ID: " + savedEvent.getEventId());
        } catch (Exception e) {
            System.err.println("ERROR saving event to database: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to save event: " + e.getMessage(), e);
        }

        // Copy template seats from venue to this event
        try {
            copyVenueSeatsToEvent(venue, savedEvent);
        } catch (Exception e) {
            System.err.println("ERROR copying venue seats: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to copy venue seats: " + e.getMessage(), e);
        }

        // Handle ticket categories if provided
        if (request.getTicketCategories() != null && !request.getTicketCategories().isEmpty()) {
            final Event finalSavedEvent = savedEvent; // Make it final for lambda
            try {
                List<TicketCategory> ticketCategories = request.getTicketCategories().stream()
                        .map(ticketCategoryRequest -> TicketCategory.builder()
                                .categoryName(ticketCategoryRequest.getCategoryName())
                                .price(ticketCategoryRequest.getPrice())
                                .capacity(ticketCategoryRequest.getCapacity())
                                .description(ticketCategoryRequest.getDescription())
                                .event(finalSavedEvent)
                                .build())
                        .collect(Collectors.toList());

                // Save all ticket categories
                ticketCategoryRepository.saveAll(ticketCategories);
                System.out.println("Saved " + ticketCategories.size() + " ticket categories");
            } catch (Exception e) {
                System.err.println("ERROR saving ticket categories: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to save ticket categories: " + e.getMessage(), e);
            }
        }

        System.out.println("CREATE EVENT COMPLETE");
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
            // Auto-populate venue name and address when venue is changed
            event.setVenueName(venue.getName());
            event.setVenueAddress(venue.getAddress());
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
    public void softDeleteEvent(UUID id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id.toString()));
        
        // Get current authenticated user - check all tables
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication.getName();
        
        // Try to find authenticated user in any of the tables
        User deletedBy = userRepository.findByEmail(authenticatedEmail).orElse(null);
        
        // If not found in users table, create a temporary User object for the recycle bin
        if (deletedBy == null) {
            // Check if it's an admin
            Admin admin = adminRepository.findByEmail(authenticatedEmail).orElse(null);
            if (admin != null) {
                // Create a temporary User object to pass to recycle bin
                deletedBy = new User();
                deletedBy.setId(admin.getAdminId());
                deletedBy.setEmail(admin.getEmail());
                deletedBy.setFirstName(admin.getFirstName());
                deletedBy.setLastName(admin.getLastName());
            } else {
                // Check if it's an organizer
                Organizer organizer = organizerRepository.findByEmail(authenticatedEmail).orElse(null);
                if (organizer != null) {
                    // Create a temporary User object to pass to recycle bin
                    deletedBy = new User();
                    deletedBy.setId(organizer.getOrganizerId());
                    deletedBy.setEmail(organizer.getEmail());
                    deletedBy.setFirstName(organizer.getFirstName());
                    deletedBy.setLastName(organizer.getLastName());
                } else {
                    throw new IllegalStateException("Current authenticated user not found in any table");
                }
            }
        }
        
        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
                "EVENT",
                event.getEventId(),
                event.getName(),
                event,
                deletedBy,
                "Event soft deleted by " + deletedBy.getEmail()
        );
        
        // Mark as deleted (soft delete)
        event.setIsDeleted(true);
        eventRepository.save(event);
    }

    @Override
    @Transactional
    public void deleteEvent(UUID id) {
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Event", "id", id.toString());
        }
        // Delete associated seats first
        seatRepository.deleteByEventId(id);
        // Delete associated ticket categories
        ticketCategoryRepository.deleteByEventId(id);
        // Finally, delete the event
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

        // Map organizer if exists (NULL for ADMIN/SUPER_ADMIN created events)
        UserBasicResponse organizerResponse = event.getOrganizer() != null ? UserBasicResponse.builder()
                .id(event.getOrganizer().getOrganizerId())
                .email(event.getOrganizer().getEmail())
                .firstName(event.getOrganizer().getFirstName())
                .lastName(event.getOrganizer().getLastName())
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
                .organizer(organizerResponse) // Can be NULL for ADMIN/SUPER_ADMIN events
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

    /**
     * Copy template seats from venue to event
     * This creates event-specific seat records based on the venue's template seats
     */
    private void copyVenueSeatsToEvent(Venue venue, Event event) {
        System.out.println("COPY VENUE SEATS TO EVENT");
        System.out.println("Venue ID: " + venue.getVenueId());
        System.out.println("Event ID: " + event.getEventId());

        // Find all template seats for this venue (where event IS NULL)
        List<com.ticket.ticket_booking_system.entity.Seat> templateSeats = seatRepository
                .findByVenueAndEventIsNull(venue);

        System.out.println("Found " + templateSeats.size() + " template seats to copy");

        if (templateSeats.isEmpty()) {
            System.out.println("WARNING: No template seats found for venue. Event will have no seats!");
            return;
        }

        // Create new seat records for the event by copying template seats
        List<com.ticket.ticket_booking_system.entity.Seat> eventSeats = templateSeats.stream()
                .map(templateSeat -> com.ticket.ticket_booking_system.entity.Seat.builder()
                        .venue(venue)
                        .event(event) // Assign to this event
                        .section(templateSeat.getSection())
                        .rowNumber(templateSeat.getRowNumber())
                        .row(templateSeat.getRow())
                        .seatNumber(templateSeat.getSeatNumber())
                        .seatType(templateSeat.getSeatType())
                        .status("AVAILABLE") // All seats start as available
                        .price(templateSeat.getPrice())
                        .isAvailable(true)
                        .isBlocked(false)
                        .build())
                .collect(Collectors.toList());

        // Save all event seats
        seatRepository.saveAll(eventSeats);

        System.out.println("Successfully copied " + eventSeats.size() + " seats to event");
        System.out.println("COPY SEATS COMPLETE");
    }
}
