package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.entity.VenueSeat;
import com.ticket.ticket_booking_system.service.VenueSeatService;
import com.ticket.ticket_booking_system.dto.SeatAvailabilityResponse;

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
}
