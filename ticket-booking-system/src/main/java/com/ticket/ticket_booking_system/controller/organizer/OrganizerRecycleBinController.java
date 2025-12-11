package com.ticket.ticket_booking_system.controller.organizer;

import java.util.List;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.RecycleBinDTO;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;

/**
 * Controller for organizers to manage recycle bin items.
 * Organizers can only see items deleted by themselves or their employees.
 */
@RestController
@RequestMapping("/api/organizer/recycle-bin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ORGANIZER', 'ROLE_ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ORGANIZER_EMPLOYEE')")
public class OrganizerRecycleBinController {

    private final RecycleBinService recycleBinService;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;

    /**
     * Get all recycle bin items for current organizer and their employees
     */
    @GetMapping
    public ResponseEntity<List<RecycleBinDTO>> getAllRecycleBinItems(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsForOrganizer(organizerId);
        return ResponseEntity.ok(items);
    }

    /**
     * Get recycle bin items by entity type for current organizer and their employees
     */
    @GetMapping("/type/{entityType}")
    public ResponseEntity<List<RecycleBinDTO>> getRecycleBinItemsByType(
            @PathVariable String entityType,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByTypeForOrganizer(entityType, organizerId);
        return ResponseEntity.ok(items);
    }

    /**
     * Get a specific recycle bin item by ID
     */
    @GetMapping("/{recycleId}")
    public ResponseEntity<RecycleBinDTO> getRecycleBinItem(@PathVariable UUID recycleId) {
        RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
        return ResponseEntity.ok(item);
    }

    /**
     * Restore an item from the recycle bin
     */
    @PostMapping("/{recycleId}/restore")
    public ResponseEntity<?> restoreItem(@PathVariable UUID recycleId) {
        try {
            RecycleBinDTO restored = recycleBinService.restoreItem(recycleId);
            return ResponseEntity.ok(restored);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Permanently delete an item from the recycle bin
     */
    @DeleteMapping("/{recycleId}")
    public ResponseEntity<?> permanentlyDelete(@PathVariable UUID recycleId) {
        try {
            recycleBinService.permanentlyDelete(recycleId);
            return ResponseEntity.ok("Item permanently deleted from recycle bin");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Empty all items from the recycle bin
     */
    @DeleteMapping("/empty")
    public ResponseEntity<?> emptyRecycleBin() {
        recycleBinService.emptyRecycleBin();
        return ResponseEntity.ok("Recycle bin emptied successfully");
    }

    /**
     * Empty recycle bin items by type
     */
    @DeleteMapping("/empty/type/{entityType}")
    public ResponseEntity<?> emptyRecycleBinByType(@PathVariable String entityType) {
        recycleBinService.emptyRecycleBinByType(entityType);
        return ResponseEntity.ok("Recycle bin emptied for type: " + entityType);
    }

    /**
     * Helper method to get organizer ID from authentication
     * Works for both organizers and organizer employees
     */
    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }

        String email = authentication.getName();

        // First try to find as organizer
        return organizerRepository.findByEmail(email)
                .map(Organizer::getOrganizerId)
                .orElseGet(() -> {
                    // If not found as organizer, try as organizer employee
                    return organizerEmployeeRepository.findByEmail(email)
                            .map(employee -> employee.getOrganizer().getOrganizerId())
                            .orElse(null);
                });
    }
}
