package com.ticket.ticket_booking_system.controller.admin;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/bookings")
@PreAuthorize("hasAnyRole('ADMIN') or hasAuthority('ADMIN') or hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminBookingController {

    // TODO: Implement booking management controller methods
    // This will include:
    // - Get all bookings with filters
    // - Get booking details
    // - Cancel booking
    // - Mark booking as attended
    // - Get booking tickets
    // - Export bookings to CSV/Excel
}