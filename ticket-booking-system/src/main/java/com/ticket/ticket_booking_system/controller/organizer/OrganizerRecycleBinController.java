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
 * Controller for organizers to manage recycle bin items.
 * Recycle bin is standalone - all users can view and manage deleted items.
 */
@RestController
@RequestMapping("/api/organizer/recycle-bin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE') or hasAnyAuthority('ORGANIZER', 'ROLE_ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ROLE_ORGANIZER_EMPLOYEE')")
public class OrganizerRecycleBinController {

    private final RecycleBinService recycleBinService;

    /**
     * Get all recycle bin items
     */
    @GetMapping
    public ResponseEntity<List<RecycleBinDTO>> getAllRecycleBinItems() {
        List<RecycleBinDTO> items = recycleBinService.getAllRecycleBinItems();
        return ResponseEntity.ok(items);
    }

    /**
     * Get recycle bin items by entity type (Event, Venue, etc.)
     */
    @GetMapping("/type/{entityType}")
    public ResponseEntity<List<RecycleBinDTO>> getRecycleBinItemsByType(@PathVariable String entityType) {
        List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByType(entityType);
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
}
