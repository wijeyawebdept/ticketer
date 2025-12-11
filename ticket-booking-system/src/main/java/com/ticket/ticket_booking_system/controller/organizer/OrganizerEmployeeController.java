package com.ticket.ticket_booking_system.controller.organizer;

import java.util.HashMap;
import java.util.Map;
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
import org.springframework.web.bind.annotation.PatchMapping;
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
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
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
    private final OrganizerEmployeeRepository employeeRepository;

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
    public ResponseEntity<?> getEmployeeById(
            @PathVariable UUID employeeId,
            Authentication authentication) {
        
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }
        
        // Verify employee belongs to current organizer
        if (!verifyEmployeeOwnership(employeeId, organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to access this employee");
        }
        
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
            
            // Create employee
            OrganizerEmployeeDTO employee = employeeService.createEmployee(request);
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
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer");
            }
            
            // Verify employee belongs to current organizer
            if (!verifyEmployeeOwnership(employeeId, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to update this employee");
            }
            
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
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer");
            }
            
            // Verify employee belongs to current organizer
            if (!verifyEmployeeOwnership(employeeId, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to delete this employee");
            }
            
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
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer");
            }
            
            // Verify employee belongs to current organizer
            if (!verifyEmployeeOwnership(employeeId, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to restore this employee");
            }
            
            employeeService.restoreEmployee(employeeId);
            return ResponseEntity.ok("Employee restored successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Activate an employee (set active = 1)
     */
    @PatchMapping("/{employeeId}/activate")
    public ResponseEntity<?> activateEmployee(
            @PathVariable UUID employeeId,
            Authentication authentication) {
        try {
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer");
            }
            
            // Verify employee belongs to current organizer
            if (!verifyEmployeeOwnership(employeeId, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to activate this employee");
            }
            
            OrganizerEmployeeDTO employee = employeeService.activateEmployee(employeeId);
            return ResponseEntity.ok(employee);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Deactivate an employee (set active = 0)
     */
    @PatchMapping("/{employeeId}/deactivate")
    public ResponseEntity<?> deactivateEmployee(
            @PathVariable UUID employeeId,
            Authentication authentication) {
        try {
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer");
            }
            
            // Verify employee belongs to current organizer
            if (!verifyEmployeeOwnership(employeeId, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to deactivate this employee");
            }
            
            OrganizerEmployeeDTO employee = employeeService.deactivateEmployee(employeeId);
            return ResponseEntity.ok(employee);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get count of active employees for the current organizer
     */
    @GetMapping("/count")
    public ResponseEntity<?> countMyActiveEmployees(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }
        
        long count = employeeRepository.countByOrganizer_OrganizerIdAndActiveTrue(organizerId);
        return ResponseEntity.ok(count);
    }

    /**
     * Get statistics about employees
     */
    @GetMapping("/statistics")
    public ResponseEntity<?> getEmployeeStatistics(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }
        
        long totalEmployees = employeeRepository.countByOrganizer_OrganizerId(organizerId);
        long activeEmployees = employeeRepository.countByOrganizer_OrganizerIdAndActiveTrue(organizerId);
        long inactiveEmployees = totalEmployees - activeEmployees;
        
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalEmployees", totalEmployees);
        statistics.put("activeEmployees", activeEmployees);
        statistics.put("inactiveEmployees", inactiveEmployees);
        
        return ResponseEntity.ok(statistics);
    }

    /**
     * Helper method to extract organizer ID from authentication
     * Supports both Organizer and OrganizerEmployee principals
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
        
        // Try to get from OrganizerEmployee principal
        if (authentication.getPrincipal() instanceof OrganizerEmployee) {
            OrganizerEmployee employee = (OrganizerEmployee) authentication.getPrincipal();
            return employee.getOrganizer() != null ? employee.getOrganizer().getOrganizerId() : null;
        }
        
        // Extract email from authentication principal (JWT token)
        String email = authentication.getName();
        if (email != null && !email.isEmpty()) {
            // Try organizer repository first
            UUID organizerId = organizerRepository.findByEmail(email)
                    .map(Organizer::getOrganizerId)
                    .orElse(null);
            if (organizerId != null) {
                return organizerId;
            }
            
            // Try employee repository and get their organizer's ID
            return employeeRepository.findByEmail(email)
                    .map(emp -> emp.getOrganizer() != null ? emp.getOrganizer().getOrganizerId() : null)
                    .orElse(null);
        }
        
        return null;
    }

    /**
     * Verify that an employee belongs to the specified organizer
     */
    private boolean verifyEmployeeOwnership(UUID employeeId, UUID organizerId) {
        return employeeRepository.findById(employeeId)
                .map(employee -> employee.getOrganizer() != null && 
                                 employee.getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }
}
