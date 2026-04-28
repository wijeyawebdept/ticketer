package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticket.ticket_booking_system.dto.VenueResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.Seat;
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

    public VenueServiceImpl(VenueRepository venueRepository, SeatRepository seatRepository,
            EventRepository eventRepository, UserRepository userRepository, 
            AdminRepository adminRepository, OrganizerRepository organizerRepository,
            RecycleBinService recycleBinService, EventService eventService) {
        this.venueRepository = venueRepository;
        this.seatRepository = seatRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.recycleBinService = recycleBinService;
        this.eventService = eventService;
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
        venue.setSeatingChartConfig(venueDetails.getSeatingChartConfig());
        venue.setSeatingLayout(venueDetails.getSeatingLayout());
        // Shared area fields
        venue.setHasSharedAreas(venueDetails.getHasSharedAreas());
        venue.setSharedAreaCount(venueDetails.getSharedAreaCount());
        venue.setSharedAreaTotalCapacity(venueDetails.getSharedAreaTotalCapacity());
        venue.setUpdatedAt(LocalDateTime.now());

        return venueRepository.save(venue);
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
        Venue venue = getVenueById(venueId);

        System.out.println("=== GENERATE SEATS FOR VENUE ===");
        System.out.println("Venue ID: " + venueId);
        System.out.println("Venue Name: " + venue.getName());
        System.out.println("Venue Capacity: " + venue.getCapacity());

        // Validate capacity before proceeding
        if (venue.getCapacity() == null || venue.getCapacity() <= 0) {
            throw new IllegalStateException(
                    "Venue capacity must be set before generating seats. Current capacity: " + venue.getCapacity());
        }

        // Delete any existing template seats for this venue (event_id IS NULL)
        seatRepository.deleteByVenueAndEventIsNull(venue);
        System.out.println("Deleted existing template seats");

        // Generate default grid layout if no seating chart config exists
        if (venue.getSeatingChartConfig() == null || venue.getSeatingChartConfig().trim().isEmpty()) {
            int capacity = venue.getCapacity();
            System.out.println("Generating EXACTLY " + capacity + " seats to match venue capacity...");

            // Calculate optimal grid dimensions
            // Prefer 15 seats per row (cinema standard), adjust rows accordingly
            int seatsPerRow = 15;
            int rows = (int) Math.ceil((double) capacity / seatsPerRow);

            // Limit to maximum 26 rows (A-Z)
            if (rows > 26) {
                rows = 26;
                seatsPerRow = (int) Math.ceil((double) capacity / rows);
            }

            BigDecimal defaultPrice = BigDecimal.valueOf(50.00);

            // Create seating layout JSON structure
            List<Map<String, Object>> seatsJson = new ArrayList<>();
            int seatsCreated = 0;
            int remainingSeats = capacity;

            for (int i = 0; i < rows && remainingSeats > 0; i++) {
                char rowLabel = (char) ('A' + i);
                int seatsInThisRow = Math.min(seatsPerRow, remainingSeats);

                for (int col = 1; col <= seatsInThisRow; col++) {
                    // Create seat record in database
                    Seat seat = Seat.builder()
                            .venue(venue)
                            .event(null) // Template seats have NO event
                            .section("General")
                            .rowNumber(String.valueOf(rowLabel))
                            .row(String.valueOf(rowLabel))
                            .seatNumber(String.valueOf(col))
                            .seatType("REGULAR")
                            .status("AVAILABLE")
                            .price(defaultPrice)
                            .isAvailable(true)
                            .isBlocked(false)
                            .build();
                    seatRepository.save(seat);

                    // Add to JSON structure for seating_layout
                    Map<String, Object> seatJson = new HashMap<>();
                    seatJson.put("row", String.valueOf(rowLabel));
                    seatJson.put("number", String.valueOf(col));
                    seatJson.put("status", "available");
                    seatJson.put("section", "General");
                    seatJson.put("price", defaultPrice.doubleValue());
                    seatsJson.add(seatJson);

                    seatsCreated++;
                    remainingSeats--;
                }
            }

            // Create and save seating_layout JSON
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, Object> seatingLayout = new HashMap<>();
                seatingLayout.put("rows", rows);
                seatingLayout.put("columns", seatsPerRow);
                seatingLayout.put("seats", seatsJson);
                seatingLayout.put("totalSeats", seatsCreated); // Add actual count

                // Set seating layout as Map (will be auto-converted to JSONB by Hibernate)
                venue.setSeatingLayout(seatingLayout);

                // Create and save seating_chart_config JSON
                Map<String, Object> chartConfig = new HashMap<>();
                Map<String, Object> sections = new HashMap<>();
                Map<String, Object> generalSection = new HashMap<>();

                List<String> rowLabels = new ArrayList<>();
                for (int i = 0; i < rows; i++) {
                    rowLabels.add(String.valueOf((char) ('A' + i)));
                }

                generalSection.put("rows", rowLabels);
                generalSection.put("cols", seatsPerRow);
                generalSection.put("price", defaultPrice.doubleValue());
                sections.put("General", generalSection);
                chartConfig.put("sections", sections);

                String chartConfigJson = objectMapper.writeValueAsString(chartConfig);
                venue.setSeatingChartConfig(chartConfigJson);

                // Save the venue with updated JSON fields
                venueRepository.save(venue);

                System.out
                        .println("Successfully generated exactly " + seatsCreated + " seats matching venue capacity: " + capacity);
                System.out.println("Grid dimensions: " + rows + " rows × up to " + seatsPerRow + " columns per row");
                System.out.println("Last row has " + (capacity % seatsPerRow == 0 ? seatsPerRow : capacity % seatsPerRow) + " seats");
                System.out.println("Saved seating layout and chart config to venue");
                
                // Verify the exact count
                if (seatsCreated != capacity) {
                    System.err.println("WARNING: Seat count mismatch! Created " + seatsCreated + " but capacity is " + capacity);
                    throw new IllegalStateException("Seat generation failed: created " + seatsCreated + " seats but capacity is " + capacity);
                }
            } catch (Exception e) {
                System.err.println("Failed to save seating layout JSON: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to generate seats: " + e.getMessage(), e);
            }

            System.out.println("GENERATE SEATS COMPLETE - EXACTLY " + seatsCreated + " seats created");
            return seatsCreated;
        } else {
            // Generate seats from the existing seating chart config
            generateSeatsFromConfig(venue);
            return (int) seatRepository.countByVenueAndEventIsNull(venue);
        }
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
        
        System.out.println("New status: " + newStatus + " (" + (newStatus == 1 ? "ACTIVE" : "INACTIVE") + ")");
        System.out.println("TOGGLE VENUE STATUS END");
        
        return convertToVenueResponse(savedVenue);
    }

    @Override
    @Transactional
    public Venue updateSeatingLayout(UUID venueId, Map<String, Object> seatingLayout) {
        System.out.println("UPDATE SEATING LAYOUT START");
        System.out.println("Venue ID: " + venueId);
        System.out.println("Seating Layout: " + seatingLayout);

        Venue venue = getVenueById(venueId);
        venue.setSeatingLayout(seatingLayout);
        venue.setUpdatedAt(LocalDateTime.now());

        // Also update individual seat records to match the layout
        updateIndividualSeatRecords(venue, seatingLayout);

        Venue savedVenue = venueRepository.save(venue);

        System.out.println("UPDATE SEATING LAYOUT END");
        return savedVenue;
    }

    /**
     * Update individual seat records to match the seating layout
     */
    @SuppressWarnings("unchecked")
    private void updateIndividualSeatRecords(Venue venue, Map<String, Object> seatingLayout) {
        try {
            System.out.println("UPDATING INDIVIDUAL SEAT RECORDS");
            System.out.println("Venue ID: " + venue.getVenueId());

            // Get existing seats for this venue
            List<Seat> existingSeats = seatRepository.findByVenue_VenueId(venue.getVenueId());
            System.out.println("Found " + existingSeats.size() + " existing seats for venue");

            // Create a map of existing seats by their identifier (row_number + seat_number)
            Map<String, Seat> existingSeatMap = new HashMap<>();
            for (Seat seat : existingSeats) {
                String identifier = seat.getRowNumber() + "-" + seat.getSeatNumber();
                existingSeatMap.put(identifier, seat);
                System.out.println("Mapped existing seat: " + identifier +
                        " (available: " + seat.getIsAvailable() +
                        ", blocked: " + seat.getIsBlocked() + ")");
            }

            // Process seats from the layout
            Object seatsObj = seatingLayout.get("seats");
            if (seatsObj instanceof List) {
                List<Map<String, Object>> layoutSeats = (List<Map<String, Object>>) seatsObj;
                System.out.println("Processing " + layoutSeats.size() + " seats from layout");

                // Track which seats we've processed to handle deletions
                Set<String> processedSeats = new HashSet<>();

                for (Map<String, Object> layoutSeat : layoutSeats) {
                    System.out.println("Layout seat data: " + layoutSeat);

                    String row = getStringValue(layoutSeat.get("row"));
                    String numberStr = getStringValue(layoutSeat.get("number"));
                    String status = getStringValue(layoutSeat.get("status"));
                    String section = getStringValue(layoutSeat.get("section"));
                    Object priceObj = layoutSeat.get("price");

                    System.out.println(
                            "Processing seat - Row: " + row + ", Number: " + numberStr + ", Status: " + status);

                    if (row != null && numberStr != null) {
                        String identifier = row + "-" + numberStr;
                        processedSeats.add(identifier);
                        Seat seat = existingSeatMap.get(identifier);

                        // Update existing seat or create new one
                        if (seat != null) {
                            // Update existing seat status
                            System.out.println("Updating existing seat: " + identifier);
                            updateSeatStatus(seat, status, section, priceObj);
                        } else {
                            // Create new seat if it doesn't exist
                            System.out.println("Creating new seat: " + identifier);
                            createNewSeatFromLayout(venue, layoutSeat);
                        }
                    } else {
                        System.out.println("Skipping seat due to missing row or number");
                    }
                }

                // Optionally handle seats that exist in DB but not in layout
                // This would be for seat deletions, but we'll skip this for now
            } else {
                System.out.println("No seats found in layout or invalid format");
            }

            System.out.println("FINISHED UPDATING INDIVIDUAL SEAT RECORDS");
        } catch (Exception e) {
            // Log the error but don't fail the entire operation
            System.err.println("Failed to update individual seat records: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Helper method to safely extract string values from objects
     */
    private String getStringValue(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof String) {
            return (String) obj;
        }
        if (obj instanceof Number) {
            return String.valueOf(obj);
        }
        return obj.toString();
    }

    /**
     * Helper method to safely extract BigDecimal values from objects
     */
    private BigDecimal getBigDecimalValue(Object obj) {
        if (obj == null) {
            return BigDecimal.ZERO;
        }
        if (obj instanceof Number) {
            return BigDecimal.valueOf(((Number) obj).doubleValue());
        }
        if (obj instanceof String) {
            try {
                return new BigDecimal((String) obj);
            } catch (NumberFormatException e) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    /**
     * Update seat status based on layout status
     */
    private void updateSeatStatus(Seat seat, String layoutStatus, String section, Object priceObj) {
        System.out.println("Updating seat status - Before: available=" + seat.getIsAvailable() + ", blocked="
                + seat.getIsBlocked() +
                ", section=" + seat.getSection() + ", price=" + seat.getPrice());

        // Update status
        if ("unavailable".equals(layoutStatus)) {
            seat.setIsAvailable(false);
            seat.setIsBlocked(true);
            seat.setStatus("RESERVED"); // Set status field for database compatibility
        } else if ("reserved".equals(layoutStatus)) {
            seat.setIsAvailable(false);
            seat.setIsBlocked(false);
            seat.setStatus("RESERVED"); // Set status field for database compatibility
        } else {
            // available
            seat.setIsAvailable(true);
            seat.setIsBlocked(false);
            seat.setStatus("AVAILABLE"); // Set status field for database compatibility
        }

        // Update section if provided
        if (section != null && !section.isEmpty()) {
            seat.setSection(section);
        }

        // Update price if provided
        if (priceObj != null) {
            seat.setPrice(getBigDecimalValue(priceObj));
        }

        // Ensure both row fields are populated
        if (seat.getRowNumber() != null && seat.getRow() == null) {
            seat.setRow(seat.getRowNumber());
        } else if (seat.getRow() != null && seat.getRowNumber() == null) {
            seat.setRowNumber(seat.getRow());
        }

        Seat savedSeat = seatRepository.save(seat);

        System.out.println("Updated seat status - After: available=" + savedSeat.getIsAvailable() + ", blocked="
                + savedSeat.getIsBlocked() +
                ", section=" + savedSeat.getSection() + ", price=" + savedSeat.getPrice() +
                " for seat " + savedSeat.getRowNumber() + "-" + savedSeat.getSeatNumber());
    }

    /**
     * Create a new seat from layout data
     */
    private void createNewSeatFromLayout(Venue venue, Map<String, Object> layoutSeat) {
        try {
            String row = getStringValue(layoutSeat.get("row"));
            String numberStr = getStringValue(layoutSeat.get("number"));
            String status = getStringValue(layoutSeat.get("status"));
            String section = getStringValue(layoutSeat.get("section"));
            Object priceObj = layoutSeat.get("price");

            // Handle price field
            BigDecimal price = getBigDecimalValue(priceObj);

            // Determine status for the status field
            String dbStatus = "AVAILABLE";
            boolean isAvailable = true;
            boolean isBlocked = false;

            if ("unavailable".equals(status)) {
                dbStatus = "RESERVED";
                isAvailable = false;
                isBlocked = true;
            } else if ("reserved".equals(status)) {
                dbStatus = "RESERVED";
                isAvailable = false;
                isBlocked = false;
            }

            if (row != null && numberStr != null) {
                Seat seat = Seat.builder()
                        .venue(venue)
                        .event(getOrCreateDefaultEvent(venue)) // Use default event for venue-level seats
                        .section(section != null && !section.isEmpty() ? section : "General")
                        .rowNumber(row)
                        .row(row) // Also populate the row field for database compatibility
                        .seatNumber(numberStr)
                        .seatType("REGULAR")
                        .status(dbStatus) // Populate the status field for database compatibility
                        .price(price)
                        .isAvailable(isAvailable)
                        .isBlocked(isBlocked)
                        .build();

                Seat savedSeat = seatRepository.save(seat);
                System.out.println("Created new seat: " + row + "-" + numberStr +
                        " with status: available=" + savedSeat.getIsAvailable() +
                        ", blocked=" + savedSeat.getIsBlocked() +
                        ", section=" + savedSeat.getSection() +
                        ", price=" + savedSeat.getPrice());
            }
        } catch (Exception e) {
            System.err.println("Failed to create seat from layout: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Generate seats from venue seating chart configuration
     */
    @SuppressWarnings("unchecked")
    private void generateSeatsFromConfig(Venue venue) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> config = objectMapper.readValue(venue.getSeatingChartConfig(),
                    new TypeReference<Map<String, Object>>() {
                    });

            Map<String, Object> sections = (Map<String, Object>) config.get("sections");

            for (String sectionName : sections.keySet()) {
                Map<String, Object> section = (Map<String, Object>) sections.get(sectionName);
                List<String> rows = (List<String>) section.get("rows");
                Integer cols = (Integer) section.get("cols");
                Number priceNumber = (Number) section.get("price");
                double price = priceNumber.doubleValue();

                for (String row : rows) {
                    for (int col = 1; col <= cols; col++) {
                        Seat seat = Seat.builder()
                                .venue(venue)
                                .event(null) // Template seats have NO event - they are copied when events are created
                                .section(sectionName)
                                .rowNumber(row)
                                .row(row) // Also populate the row field for database compatibility
                                .seatNumber(String.valueOf(col))
                                .seatType("REGULAR")
                                .status("AVAILABLE") // Populate the status field for database compatibility
                                .price(BigDecimal.valueOf(price))
                                .isAvailable(true)
                                .isBlocked(false)
                                .build();
                        seatRepository.save(seat);
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to generate seats from configuration: " + e.getMessage(), e);
        }
    }

    /**
     * Get or create a default event for venue-level seats
     */
    private Event getOrCreateDefaultEvent(Venue venue) {
        // Try to find an existing default event for this venue
        Page<Event> defaultEventsPage = eventRepository.findByVenue(venue, PageRequest.of(0, 100));
        List<Event> defaultEvents = defaultEventsPage.getContent();
        for (Event event : defaultEvents) {
            if ("Default Template Event".equals(event.getName())) {
                return event;
            }
        }

        // If no default event exists, create one
        // Try to get an admin to be the creator (organizer is null for admin-created events)
        Admin admin = adminRepository.findByEmail("admin@ticketbooking.com")
                .orElseGet(() -> adminRepository.findByActiveTrue().stream().findFirst().orElse(null));
        
        UUID createdByUserId = null;
        String createdByType = null;
        
        if (admin != null) {
            createdByUserId = admin.getAdminId();
            createdByType = admin.getRole().name();
        }

        // Create the default event
        Event defaultEvent = Event.builder()
                .name("Default Template Event")
                .description("Template event for venue-level seat management")
                .venue(venue)

                .totalCapacity(venue.getCapacity())
                .availableSeats(venue.getCapacity())
                .status(Event.EventStatus.DRAFT)
                .organizer(null) // Admin-created events don't have an organizer
                .createdByUserId(createdByUserId) // Track creator ID
                .createdByType(createdByType) // Track creator type
                .build();

        return eventRepository.save(defaultEvent);
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
        response.setSeatingLayout(venue.getSeatingLayout());
        response.setCreatedAt(venue.getCreatedAt());
        response.setUpdatedAt(venue.getUpdatedAt());
        return response;
    }
}