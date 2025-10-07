package com.ticket.ticket_booking_system.controller.admin;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/venues")
@PreAuthorize("hasAnyRole('ADMIN') or hasAuthority('ADMIN') or hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminVenueController {

    // TODO: Implement venue management controller methods
    // This will include:
    // - Get all venues
    // - Get venue details
    // - Create new venue
    // - Update venue details
    // - Delete venue
    // - Get events by venue
}