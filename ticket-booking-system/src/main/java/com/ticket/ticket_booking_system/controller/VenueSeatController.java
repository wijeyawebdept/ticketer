package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.SeatAvailabilityResponse;
import com.ticket.ticket_booking_system.dto.SeatHoldRequest;
import com.ticket.ticket_booking_system.dto.VenueSeatCategoryDTO;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.service.VenueSeatService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
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
     * Get distinct seat categories for a venue with seat counts.
     * Used by the event creation wizard to auto-populate ticket category rows.
     * GET /api/venue-seats/layout/{venueId}/categories
     */
    @GetMapping("/layout/{venueId}/categories")
    public ResponseEntity<List<VenueSeatCategoryDTO>> getVenueSeatCategories(@PathVariable UUID venueId) {
        List<VenueSeatCategoryDTO> categories = venueSeatService.getVenueSeatCategories(venueId);
        return ResponseEntity.ok(categories);
    }

    /**
     * Get seat availability for a specific event schedule (public endpoint)
     */
    @GetMapping("/availability/{eventScheduleId}")
    public ResponseEntity<SeatAvailabilityResponse> getSeatAvailability(@PathVariable String eventScheduleId) {
        try {
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
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Map<String, String>> lockSeat(@PathVariable String seatId) {
        try {
            venueSeatService.lockSeat(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat locked successfully", "seatId", seatId));
        } catch (Exception e) {
            log.error("Failed to lock seat {}: {}", seatId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to lock seat. Please try again."));
        }
    }

    /**
     * Unlock a seat (admin/organizer only)
     */
    @PutMapping("/{seatId}/unlock")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Map<String, String>> unlockSeat(@PathVariable String seatId) {
        try {
            venueSeatService.unlockSeat(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat unlocked successfully", "seatId", seatId));
        } catch (Exception e) {
            log.error("Failed to unlock seat {}: {}", seatId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to unlock seat. Please try again."));
        }
    }

    /**
     * Mark seat as accessible (admin/organizer only)
     */
    @PutMapping("/{seatId}/accessible")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Map<String, String>> markAccessible(@PathVariable String seatId) {
        try {
            venueSeatService.markAccessible(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat marked as accessible", "seatId", seatId));
        } catch (Exception e) {
            log.error("Failed to mark seat {} as accessible: {}", seatId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to mark seat as accessible. Please try again."));
        }
    }

    /**
     * Reserve seat for VIP (admin/organizer only)
     */
    @PutMapping("/{seatId}/reserve-vip")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Map<String, String>> reserveForVIP(@PathVariable String seatId) {
        try {
            venueSeatService.reserveForVIP(seatId);
            return ResponseEntity.ok(Map.of("message", "Seat reserved for VIP", "seatId", seatId));
        } catch (Exception e) {
            log.error("Failed to reserve seat {} for VIP: {}", seatId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to reserve seat for VIP. Please try again."));
        }
    }

    /**
     * Remove accessible marking from a seat (admin/organizer only)
     */
    @PutMapping("/{seatId}/remove-accessible")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Map<String, String>> removeAccessible(@PathVariable String seatId) {
        try {
            venueSeatService.removeAccessible(seatId);
            return ResponseEntity.ok(Map.of("message", "Accessible marking removed", "seatId", seatId));
        } catch (Exception e) {
            log.error("Failed to remove accessible marking for seat {}: {}", seatId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to remove accessible marking. Please try again."));
        }
    }

    /**
     * Remove VIP reservation from a seat (admin/organizer only)
     */
    @PutMapping("/{seatId}/remove-vip")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Map<String, String>> removeVIPReservation(@PathVariable String seatId) {
        try {
            venueSeatService.removeVIPReservation(seatId);
            return ResponseEntity.ok(Map.of("message", "VIP reservation removed", "seatId", seatId));
        } catch (Exception e) {
            log.error("Failed to remove VIP reservation for seat {}: {}", seatId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Failed to remove VIP reservation. Please try again."));
        }
    }

    /**
     * Hold seats temporarily (5-minute timer)
     * POST /api/venue-seats/hold
     */
    @PostMapping("/hold")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> holdSeats(@RequestBody SeatHoldRequest request) {
        try {
            boolean success = venueSeatService.holdSeats(
                request.getEventScheduleId(),
                request.getSeatIds(),
                request.getUserId()
            );
            
            if (success) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Seats held successfully",
                    "expiresIn", 300 // 5 minutes in seconds
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "Failed to hold seats"
                ));
            }
        } catch (Exception e) {
            log.error("Error holding seats: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "success", false,
                    "message", "Error holding seats. Please try again."
                ));
        }
    }

    /**
     * Release seat holds manually
     * POST /api/venue-seats/release
     */
    @PostMapping("/release")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> releaseHolds(
            @org.springframework.web.bind.annotation.RequestParam UUID eventScheduleId,
            @RequestBody List<String> seatIds) {
        try {
            venueSeatService.releaseHolds(eventScheduleId, seatIds);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Holds released successfully"
            ));
        } catch (Exception e) {
            log.error("Error releasing holds: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "success", false,
                    "message", "Error releasing holds. Please try again."
                ));
        }
    }

    /**
     * Confirm booking (convert hold to booked)
     * POST /api/venue-seats/confirm
     */
    @PostMapping("/confirm")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> confirmBooking(
            @org.springframework.web.bind.annotation.RequestParam UUID eventScheduleId,
            @org.springframework.web.bind.annotation.RequestParam Long bookingRefId,
            @org.springframework.web.bind.annotation.RequestParam UUID userId,
            @RequestBody List<String> seatIds) {
        try {
            boolean success = venueSeatService.confirmBooking(eventScheduleId, seatIds, userId, bookingRefId);
            
            if (success) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Booking confirmed successfully"
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "Failed to confirm booking"
                ));
            }
        } catch (Exception e) {
            log.error("Error confirming booking: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "success", false,
                    "message", "Error confirming booking. Please try again."
                ));
        }
    }

    /**
     * Initialize seats for a new event schedule
     * POST /api/venue-seats/initialize/{eventScheduleId}
     */
    @PostMapping("/initialize/{eventScheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> initializeEventSeats(@PathVariable UUID eventScheduleId) {
        try {
            venueSeatService.initializeEventSeats(eventScheduleId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Event seats initialized successfully"
            ));
        } catch (Exception e) {
            log.error("Error initializing event seats: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "success", false,
                    "message", "Error initializing event seats. Please try again."
                ));
        }
    }
}

