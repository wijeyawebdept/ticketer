package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.SeatAvailabilityResponse;
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
     * Get venue layout for a specific venue
     * GET /api/venue-seats/layout/{venueId}
     */
    @GetMapping("/layout/{venueId}")
    public ResponseEntity<List<VenueSeat>> getVenueLayoutByVenue(@PathVariable UUID venueId) {
        return ResponseEntity.ok(venueSeatService.getSeatsByVenue(venueId));
    }

    /**
     * Get seat availability for a specific event schedule (public endpoint)
     */
    @GetMapping("/availability/{eventScheduleId}")
    public ResponseEntity<SeatAvailabilityResponse> getSeatAvailability(@PathVariable String eventScheduleId) {
        try {
            // Parse UUID from string
            UUID scheduleUuid = UUID.fromString(eventScheduleId);
            SeatAvailabilityResponse response = venueSeatService.getSeatAvailabilityByUUID(scheduleUuid);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Lock a seat (admin/organizer only)
     */
    @PutMapping("/{seatId}/lock")
    public ResponseEntity<Map<String, String>> lockSeat(@PathVariable String seatId) {
        try {
            venueSeatService.lockSeat(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat locked successfully", "seatId", seatId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to lock seat: " + e.getMessage()));
        }
    }

    /**
     * Unlock a seat (admin/organizer only)
     */
    @PutMapping("/{seatId}/unlock")
    public ResponseEntity<Map<String, String>> unlockSeat(@PathVariable String seatId) {
        try {
            venueSeatService.unlockSeat(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat unlocked successfully", "seatId", seatId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to unlock seat: " + e.getMessage()));
        }
    }

    /**
     * Mark seat as accessible (admin/organizer only)
     */
    @PutMapping("/{seatId}/accessible")
    public ResponseEntity<Map<String, String>> markAccessible(@PathVariable String seatId) {
        try {
            venueSeatService.markAccessible(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat marked as accessible", "seatId", seatId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to mark seat as accessible: " + e.getMessage()));
        }
    }

    /**
     * Reserve seat for VIP (admin/organizer only)
     */
    @PutMapping("/{seatId}/reserve-vip")
    public ResponseEntity<Map<String, String>> reserveForVIP(@PathVariable String seatId) {
        try {
            venueSeatService.reserveForVIP(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat reserved for VIP", "seatId", seatId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to reserve seat for VIP: " + e.getMessage()));
        }
    }
}
