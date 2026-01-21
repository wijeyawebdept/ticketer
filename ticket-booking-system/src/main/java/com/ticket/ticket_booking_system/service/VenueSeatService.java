package com.ticket.ticket_booking_system.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.SeatAvailabilityResponse;
import com.ticket.ticket_booking_system.dto.SeatDTO;
import com.ticket.ticket_booking_system.entity.Seat.SeatStatus;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.VenueSeatRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VenueSeatService {

    private final VenueSeatRepository venueSeatRepository;

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
     * Get seat availability for a specific event schedule (UUID-based)
     * Returns all seats as AVAILABLE since bookings use Long IDs
     */
    @Transactional(readOnly = true)
    public SeatAvailabilityResponse getSeatAvailabilityByUUID(UUID eventScheduleUuid) {
        // Get all venue seats (hard-coded layout)
        List<VenueSeat> allSeats = venueSeatRepository.findAllOrderedByLayout();
        
        // Since SeatBooking uses Long eventScheduleId but EventSchedule uses UUID scheduleId,
        // we can't query bookings directly. Return all seats as AVAILABLE for now.
        // TODO: Fix data model to use UUID consistently
        
        List<SeatDTO> seatDTOs = new ArrayList<>();
        
        for (VenueSeat seat : allSeats) {
            // Debug logging
            if (seat.getSeatId().equals("KH-A01")) {
                System.out.println("DEBUG: Creating DTO for seat KH-A01");
                System.out.println("  xPosition: " + seat.getXPosition());
                System.out.println("  yPosition: " + seat.getYPosition());
                System.out.println("  categoryName: " + seat.getCategory().getCategoryName());
            }
            
            SeatDTO dto = new SeatDTO(
                seat.getSeatId(),
                seat.getSection(),
                seat.getRowLabel(),
                seat.getSeatNumber(),
                seat.getCategory().getCategoryName(),
                seat.getCategory().getColorCode(),
                seat.getXPosition(),
                seat.getYPosition(),
                seat.getIsAisleSeat(),
                seat.getIsAccessible(),
                SeatStatus.AVAILABLE.name(),
                seat.getCategory().getBasePrice() // This becomes currentPrice
            );
            
            seatDTOs.add(dto);
        }
        
        return new SeatAvailabilityResponse(
            seatDTOs,
            (long) allSeats.size(),
            (long) allSeats.size(), // All available
            0L, // None booked
            0L  // No holds
        );
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
     * Hold seats temporarily
     */
    @Transactional
    public boolean holdSeats(UUID eventScheduleId, List<String> seatIds, Long userId) {
        // TODO: Implement seat holding logic with SeatHold entity
        // For now, return true to allow frontend to proceed
        return true;
    }

    /**
     * Release seat holds
     */
    @Transactional
    public void releaseHolds(UUID eventScheduleId, List<String> seatIds) {
        // TODO: Implement seat hold release logic
    }

    /**
     * Confirm booking (convert hold to booked)
     */
    @Transactional
    public boolean confirmBooking(UUID eventScheduleId, List<String> seatIds, Long userId, Long bookingRefId) {
        // TODO: Implement booking confirmation logic
        // For now, return true to allow frontend to proceed
        return true;
    }

    /**
     * Initialize seats for a new event schedule
     */
    @Transactional
    public void initializeEventSeats(UUID eventScheduleId) {
        // TODO: Implement event seat initialization
        // This should create seat availability records for the event
    }

    /**
     * Initialize seats with custom pricing for a new event
     */
    @Transactional
    public void initializeEventSeatsWithPricing(UUID eventScheduleId, java.util.Map<String, java.math.BigDecimal> categoryPrices) {
        // TODO: Implement event seat initialization with custom pricing
    }

    /**
     * Update pricing for an existing event
     */
    @Transactional
    public void updateEventPricing(UUID eventScheduleId, String categoryName, java.math.BigDecimal newPrice) {
        // TODO: Implement event pricing update
    }
}

