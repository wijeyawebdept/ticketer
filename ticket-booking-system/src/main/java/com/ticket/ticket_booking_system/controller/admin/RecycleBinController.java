package com.ticket.ticket_booking_system.controller.admin;

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

@RestController
@RequestMapping("/api/admin/recycle-bin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class RecycleBinController {

    private final RecycleBinService recycleBinService;

    @GetMapping
    public ResponseEntity<List<RecycleBinDTO>> getAllRecycleBinItems() {
        List<RecycleBinDTO> items = recycleBinService.getAllRecycleBinItems();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/type/{entityType}")
    public ResponseEntity<List<RecycleBinDTO>> getRecycleBinItemsByType(@PathVariable String entityType) {
        List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByType(entityType);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{recycleId}")
    public ResponseEntity<RecycleBinDTO> getRecycleBinItem(@PathVariable UUID recycleId) {
        RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
        return ResponseEntity.ok(item);
    }

    @PostMapping("/{recycleId}/restore")
    public ResponseEntity<?> restoreItem(@PathVariable UUID recycleId) {
        try {
            RecycleBinDTO restored = recycleBinService.restoreItem(recycleId);
            return ResponseEntity.ok(restored);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{recycleId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN') or hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> permanentlyDelete(@PathVariable UUID recycleId) {
        try {
            recycleBinService.permanentlyDelete(recycleId);
            return ResponseEntity.ok("Item permanently deleted from recycle bin");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/empty")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN') or hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> emptyRecycleBin() {
        recycleBinService.emptyRecycleBin();
        return ResponseEntity.ok("Recycle bin emptied successfully");
    }

    @DeleteMapping("/empty/type/{entityType}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN') or hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<?> emptyRecycleBinByType(@PathVariable String entityType) {
        recycleBinService.emptyRecycleBinByType(entityType);
        return ResponseEntity.ok("Recycle bin emptied for type: " + entityType);
    }
}
