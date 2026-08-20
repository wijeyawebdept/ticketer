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
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import lombok.RequiredArgsConstructor;

/**
 * Controller for organizers to manage recycle bin items.
 * Organizers can only see / restore / delete items that were deleted by themselves or their employees.
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
    public ResponseEntity<?> getAllRecycleBinItems(Authentication authentication) {
        try {
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                System.err.println("Failed to get organizer ID from authentication: " +
                    (authentication != null ? authentication.getName() : "null"));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer. Please ensure you are logged in correctly.");
            }

            List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsForOrganizer(organizerId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            System.err.println("Error fetching recycle bin items: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error fetching recycle bin items: " + e.getMessage());
        }
    }

    /**
     * Get recycle bin items by entity type for current organizer and their employees
     */
    @GetMapping("/type/{entityType}")
    public ResponseEntity<?> getRecycleBinItemsByType(
            @PathVariable String entityType,
            Authentication authentication) {
        try {
            UUID organizerId = getOrganizerIdFromAuth(authentication);
            if (organizerId == null) {
                System.err.println("Failed to get organizer ID from authentication for type query: " +
                    (authentication != null ? authentication.getName() : "null"));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer. Please ensure you are logged in correctly.");
            }

            List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByTypeForOrganizer(entityType, organizerId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            System.err.println("Error fetching recycle bin items by type: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error fetching recycle bin items: " + e.getMessage());
        }
    }

    /**
     * Get a specific recycle bin item by ID – scoped to the organizer's own items.
     */
    @GetMapping("/{recycleId}")
    public ResponseEntity<?> getRecycleBinItem(@PathVariable UUID recycleId, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer.");
        }
        try {
            RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
            if (!isItemOwnedByOrganizer(item, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to access this recycle bin item");
            }
            return ResponseEntity.ok(item);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Restore an item from the recycle bin – scoped to the organizer's own items.
     */
    @PostMapping("/{recycleId}/restore")
    public ResponseEntity<?> restoreItem(@PathVariable UUID recycleId, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer.");
        }
        try {
            // Ownership check before restore
            RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
            if (!isItemOwnedByOrganizer(item, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to restore this recycle bin item");
            }
            RecycleBinDTO restored = recycleBinService.restoreItem(recycleId);
            return ResponseEntity.ok(restored);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Permanently delete an item from the recycle bin – scoped to the organizer's own items.
     */
    @DeleteMapping("/{recycleId}")
    public ResponseEntity<?> permanentlyDelete(@PathVariable UUID recycleId, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer.");
        }
        try {
            // Ownership check before permanent deletion
            RecycleBinDTO item = recycleBinService.getRecycleBinItem(recycleId);
            if (!isItemOwnedByOrganizer(item, organizerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You do not have permission to delete this recycle bin item");
            }
            recycleBinService.permanentlyDelete(recycleId);
            return ResponseEntity.ok("Item permanently deleted from recycle bin");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Empty all of the current organizer's own recycle bin items.
     * Scoped: only deletes items owned by this organizer or their employees.
     */
    @DeleteMapping("/empty")
    public ResponseEntity<?> emptyMyRecycleBin(Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer.");
        }
        try {
            // Only empty this organizer's own items
            List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsForOrganizer(organizerId);
            for (RecycleBinDTO item : items) {
                try {
                    recycleBinService.permanentlyDelete(item.getRecycleId());
                } catch (Exception e) {
                    System.err.println("Could not permanently delete recycleId " + item.getRecycleId() + ": " + e.getMessage());
                }
            }
            return ResponseEntity.ok("Recycle bin emptied successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Empty recycle bin items of a specific type – scoped to this organizer.
     */
    @DeleteMapping("/empty/type/{entityType}")
    public ResponseEntity<?> emptyRecycleBinByType(@PathVariable String entityType, Authentication authentication) {
        UUID organizerId = getOrganizerIdFromAuth(authentication);
        if (organizerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unable to identify organizer.");
        }
        try {
            List<RecycleBinDTO> items = recycleBinService.getRecycleBinItemsByTypeForOrganizer(entityType, organizerId);
            for (RecycleBinDTO item : items) {
                try {
                    recycleBinService.permanentlyDelete(item.getRecycleId());
                } catch (Exception e) {
                    System.err.println("Could not permanently delete recycleId " + item.getRecycleId() + ": " + e.getMessage());
                }
            }
            return ResponseEntity.ok("Recycle bin emptied for type: " + entityType);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─────────────────── helpers ───────────────────

    /**
     * Helper method to get organizer ID from authentication
     * Works for both organizers and organizer employees
     */
    private UUID getOrganizerIdFromAuth(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            System.err.println("Authentication is null or has no name");
            return null;
        }

        String email = authentication.getName();
        System.out.println("Getting organizer ID for email: " + email);

        // First try to find as organizer
        UUID organizerId = organizerRepository.findByEmail(email)
                .map(organizer -> {
                    System.out.println("Found as organizer with ID: " + organizer.getOrganizerId());
                    return organizer.getOrganizerId();
                })
                .orElseGet(() -> {
                    // If not found as organizer, try as organizer employee
                    UUID empOrganizerId = organizerEmployeeRepository.findByEmail(email)
                            .map(employee -> {
                                if (employee.getOrganizer() == null) {
                                    System.err.println("Employee found but organizer is null for email: " + email);
                                    return null;
                                }
                                System.out.println("Found as organizer employee with organizer ID: " +
                                    employee.getOrganizer().getOrganizerId());
                                return employee.getOrganizer().getOrganizerId();
                            })
                            .orElse(null);

                    if (empOrganizerId == null) {
                        System.err.println("User not found as organizer or employee for email: " + email);
                    }
                    return empOrganizerId;
                });

        return organizerId;
    }

    /**
     * Returns true if the recycle bin item was deleted by the given organizer or one of their employees.
     */
    private boolean isItemOwnedByOrganizer(RecycleBinDTO item, UUID organizerId) {
        if (item.getDeletedBy() == null) return false;
        // Deleted directly by the organizer
        if (item.getDeletedBy().equals(organizerId)) return true;
        // Deleted by one of the organizer's employees
        return organizerEmployeeRepository.findById(item.getDeletedBy())
                .map(emp -> emp.getOrganizer() != null &&
                            emp.getOrganizer().getOrganizerId().equals(organizerId))
                .orElse(false);
    }
}
