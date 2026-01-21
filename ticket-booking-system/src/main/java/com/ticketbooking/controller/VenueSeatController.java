package com.ticketbooking.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.SeatAvailabilityResponse;
import com.ticket.ticket_booking_system.dto.SeatHoldRequest;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.service.VenueSeatService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/venue-seats")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VenueSeatController {

    private final VenueSeatService venueSeatService;

    /**
     * Get hard-coded venue layout (all seats with positions)
     */
    @GetMapping("/layout")
    public ResponseEntity<List<VenueSeat>> getVenueLayout() {
        return ResponseEntity.ok(venueSeatService.getAllSeats());
    }

    /**
     * Get seat availability for specific event schedule
     */
    @GetMapping("/availability/{eventScheduleId}")
    public ResponseEntity<SeatAvailabilityResponse> getSeatAvailability(
        @PathVariable UUID eventScheduleId
    ) {
        return ResponseEntity.ok(venueSeatService.getSeatAvailability(eventScheduleId));
    }

    /**
     * Hold seats temporarily (5-minute timer)
     */
    @PostMapping("/hold")
    public ResponseEntity<Map<String, Object>> holdSeats(@RequestBody SeatHoldRequest request) {
        boolean success = venueSeatService.holdSeats(
            request.getEventScheduleId(),
            request.getSeatIds(),
            request.getUserId()
        );
        
        if (success) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Seats held for 5 minutes",
                "expiresIn", 300 // seconds
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "One or more seats are not available"
            ));
        }
    }

    /**
     * Release seat holds manually
     */
    @PostMapping("/release")
    public ResponseEntity<Map<String, String>> releaseHolds(
        @RequestParam UUID eventScheduleId,
        @RequestBody List<String> seatIds
    ) {
        venueSeatService.releaseHolds(eventScheduleId, seatIds);
        return ResponseEntity.ok(Map.of("message", "Seats released successfully"));
    }

    /**
     * Confirm booking (convert hold to booked)
     */
    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmBooking(
        @RequestParam UUID eventScheduleId,
        @RequestParam Long bookingRefId,
        @RequestParam Long userId,
        @RequestBody List<String> seatIds
    ) {
        boolean success = venueSeatService.confirmBooking(
            eventScheduleId, seatIds, userId, bookingRefId
        );
        
        if (success) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Booking confirmed"
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Booking confirmation failed"
            ));
        }
    }

    /**
     * Initialize seats for a new event schedule
     */
    @PostMapping("/initialize/{eventScheduleId}")
    public ResponseEntity<Map<String, String>> initializeEventSeats(
        @PathVariable UUID eventScheduleId
    ) {
        venueSeatService.initializeEventSeats(eventScheduleId);
        return ResponseEntity.ok(Map.of("message", "Event seats initialized"));
    }

    /**
     * Initialize seats with custom pricing for a new event
     */
    @PostMapping("/initialize/{eventScheduleId}/with-pricing")
    public ResponseEntity<Map<String, String>> initializeEventSeatsWithPricing(
        @PathVariable UUID eventScheduleId,
        @RequestBody Map<String, BigDecimal> categoryPrices
    ) {
        venueSeatService.initializeEventSeatsWithPricing(eventScheduleId, categoryPrices);
        return ResponseEntity.ok(Map.of("message", "Event seats initialized with custom pricing"));
    }

    /**
     * Update pricing for an existing event
     */
    @PutMapping("/pricing/{eventScheduleId}")
    public ResponseEntity<Map<String, String>> updateEventPricing(
        @PathVariable UUID eventScheduleId,
        @RequestParam String categoryName,
        @RequestParam BigDecimal newPrice
    ) {
        venueSeatService.updateEventPricing(eventScheduleId, categoryName, newPrice);
        return ResponseEntity.ok(Map.of("message", "Pricing updated successfully"));
    }
}
