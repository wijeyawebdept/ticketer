package com.ticket.ticket_booking_system.service.impl;


import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import java.util.UUID;


import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.VenueResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.EventService;
import com.ticket.ticket_booking_system.service.RecycleBinService;
import com.ticket.ticket_booking_system.service.VenueService;
import com.ticket.ticket_booking_system.service.AdminAuditService;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class VenueServiceImpl implements VenueService {

    private final VenueRepository venueRepository;
    private final SeatRepository seatRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final RecycleBinService recycleBinService;
    private final EventService eventService;
    private final AdminAuditService auditService;

    public VenueServiceImpl(VenueRepository venueRepository, SeatRepository seatRepository,
            EventRepository eventRepository, UserRepository userRepository, 
            AdminRepository adminRepository, OrganizerRepository organizerRepository,
            RecycleBinService recycleBinService, EventService eventService,
            AdminAuditService auditService) {
        this.venueRepository = venueRepository;
        this.seatRepository = seatRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.recycleBinService = recycleBinService;
        this.eventService = eventService;
        this.auditService = auditService;
    }

    @Override
    public List<Venue> getAllVenues() {
        // Only return active venues (exclude soft-deleted venues in recycle bin)
        return venueRepository.findAllActive();
    }

    @Override
    public Venue getVenueById(UUID venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
    }

    @Override
    @Transactional
    public Venue createVenue(Venue venue) {
        System.out.println("CREATE VENUE START");
        System.out.println("Venue Name: " + venue.getName());
        System.out.println("Venue Capacity: " + venue.getCapacity());

        venue.setCreatedAt(LocalDateTime.now());
        venue.setUpdatedAt(LocalDateTime.now());
        Venue savedVenue = venueRepository.save(venue);

        System.out.println("Venue saved with ID: " + savedVenue.getVenueId());
        System.out.println("CREATE VENUE COMPLETE - No automatic seat generation");
        
        auditService.logAction(getCurrentUserId(), "CREATE_VENUE", "VENUE", savedVenue.getVenueId(), "Created venue: " + savedVenue.getName());
        return savedVenue;
    }

    @Override
    @Transactional
    public Venue updateVenue(UUID venueId, Venue venueDetails) {
        Venue venue = getVenueById(venueId);

        venue.setName(venueDetails.getName());
        venue.setDescription(venueDetails.getDescription());
        venue.setAddress(venueDetails.getAddress());
        venue.setCity(venueDetails.getCity());
        venue.setState(venueDetails.getState());
        venue.setZipCode(venueDetails.getZipCode());
        venue.setCapacity(venueDetails.getCapacity());
        
        
        // Shared area fields
        venue.setHasSharedAreas(venueDetails.getHasSharedAreas());
        venue.setSharedAreaCount(venueDetails.getSharedAreaCount());
        venue.setSharedAreaTotalCapacity(venueDetails.getSharedAreaTotalCapacity());
        venue.setUpdatedAt(LocalDateTime.now());

        Venue savedVenue = venueRepository.save(venue);
        auditService.logAction(getCurrentUserId(), "UPDATE_VENUE", "VENUE", savedVenue.getVenueId(), "Updated venue: " + savedVenue.getName());
        return savedVenue;
    }

    @Override
    @Transactional
    public void softDeleteVenue(UUID venueId) {
        Venue venue = getVenueById(venueId);
        
        System.out.println("SOFT DELETE VENUE START");
        System.out.println("Venue ID: " + venueId);
        System.out.println("Venue Name: " + venue.getName());
        
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
        
        // First, soft delete all events associated with this venue
        // Note: Event soft delete will also handle event-specific seats
        List<Event> eventsUsingVenue = eventRepository.findByVenue(venue, PageRequest.of(0, Integer.MAX_VALUE))
                .getContent();
        
        if (!eventsUsingVenue.isEmpty()) {
            System.out.println("Found " + eventsUsingVenue.size() + " events using this venue - soft deleting them...");
            for (Event event : eventsUsingVenue) {
                System.out.println("  - Soft deleting event: " + event.getName() + " (ID: " + event.getEventId() + ")");
                try {
                    eventService.softDeleteEvent(event.getEventId());
                } catch (Exception e) {
                    System.err.println("Warning: Failed to soft delete event " + event.getEventId() + ": " + e.getMessage());
                    // Continue with other events even if one fails
                }
            }
            System.out.println("All associated events soft deleted");
        } else {
            System.out.println("No events associated with this venue");
        }
        
        // Note: Template seats (event_id IS NULL) remain in database but venue is marked as deleted
        // Template seats will be cleaned up when venue is permanently deleted or restored
        long templateSeatsCount = seatRepository.countByVenueAndEventIsNull(venue);
        if (templateSeatsCount > 0) {
            System.out.println(templateSeatsCount + " template seats remain (will be removed on permanent delete)");
        }
        
        // Move venue to recycle bin
        recycleBinService.moveToRecycleBin(
                "VENUE",
                venue.getVenueId(),
                venue.getName(),
                venue,
                deletedBy,
                "Venue soft deleted by " + deletedBy.getEmail()
        );
        
        // Mark venue as soft deleted - set status to -1 (in recycle bin)
        venue.setStatus(-1);
        venueRepository.save(venue);
        auditService.logAction(deletedBy.getId(), "SOFT_DELETE_VENUE", "VENUE", venue.getVenueId(), "Soft deleted venue: " + venue.getName());
        
        System.out.println("Venue soft deleted successfully");
        System.out.println("SOFT DELETE VENUE COMPLETE");
    }

    @Override
    @Transactional
    public void deleteVenue(UUID venueId) {
        System.out.println("PERMANENT DELETE VENUE START");
        System.out.println("Venue ID: " + venueId);

        try {
            Venue venue = getVenueById(venueId);
            System.out.println("Venue Name: " + venue.getName());

            // First, permanently delete all events using this venue
            List<Event> eventsUsingVenue = eventRepository.findByVenue(venue, PageRequest.of(0, Integer.MAX_VALUE))
                    .getContent();
            
            if (!eventsUsingVenue.isEmpty()) {
                System.out.println("Found " + eventsUsingVenue.size() + " events using this venue - permanently deleting them...");
                for (Event event : eventsUsingVenue) {
                    System.out.println("  - Permanently deleting event: " + event.getName() + " (ID: " + event.getEventId() + ")");
                    try {
                        // Permanently delete the event (this will also delete associated seats, bookings, etc.)
                        eventService.deleteEvent(event.getEventId());
                    } catch (Exception e) {
                        System.err.println("Warning: Failed to delete event " + event.getEventId() + ": " + e.getMessage());
                        // Continue with other events even if one fails
                    }
                }
                
                // Flush to ensure all events are deleted before deleting venue
                eventRepository.flush();
                System.out.println("All associated events permanently deleted");
            } else {
                System.out.println("No events associated with this venue");
            }

            // Delete all template seats for this venue (event_id IS NULL)
            // Event-specific seats should already be deleted by eventService.deleteEvent()
            long templateSeatsCount = seatRepository.countByVenueAndEventIsNull(venue);
            if (templateSeatsCount > 0) {
                System.out.println("Deleting " + templateSeatsCount + " template seats...");
                seatRepository.deleteByVenueAndEventIsNull(venue);
                seatRepository.flush();
                System.out.println("Template seats deleted successfully");
            }

            // Now delete the venue itself
            venueRepository.delete(venue);
            auditService.logAction(getCurrentUserId(), "PERMANENT_DELETE_VENUE", "VENUE", venueId, "Permanently deleted venue: " + venue.getName());
            venueRepository.flush();

            System.out.println("Venue permanently deleted successfully");
            System.out.println("PERMANENT DELETE VENUE COMPLETE");

        } catch (Exception e) {
            System.err.println("Error permanently deleting venue: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to permanently delete venue: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public int generateSeatsForVenue(UUID venueId) {
        return 0;
    }

    @Override
    public List<Venue> searchVenuesByName(String name) {
        return venueRepository.findByNameContainingIgnoreCase(name);
    }

    @Override
    public List<Venue> findVenuesByCityAndState(String city, String state) {
        return venueRepository.findByCityAndState(city, state);
    }

    @Override
    public List<Venue> findVenuesByMinimumCapacity(int minCapacity) {
        return venueRepository.findByMinimumCapacity(minCapacity);
    }
    
    @Override
    @Transactional
    public VenueResponse toggleVenueStatus(UUID venueId) {
        System.out.println("TOGGLE VENUE STATUS START");
        System.out.println("Venue ID: " + venueId);
        
        Venue venue = getVenueById(venueId);
        System.out.println("Current status: " + venue.getStatus());
        
        if (venue.getStatus() == -1) {
            throw new IllegalStateException("Cannot toggle status of a soft-deleted venue. Please restore it first.");
        }
        
        int newStatus = (venue.getStatus() == 1) ? 0 : 1;
        venue.setStatus(newStatus);
        venue.setUpdatedAt(LocalDateTime.now());
        
        Venue savedVenue = venueRepository.save(venue);
        auditService.logAction(getCurrentUserId(), "TOGGLE_VENUE_STATUS", "VENUE", savedVenue.getVenueId(), 
                "Toggled status to " + (newStatus == 1 ? "ACTIVE" : "INACTIVE") + " for venue: " + savedVenue.getName());
        
        System.out.println("New status: " + newStatus + " (" + (newStatus == 1 ? "ACTIVE" : "INACTIVE") + ")");
        System.out.println("TOGGLE VENUE STATUS END");
        
        return convertToVenueResponse(savedVenue);
    }

    @Override
    @Transactional
    public Venue updateSeatingLayout(UUID venueId, Map<String, Object> seatingLayout) {
        return getVenueById(venueId);
    }

    
    private UUID getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) return user.getUserId();
                
                Admin admin = adminRepository.findByEmail(email).orElse(null);
                if (admin != null) return admin.getAdminId();
                
                Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
                if (organizer != null) return organizer.getOrganizerId();
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }

    /**
     * Convert Venue entity to VenueResponse DTO
     */
    private VenueResponse convertToVenueResponse(Venue venue) {
        VenueResponse response = new VenueResponse();
        response.setId(venue.getVenueId());
        response.setName(venue.getName());
        response.setDescription(venue.getDescription());
        response.setAddress(venue.getAddress());
        response.setCity(venue.getCity());
        response.setState(venue.getState());
        response.setZipCode(venue.getZipCode());
        response.setCapacity(venue.getCapacity());
        response.setStatus(venue.getStatus());
        
        response.setCreatedAt(venue.getCreatedAt());
        response.setUpdatedAt(venue.getUpdatedAt());
        return response;
    }
}