package com.ticket.ticket_booking_system.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Seat;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.VenueService;

@Service
public class VenueServiceImpl implements VenueService {

    private final VenueRepository venueRepository;
    private final SeatRepository seatRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    public VenueServiceImpl(VenueRepository venueRepository, SeatRepository seatRepository,
            EventRepository eventRepository, UserRepository userRepository) {
        this.venueRepository = venueRepository;
        this.seatRepository = seatRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    @Override
    public List<Venue> getAllVenues() {
        return venueRepository.findAll();
    }

    @Override
    public Venue getVenueById(UUID venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
    }

    @Override
    @Transactional
    public Venue createVenue(Venue venue) {
        venue.setCreatedAt(LocalDateTime.now());
        venue.setUpdatedAt(LocalDateTime.now());
        Venue savedVenue = venueRepository.save(venue);

        // Generate seats from configuration if provided
        if (venue.getSeatingChartConfig() != null && !venue.getSeatingChartConfig().trim().isEmpty()) {
            generateSeatsFromConfig(savedVenue);
        }

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
        venue.setLayoutType(venueDetails.getLayoutType());
        venue.setSeatingChartConfig(venueDetails.getSeatingChartConfig());
        venue.setSeatingLayout(venueDetails.getSeatingLayout());
        venue.setUpdatedAt(LocalDateTime.now());

        return venueRepository.save(venue);
    }

    @Override
    @Transactional
    public void deleteVenue(UUID venueId) {
        Venue venue = getVenueById(venueId);
        venueRepository.delete(venue);
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
    public Venue updateSeatingLayout(UUID venueId, Map<String, Object> seatingLayout) {
        System.out.println("=== UPDATE SEATING LAYOUT START ===");
        System.out.println("Venue ID: " + venueId);
        System.out.println("Seating Layout: " + seatingLayout);

        Venue venue = getVenueById(venueId);
        venue.setSeatingLayout(seatingLayout);
        venue.setUpdatedAt(LocalDateTime.now());

        // Also update individual seat records to match the layout
        updateIndividualSeatRecords(venue, seatingLayout);

        Venue savedVenue = venueRepository.save(venue);

        System.out.println("=== UPDATE SEATING LAYOUT END ===");
        return savedVenue;
    }

    /**
     * Update individual seat records to match the seating layout
     */
    @SuppressWarnings("unchecked")
    private void updateIndividualSeatRecords(Venue venue, Map<String, Object> seatingLayout) {
        try {
            System.out.println("=== UPDATING INDIVIDUAL SEAT RECORDS ===");
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

            System.out.println("=== FINISHED UPDATING INDIVIDUAL SEAT RECORDS ===");
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
                                .event(getOrCreateDefaultEvent(venue)) // Use default event for venue-level seats
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
        // First, try to get an admin user to be the organizer
        User adminUser = userRepository.findByEmail("admin@ticketbooking.com")
                .orElse(null);
        if (adminUser == null) {
            // If no admin user exists, get the first user
            List<User> users = userRepository.findAll();
            if (!users.isEmpty()) {
                adminUser = users.get(0);
            }
        }

        // Create the default event
        Event defaultEvent = Event.builder()
                .name("Default Template Event")
                .description("Template event for venue-level seat management")
                .venue(venue)
                .startDateTime(LocalDateTime.now().plusYears(1)) // Set to future date
                .endDateTime(LocalDateTime.now().plusYears(1).plusHours(2)) // 2 hours duration
                .basePrice(BigDecimal.ZERO)
                .totalCapacity(venue.getCapacity())
                .availableSeats(venue.getCapacity())
                .status(Event.EventStatus.DRAFT)
                .organizer(adminUser)
                .build();

        return eventRepository.save(defaultEvent);
    }
}