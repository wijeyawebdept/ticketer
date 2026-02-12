package com.ticket.ticket_booking_system.controller.admin;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.SeatDTO;
import com.ticket.ticket_booking_system.entity.SeatHold;
import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.repository.BookingSeatRepository;
import com.ticket.ticket_booking_system.repository.SeatHoldRepository;
import com.ticket.ticket_booking_system.repository.VenueSeatRepository;
import com.ticket.ticket_booking_system.service.SeatWebSocketService;

import lombok.RequiredArgsConstructor;

/**
 * Admin controller for managing venue seats at the event schedule level.
 * Provides endpoints for releasing holds and unreserving booked seats.
 */
@RestController
@RequestMapping("/api/admin/venue-seats")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminVenueSeatController {

    private final SeatHoldRepository seatHoldRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final SeatWebSocketService webSocketService;

    /**
     * Get detailed seat information including hold/booking info
     */
    @GetMapping("/{eventScheduleId}/{seatId}")
    public ResponseEntity<SeatDTO> getSeatDetails(
            @PathVariable UUID eventScheduleId,
            @PathVariable String seatId) {
        
        VenueSeat venueSeat = venueSeatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Seat not found: " + seatId));
        
        // Check for active holds
        SeatHold hold = seatHoldRepository.findByVenueSeatIdAndScheduleId(seatId, eventScheduleId)
            .filter(h -> h.getIsPermanent() || h.getExpiresAt().isAfter(LocalDateTime.now()))
            .orElse(null);
        
        // Check for bookings
        boolean isBooked = bookingSeatRepository.isSeatBooked(seatId, eventScheduleId);
        
        // Build SeatDTO
        SeatDTO.SeatDTOBuilder builder = SeatDTO.builder()
            .seatId(venueSeat.getSeatId())
            .section(venueSeat.getSection())
            .rowLabel(venueSeat.getRowLabel())
            .seatNumber(venueSeat.getSeatNumber())
            .categoryName(venueSeat.getCategory().getCategoryName())
            .colorCode(venueSeat.getCategory().getColorCode())
            .xPosition(venueSeat.getXPosition())
            .yPosition(venueSeat.getYPosition())
            .isAisleSeat(venueSeat.getIsAisleSeat())
            .isAccessible(venueSeat.getIsAccessible())
            .currentPrice(venueSeat.getCategory().getBasePrice())
            .notes(venueSeat.getNotes());
        
        // Set status and hold info
        if (isBooked) {
            builder.status("BOOKED");
        } else if (hold != null) {
            builder.status("HELD")
                   .heldByUserId(hold.getUserId())
                   .holdExpiresAt(hold.getExpiresAt())
                   .holdCreatedAt(hold.getCreatedAt())
                   .isPermanentHold(hold.getIsPermanent());
            // Note: User lookup skipped due to userId type mismatch (Long vs UUID)
            // User details should be fetched separately if needed
        } else {
            String notes = venueSeat.getNotes() != null ? venueSeat.getNotes().toLowerCase() : "";
            if (notes.contains("[locked]")) {
                builder.status("LOCKED");
            } else if (notes.contains("[vip]")) {
                builder.status("VIP_RESERVED");
            } else {
                builder.status("AVAILABLE");
            }
        }
        
        return ResponseEntity.ok(builder.build());
    }

    /**
     * Admin force-release a seat hold
     */
    @DeleteMapping("/holds/{eventScheduleId}/{seatId}")
    public ResponseEntity<Map<String, String>> adminReleaseHold(
            @PathVariable UUID eventScheduleId,
            @PathVariable String seatId) {
        
        SeatHold hold = seatHoldRepository.findByVenueSeatIdAndScheduleId(seatId, eventScheduleId)
            .orElseThrow(() -> new RuntimeException("No hold found for seat: " + seatId));
        
        // Get user info before deleting
        Long userId = hold.getUserId();
        
        // Delete the hold
        seatHoldRepository.delete(hold);
        
        // Notify via WebSocket
        VenueSeat releasedSeat = venueSeatRepository.findById(seatId).orElse(null);
        if (releasedSeat != null) {
            // Create a minimal seat object for WebSocket notification
            com.ticket.ticket_booking_system.entity.Seat notificationSeat = new com.ticket.ticket_booking_system.entity.Seat();
            notificationSeat.setSection(releasedSeat.getSection());
            notificationSeat.setRowNumber(releasedSeat.getRowLabel());
            notificationSeat.setSeatNumber(String.valueOf(releasedSeat.getSeatNumber()));
            notificationSeat.setIsAvailable(true);
            notificationSeat.setIsBlocked(false);
            
            webSocketService.notifySeatUpdate(eventScheduleId, notificationSeat, "RELEASED");
        }
        
        return ResponseEntity.ok(Map.of(
            "message", "Hold released successfully for seat: " + seatId,
            "seatId", seatId,
            "releasedUserId", userId.toString()
        ));
    }

    /**
     * Admin unreserve/unbook a booked seat
     * This should be used with caution as it cancels a confirmed booking
     */
    @DeleteMapping("/bookings/{eventScheduleId}/{seatId}")
    public ResponseEntity<Map<String, String>> adminUnreserveSeat(
            @PathVariable UUID eventScheduleId,
            @PathVariable String seatId) {
        
        // Check if seat is actually booked
        if (!bookingSeatRepository.isSeatBooked(seatId, eventScheduleId)) {
            throw new RuntimeException("Seat is not booked: " + seatId);
        }
        
        // Delete the booking seat record
        bookingSeatRepository.deleteByVenueSeatIdAndScheduleId(seatId, eventScheduleId);
        
        // Notify via WebSocket
        VenueSeat unbookedSeat = venueSeatRepository.findById(seatId).orElse(null);
        if (unbookedSeat != null) {
            com.ticket.ticket_booking_system.entity.Seat notificationSeat = new com.ticket.ticket_booking_system.entity.Seat();
            notificationSeat.setSection(unbookedSeat.getSection());
            notificationSeat.setRowNumber(unbookedSeat.getRowLabel());
            notificationSeat.setSeatNumber(String.valueOf(unbookedSeat.getSeatNumber()));
            notificationSeat.setIsAvailable(true);
            notificationSeat.setIsBlocked(false);
            
            webSocketService.notifySeatUpdate(eventScheduleId, notificationSeat, "RELEASED");
        }
        
        return ResponseEntity.ok(Map.of(
            "message", "Booking removed successfully for seat: " + seatId,
            "seatId", seatId
        ));
    }
}
