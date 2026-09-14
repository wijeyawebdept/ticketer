package com.ticket.ticket_booking_system.controller.admin;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.AssignGateStaffRequest;
import com.ticket.ticket_booking_system.dto.GateStaffAssignmentDTO;
import com.ticket.ticket_booking_system.dto.UpdateGateStaffAssignmentRequest;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.service.GateStaffAssignmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/gate-staff-assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER', 'ROLE_ORGANIZER_EMPLOYEE')")
public class AdminGateStaffAssignmentController {

    private final GateStaffAssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<List<GateStaffAssignmentDTO>> getAssignments(
            @RequestParam(required = false) UUID eventId,
            @RequestParam(required = false) UUID scheduleId,
            @RequestParam(required = false) UUID staffUserId) {
        if (scheduleId != null) {
            return ResponseEntity.ok(assignmentService.getAssignmentsBySchedule(scheduleId));
        }
        if (eventId != null) {
            return ResponseEntity.ok(assignmentService.getAssignmentsByEvent(eventId));
        }
        if (staffUserId != null) {
            return ResponseEntity.ok(assignmentService.getAssignmentsByStaff(staffUserId));
        }
        return ResponseEntity.ok(assignmentService.getAllActiveAssignments());
    }

    @PostMapping
    public ResponseEntity<List<GateStaffAssignmentDTO>> assignGateStaff(
            @Valid @RequestBody AssignGateStaffRequest request,
            Authentication authentication) {
        UUID assignedById = extractUserId(authentication);
        List<GateStaffAssignmentDTO> created = assignmentService.assignGateStaff(request, assignedById);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GateStaffAssignmentDTO> updateAssignment(
            @PathVariable UUID id,
            @RequestBody UpdateGateStaffAssignmentRequest request) {
        GateStaffAssignmentDTO updated = assignmentService.updateAssignment(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> removeAssignment(@PathVariable UUID id) {
        assignmentService.removeAssignment(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Assignment removed successfully"));
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
        return null;
    }
}
