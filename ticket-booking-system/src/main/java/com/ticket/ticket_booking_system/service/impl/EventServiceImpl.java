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
import com.ticket.ticket_booking_system.dto.response.EventCategoryResponse;
import com.ticket.ticket_booking_system.dto.response.TicketCategoryResponse;
import com.ticket.ticket_booking_system.dto.response.UserBasicResponse; // Added import
import com.ticket.ticket_booking_system.dto.response.VenueBasicResponse; // Added import
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventCategory;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.TicketCategory; // Added import
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException; // Added import
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventCategoryRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.EventService; // Added import
import com.ticket.ticket_booking_system.service.FileUploadService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final FileUploadService fileUploadService;
    private final TicketCategoryRepository ticketCategoryRepository; // Added repository
    private final SeatRepository seatRepository; // Added repository for seat deletion
    private final RecycleBinService recycleBinService;
    private final EmailService emailService;
    private final com.ticket.ticket_booking_system.service.AdminAuditService auditService;

    @Override
    @Transactional
    public EventResponse createEvent(EventCreateRequest request) {
        System.out.println("CREATE EVENT START");
        System.out.println("Event Name: " + request.getName());
        System.out.println("Venue ID: " + request.getVenueId());

        // Get current authenticated user details from SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        // Extract roles from authorities to prioritize the correct table lookup
        List<String> roles = authentication.getAuthorities().stream()
                .map(grantedAuthority -> grantedAuthority.getAuthority())
                .collect(Collectors.toList());
        
        System.out.println("Role recognition for: " + email + " (Authenticated Roles: " + roles + ")");

        // Determine which table the user is from and get their details
        UUID createdByUserId = null;
        String createdByType = null;
        Organizer eventOrganizer = null;
        
        // 1. Check if user is an ADMIN or SUPER_ADMIN (Priority 1)
        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_SUPER_ADMIN") || 
            roles.contains("ADMIN") || roles.contains("SUPER_ADMIN")) {
            Admin admin = adminRepository.findByEmail(email).orElse(null);
            if (admin != null) {
                createdByUserId = admin.getAdminId();
                createdByType = admin.getRole().name(); // "ADMIN" or "SUPER_ADMIN"
                System.out.println("Validated as: " + email + " (Entity: ADMIN, ID: " + createdByUserId + ")");
            }
        }
        
        // 2. Check if user is an ORGANIZER (Priority 2)
        if (createdByUserId == null && (roles.contains("ROLE_ORGANIZER") || roles.contains("ORGANIZER"))) {
            Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
            if (organizer != null) {
                createdByUserId = organizer.getOrganizerId();
                createdByType = "ORGANIZER";
                eventOrganizer = organizer;
                System.out.println("Validated as: " + email + " (Entity: ORGANIZER, ID: " + createdByUserId + ")");
            }
        }
        
        // 3. Check if user is an ORGANIZER_EMPLOYEE (Priority 3)
        if (createdByUserId == null && (roles.contains("ROLE_ORGANIZER_EMPLOYEE") || roles.contains("ORGANIZER_EMPLOYEE"))) {
            OrganizerEmployee employee = organizerEmployeeRepository.findByEmail(email).orElse(null);
            if (employee != null) {
                createdByUserId = employee.getEmployeeId();
                createdByType = "ORGANIZER_EMPLOYEE";
                // Employee creates event on behalf of their parent organizer
                eventOrganizer = employee.getOrganizer();
                System.out.println("Validated as: " + email + " (Entity: ORGANIZER_EMPLOYEE, ID: " + createdByUserId + ")");
            }
        }
        
        // 4. Fallback to regular USER table only if no staff role is present (Priority 4)
        if (createdByUserId == null) {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                createdByUserId = user.getUserId();
                createdByType = "USER";
                System.out.println("Validated as: " + email + " (Entity: USER)");
                throw new IllegalStateException("Users with USER role cannot create events through the admin portal");
            }
        }
        
        if (createdByUserId == null) {
            throw new IllegalStateException("Current user not found in the appropriate authentication table for their role");
        }

        // Find venue
        Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "id", request.getVenueId().toString()));

        System.out.println("Venue found: " + venue.getName() + " (Capacity: " + venue.getCapacity() + ")");

        // Find category if provided
        EventCategory category = null;
        if (request.getCategoryId() != null) {
            category = eventCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event Category", "id", request.getCategoryId().toString()));
        }

        // Build event entity - automatically populate venue name and address from the selected venue
        Event event = Event.builder()
                .name(request.getName())
                .description(request.getDescription())
                .venue(venue)
                .venueName(venue.getName()) // Auto-populate from selected venue
                .venueAddress(venue.getAddress()) // Auto-populate from selected venue
                // basePrice no longer set from form - auto-computed from min ticket category price
                .totalCapacity(request.getTotalCapacity())
                .availableSeats(request.getTotalCapacity()) // Initially all seats are available
                .status(Event.EventStatus.DRAFT) // Default status is DRAFT
                .imageUrl(request.getImageUrl())
                .category(category) // Set category FK
                .organizer(eventOrganizer) // Only set for ORGANIZER role
                .createdByUserId(createdByUserId) // Track creator ID
                .createdByType(createdByType) // Track creator type (USER/ADMIN/SUPER_ADMIN/ORGANIZER)
                .build();

        Event savedEvent;
        try {
            savedEvent = eventRepository.save(event);
            System.out.println("Event saved with ID: " + savedEvent.getEventId());

            // Log event creation
            auditService.logAction(createdByUserId, "CREATE_EVENT", "EVENT", savedEvent.getEventId(), "Created event: " + savedEvent.getName());
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
                                .isSharedArea(ticketCategoryRequest.getIsSharedArea() != null ? ticketCategoryRequest.getIsSharedArea() : false)
                                .sharedAreaNumber(ticketCategoryRequest.getSharedAreaNumber())
                                .venueSeatCategoryName(ticketCategoryRequest.getVenueSeatCategoryName())
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

        // Handle schedules if provided
        if (request.getSchedules() != null && !request.getSchedules().isEmpty()) {
            final Event finalSavedEvent = savedEvent;
            try {
                List<EventSchedule> schedules = request.getSchedules().stream()
                        .map(scheduleRequest -> EventSchedule.builder()
                                .event(finalSavedEvent)
                                .scheduleDate(scheduleRequest.getScheduleDate())
                                .startTime(scheduleRequest.getStartTime())
                                .endTime(scheduleRequest.getEndTime())
                                .capacity(scheduleRequest.getCapacity())
                                .availableSeats(scheduleRequest.getCapacity()) // Initially all available
                                .priceAdjustment(scheduleRequest.getPriceAdjustment() != null ? scheduleRequest.getPriceAdjustment() : java.math.BigDecimal.ZERO)
                                .status(EventSchedule.ScheduleStatus.ACTIVE)
                                .notes(scheduleRequest.getNotes())
                                .build())
                        .collect(Collectors.toList());
                
                eventScheduleRepository.saveAll(schedules);
                System.out.println("Saved " + schedules.size() + " schedules");
            } catch (Exception e) {
                System.err.println("ERROR saving schedules: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to save schedules: " + e.getMessage(), e);
            }
        }

        // Send email to admins if created by organizer/employee
        if ("ORGANIZER".equals(createdByType) || "ORGANIZER_EMPLOYEE".equals(createdByType)) {
            String orgName = eventOrganizer != null ? eventOrganizer.getOrganizationName() : "An Organizer";
            adminRepository.findAll().forEach(admin -> {
                if (admin.getEmail() != null) {
                    emailService.sendEventRequestAdminNotificationEmail(admin.getEmail(), orgName, savedEvent.getName());
                }
            });
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

        // basePrice is auto-computed from min ticket price, not directly updated

        if (request.getTotalCapacity() != null) {
            // Calculate capacity difference BEFORE updating
            int oldCapacity = event.getTotalCapacity();
            int newCapacity = request.getTotalCapacity();
            int capacityDifference = newCapacity - oldCapacity;
            
            event.setTotalCapacity(newCapacity);
            // Update available seats based on capacity change
            event.setAvailableSeats(event.getAvailableSeats() + capacityDifference);
        }

        if (request.getStatus() != null) {
            try {
                Event.EventStatus status = Event.EventStatus.valueOf(request.getStatus().toUpperCase());
                event.setStatus(status);
                
                if (status == Event.EventStatus.PUBLISHED) {
                    event.setActive(1);
                } else {
                    event.setActive(0);
                    
                    // Deactivate deals for this event
                    List<TicketCategory> categories = ticketCategoryRepository.findByEventId(event.getEventId());
                    for (TicketCategory category : categories) {
                        if (Boolean.TRUE.equals(category.getDealActive())) {
                            category.setDealActive(false);
                            ticketCategoryRepository.save(category);
                        }
                    }
                }
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid event status: " + request.getStatus());
            }
        }

        if (request.getImageUrl() != null) {
            // If the image is being cleared (empty string), delete the old file
            if (request.getImageUrl().isEmpty() && event.getImageUrl() != null && !event.getImageUrl().isEmpty()) {
                try {
                    fileUploadService.deleteProfilePicture(event.getImageUrl());
                } catch (IOException e) {
                    // Log error but continue
                }
                event.setImageUrl(null);
            } else if (!request.getImageUrl().isEmpty()) {
                // If it's a new URL string, just update it
                event.setImageUrl(request.getImageUrl());
            }
        }

        if (request.getCategoryId() != null) {
            EventCategory category = eventCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event Category", "id", request.getCategoryId().toString()));
            event.setCategory(category);
        }

        Event savedEvent = eventRepository.save(event);
        
        // Log event update
        auditService.logAction(event.getCreatedByUserId(), "UPDATE_EVENT", "EVENT", savedEvent.getEventId(), "Updated event: " + savedEvent.getName());
        
        // Handle ticket categories update if provided
        if (request.getTicketCategories() != null && !request.getTicketCategories().isEmpty()) {
            System.out.println("UPDATE EVENT: Processing " + request.getTicketCategories().size() + " ticket categories");
            
            // Delete existing ticket categories for this event
            ticketCategoryRepository.deleteByEventEventId(savedEvent.getEventId());
            System.out.println("UPDATE EVENT: Deleted old ticket categories for event " + savedEvent.getEventId());
            
            // Create new ticket categories
            List<TicketCategory> ticketCategories = request.getTicketCategories().stream()
                    .map(ticketCategoryRequest -> {
                        System.out.println("UPDATE EVENT: Creating category - " + ticketCategoryRequest.getCategoryName() + 
                            ", isSharedArea=" + ticketCategoryRequest.getIsSharedArea() + 
                            ", sharedAreaNumber=" + ticketCategoryRequest.getSharedAreaNumber());
                        return TicketCategory.builder()
                                .categoryName(ticketCategoryRequest.getCategoryName())
                                .price(ticketCategoryRequest.getPrice())
                                .capacity(ticketCategoryRequest.getCapacity())
                                .description(ticketCategoryRequest.getDescription())
                                .isSharedArea(ticketCategoryRequest.getIsSharedArea() != null ? ticketCategoryRequest.getIsSharedArea() : false)
                                .sharedAreaNumber(ticketCategoryRequest.getSharedAreaNumber())
                                .venueSeatCategoryName(ticketCategoryRequest.getVenueSeatCategoryName())
                                .event(savedEvent)
                                .build();
                    })
                    .collect(Collectors.toList());

            // Save all ticket categories
            ticketCategoryRepository.saveAll(ticketCategories);
            System.out.println("UPDATE EVENT: Saved " + ticketCategories.size() + " ticket categories");
            
            // Count shared area categories for verification
            long sharedAreaCount = ticketCategories.stream()
                    .filter(tc -> Boolean.TRUE.equals(tc.getIsSharedArea()))
                    .count();
            System.out.println("UPDATE EVENT: " + sharedAreaCount + " categories are shared areas");
        }
        
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
                    // Check if it's an organizer employee
                    OrganizerEmployee employee = organizerEmployeeRepository.findByEmail(authenticatedEmail).orElse(null);
                    if (employee != null) {
                        deletedBy = new User();
                        deletedBy.setId(employee.getEmployeeId());
                        deletedBy.setEmail(employee.getEmail());
                        deletedBy.setFirstName(employee.getFirstName());
                        deletedBy.setLastName(employee.getLastName());

                    } else {
                        throw new IllegalStateException("Current authenticated user not found in any table");
                    }
                }
            }
        }

        // First, move all event schedules to recycle bin
        List<EventSchedule> schedules = eventScheduleRepository.findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(event.getEventId());
        System.out.println("Found " + schedules.size() + " schedules to move to recycle bin for event: " + event.getName());
        
        for (EventSchedule schedule : schedules) {
            recycleBinService.moveToRecycleBin(
                "SCHEDULE",
                schedule.getScheduleId(),
                event.getName() + " - " + schedule.getScheduleDate() + " " + schedule.getStartTime(),
                schedule,
                deletedBy,
                "Schedule soft deleted due to event deletion"
            );
            
            // Mark schedule as deleted
            schedule.setIsDeleted(true);
            eventScheduleRepository.save(schedule);
            System.out.println("Schedule " + schedule.getScheduleDate() + " moved to recycle bin");
        }
        
        // Move event to recycle bin
        recycleBinService.moveToRecycleBin(
                "EVENT",
                event.getEventId(),
                event.getName(),
                event,
                deletedBy,
                "Event soft deleted by " + deletedBy.getEmail()
        );
        
        // Mark as deleted (soft delete) - use active = -1
        event.setActive(-1);
        event.setIsDeleted(true);
        eventRepository.save(event);

        // Clear all deal data for this event permanently
        List<TicketCategory> categories = ticketCategoryRepository.findByEventId(event.getEventId());
        for (TicketCategory category : categories) {
            if (category.getDealType() != null || Boolean.TRUE.equals(category.getDealActive())) {
                category.setDealActive(false);
                category.setDealType(null);
                category.setDealDiscountPercentage(null);
                category.setDealBuyQuantity(null);
                category.setDealFreeQuantity(null);
                category.setDealLabel(null);
                ticketCategoryRepository.save(category);
            }
        }
        
        System.out.println("Event " + event.getName() + " moved to recycle bin with status=-1");

        // Log event soft delete
        auditService.logAction(deletedBy.getId(), "SOFT_DELETE_EVENT", "EVENT", event.getEventId(), "Moved event to recycle bin: " + event.getName());
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
            
            // Update active field based on status
            // Only PUBLISHED events are considered active
            if (eventStatus == Event.EventStatus.PUBLISHED) {
                event.setActive(1); // Active
            } else {
                event.setActive(0); // Inactive for DRAFT, CANCELLED, COMPLETED
                
                // Deactivate deals for this event
                List<TicketCategory> categories = ticketCategoryRepository.findByEventId(event.getEventId());
                for (TicketCategory category : categories) {
                    if (Boolean.TRUE.equals(category.getDealActive())) {
                        category.setDealActive(false);
                        ticketCategoryRepository.save(category);
                    }
                }
            }
            
            Event savedEvent = eventRepository.save(event);
            
            // Log status change
            auditService.logAction(event.getCreatedByUserId(), "CHANGE_EVENT_STATUS", "EVENT", savedEvent.getEventId(), 
                    "Changed event status to " + status + ": " + event.getName());
            
            return mapEventToResponse(savedEvent);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid event status: " + status);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getEventsByOrganizer(UUID organizerId, Pageable pageable) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

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
                            .isSharedArea(ticketCategory.getIsSharedArea())
                            .sharedAreaNumber(ticketCategory.getSharedAreaNumber())
                            .venueSeatCategoryName(ticketCategory.getVenueSeatCategoryName())
                            .dealActive(ticketCategory.getDealActive())
                            .dealType(ticketCategory.getDealType())
                            .dealDiscountPercentage(ticketCategory.getDealDiscountPercentage())
                            .dealBuyQuantity(ticketCategory.getDealBuyQuantity())
                            .dealFreeQuantity(ticketCategory.getDealFreeQuantity())
                            .dealLabel(ticketCategory.getDealLabel())
                            .createdAt(ticketCategory.getCreatedAt())
                            .updatedAt(ticketCategory.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());
        }

        // Get the next upcoming schedule for this event
        List<EventSchedule> schedules = eventScheduleRepository
                .findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(event.getEventId());
        EventSchedule nextSchedule = schedules.stream()
                .filter(schedule -> {
                    java.time.LocalDateTime scheduleDateTime = java.time.LocalDateTime.of(
                        schedule.getScheduleDate(), 
                        schedule.getStartTime()
                    );
                    return scheduleDateTime.isAfter(java.time.LocalDateTime.now());
                })
                .min((s1, s2) -> {
                    java.time.LocalDateTime dt1 = java.time.LocalDateTime.of(s1.getScheduleDate(), s1.getStartTime());
                    java.time.LocalDateTime dt2 = java.time.LocalDateTime.of(s2.getScheduleDate(), s2.getStartTime());
                    return dt1.compareTo(dt2);
                })
                .orElse(null);

        // Convert next schedule to response if exists
        com.ticket.ticket_booking_system.dto.response.EventScheduleResponse nextScheduleResponse = null;
        java.time.LocalDateTime startDateTime = null;
        java.time.LocalDateTime endDateTime = null;

        if (nextSchedule != null) {
            nextScheduleResponse = com.ticket.ticket_booking_system.dto.response.EventScheduleResponse.builder()
                    .scheduleId(nextSchedule.getScheduleId())
                    .eventId(event.getEventId())
                    .eventName(event.getName())
                    .scheduleDate(nextSchedule.getScheduleDate())
                    .startTime(nextSchedule.getStartTime())
                    .endTime(nextSchedule.getEndTime())
                    .capacity(nextSchedule.getCapacity())
                    .availableSeats(nextSchedule.getAvailableSeats())
                    .priceAdjustment(nextSchedule.getPriceAdjustment())
                    .status(nextSchedule.getStatus())
                    .build();

            startDateTime = java.time.LocalDateTime.of(nextSchedule.getScheduleDate(), nextSchedule.getStartTime());
            endDateTime = java.time.LocalDateTime.of(nextSchedule.getScheduleDate(), nextSchedule.getEndTime());
        }

        // Map event category if exists
        EventCategoryResponse categoryResponse = null;
        if (event.getCategory() != null) {
            categoryResponse = EventCategoryResponse.builder()
                    .id(event.getCategory().getId())
                    .categoryName(event.getCategory().getCategoryName())
                    .description(event.getCategory().getDescription())
                    .active(event.getCategory().getActive())
                    .createdAt(event.getCategory().getCreatedAt())
                    .updatedAt(event.getCategory().getUpdatedAt())
                    .build();
        }

        // Determine if any ticket category has an active deal
        boolean hasDeal = ticketCategoryResponses.stream()
                .anyMatch(tc -> Boolean.TRUE.equals(tc.getDealActive()));

        // Auto-compute basePrice as the minimum price across non-shared-area ticket categories
        // This is used by public pages to show "From LKR X" without requiring admin input
        java.math.BigDecimal computedBasePrice = ticketCategoryResponses.stream()
                .filter(tc -> !Boolean.TRUE.equals(tc.getIsSharedArea()))
                .map(tc -> tc != null ? tc.getPrice() : null)
                .filter(p -> p != null)
                .min((p1, p2) -> p1.compareTo(p2))
                .orElse(java.math.BigDecimal.ZERO);

        // Calculate true total capacity and available seats from schedules
        // The user doesn't want the capacity multiplied across multiple schedules (e.g. if it's the same venue capacity each day)
        int trueTotalCapacity = event.getTotalCapacity();
        int trueAvailableSeats = event.getAvailableSeats();

        // Map all schedules to responses
        List<com.ticket.ticket_booking_system.dto.response.EventScheduleResponse> scheduleResponses = schedules.stream()
                .map(schedule -> com.ticket.ticket_booking_system.dto.response.EventScheduleResponse.builder()
                        .scheduleId(schedule.getScheduleId())
                        .eventId(event.getEventId())
                        .eventName(event.getName())
                        .scheduleDate(schedule.getScheduleDate())
                        .startTime(schedule.getStartTime())
                        .endTime(schedule.getEndTime())
                        .capacity(schedule.getCapacity())
                        .availableSeats(schedule.getAvailableSeats())
                        .priceAdjustment(schedule.getPriceAdjustment())
                        .status(schedule.getStatus())
                        .build())
                .collect(Collectors.toList());

        return EventResponse.builder()
                .id(event.getId())
                .name(event.getName())
                .description(event.getDescription())
                .venue(venueResponse)
                .organizer(organizerResponse) // Can be NULL for ADMIN/SUPER_ADMIN events
                .startDateTime(startDateTime) // Earliest/next schedule date-time
                .endDateTime(endDateTime)     // Earliest/next schedule end time
                .nextSchedule(nextScheduleResponse) // Full next schedule info
                .basePrice(computedBasePrice) // Auto-computed min price
                .totalCapacity(trueTotalCapacity)
                .availableSeats(trueAvailableSeats)
                .status(event.getStatus().name())
                .imageUrl(event.getImageUrl())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .createdByType(event.getCreatedByType()) // Include creator type for filtering
                .category(categoryResponse) // Include category object
                .ticketCategories(ticketCategoryResponses) // Added ticket categories
                .hasDeal(hasDeal) // Derived from ticket categories
                .schedules(scheduleResponses) // All schedules
                .slug(event.getSlug()) // Include slug
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

    @Override
    @Transactional
    public EventResponse assignOrganizerToEvent(UUID eventId, UUID organizerId) {
        // Find the event
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));

        // Verify event was created by admin/super admin (allow null for backward compatibility)
        if (event.getCreatedByType() != null && 
            !"ADMIN".equals(event.getCreatedByType()) && 
            !"SUPER_ADMIN".equals(event.getCreatedByType())) {
            throw new IllegalArgumentException("Can only assign organizers to admin-created events");
        }

        // Find the organizer
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

        // Verify organizer is active (use isActive() for primitive boolean)
        if (organizer.getActive() != 1) {
            throw new IllegalArgumentException("Cannot assign inactive organizer");
        }

        // Assign organizer to event
        event.setOrganizer(organizer);
        Event savedEvent = eventRepository.save(event);

        // Notify organizer by email
        try {
            emailService.sendOrganizerEventAssignmentEmail(organizer, savedEvent);
        } catch (Exception e) {
            System.err.println("⚠ Failed to send organizer assignment email: " + e.getMessage());
        }

        // Log organizer assignment
        auditService.logAction(null, "ASSIGN_ORGANIZER", "EVENT", savedEvent.getEventId(), 
                "Assigned organizer " + organizer.getOrganizationName() + " to event: " + savedEvent.getName());

        return mapEventToResponse(savedEvent);
    }

    @Override
    @Transactional
    public EventResponse removeOrganizerFromEvent(UUID eventId) {
        // Find the event
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));

        // Verify event was created by admin/super admin (allow null for backward compatibility)
        if (event.getCreatedByType() != null && 
            !"ADMIN".equals(event.getCreatedByType()) && 
            !"SUPER_ADMIN".equals(event.getCreatedByType())) {
            throw new IllegalArgumentException("Can only remove organizers from admin-created events");
        }

        // Remove organizer
        event.setOrganizer(null);
        Event savedEvent = eventRepository.save(event);

        return mapEventToResponse(savedEvent);
    }

    @Override
    @Transactional
    public EventResponse activateEvent(UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));
        
        event.setActive(1); // Activate event
        event.setStatus(Event.EventStatus.PUBLISHED); // Set status to PUBLISHED
        Event savedEvent = eventRepository.save(event);
        
        System.out.println("Event " + event.getName() + " activated (status=1, PUBLISHED)");

        // Log event activation
        auditService.logAction(event.getCreatedByUserId(), "ACTIVATE_EVENT", "EVENT", savedEvent.getEventId(), "Activated event: " + event.getName());
        
        return mapEventToResponse(savedEvent);
    }

    @Override
    @Transactional
    public EventResponse deactivateEvent(UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));
        
        event.setActive(0); // Deactivate event (can be reactivated)
        event.setStatus(Event.EventStatus.DRAFT); // Set status to DRAFT
        Event savedEvent = eventRepository.save(event);
        
        System.out.println("Event " + event.getName() + " deactivated (status=0)");

        // Deactivate deals for this event
        List<TicketCategory> categories = ticketCategoryRepository.findByEventId(event.getEventId());
        for (TicketCategory category : categories) {
            if (Boolean.TRUE.equals(category.getDealActive())) {
                category.setDealActive(false);
                ticketCategoryRepository.save(category);
            }
        }

        // Log event deactivation
        auditService.logAction(event.getCreatedByUserId(), "DEACTIVATE_EVENT", "EVENT", savedEvent.getEventId(), "Deactivated event: " + event.getName());
        
        return mapEventToResponse(savedEvent);
    }
    
    @Override
    @Transactional
    public EventResponse requestEventCreation(EventCreateRequest request) {
        // We reuse createEvent to handle the complex creation logic
        EventResponse response = createEvent(request);
        
        // Then we fetch it and change its status
        Event event = eventRepository.findById(response.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", response.getId().toString()));
                
        event.setStatus(Event.EventStatus.PENDING_APPROVAL);
        Event savedEvent = eventRepository.save(event);
        
        // Log event request
        auditService.logAction(event.getCreatedByUserId(), "REQUEST_EVENT_CREATION", "EVENT", savedEvent.getEventId(), "Requested event creation: " + event.getName());
        
        return mapEventToResponse(savedEvent);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getPendingEvents(Pageable pageable) {
        return eventRepository.findByStatus(Event.EventStatus.PENDING_APPROVAL, pageable)
                .map(this::mapEventToResponse);
    }

    @Override
    @Transactional
    public EventResponse approveEventRequest(UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));
                
        if (event.getStatus() != Event.EventStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending events can be approved.");
        }
        
        event.setStatus(Event.EventStatus.DRAFT);
        event.setAdminFeedback(null); // Clear any previous feedback
        
        Event savedEvent = eventRepository.save(event);
        
        // Log
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminEmail = auth != null ? auth.getName() : "System";
        Admin admin = adminRepository.findByEmail(adminEmail).orElse(null);
        UUID adminId = admin != null ? admin.getAdminId() : null;
        if (adminId != null) {
            auditService.logAction(adminId, "APPROVE_EVENT", "EVENT", savedEvent.getEventId(), "Approved event request: " + event.getName());
        }
        
        // Send email to organizer if applicable
        if ("ORGANIZER".equals(event.getCreatedByType()) || "ORGANIZER_EMPLOYEE".equals(event.getCreatedByType())) {
            UUID orgId = null;
            if ("ORGANIZER".equals(event.getCreatedByType())) {
                orgId = event.getCreatedByUserId();
            } else {
                organizerEmployeeRepository.findById(event.getCreatedByUserId())
                        .ifPresent(emp -> {
                            if (emp.getOrganizer() != null) {
                                emailService.sendEventApprovedEmail(
                                    emp.getEmail(),
                                    emp.getOrganizer().getOrganizationName(),
                                    savedEvent.getName()
                                );
                            }
                        });
            }
            
            if (orgId != null) {
                organizerRepository.findById(orgId).ifPresent(organizer -> {
                    emailService.sendEventApprovedEmail(
                        organizer.getEmail(),
                        organizer.getOrganizationName(),
                        savedEvent.getName()
                    );
                });
            }
        }
        
        return mapEventToResponse(savedEvent);
    }

    @Override
    @Transactional
    public EventResponse rejectEventRequest(UUID eventId, String feedback) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));
                
        if (event.getStatus() != Event.EventStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending events can be rejected.");
        }
        
        event.setStatus(Event.EventStatus.REJECTED);
        event.setAdminFeedback(feedback);
        
        Event savedEvent = eventRepository.save(event);
        
        // Log
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminEmail = auth != null ? auth.getName() : "System";
        Admin admin = adminRepository.findByEmail(adminEmail).orElse(null);
        UUID adminId = admin != null ? admin.getAdminId() : null;
        if (adminId != null) {
            auditService.logAction(adminId, "REJECT_EVENT", "EVENT", savedEvent.getEventId(), "Rejected event request: " + event.getName() + " with reason: " + feedback);
        }
        
        // Send email to organizer if applicable
        if ("ORGANIZER".equals(event.getCreatedByType()) || "ORGANIZER_EMPLOYEE".equals(event.getCreatedByType())) {
            UUID orgId = null;
            if ("ORGANIZER".equals(event.getCreatedByType())) {
                orgId = event.getCreatedByUserId();
            } else {
                organizerEmployeeRepository.findById(event.getCreatedByUserId())
                        .ifPresent(emp -> {
                            if (emp.getOrganizer() != null) {
                                emailService.sendEventRejectedEmail(
                                    emp.getEmail(),
                                    emp.getOrganizer().getOrganizationName(),
                                    savedEvent.getName(),
                                    feedback
                                );
                            }
                        });
            }
            
            if (orgId != null) {
                organizerRepository.findById(orgId).ifPresent(organizer -> {
                    emailService.sendEventRejectedEmail(
                        organizer.getEmail(),
                        organizer.getOrganizationName(),
                        savedEvent.getName(),
                        feedback
                    );
                });
            }
        }
        
        return mapEventToResponse(savedEvent);
    }
    
    // Public event methods (no authentication required)
    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getPublishedEvents(UUID categoryId, Pageable pageable) {
        Page<Event> events;
        if (categoryId != null) {
            events = eventRepository.findPublishedEventsByCategory(categoryId, pageable);
        } else {
            events = eventRepository.findAllPublishedEvents(pageable);
        }
        return events.map(this::mapEventToResponse);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> getUpcomingPublishedEvents(Pageable pageable) {
        Page<Event> events = eventRepository.findUpcomingPublishedEvents(pageable);
        return events.map(this::mapEventToResponse);
    }
    
    @Override
    @Transactional(readOnly = true)
    public EventResponse getPublishedEventById(UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", eventId.toString()));
        
        if (event.getStatus() != Event.EventStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Published Event", "id", eventId.toString());
        }
        
        // Trigger lazy loading within transaction
        if (event.getVenue() != null) {
            event.getVenue().getName(); // Force initialization
        }
        if (event.getOrganizer() != null) {
            event.getOrganizer().getOrganizationName(); // Force initialization
        }
        
        return mapEventToResponse(event);
    }

    @Override
    @Transactional(readOnly = true)
    public EventResponse getPublishedEventBySlug(String slug) {
        Event event = eventRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "slug", slug));
        
        if (event.getStatus() != Event.EventStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Published Event", "slug", slug);
        }
        
        return mapEventToResponse(event);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<EventResponse> searchPublishedEvents(String query, Pageable pageable) {
        Page<Event> events = eventRepository.searchPublishedEvents(query, pageable);
        return events.map(this::mapEventToResponse);
    }
}
