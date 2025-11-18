package com.ticket.ticket_booking_system.controller.admin;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

import com.ticket.ticket_booking_system.dto.CreateOrganizerEmployeeRequest;
import com.ticket.ticket_booking_system.dto.OrganizerEmployeeDTO;
import com.ticket.ticket_booking_system.dto.UpdateOrganizerEmployeeRequest;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.service.OrganizerEmployeeManagementService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/organizer-employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ORGANIZER') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ORGANIZER')")
public class OrganizerEmployeeManagementController {

    private final OrganizerEmployeeManagementService employeeService;

    @GetMapping
    public ResponseEntity<Page<OrganizerEmployeeDTO>> getAllEmployees(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? 
                Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<OrganizerEmployeeDTO> employees = employeeService.getAllEmployees(pageable);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/by-organizer/{organizerId}")
    public ResponseEntity<Page<OrganizerEmployeeDTO>> getEmployeesByOrganizer(
            @PathVariable UUID organizerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<OrganizerEmployeeDTO> employees = employeeService.getEmployeesByOrganizer(organizerId, pageable);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<OrganizerEmployeeDTO> getEmployeeById(@PathVariable UUID employeeId) {
        OrganizerEmployeeDTO employee = employeeService.getEmployeeById(employeeId);
        return ResponseEntity.ok(employee);
    }

    @PostMapping
    public ResponseEntity<?> createEmployee(
            @Valid @RequestBody CreateOrganizerEmployeeRequest request,
            Authentication authentication) {
        try {
            // Get the admin ID from authentication if available
            UUID createdByAdminId = null;
            if (authentication.getPrincipal() instanceof Admin) {
                Admin admin = (Admin) authentication.getPrincipal();
                createdByAdminId = admin.getAdminId();
            }
            
            OrganizerEmployeeDTO employee = employeeService.createEmployee(request, createdByAdminId);
            return ResponseEntity.status(HttpStatus.CREATED).body(employee);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{employeeId}")
    public ResponseEntity<?> updateEmployee(
            @PathVariable UUID employeeId,
            @Valid @RequestBody UpdateOrganizerEmployeeRequest request) {
        try {
            OrganizerEmployeeDTO employee = employeeService.updateEmployee(employeeId, request);
            return ResponseEntity.ok(employee);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{employeeId}")
    public ResponseEntity<?> deleteEmployee(@PathVariable UUID employeeId) {
        try {
            employeeService.deleteEmployee(employeeId);
            return ResponseEntity.ok("Employee deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{employeeId}/restore")
    public ResponseEntity<?> restoreEmployee(@PathVariable UUID employeeId) {
        try {
            employeeService.restoreEmployee(employeeId);
            return ResponseEntity.ok("Employee restored successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/count")
    public ResponseEntity<Long> countActiveEmployees() {
        long count = employeeService.countActiveEmployees();
        return ResponseEntity.ok(count);
    }
}
