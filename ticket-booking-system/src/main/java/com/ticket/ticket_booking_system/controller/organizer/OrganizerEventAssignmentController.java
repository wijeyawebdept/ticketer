package com.ticket.ticket_booking_system.controller.organizer;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.AssignEmployeesToEventRequest;
import com.ticket.ticket_booking_system.dto.EventEmployeeAssignmentDTO;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.EventEmployeeAssignmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/organizer/event-assignments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ORGANIZER')")
public class OrganizerEventAssignmentController {

    private final EventEmployeeAssignmentService assignmentService;
    private final OrganizerRepository organizerRepository;
    private final EventRepository eventRepository;
    private final OrganizerEmployeeRepository employeeRepository;

    /**
     * Assign employees to an event
     */
    @PostMapping
    public ResponseEntity<List<EventEmployeeAssignmentDTO>> assignEmployeesToEvent(
            @Valid @RequestBody AssignEmployeesToEventRequest request) {
        UUID organizerId = getAuthenticatedOrganizerId();
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.assignEmployeesToEvent(organizerId, request);
        return new ResponseEntity<>(assignments, HttpStatus.CREATED);
    }

    /**
     * Remove employee from event
     */
    @DeleteMapping("/events/{eventId}/employees/{employeeId}")
    public ResponseEntity<Void> removeEmployeeFromEvent(
            @PathVariable UUID eventId,
            @PathVariable UUID employeeId) {
        UUID organizerId = getAuthenticatedOrganizerId();
        assignmentService.removeEmployeeFromEvent(organizerId, eventId, employeeId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all employees assigned to a specific event
     */
    @GetMapping("/events/{eventId}/employees")
    public ResponseEntity<?> getEmployeesForEvent(@PathVariable UUID eventId) {
        UUID organizerId = getAuthenticatedOrganizerId();
        if (!verifyEventOwnership(eventId, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view employees for this event");
        }
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.getEmployeesForEvent(eventId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get all events assigned to a specific employee
     */
    @GetMapping("/employees/{employeeId}/events")
    public ResponseEntity<?> getEventsForEmployee(@PathVariable UUID employeeId) {
        UUID organizerId = getAuthenticatedOrganizerId();
        if (!verifyEmployeeOwnership(employeeId, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to view this employee's events");
        }
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.getEventsForEmployee(employeeId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get all assignments for organizer
     */
    @GetMapping
    public ResponseEntity<List<EventEmployeeAssignmentDTO>> getAllAssignments() {
        UUID organizerId = getAuthenticatedOrganizerId();
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.getAllAssignmentsForOrganizer(organizerId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Update assignment details
     */
    @PatchMapping("/{assignmentId}")
    public ResponseEntity<EventEmployeeAssignmentDTO> updateAssignment(
            @PathVariable UUID assignmentId,
            @RequestParam(required = false) String roleDescription,
            @RequestParam(required = false) String notes) {
        UUID organizerId = getAuthenticatedOrganizerId();
        EventEmployeeAssignmentDTO updated = assignmentService.updateAssignment(
                organizerId, assignmentId, roleDescription, notes);
        return ResponseEntity.ok(updated);
    }

    private UUID getAuthenticatedOrganizerId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Organizer organizer = organizerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));
        return organizer.getOrganizerId();
    }

    private boolean verifyEventOwnership(UUID eventId, UUID organizerId) {
        return eventRepository.findById(eventId)
                .map(event -> event.getOrganizer() != null &&
                              event.getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }

    private boolean verifyEmployeeOwnership(UUID employeeId, UUID organizerId) {
        return employeeRepository.findById(employeeId)
                .map(employee -> employee.getOrganizer() != null &&
                                  employee.getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }
}
