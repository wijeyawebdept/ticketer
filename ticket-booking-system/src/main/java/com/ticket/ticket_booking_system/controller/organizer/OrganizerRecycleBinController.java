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
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;

/**
 * Controller for organizers to manage their recycle bin items.
 * Organizers can view, restore, and permanently delete their own deleted items.
 */
@RestController
@RequestMapping("/api/organizer/recycle-bin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ORGANIZER') or hasAnyAuthority('ORGANIZER', 'ROLE_ORGANIZER')")
public class OrganizerRecycleBinController {

    private final RecycleBinService recycleBinService;
    private final OrganizerRepository organizerRepository;

    /**
     * Get all recycle bin items for the current organizer
     */
    @GetMapping
    public ResponseEntity<?> getAllRecycleBinItems(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByOrganizer(organizerId);
        return ResponseEntity.ok(items);
    }

    /**
     * Get recycle bin items by entity type (Event, Venue, etc.) for current organizer
     */
    @GetMapping("/type/{entityType}")
    public ResponseEntity<?> getRecycleBinItemsByType(
            @PathVariable String entityType,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByOrganizerAndType(organizerId, entityType);
        return ResponseEntity.ok(items);
    }

    /**
     * Get a specific recycle bin item by ID
     */
    @GetMapping("/{recycleId}")
    public ResponseEntity<?> getRecycleBinItem(
            @PathVariable UUID recycleId,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
        
        // Verify this item belongs to the current organizer
        if (item.getOrganizerId() == null || !item.getOrganizerId().equals(organizerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have permission to access this recycle bin item");
        }

        return ResponseEntity.ok(item);
    }

    /**
     * Restore an item from the recycle bin
     */
    @PostMapping("/{recycleId}/restore")
    public ResponseEntity<?> restoreItem(
            @PathVariable UUID recycleId,
            Authentication authentication) {
        try {
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer");
            }

            // Get item and verify ownership
            RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
            if (item.getOrganizerId() == null || !item.getOrganizerId().equals(organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to restore this item");
            }

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
    public ResponseEntity<?> permanentlyDelete(
            @PathVariable UUID recycleId,
            Authentication authentication) {
        try {
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Unable to identify organizer");
            }

            // Get item and verify ownership
            RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
            if (item.getOrganizerId() == null || !item.getOrganizerId().equals(organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to delete this item");
            }

            recycleBinService.permanentlyDelete(recycleId);
            return ResponseEntity.ok("Item permanently deleted from recycle bin");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Empty all items from the organizer's recycle bin
     */
    @DeleteMapping("/empty")
    public ResponseEntity<?> emptyRecycleBin(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        recycleBinService.emptyRecycleBinForOrganizer(organizerId);
        return ResponseEntity.ok("Recycle bin emptied successfully");
    }

    /**
     * Empty recycle bin items by type for the organizer
     */
    @DeleteMapping("/empty/type/{entityType}")
    public ResponseEntity<?> emptyRecycleBinByType(
            @PathVariable String entityType,
            Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer");
        }

        recycleBinService.emptyRecycleBinForOrganizerByType(organizerId, entityType);
        return ResponseEntity.ok("Recycle bin emptied for type: " + entityType);
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
