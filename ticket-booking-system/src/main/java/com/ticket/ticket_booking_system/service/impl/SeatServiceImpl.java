package com.ticket.ticket_booking_system.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.Seat;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.SeatRepository;
import com.ticket.ticket_booking_system.service.SeatService;
import com.ticket.ticket_booking_system.service.SeatWebSocketService;

@Service
public class SeatServiceImpl implements SeatService {
    
    private final SeatRepository seatRepository;
    private final EventRepository eventRepository;
    private final SeatWebSocketService webSocketService;
    
    public SeatServiceImpl(SeatRepository seatRepository, EventRepository eventRepository, SeatWebSocketService webSocketService) {
        this.seatRepository = seatRepository;
        this.eventRepository = eventRepository;
        this.webSocketService = webSocketService;
    }
    
    @Override
    @Transactional
    public void generateSeatsForEvent(UUID venueId, UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "eventId", eventId.toString()));
        
        List<Seat> baseSeats = seatRepository.findByVenue_VenueIdAndEventIsNull(venueId);
        for (Seat base : baseSeats) {
            Seat copy = Seat.builder()
                    .venue(base.getVenue())
                    .event(event)
                    .section(base.getSection())
                    .rowNumber(base.getRowNumber())
                    .seatNumber(base.getSeatNumber())
                    .seatType(base.getSeatType())
                    .price(base.getPrice())
                    .isAvailable(true)
                    .isBlocked(false)
                    .build();
            seatRepository.save(copy);
        }
    }
    
    @Override
    public List<Seat> getSeatsByEvent(UUID eventId) {
        return seatRepository.findByEvent_EventId(eventId);
    }
    
    @Override
    public List<Seat> getAvailableSeatsByEvent(UUID eventId) {
        return seatRepository.findAvailableSeatsByEventId(eventId);
    }
    
    @Override
    @Transactional
    public void toggleBlock(UUID seatId, boolean block) {
        Seat seat = getSeatById(seatId);
        seat.setIsBlocked(block);
        seatRepository.save(seat);
        
        // Notify WebSocket subscribers
        webSocketService.notifySeatUpdate(
            seat.getEvent().getEventId(), 
            seat, 
            block ? "BLOCKED" : "UNBLOCKED"
        );
    }
    
    @Override
    @Transactional
    public void holdSeats(List<UUID> seatIds, UUID userId, int holdDurationMinutes) {
        List<Seat> seats = seatRepository.findAllById(seatIds);
        LocalDateTime holdExpiry = LocalDateTime.now().plusMinutes(holdDurationMinutes);
        
        for (Seat seat : seats) {
            if (!seat.isAvailableForBooking()) {
                throw new IllegalStateException("Seat not available for booking: " + seat.getSeatNumber());
            }
            seat.setHoldExpiresAt(holdExpiry);
            seat.setHeldByUser(userId);
            
            // Notify WebSocket subscribers about seat hold
            webSocketService.notifySeatUpdate(
                seat.getEvent().getEventId(), 
                seat, 
                "HELD"
            );
        }
        seatRepository.saveAll(seats);
        
        // Notify the specific user about their hold
        SeatWebSocketService.SeatHoldNotification notification = 
            new SeatWebSocketService.SeatHoldNotification(
                seats.get(0).getEvent().getEventId(),
                "Seats held for " + holdDurationMinutes + " minutes",
                "HOLD_CONFIRMED",
                holdExpiry.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
            );
        webSocketService.notifyUserSeatHold(userId, seats.get(0).getEvent().getEventId(), notification);
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
            
            // Notify WebSocket subscribers about seat reservation
            webSocketService.notifySeatUpdate(
                seat.getEvent().getEventId(), 
                seat, 
                "RESERVED"
            );
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
            }
        }
        seatRepository.saveAll(seats);
    }
    
    @Override
    @Transactional
    @Scheduled(fixedRate = 60000) // Run every minute
    public void releaseExpiredHolds() {
        // Find expired holds before releasing them to notify users
        List<Seat> expiredSeats = seatRepository.findExpiredHolds(LocalDateTime.now());
        
        // Release expired holds
        seatRepository.releaseExpiredHolds(LocalDateTime.now());
        
        // Notify WebSocket subscribers about released seats
        for (Seat seat : expiredSeats) {
            webSocketService.notifySeatUpdate(
                seat.getEvent().getEventId(), 
                seat, 
                "RELEASED"
            );
            
            // Notify the user who held the seat
            if (seat.getHeldByUser() != null) {
                SeatWebSocketService.SeatHoldNotification notification = 
                    new SeatWebSocketService.SeatHoldNotification(
                        seat.getEvent().getEventId(),
                        "Your seat hold has expired",
                        "HOLD_EXPIRED",
                        0
                    );
                webSocketService.notifyUserSeatHold(seat.getHeldByUser(), seat.getEvent().getEventId(), notification);
            }
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