package com.ticket.ticket_booking_system.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.SeatAvailabilityResponse;
import com.ticket.ticket_booking_system.dto.SeatDTO;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.Seat.SeatStatus;
import com.ticket.ticket_booking_system.entity.SeatHold;
import com.ticket.ticket_booking_system.entity.TicketCategory;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.BookingSeatRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.SeatHoldRepository;
import com.ticket.ticket_booking_system.repository.TicketCategoryRepository;
import com.ticket.ticket_booking_system.repository.VenueSeatRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VenueSeatService {

    private final VenueSeatRepository venueSeatRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatHoldRepository seatHoldRepository;

    /** Default hold duration in minutes */
    @Value("${seat.hold.duration.minutes:10}")
    private int defaultHoldDurationMinutes;

    /**
     * Get all venue seats with their hard-coded layout
     */
    @Transactional(readOnly = true)
    public List<VenueSeat> getAllSeats() {
        return venueSeatRepository.findAllOrderedByLayout();
    }

    /**
     * Get seats by section
     */
    @Transactional(readOnly = true)
    public List<VenueSeat> getSeatsBySection(String section) {
        return venueSeatRepository.findBySectionOrdered(section);
    }

    /**
     * Get all venue seats for a specific venue.
     * Seats are ordered by section, row label, and seat number.
     * 
     * @param venueId the UUID of the venue
     * @return list of venue seats belonging to the specified venue
     */
    @Transactional(readOnly = true)
    public List<VenueSeat> getSeatsByVenue(UUID venueId) {
        return venueSeatRepository.findByVenueOrderedByLayout(venueId);
    }

    /**
     * Get seat availability for a specific event schedule (UUID-based)
     * Returns all seats for the event's venue with booking status
     */
    @Transactional(readOnly = true)
    public SeatAvailabilityResponse getSeatAvailabilityByUUID(UUID eventScheduleUuid) {
        // Get the event schedule to find the venue
        EventSchedule eventSchedule = eventScheduleRepository.findById(eventScheduleUuid)
            .orElseThrow(() -> new RuntimeException("Event schedule not found"));
        
        // Get the venue from the event
        UUID venueId = eventSchedule.getEvent().getVenue().getVenueId();
        UUID eventId = eventSchedule.getEvent().getEventId();
        
        // Get only seats for this specific venue
        List<VenueSeat> venueSeats = venueSeatRepository.findByVenueOrderedByLayout(venueId);
        
        // Get booked and held seat IDs for this schedule
        Set<String> bookedSeatIds = bookingSeatRepository.findBookedVenueSeatIdsByScheduleId(eventScheduleUuid);
        List<SeatHold> activeHolds = seatHoldRepository.findActiveHoldsByScheduleId(eventScheduleUuid, LocalDateTime.now());
        Long bookedCount = bookingSeatRepository.countBookedSeatsForSchedule(eventScheduleUuid);
        Long heldCount = seatHoldRepository.countActiveHoldsByScheduleId(eventScheduleUuid, LocalDateTime.now());
        
        // Build a map of seat IDs to their hold info for quick lookup
        java.util.Map<String, SeatHold> seatHoldMap = new java.util.HashMap<>();
        for (SeatHold hold : activeHolds) {
            seatHoldMap.put(hold.getVenueSeatId(), hold);
            // Note: User lookup skipped due to userId type mismatch (Long vs UUID)
        }
        
        List<SeatDTO> seatDTOs = new ArrayList<>();
        
        for (VenueSeat seat : venueSeats) {
            // Determine seat status based on bookings, holds, and notes
            String seatStatus;
            String notes = seat.getNotes() != null ? seat.getNotes().toLowerCase() : "";
            
            if (bookedSeatIds.contains(seat.getSeatId())) {
                seatStatus = SeatStatus.BOOKED.name();
            } else if (seatHoldMap.containsKey(seat.getSeatId())) {
                seatStatus = "HELD"; // Seat is temporarily held
            } else if (notes.contains("[locked]")) {
                seatStatus = "LOCKED"; // Custom status for locked seats
            } else if (notes.contains("[vip]")) {
                seatStatus = "VIP_RESERVED"; // Custom status for VIP seats
            } else {
                seatStatus = SeatStatus.AVAILABLE.name();
            }
            
            // Build SeatDTO with hold information
            SeatDTO.SeatDTOBuilder builder = SeatDTO.builder()
                .seatId(seat.getSeatId())
                .section(seat.getSection())
                .rowLabel(seat.getRowLabel())
                .seatNumber(seat.getSeatNumber())
                .categoryName(seat.getCategory().getCategoryName())
                .colorCode(seat.getCategory().getColorCode())
                .xPosition(seat.getXPosition())
                .yPosition(seat.getYPosition())
                .isAisleSeat(seat.getIsAisleSeat())
                .isAccessible(seat.getIsAccessible())
                .status(seatStatus)
                .currentPrice(seat.getCategory().getBasePrice())
                .notes(seat.getNotes());
            
            // Add hold information if seat is held
            SeatHold hold = seatHoldMap.get(seat.getSeatId());
            if (hold != null) {
                builder.heldByUserId(hold.getUserId())
                       .holdExpiresAt(hold.getExpiresAt())
                       .holdCreatedAt(hold.getCreatedAt())
                       .isPermanentHold(hold.getIsPermanent());
                // Note: User name/email not populated due to userId type mismatch
            }
            
            seatDTOs.add(builder.build());
        }
        
        // Fetch shared area categories for the event
        System.out.println("DEBUG: Looking for shared areas for eventId: " + eventId);
        List<TicketCategory> sharedAreaCategories = ticketCategoryRepository.findSharedAreaCategoriesByEventId(eventId);
        System.out.println("DEBUG: Found " + sharedAreaCategories.size() + " shared area categories");
        List<SeatAvailabilityResponse.SharedAreaDTO> sharedAreas = new ArrayList<>();
        
        for (TicketCategory category : sharedAreaCategories) {
            System.out.println("DEBUG: Processing shared area: " + category.getCategoryName() + 
                ", isSharedArea=" + category.getIsSharedArea() + 
                ", sharedAreaNumber=" + category.getSharedAreaNumber());
            // Count booked tickets for this shared area
            Long bookedTickets = bookingRepository.countBookedSharedAreaTickets(
                eventScheduleUuid, 
                category.getSharedAreaNumber()
            );
            if (bookedTickets == null) {
                bookedTickets = 0L;
            }
            
            int availableTickets = category.getCapacity() - bookedTickets.intValue();
            if (availableTickets < 0) {
                availableTickets = 0;
            }
            
            sharedAreas.add(SeatAvailabilityResponse.SharedAreaDTO.builder()
                .categoryId(category.getCategoryId())
                .categoryName(category.getCategoryName())
                .price(category.getPrice())
                .capacity(category.getCapacity())
                .sharedAreaNumber(category.getSharedAreaNumber())
                .availableTickets(availableTickets)
                .build());
        }
        
        // Calculate available seats (total - booked - held)
        long totalSeats = (long) venueSeats.size();
        long confirmedBooked = bookedCount != null ? bookedCount : 0L;
        long heldSeats = heldCount != null ? heldCount : 0L;
        long availableSeats = totalSeats - confirmedBooked - heldSeats;
        
        SeatAvailabilityResponse response = new SeatAvailabilityResponse(
            seatDTOs,
            totalSeats,
            availableSeats,
            confirmedBooked - heldSeats, // Confirmed bookings (excluding pending/held)
            heldSeats  // Pending/held seats
        );
        response.setSharedAreas(sharedAreas);
        
        return response;
    }

    /**
     * Get seat availability for a specific event schedule
     * Alias method for controller compatibility
     */
    @Transactional(readOnly = true)
    public SeatAvailabilityResponse getSeatAvailability(UUID eventScheduleId) {
        return getSeatAvailabilityByUUID(eventScheduleId);
    }

    /**
     * Hold seats temporarily for a user.
     * Creates temporary holds that expire after the configured duration.
     * 
     * @param eventScheduleId the event schedule UUID
     * @param seatIds list of venue seat IDs to hold
     * @param userId the user requesting the hold
     * @return true if all seats were successfully held, false if any seat was unavailable
     */
    @Transactional
    public boolean holdSeats(UUID eventScheduleId, List<String> seatIds, Long userId) {
        EventSchedule eventSchedule = eventScheduleRepository.findById(eventScheduleId)
            .orElseThrow(() -> new RuntimeException("Event schedule not found"));
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(defaultHoldDurationMinutes);
        
        // Get currently booked and held seats
        Set<String> bookedSeatIds = bookingSeatRepository.findBookedVenueSeatIdsByScheduleId(eventScheduleId);
        
        // Verify all seats are available
        for (String seatId : seatIds) {
            // Check if seat is already booked
            if (bookedSeatIds.contains(seatId)) {
                return false;
            }
            
            // Check if seat is held by another user
            if (seatHoldRepository.isSeatHeldByOther(seatId, eventScheduleId, userId, now)) {
                return false;
            }
        }
        
        // Release any existing holds by this user for this schedule first
        seatHoldRepository.deleteByUserAndScheduleId(userId, eventScheduleId);
        
        // Create new holds for the requested seats
        for (String seatId : seatIds) {
            SeatHold hold = SeatHold.builder()
                .venueSeatId(seatId)
                .eventSchedule(eventSchedule)
                .userId(userId)
                .expiresAt(expiresAt)
                .isPermanent(false)
                .build();
            seatHoldRepository.save(hold);
        }
        
        return true;
    }

    /**
     * Release seat holds for specific seats.
     * 
     * @param eventScheduleId the event schedule UUID
     * @param seatIds list of venue seat IDs to release
     */
    @Transactional
    public void releaseHolds(UUID eventScheduleId, List<String> seatIds) {
        seatHoldRepository.deleteByVenueSeatIdsAndScheduleId(seatIds, eventScheduleId);
    }

    /**
     * Release all holds for a user on a specific schedule.
     * 
     * @param eventScheduleId the event schedule UUID
     * @param userId the user whose holds should be released
     */
    @Transactional
    public void releaseUserHolds(UUID eventScheduleId, Long userId) {
        seatHoldRepository.deleteByUserAndScheduleId(userId, eventScheduleId);
    }

    /**
     * Confirm booking by converting holds to a confirmed booking.
     * This releases the holds after the booking is confirmed.
     * 
     * @param eventScheduleId the event schedule UUID
     * @param seatIds list of venue seat IDs being booked
     * @param userId the user making the booking
     * @param bookingRefId the booking reference ID
     * @return true if the booking was confirmed successfully
     */
    @Transactional
    public boolean confirmBooking(UUID eventScheduleId, List<String> seatIds, Long userId, Long bookingRefId) {
        // Verify the user has holds on these seats or seats are available
        LocalDateTime now = LocalDateTime.now();
        Set<String> bookedSeatIds = bookingSeatRepository.findBookedVenueSeatIdsByScheduleId(eventScheduleId);
        
        for (String seatId : seatIds) {
            // Check if seat is already booked by someone else
            if (bookedSeatIds.contains(seatId)) {
                return false;
            }
            
            // Check if seat is held by another user
            if (seatHoldRepository.isSeatHeldByOther(seatId, eventScheduleId, userId, now)) {
                return false;
            }
        }
        
        // Release the holds (the actual booking creation is handled by BookingService)
        seatHoldRepository.deleteByVenueSeatIdsAndScheduleId(seatIds, eventScheduleId);
        
        return true;
    }

    /**
     * Initialize seats for a new event schedule.
     * Validates the venue has seats configured and clears any stale holds.
     * 
     * @param eventScheduleId the event schedule UUID
     * @throws RuntimeException if the event schedule or venue is not found, or venue has no seats
     */
    @Transactional
    public void initializeEventSeats(UUID eventScheduleId) {
        EventSchedule eventSchedule = eventScheduleRepository.findById(eventScheduleId)
            .orElseThrow(() -> new RuntimeException("Event schedule not found: " + eventScheduleId));
        
        UUID venueId = eventSchedule.getEvent().getVenue().getVenueId();
        
        // Verify venue has seats configured
        List<VenueSeat> venueSeats = venueSeatRepository.findByVenueOrderedByLayout(venueId);
        if (venueSeats.isEmpty()) {
            throw new RuntimeException("No seats configured for venue: " + venueId);
        }
        
        // Clear any expired holds for this schedule
        seatHoldRepository.deleteExpiredHolds(LocalDateTime.now());
        
        System.out.println("Initialized " + venueSeats.size() + " seats for event schedule: " + eventScheduleId);
    }

    /**
     * Initialize seats with custom pricing for a new event.
     * Creates TicketCategory entries for the event with custom prices per seat category.
     * 
     * @param eventScheduleId the event schedule UUID
     * @param categoryPrices map of seat category names to custom prices
     */
    @Transactional
    public void initializeEventSeatsWithPricing(UUID eventScheduleId, java.util.Map<String, java.math.BigDecimal> categoryPrices) {
        EventSchedule eventSchedule = eventScheduleRepository.findById(eventScheduleId)
            .orElseThrow(() -> new RuntimeException("Event schedule not found: " + eventScheduleId));
        
        // First initialize the basic seat setup
        initializeEventSeats(eventScheduleId);
        
        UUID venueId = eventSchedule.getEvent().getVenue().getVenueId();
        List<VenueSeat> venueSeats = venueSeatRepository.findByVenueOrderedByLayout(venueId);
        
        // Create TicketCategory entries for each unique seat category with custom pricing
        java.util.Map<String, Integer> categoryCounts = new java.util.HashMap<>();
        for (VenueSeat seat : venueSeats) {
            String categoryName = seat.getCategory().getCategoryName();
            categoryCounts.merge(categoryName, 1, Integer::sum);
        }
        
        for (java.util.Map.Entry<String, java.math.BigDecimal> entry : categoryPrices.entrySet()) {
            String categoryName = entry.getKey();
            java.math.BigDecimal customPrice = entry.getValue();
            Integer capacity = categoryCounts.getOrDefault(categoryName, 0);
            
            if (capacity > 0) {
                TicketCategory ticketCategory = TicketCategory.builder()
                    .categoryName(categoryName)
                    .price(customPrice)
                    .capacity(capacity)
                    .description("Custom pricing for " + categoryName + " seats")
                    .event(eventSchedule.getEvent())
                    .isSharedArea(false)
                    .build();
                ticketCategoryRepository.save(ticketCategory);
            }
        }
        
        System.out.println("Initialized event pricing with " + categoryPrices.size() + " custom category prices");
    }

    /**
     * Update pricing for an existing event's seat category.
     * Updates or creates a TicketCategory entry for the specified category.
     * 
     * @param eventScheduleId the event schedule UUID
     * @param categoryName the seat category name to update
     * @param newPrice the new price for this category
     */
    @Transactional
    public void updateEventPricing(UUID eventScheduleId, String categoryName, java.math.BigDecimal newPrice) {
        EventSchedule eventSchedule = eventScheduleRepository.findById(eventScheduleId)
            .orElseThrow(() -> new RuntimeException("Event schedule not found: " + eventScheduleId));
        
        UUID eventId = eventSchedule.getEvent().getEventId();
        
        // Find existing TicketCategory for this event and category name
        List<TicketCategory> existingCategories = ticketCategoryRepository.findByEventId(eventId);
        TicketCategory targetCategory = existingCategories.stream()
            .filter(tc -> tc.getCategoryName().equals(categoryName) && !Boolean.TRUE.equals(tc.getIsSharedArea()))
            .findFirst()
            .orElse(null);
        
        if (targetCategory != null) {
            // Update existing category
            targetCategory.setPrice(newPrice);
            ticketCategoryRepository.save(targetCategory);
            System.out.println("Updated price for category '" + categoryName + "' to " + newPrice);
        } else {
            // Create new category with the specified price
            UUID venueId = eventSchedule.getEvent().getVenue().getVenueId();
            List<VenueSeat> venueSeats = venueSeatRepository.findByVenueOrderedByLayout(venueId);
            
            int capacity = (int) venueSeats.stream()
                .filter(seat -> seat.getCategory().getCategoryName().equals(categoryName))
                .count();
            
            if (capacity == 0) {
                throw new RuntimeException("No seats found with category: " + categoryName);
            }
            
            TicketCategory newCategory = TicketCategory.builder()
                .categoryName(categoryName)
                .price(newPrice)
                .capacity(capacity)
                .description("Custom pricing for " + categoryName + " seats")
                .event(eventSchedule.getEvent())
                .isSharedArea(false)
                .build();
            ticketCategoryRepository.save(newCategory);
            System.out.println("Created new pricing category '" + categoryName + "' with price " + newPrice);
        }
    }

    /**
     * Lock a seat (prevent booking)
     */
    @Transactional
    public void lockSeat(String seatId) {
        VenueSeat seat = venueSeatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
        
        // Add a note indicating the seat is locked
        String currentNotes = seat.getNotes() != null ? seat.getNotes() : "";
        if (!currentNotes.contains("[LOCKED]")) {
            seat.setNotes("[LOCKED] " + currentNotes);
            venueSeatRepository.save(seat);
        }
    }

    /**
     * Unlock a seat (allow booking)
     */
    @Transactional
    public void unlockSeat(String seatId) {
        VenueSeat seat = venueSeatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
        
        // Remove the locked flag from notes
        String currentNotes = seat.getNotes() != null ? seat.getNotes() : "";
        if (currentNotes.contains("[LOCKED]")) {
            seat.setNotes(currentNotes.replace("[LOCKED] ", "").replace("[LOCKED]", ""));
            venueSeatRepository.save(seat);
        }
    }

    /**
     * Mark seat as accessible (wheelchair accessible)
     */
    @Transactional
    public void markAccessible(String seatId) {
        VenueSeat seat = venueSeatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
        
        seat.setIsAccessible(true);
        venueSeatRepository.save(seat);
    }

    /**
     * Reserve seat for VIP
     */
    @Transactional
    public void reserveForVIP(String seatId) {
        VenueSeat seat = venueSeatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
        
        // Add a note indicating VIP reservation
        String currentNotes = seat.getNotes() != null ? seat.getNotes() : "";
        if (!currentNotes.contains("[VIP]")) {
            seat.setNotes("[VIP] " + currentNotes);
            venueSeatRepository.save(seat);
        }
    }

    /**
     * Remove accessible marking from a seat
     */
    @Transactional
    public void removeAccessible(String seatId) {
        VenueSeat seat = venueSeatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
        
        seat.setIsAccessible(false);
        venueSeatRepository.save(seat);
    }

    /**
     * Remove VIP reservation from a seat
     */
    @Transactional
    public void removeVIPReservation(String seatId) {
        VenueSeat seat = venueSeatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
        
        String currentNotes = seat.getNotes() != null ? seat.getNotes() : "";
        if (currentNotes.contains("[VIP]")) {
            seat.setNotes(currentNotes.replace("[VIP] ", "").replace("[VIP]", "").trim());
            venueSeatRepository.save(seat);
        }
    }

    /**
     * Scheduled task to clean up expired seat holds.
     * Runs every minute (with fixedDelay to prevent overlap) to release seats whose hold has expired.
     * Uses an atomic flag to prevent concurrent execution across threads.
     */
    private static final Logger log = LoggerFactory.getLogger(VenueSeatService.class);
    private static final AtomicBoolean cleanupRunning = new AtomicBoolean(false);

    @Scheduled(fixedDelay = 60000, initialDelay = 10000) // Run every minute after previous completes, 10s initial delay
    @Transactional
    public void cleanupExpiredHolds() {
        // Prevent concurrent execution
        if (!cleanupRunning.compareAndSet(false, true)) {
            log.debug("Cleanup already running, skipping this execution");
            return;
        }

        try {
            // Use UTC time for consistency
            LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
            String jobId = "cleanup-" + Thread.currentThread().getName() + "-" + Instant.now().toEpochMilli();
            
            log.info("[{}] Starting expired holds cleanup at {}", jobId, nowUtc);
            
            int deleted = seatHoldRepository.deleteExpiredHolds(nowUtc);
            
            if (deleted > 0) {
                log.info("[{}] Cleaned up {} expired seat holds", jobId, deleted);
            } else {
                log.debug("[{}] No expired holds to clean up", jobId);
            }
        } catch (Exception e) {
            log.error("Error during expired holds cleanup", e);
        } finally {
            cleanupRunning.set(false);
        }
    }
}

