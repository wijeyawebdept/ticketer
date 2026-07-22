package com.ticket.ticket_booking_system.service.impl;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.response.SeatResponse;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Seat;
import com.ticket.ticket_booking_system.entity.Venue;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;

import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;

import com.ticket.ticket_booking_system.repository.VenueRepository;
import com.ticket.ticket_booking_system.service.SeatService;
import com.ticket.ticket_booking_system.service.SeatWebSocketService;

@Service
public class SeatServiceImpl implements SeatService {

    private static final Logger logger = LoggerFactory.getLogger(SeatServiceImpl.class);
    private static final AtomicBoolean cleanupRunning = new AtomicBoolean(false);

    private final SeatRepository seatRepository;
    private final EventRepository eventRepository;
    private final SeatWebSocketService webSocketService;

    private final VenueRepository venueRepository;

    public SeatServiceImpl(SeatRepository seatRepository, EventRepository eventRepository,
            SeatWebSocketService webSocketService, VenueRepository venueRepository) {
        this.seatRepository = seatRepository;
        this.eventRepository = eventRepository;
        this.webSocketService = webSocketService;

        this.venueRepository = venueRepository;
    }

    @Override
    @Transactional
    public void generateSeatsForEvent(UUID venueId, UUID eventId) {
        logger.info("Generating seats for eventId: {} from venueId: {}", eventId, venueId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "eventId", eventId.toString()));

        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));

        logger.info("Found event: {} (ID: {})", event.getName(), event.getEventId());
        logger.info("Venue: {} with capacity: {}", venue.getName(), venue.getCapacity());

        List<Seat> baseSeats = seatRepository.findByVenue_VenueIdAndEventIsNull(venueId);
        logger.info("Found {} template seats for venue {}", baseSeats.size(), venueId);
        if (baseSeats.isEmpty()) {
            logger.warn("No template seats found for venue {}. Cannot generate seats for event.", venueId);
            return;
        }

        // Enforce venue capacity limit
        int maxSeatsToCreate = venue.getCapacity();
        int seatsToCreate = Math.min(baseSeats.size(), maxSeatsToCreate);

        if (baseSeats.size() > maxSeatsToCreate) {
            logger.warn("Template seats ({}) exceed venue capacity ({}). Limiting to capacity.",
                    baseSeats.size(), maxSeatsToCreate);
        }

        int seatsCreated = 0;
        for (int i = 0; i < seatsToCreate; i++) {
            Seat base = baseSeats.get(i);

            // Determine status for the status field
            String dbStatus = "AVAILABLE";
            if (Boolean.TRUE.equals(base.getIsBlocked())) {
                dbStatus = "RESERVED";
            } else if (Boolean.FALSE.equals(base.getIsAvailable())) {
                dbStatus = "RESERVED";
            }

            Seat copy = Seat.builder()
                    .venue(base.getVenue())
                    .event(event)
                    .section(base.getSection())
                    .rowNumber(base.getRowNumber())
                    .row(base.getRow() != null ? base.getRow() : base.getRowNumber()) // Populate row field for database
                                                                                      // compatibility
                    .seatNumber(base.getSeatNumber())
                    .seatType(base.getSeatType())
                    .status(dbStatus) // Populate the status field for database compatibility
                    .price(base.getPrice())
                    .isAvailable(true)
                    .isBlocked(false)
                    .build();
            seatRepository.save(copy);
            seatsCreated++;
        }

        logger.info("Successfully created {} seats for event {} ({}) - Venue capacity: {}",
                seatsCreated, event.getName(), eventId, venue.getCapacity());
    }

    @Override
    public List<Seat> getSeatsByEvent(UUID eventId) {
        return seatRepository.findByEvent_EventId(eventId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SeatResponse> getSeatsByEventAsResponse(UUID eventId) {
        logger.info("Fetching seats for eventId: {}", eventId);
        List<Seat> seats = seatRepository.findByEvent_EventId(eventId);
        logger.info("Found {} seats for event {}", seats.size(), eventId);
        return seats.stream()
                .map(this::convertToResponse)
                .toList();
    }

    @Override
    public List<Seat> getAvailableSeatsByEvent(UUID eventId) {
        return seatRepository.findAvailableSeatsByEventId(eventId);
    }

    /**
     * Convert Seat entity to SeatResponse DTO
     * This avoids lazy loading issues with Venue and Event
     */
    private SeatResponse convertToResponse(Seat seat) {
        return SeatResponse.builder()
                .seatId(seat.getSeatId())
                .venueId(seat.getVenue() != null ? seat.getVenue().getVenueId() : null)
                .venueName(seat.getVenue() != null ? seat.getVenue().getName() : null)
                .eventId(seat.getEvent() != null ? seat.getEvent().getEventId() : null)
                .eventName(seat.getEvent() != null ? seat.getEvent().getName() : null)
                .section(seat.getSection())
                .rowNumber(seat.getRowNumber())
                .seatNumber(seat.getSeatNumber())
                .seatType(seat.getSeatType())
                .price(seat.getPrice())
                .isAvailable(seat.getIsAvailable())
                .isBlocked(seat.getIsBlocked())
                .isPermanentHold(seat.getIsPermanentHold())
                .holdExpiresAt(seat.getHoldExpiresAt())
                .heldByUser(seat.getHeldByUser())
                .createdAt(seat.getCreatedAt() != null ? seat.getCreatedAt().toLocalDateTime() : null)
                .build();
    }

    @Override
    @Transactional
    public void toggleBlock(UUID seatId, boolean block) {
        Seat seat = getSeatById(seatId);
        seat.setIsBlocked(block);
        // Update status field for database compatibility
        if (block) {
            seat.setStatus("RESERVED");
        } else {
            seat.setStatus("AVAILABLE");
        }
        seatRepository.save(seat);

        // Notify WebSocket subscribers
        webSocketService.notifySeatUpdate(
                seat.getEvent().getEventId(),
                seat,
                block ? "RESERVED" : "UNBLOCKED");
    }

    @Override
    @Transactional
    public void holdSeats(List<UUID> seatIds, UUID userId, int holdDurationMinutes) {
        if (seatIds == null || seatIds.isEmpty()) return;
        List<Seat> seats = seatRepository.findAllById(seatIds);
        if (seats.isEmpty()) return;
        
        Event event = seats.get(0).getEvent();
        LocalDateTime cutoffTime = event.getTicketCutoffTime();
        
        // If cutoff is null, compute 12 hours before the first schedule
        if (cutoffTime == null && event.getSchedules() != null && !event.getSchedules().isEmpty()) {
            com.ticket.ticket_booking_system.entity.EventSchedule firstSchedule = event.getSchedules().stream()
                .min(java.util.Comparator.comparing(s -> LocalDateTime.of(s.getScheduleDate(), s.getStartTime())))
                .orElse(null);
            if (firstSchedule != null) {
                cutoffTime = LocalDateTime.of(firstSchedule.getScheduleDate(), firstSchedule.getStartTime()).minusHours(12);
            }
        }
        
        // Enforce Sri Lankan Time (Asia/Colombo) for current time check
        java.time.ZoneId lkZone = java.time.ZoneId.of("Asia/Colombo");
        LocalDateTime nowLK = LocalDateTime.now(lkZone);
        
        if (cutoffTime != null && nowLK.isAfter(cutoffTime)) {
            throw new IllegalStateException("Online ticket sales for this event have closed.");
        }

        LocalDateTime holdExpiry = LocalDateTime.now().plusMinutes(holdDurationMinutes);

        for (Seat seat : seats) {
            if (!seat.isAvailableForBooking()) {
                throw new IllegalStateException("Seat not available for booking: " + seat.getSeatNumber());
            }
            seat.setHoldExpiresAt(holdExpiry);
            seat.setHeldByUser(userId);
            // Update status field for database compatibility - use RESERVED instead of HELD
            seat.setStatus("RESERVED");

            // Notify WebSocket subscribers about seat hold
            webSocketService.notifySeatUpdate(
                    seat.getEvent().getEventId(),
                    seat,
                    "HELD");
        }
        seatRepository.saveAll(seats);

        // Notify the specific user about their hold (only if userId is provided)
        if (userId != null && !seats.isEmpty()) {
            SeatWebSocketService.SeatHoldNotification notification = new SeatWebSocketService.SeatHoldNotification(
                    seats.get(0).getEvent().getEventId(),
                    "Seats held for " + holdDurationMinutes + " minutes",
                    "HOLD_CONFIRMED",
                    holdExpiry.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli());
            webSocketService.notifyUserSeatHold(userId, seats.get(0).getEvent().getEventId(), notification);
        }
    }

    @Override
    @Transactional
    public void reserveSeats(List<UUID> seatIds) {
        List<Seat> seats = seatRepository.findAllById(seatIds);
        for (Seat seat : seats) {
            if (!seat.isAvailableForBooking() && !seat.isHeld()) {
                throw new IllegalStateException("Seat not available for booking: " + seat.getSeatNumber());
            }
            seat.setIsAvailable(false);
            seat.setHoldExpiresAt(null);
            seat.setHeldByUser(null);
            // Update status field for database compatibility
            seat.setStatus("RESERVED");

            // Notify WebSocket subscribers about seat reservation
            webSocketService.notifySeatUpdate(
                    seat.getEvent().getEventId(),
                    seat,
                    "RESERVED");
        }
        seatRepository.saveAll(seats);
    }

    @Override
    @Transactional
    public void unreserveSeats(List<UUID> seatIds) {
        List<Seat> seats = seatRepository.findAllById(seatIds);
        for (Seat seat : seats) {
            seat.setIsAvailable(true);
            seat.setHoldExpiresAt(null);
            seat.setHeldByUser(null);
            seat.setStatus("AVAILABLE");

            // Notify WebSocket subscribers about seat unreservation
            webSocketService.notifySeatUpdate(
                    seat.getEvent().getEventId(),
                    seat,
                    "UNRESERVED");
        }
        seatRepository.saveAll(seats);
    }

    @Override
    @Transactional
    public void permanentHoldSeats(List<UUID> seatIds) {
        List<Seat> seats = seatRepository.findAllById(seatIds);
        for (Seat seat : seats) {
            if (!seat.isAvailableForBooking()) {
                throw new IllegalStateException("Seat not available for permanent hold: " + seat.getSeatNumber());
            }
            seat.setIsAvailable(false);
            seat.setIsPermanentHold(true); // Mark as permanent hold
            // Set a very far future date to indicate permanent hold
            seat.setHoldExpiresAt(LocalDateTime.now().plusYears(100));
            seat.setHeldByUser(null); // Admin hold, no specific user
            seat.setStatus("RESERVED"); // Use RESERVED status to comply with database constraint

            // Notify WebSocket subscribers
            webSocketService.notifySeatUpdate(
                    seat.getEvent().getEventId(),
                    seat,
                    "PERMANENT_HOLD");
        }
        seatRepository.saveAll(seats);
    }

    @Override
    @Transactional
    public void releasePermanentHold(List<UUID> seatIds) {
        List<Seat> seats = seatRepository.findAllById(seatIds);
        for (Seat seat : seats) {
            seat.setIsAvailable(true);
            seat.setIsPermanentHold(false); // Clear permanent hold flag
            seat.setHoldExpiresAt(null);
            seat.setHeldByUser(null);
            seat.setStatus("AVAILABLE");

            // Notify WebSocket subscribers
            webSocketService.notifySeatUpdate(
                    seat.getEvent().getEventId(),
                    seat,
                    "RELEASED");
        }
        seatRepository.saveAll(seats);
    }

    @Override
    @Transactional
    public void releaseSeatHolds(UUID userId) {
        List<Seat> seats = getSeatsByEvent(userId); // This should be updated to find by held user
        for (Seat seat : seats) {
            if (userId.equals(seat.getHeldByUser())) {
                seat.setHoldExpiresAt(null);
                seat.setHeldByUser(null);
                // Update status field for database compatibility
                if (Boolean.TRUE.equals(seat.getIsBlocked())) {
                    seat.setStatus("RESERVED");
                } else {
                    seat.setStatus("AVAILABLE");
                }
            }
        }
        seatRepository.saveAll(seats);
    }

    @Override
    @Transactional
    @Scheduled(fixedDelay = 60000, initialDelay = 15000) // Run every minute after previous completes, 15s initial delay
    public void releaseExpiredHolds() {
        // Prevent concurrent execution
        if (!cleanupRunning.compareAndSet(false, true)) {
            logger.debug("SeatServiceImpl cleanup already running, skipping");
            return;
        }

        try {
            // Use UTC time for consistency
            LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
            String jobId = "seat-cleanup-" + Thread.currentThread().getName() + "-" + Instant.now().toEpochMilli();

            logger.debug("[{}] Starting expired seat holds release at {}", jobId, nowUtc);

            // Find expired holds before releasing them to notify users
            List<Seat> expiredSeats = seatRepository.findExpiredHolds(nowUtc);

            if (expiredSeats.isEmpty()) {
                logger.debug("[{}] No expired seat holds to release", jobId);
                return;
            }

            // Release expired holds
            int released = seatRepository.releaseExpiredHolds(nowUtc);
            logger.info("[{}] Released {} expired seat holds", jobId, released);

            // Notify WebSocket subscribers about released seats
            for (Seat seat : expiredSeats) {
                try {
                    webSocketService.notifySeatUpdate(
                            seat.getEvent().getEventId(),
                            seat,
                            "RELEASED");

                    // Notify the user who held the seat
                    if (seat.getHeldByUser() != null) {
                        SeatWebSocketService.SeatHoldNotification notification = new SeatWebSocketService.SeatHoldNotification(
                                seat.getEvent().getEventId(),
                                "Your seat hold has expired",
                                "HOLD_EXPIRED",
                                0);
                        webSocketService.notifyUserSeatHold(seat.getHeldByUser(), seat.getEvent().getEventId(),
                                notification);
                    }
                } catch (Exception e) {
                    logger.warn("[{}] Failed to notify WebSocket for seat {}: {}", jobId, seat.getSeatId(),
                            e.getMessage());
                }
            }
        } catch (Exception e) {
            logger.error("Error during expired seat holds release", e);
        } finally {
            cleanupRunning.set(false);
        }
    }

    @Override
    public Seat getSeatById(UUID seatId) {
        return seatRepository.findById(seatId)
                .orElseThrow(() -> new ResourceNotFoundException("Seat", "seatId", seatId.toString()));
    }

    @Override
    public SeatAvailabilityStats getAvailabilityStats(UUID eventId) {
        List<Seat> allSeats = seatRepository.findByEvent_EventId(eventId);

        long totalSeats = allSeats.size();
        long availableSeats = allSeats.stream()
                .mapToLong(seat -> seat.isAvailableForBooking() ? 1 : 0)
                .sum();
        long bookedSeats = allSeats.stream()
                .mapToLong(seat -> Boolean.FALSE.equals(seat.getIsAvailable()) ? 1 : 0)
                .sum();
        long heldSeats = allSeats.stream()
                .mapToLong(seat -> seat.isHeld() ? 1 : 0)
                .sum();
        long blockedSeats = allSeats.stream()
                .mapToLong(seat -> Boolean.TRUE.equals(seat.getIsBlocked()) ? 1 : 0)
                .sum();

        return new SeatAvailabilityStats(totalSeats, availableSeats, bookedSeats, heldSeats, blockedSeats);
    }

}