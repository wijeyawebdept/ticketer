package com.ticket.ticket_booking_system.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/events")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminEventController {

    // TODO: Implement event management controller methods
    // This will include:
    // - Create new event
    // - Get events with filters
    // - Update event details
    // - Delete/Cancel events
    // - Manage event status
    // - Get event bookings
    // - Get event revenue
}