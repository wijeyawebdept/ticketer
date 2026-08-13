package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.EventReportDTO;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.EventReportService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class EventReportController {

    private final EventReportService eventReportService;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;

    /**
     * Get report for a specific event
     */
    @GetMapping("/events/{eventId}")
    public ResponseEntity<EventReportDTO> getEventReport(
            @PathVariable UUID eventId,
            @RequestParam(required = false) UUID scheduleId,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        EventReportDTO report = eventReportService.generateEventReport(eventId, scheduleId, organizerId);
        return ResponseEntity.ok(report);
    }

    /**
     * Get list of events available for reporting
     */
    @GetMapping("/events")
    public ResponseEntity<List<Map<String, Object>>> getReportableEvents(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        List<Map<String, Object>> events = eventReportService.getReportableEvents(organizerId);
        return ResponseEntity.ok(events);
    }

    /**
     * Helper method to extract organizer ID from authentication.
     * Returns null if caller is Admin / Super Admin (unrestricted access).
     */
    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null) {
            return null;
        }

        // Check if caller is Admin or Super Admin
        boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a -> 
            a.getAuthority().contains("ADMIN") || a.getAuthority().contains("SUPER_ADMIN"));
        
        if (isAdmin) {
            return null; // Admin has full access to all events
        }

        // Try to get from Organizer principal
        if (authentication.getPrincipal() instanceof Organizer) {
            Organizer organizer = (Organizer) authentication.getPrincipal();
            return organizer.getOrganizerId();
        }

        // Try to get from OrganizerEmployee principal
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee employee = (OrganizerEmployee) authentication.getPrincipal();
            return employee.getOrganizer() != null ? employee.getOrganizer().getOrganizerId() : null;
        }

        // Extract email from authentication principal
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            UUID orgId = organizerRepository.findByEmail(email)
                    .map(org -> org.getOrganizerId())
                    .orElse(null);
            if (orgId != null) {
                return orgId;
            }

            return employeeRepository.findByEmail(email)
                    .map(emp -> emp.getOrganizer() != null ? emp.getOrganizer().getOrganizerId() : null)
                    .orElse(null);
        }

        return null;
    }
}
