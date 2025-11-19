package com.ticket.ticket_booking_system.controller.organizer;

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
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.OrganizerEmployeeManagementService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Controller for organizers to manage their employees.
 * Allows organizers to create, view, update, and delete employee accounts.
 */
@RestController
@RequestMapping("/api/organizer/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ORGANIZER') or hasAnyAuthority('ORGANIZER', 'ROLE_ORGANIZER')")
public class OrganizerEmployeeController {

    private final OrganizerEmployeeManagementService employeeService;
    private final OrganizerRepository organizerRepository;

    /**
     * Get all employees for the current organizer
     */
    @GetMapping
    public ResponseEntity<Page<OrganizerEmployeeDTO>> getMyEmployees(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection,
            Authentication authentication) {
        
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? 
                Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        // Get organizer ID from authentication
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Page<OrganizerEmployeeDTO> employees = employeeService.getEmployeesByOrganizer(organizerId, pageable);
        return ResponseEntity.ok(employees);
    }

    /**
     * Get a specific employee by ID
     */
    @GetMapping("/{employeeId}")
    public ResponseEntity<OrganizerEmployeeDTO> getEmployeeById(
            @PathVariable UUID employeeId,
            Authentication authentication) {
        
        // TODO: Verify this employee belongs to the current organizer
        OrganizerEmployeeDTO employee = employeeService.getEmployeeById(employeeId);
        return ResponseEntity.ok(employee);
    }

    /**
     * Create a new employee under the current organizer
     */
    @PostMapping
    public ResponseEntity<?> createEmployee(
            @Valid @RequestBody CreateOrganizerEmployeeRequest request,
            Authentication authentication) {
        try {
            // Get organizer ID from authentication
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer from authentication");
            }
            
            // Set the organizer ID in the request
            request.setOrganizerId(organizerId);
            
            // Create employee (createdByAdminId is null for organizer-created employees)
            OrganizerEmployeeDTO employee = employeeService.createEmployee(request, null);
            return ResponseEntity.status(HttpStatus.CREATED).body(employee);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update an existing employee
     */
    @PutMapping("/{employeeId}")
    public ResponseEntity<?> updateEmployee(
            @PathVariable UUID employeeId,
            @Valid @RequestBody UpdateOrganizerEmployeeRequest request,
            Authentication authentication) {
        try {
            // TODO: Verify this employee belongs to the current organizer
            OrganizerEmployeeDTO employee = employeeService.updateEmployee(employeeId, request);
            return ResponseEntity.ok(employee);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete (soft delete) an employee
     */
    @DeleteMapping("/{employeeId}")
    public ResponseEntity<?> deleteEmployee(
            @PathVariable UUID employeeId,
            Authentication authentication) {
        try {
            // TODO: Verify this employee belongs to the current organizer
            employeeService.deleteEmployee(employeeId);
            return ResponseEntity.ok("Employee deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Restore a soft-deleted employee
     */
    @PostMapping("/{employeeId}/restore")
    public ResponseEntity<?> restoreEmployee(
            @PathVariable UUID employeeId,
            Authentication authentication) {
        try {
            // TODO: Verify this employee belongs to the current organizer
            employeeService.restoreEmployee(employeeId);
            return ResponseEntity.ok("Employee restored successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get count of active employees for the current organizer
     */
    @GetMapping("/count")
    public ResponseEntity<Long> countMyActiveEmployees(Authentication authentication) {
        // TODO: Implement organizer-specific count
        // For now, returns total count
        long count = employeeService.countActiveEmployees();
        return ResponseEntity.ok(count);
    }

    /**
     * Get statistics about employees
     */
    @GetMapping("/statistics")
    public ResponseEntity<?> getEmployeeStatistics(Authentication authentication) {
        // TODO: Implement employee statistics
        // This could include: total employees, active employees, inactive employees,
        // employees by position, etc.
        return ResponseEntity.ok("Employee statistics coming soon");
    }

    /**
     * Helper method to extract organizer ID from authentication
     */
    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        
        // Try to get from Organizer principal
        if (authentication.getPrincipal() instanceof Organizer) {
            Organizer organizer = (Organizer) authentication.getPrincipal();
            return organizer.getOrganizerId();
        }
        
        // Extract email from authentication principal (JWT token)
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            return organizerRepository.findByEmail(email)
                    .map(Organizer::getOrganizerId)
                    .orElse(null);
        }
        
        return null;
    }
}
