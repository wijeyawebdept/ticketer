package com.ticket.ticket_booking_system.controller.organizer;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.RecycleBinDTO;
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

    /**
     * Get all recycle bin items for the organizer
     * Note: In a production system, this should be filtered by organizer ID
     */
    @GetMapping
    public ResponseEntity<List<RecycleBinDTO>> getAllRecycleBinItems() {
        List<RecycleBinDTO> items = recycleBinService.getAllRecycleBinItems();
        // TODO: Filter by current organizer's ID
        return ResponseEntity.ok(items);
    }

    /**
     * Get recycle bin items by entity type (Event, Venue, etc.)
     */
    @GetMapping("/type/{entityType}")
    public ResponseEntity<List<RecycleBinDTO>> getRecycleBinItemsByType(@PathVariable String entityType) {
        List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByType(entityType);
        // TODO: Filter by current organizer's ID
        return ResponseEntity.ok(items);
    }

    /**
     * Get a specific recycle bin item by ID
     */
    @GetMapping("/{recycleId}")
    public ResponseEntity<RecycleBinDTO> getRecycleBinItem(@PathVariable UUID recycleId) {
        RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
        // TODO: Verify this item belongs to the current organizer
        return ResponseEntity.ok(item);
    }

    /**
     * Restore an item from the recycle bin
     */
    @PostMapping("/{recycleId}/restore")
    public ResponseEntity<?> restoreItem(@PathVariable UUID recycleId) {
        try {
            // TODO: Verify this item belongs to the current organizer before restoring
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
            // TODO: Verify this item belongs to the current organizer before deleting
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
    public ResponseEntity<?> emptyRecycleBin() {
        // TODO: Implement organizer-specific empty recycle bin
        // This should only delete items belonging to the current organizer
        recycleBinService.emptyRecycleBin();
        return ResponseEntity.ok("Recycle bin emptied successfully");
    }

    /**
     * Empty recycle bin items by type for the organizer
     */
    @DeleteMapping("/empty/type/{entityType}")
    public ResponseEntity<?> emptyRecycleBinByType(@PathVariable String entityType) {
        // TODO: Implement organizer-specific empty by type
        // This should only delete items of this type belonging to the current organizer
        recycleBinService.emptyRecycleBinByType(entityType);
        return ResponseEntity.ok("Recycle bin emptied for type: " + entityType);
    }
}
