package com.ticket.ticket_booking_system.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.response.EventResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.service.EventService;
import com.ticket.ticket_booking_system.service.GateStaffAssignmentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/gate")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
@PreAuthorize("hasAnyRole('GATE_STAFF', 'ORGANIZER_EMPLOYEE', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ROLE_GATE_STAFF', 'ROLE_ORGANIZER_EMPLOYEE', 'ROLE_ORGANIZER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'GATE_STAFF', 'ORGANIZER_EMPLOYEE', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN')")
public class GateStaffPortalController {

    private final GateStaffAssignmentService assignmentService;
    private final EventService eventService;

    @GetMapping("/my-assignments")
    public ResponseEntity<List<EventResponse>> getMyAssignedEvents(Authentication authentication) {
        UUID userId = extractUserId(authentication);
        boolean isAdminOrSuperAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN") || a.getAuthority().contains("ORGANIZER"));

        if (isAdminOrSuperAdmin) {
            // Admins & Organizers can access all events
            List<EventResponse> allEvents = eventService.getAllEvents(Pageable.unpaged()).getContent();
            return ResponseEntity.ok(allEvents);
        }

        if (userId == null) {
            return ResponseEntity.ok(List.of());
        }

        List<EventResponse> assignedEvents = assignmentService.getAssignedEventsForStaff(userId);
        return ResponseEntity.ok(assignedEvents);
    }

    @GetMapping("/check-assignment")
    public ResponseEntity<Boolean> checkAssignment(
            @RequestParam UUID eventId,
            @RequestParam(required = false) UUID scheduleId,
            Authentication authentication) {
        boolean isAdminOrSuperAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN") || a.getAuthority().contains("ORGANIZER"));

        if (isAdminOrSuperAdmin) {
            return ResponseEntity.ok(true);
        }

        UUID userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.ok(false);
        }

        boolean assigned = assignmentService.isStaffAssigned(userId, eventId, scheduleId);
        return ResponseEntity.ok(assigned);
    }

    private UUID extractUserId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) return null;
        if (auth.getPrincipal() instanceof User) {
            return ((User) auth.getPrincipal()).getId();
        }
        if (auth.getPrincipal() instanceof Admin) {
            return ((Admin) auth.getPrincipal()).getAdminId();
        }
        if (auth.getPrincipal() instanceof Organizer) {
            return ((Organizer) auth.getPrincipal()).getOrganizerId();
        }
        if (auth.getPrincipal() instanceof OrganizerEmployee) {
            return ((OrganizerEmployee) auth.getPrincipal()).getEmployeeId();
        }
        if (auth.getPrincipal() instanceof com.ticket.ticket_booking_system.entity.GateStaff) {
            return ((com.ticket.ticket_booking_system.entity.GateStaff) auth.getPrincipal()).getGateStaffId();
        }
        return null;
    }
}
