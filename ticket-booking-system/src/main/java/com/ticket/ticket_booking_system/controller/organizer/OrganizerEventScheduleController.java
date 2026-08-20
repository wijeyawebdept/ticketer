package com.ticket.ticket_booking_system.controller.organizer;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.EventScheduleRequest;
import com.ticket.ticket_booking_system.dto.response.EventScheduleResponse;
import com.ticket.ticket_booking_system.entity.EventSchedule.ScheduleStatus;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.EventScheduleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/organizer/events/{eventId}/schedules")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE')")
public class OrganizerEventScheduleController {

    private final EventScheduleService eventScheduleService;
    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;

    /**
     * Create a new schedule for an event
     */
    @PostMapping
    public ResponseEntity<?> createSchedule(
            @PathVariable UUID eventId,
            @Valid @RequestBody EventScheduleRequest request,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyEventOwnership(eventId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to create schedules for this event");
        }
        EventScheduleResponse response = eventScheduleService.createSchedule(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all schedules for an event
     */
    @GetMapping
    public ResponseEntity<?> getSchedulesForEvent(
            @PathVariable UUID eventId,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyEventOwnership(eventId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view schedules for this event");
        }
        List<EventScheduleResponse> schedules = eventScheduleService.getSchedulesForEvent(eventId);
        return ResponseEntity.ok(schedules);
    }

    /**
     * Get schedule by ID
     */
    @GetMapping("/{scheduleId}")
    public ResponseEntity<?> getScheduleById(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyScheduleOwnership(scheduleId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view this schedule");
        }
        EventScheduleResponse schedule = eventScheduleService.getScheduleById(scheduleId);
        return ResponseEntity.ok(schedule);
    }

    /**
     * Update a schedule
     */
    @PutMapping("/{scheduleId}")
    public ResponseEntity<?> updateSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            @Valid @RequestBody EventScheduleRequest request,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyScheduleOwnership(scheduleId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to update this schedule");
        }
        EventScheduleResponse response = eventScheduleService.updateSchedule(scheduleId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete a schedule (soft delete - move to recycle bin)
     */
    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<?> deleteSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyScheduleOwnership(scheduleId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to delete this schedule");
        }
        eventScheduleService.deleteSchedule(scheduleId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Restore a schedule from recycle bin
     */
    @PostMapping("/{scheduleId}/restore")
    public ResponseEntity<?> restoreSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyEventOwnership(eventId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to restore schedules for this event");
        }
        eventScheduleService.restoreSchedule(scheduleId);
        return ResponseEntity.ok().build();
    }

    /**
     * Permanently delete a schedule
     */
    @DeleteMapping("/{scheduleId}/permanent")
    public ResponseEntity<?> permanentlyDeleteSchedule(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyScheduleOwnership(scheduleId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to permanently delete this schedule");
        }
        eventScheduleService.permanentlyDeleteSchedule(scheduleId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Change schedule status
     */
    @PatchMapping("/{scheduleId}/status")
    public ResponseEntity<?> changeScheduleStatus(
            @PathVariable UUID eventId,
            @PathVariable UUID scheduleId,
            @RequestParam ScheduleStatus status,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyScheduleOwnership(scheduleId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to change the status of this schedule");
        }
        EventScheduleResponse response = eventScheduleService.changeScheduleStatus(scheduleId, status);
        return ResponseEntity.ok(response);
    }

    /**
     * Get schedules by date range
     */
    @GetMapping("/range")
    public ResponseEntity<?> getSchedulesByDateRange(
            @PathVariable UUID eventId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyEventOwnership(eventId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view schedules for this event");
        }
        List<EventScheduleResponse> schedules = eventScheduleService.getSchedulesByDateRange(eventId, startDate, endDate);
        return ResponseEntity.ok(schedules);
    }

    /**
     * Get total capacity across all schedules
     */
    @GetMapping("/total-capacity")
    public ResponseEntity<?> getTotalCapacity(@PathVariable UUID eventId, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyEventOwnership(eventId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view capacity for this event");
        }
        Integer totalCapacity = eventScheduleService.getTotalCapacityForEvent(eventId);
        return ResponseEntity.ok(totalCapacity);
    }

    /**
     * Get total available seats across all schedules
     */
    @GetMapping("/total-available")
    public ResponseEntity<?> getTotalAvailableSeats(@PathVariable UUID eventId, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (!isAdminAuth(authentication) && (organizerId == null || !verifyEventOwnership(eventId, organizerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view available seats for this event");
        }
        Integer totalAvailable = eventScheduleService.getTotalAvailableSeatsForEvent(eventId);
        return ResponseEntity.ok(totalAvailable);
    }

    // ─────────────────── helpers ───────────────────

    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null) return null;
        if (authentication.getPrincipal() instanceof Organizer) {
            return ((Organizer) authentication.getPrincipal()).getOrganizerId();
        }
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee emp = (OrganizerEmployee) authentication.getPrincipal();
            return emp.getOrganizer() != null ? emp.getOrganizer().getOrganizerId() : null;
        }
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            UUID id = organizerRepository.findByEmail(email)
                    .map(org -> org.getOrganizerId())
                    .orElse(null);
            if (id != null) return id;
            return employeeRepository.findByEmail(email)
                    .map(e -> e.getOrganizer() != null ? e.getOrganizer().getOrganizerId() : null)
                    .orElse(null);
        }
        return null;
    }

    private boolean isAdminAuth(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_SUPER_ADMIN")
                        || a.getAuthority().equals("ADMIN")
                        || a.getAuthority().equals("SUPER_ADMIN"));
    }

    private boolean verifyEventOwnership(UUID eventId, UUID organizerId) {
        return eventRepository.findById(eventId)
                .map(event -> event.getOrganizer() != null &&
                              event.getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }

    /**
     * Verify that a schedule (by scheduleId) belongs to the organizer via its parent event.
     * Falls back to event-level ownership when the schedule is soft-deleted (isDeleted=true).
     */
    private boolean verifyScheduleOwnership(UUID scheduleId, UUID organizerId) {
        return eventScheduleRepository.findById(scheduleId)
                .map(schedule -> schedule.getEvent() != null &&
                                 schedule.getEvent().getOrganizer() != null &&
                                 schedule.getEvent().getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }
}
