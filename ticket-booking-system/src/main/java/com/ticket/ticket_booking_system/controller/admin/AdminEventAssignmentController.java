package com.ticket.ticket_booking_system.controller.admin;

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
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.service.impl.EventEmployeeAssignmentServiceImpl;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Admin controller for managing event-employee assignments
 * Admins and Super Admins can:
 * - Assign organizer employees to events (events created by admin or by organizers)
 * - Remove employee assignments from events
 * - Update assignment details
 * - View all assignments across the system
 */
@RestController
@RequestMapping("/api/admin/event-assignments")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminEventAssignmentController {

    private final EventEmployeeAssignmentServiceImpl assignmentService;
    private final AdminRepository adminRepository;

    /**
     * Assign employees to an event (Admin can assign to any event)
     */
    @PostMapping
    public ResponseEntity<List<EventEmployeeAssignmentDTO>> assignEmployeesToEvent(
            @Valid @RequestBody AssignEmployeesToEventRequest request) {
        UUID adminId = getAuthenticatedAdminId();
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.assignEmployeesToEventByAdmin(adminId, request);
        return new ResponseEntity<>(assignments, HttpStatus.CREATED);
    }

    /**
     * Remove employee from event (Admin can remove from any event)
     */
    @DeleteMapping("/events/{eventId}/employees/{employeeId}")
    public ResponseEntity<Void> removeEmployeeFromEvent(
            @PathVariable UUID eventId,
            @PathVariable UUID employeeId) {
        UUID adminId = getAuthenticatedAdminId();
        assignmentService.removeEmployeeFromEventByAdmin(adminId, eventId, employeeId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all employees assigned to a specific event
     */
    @GetMapping("/events/{eventId}/employees")
    public ResponseEntity<List<EventEmployeeAssignmentDTO>> getEmployeesForEvent(@PathVariable UUID eventId) {
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.getEmployeesForEvent(eventId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get all events assigned to a specific employee
     */
    @GetMapping("/employees/{employeeId}/events")
    public ResponseEntity<List<EventEmployeeAssignmentDTO>> getEventsForEmployee(@PathVariable UUID employeeId) {
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.getEventsForEmployee(employeeId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get all assignments for a specific organizer
     */
    @GetMapping("/organizers/{organizerId}")
    public ResponseEntity<List<EventEmployeeAssignmentDTO>> getAssignmentsForOrganizer(@PathVariable UUID organizerId) {
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.getAllAssignmentsForOrganizer(organizerId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Get all assignments across the entire system (Admin/Super Admin only)
     */
    @GetMapping
    public ResponseEntity<List<EventEmployeeAssignmentDTO>> getAllAssignments() {
        List<EventEmployeeAssignmentDTO> assignments = assignmentService.getAllAssignments();
        return ResponseEntity.ok(assignments);
    }

    /**
     * Update assignment details (Admin can update any assignment)
     */
    @PatchMapping("/{assignmentId}")
    public ResponseEntity<EventEmployeeAssignmentDTO> updateAssignment(
            @PathVariable UUID assignmentId,
            @RequestParam(required = false) String roleDescription,
            @RequestParam(required = false) String notes) {
        UUID adminId = getAuthenticatedAdminId();
        EventEmployeeAssignmentDTO updated = assignmentService.updateAssignmentByAdmin(
                adminId, assignmentId, roleDescription, notes);
        return ResponseEntity.ok(updated);
    }

    /**
     * Get authenticated admin ID from security context
     */
    private UUID getAuthenticatedAdminId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        return admin.getAdminId();
    }
}
