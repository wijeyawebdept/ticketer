package com.ticket.ticket_booking_system.service.impl;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
import com.ticket.ticket_booking_system.service.VenueSeatingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class VenueSeatingServiceImpl implements VenueSeatingService {
    
    private final SeatRepository seatRepository;
    private final VenueRepository venueRepository;
    private final EventRepository eventRepository;
    
    @Override
    @Transactional
    public void createVenueSeatingTemplate(UUID venueId, List<Seat> seats) {
        log.info("Creating seating template for venue: {}", venueId);
        
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
        
        // Set venue reference for all seats and ensure event is null (template seats)
        seats.forEach(seat -> {
            seat.setVenue(venue);
            seat.setEvent(null); // Template seats don't belong to any event
        });
        
        seatRepository.saveAll(seats);
        log.info("Created {} template seats for venue {}", seats.size(), venueId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<Seat> getVenueSeatingTemplate(UUID venueId) {
        log.info("Fetching seating template for venue: {}", venueId);
        
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
        
        return seatRepository.findByVenueAndEventIsNull(venue);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<SeatResponse> getVenueSeatingTemplateAsResponse(UUID venueId) {
        List<Seat> seats = getVenueSeatingTemplate(venueId);
        return seats.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public void cloneSeatsToEvent(UUID venueId, UUID eventId) {
        log.info("Cloning seats from venue {} to event {}", venueId, eventId);
        
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
        
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "eventId", eventId.toString()));
        
        // Get template seats for this venue
        List<Seat> templateSeats = seatRepository.findByVenueAndEventIsNull(venue);
        
        if (templateSeats.isEmpty()) {
            throw new IllegalStateException("No template seats found for venue: " + venueId);
        }
        
        // Clone each template seat for the event
        List<Seat> eventSeats = templateSeats.stream()
                .map(template -> Seat.builder()
                        .venue(venue)
                        .event(event)
                        .section(template.getSection())
                        .rowNumber(template.getRowNumber())
                        .row(template.getRow())
                        .seatNumber(template.getSeatNumber())
                        .xPosition(template.getXPosition())
                        .yPosition(template.getYPosition())
                        .seatType(template.getSeatType())
                        .status("AVAILABLE")
                        .price(template.getPrice())
                        .isAvailable(true)
                        .isBlocked(false)
                        .build())
                .collect(Collectors.toList());
        
        seatRepository.saveAll(eventSeats);
        log.info("Cloned {} seats from venue {} to event {}", eventSeats.size(), venueId, eventId);
    }
    
    @Override
    @Transactional
    public void deleteVenueSeatingTemplate(UUID venueId) {
        log.info("Deleting seating template for venue: {}", venueId);
        
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
        
        seatRepository.deleteByVenueAndEventIsNull(venue);
        log.info("Deleted seating template for venue {}", venueId);
    }
    
    @Override
    @Transactional
    public void updateSeatPosition(UUID seatId, Integer xPosition, Integer yPosition) {
        log.info("Updating position for seat {}: ({}, {})", seatId, xPosition, yPosition);
        
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new ResourceNotFoundException("Seat", "seatId", seatId.toString()));
        
        seat.setXPosition(xPosition);
        seat.setYPosition(yPosition);
        seatRepository.save(seat);
    }
    
    @Override
    @Transactional
    public void batchUpdateSeatPositions(List<UUID> seatIds, List<Integer> xPositions, List<Integer> yPositions) {
        if (seatIds.size() != xPositions.size() || seatIds.size() != yPositions.size()) {
            throw new IllegalArgumentException("Seat IDs and position lists must have the same size");
        }
        
        log.info("Batch updating positions for {} seats", seatIds.size());
        
        for (int i = 0; i < seatIds.size(); i++) {
            updateSeatPosition(seatIds.get(i), xPositions.get(i), yPositions.get(i));
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public long countVenueSeats(UUID venueId) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", "venueId", venueId.toString()));
        
        return seatRepository.countByVenueAndEventIsNull(venue);
    }
    
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
                .xPosition(seat.getXPosition())
                .yPosition(seat.getYPosition())
                .seatType(seat.getSeatType())
                .price(seat.getPrice())
                .isAvailable(seat.getIsAvailable())
                .isBlocked(seat.getIsBlocked())
                .holdExpiresAt(seat.getHoldExpiresAt())
                .heldByUser(seat.getHeldByUser())
                .createdAt(seat.getCreatedAt() != null ? seat.getCreatedAt().toLocalDateTime() : null)
                .build();
    }
}
