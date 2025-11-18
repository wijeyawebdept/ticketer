package com.ticket.ticket_booking_system.controller.admin;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ticket.ticket_booking_system.dto.request.OrganizerCreateRequest;
import com.ticket.ticket_booking_system.dto.request.OrganizerUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.OrganizerResponse;
import com.ticket.ticket_booking_system.service.OrganizerManagementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/organizers")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAnyAuthority('ADMIN', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
public class OrganizerManagementController {

    private final OrganizerManagementService organizerManagementService;

    public OrganizerManagementController(OrganizerManagementService organizerManagementService) {
        this.organizerManagementService = organizerManagementService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<OrganizerResponse> createOrganizer(@Valid @RequestBody OrganizerCreateRequest request) {
        OrganizerResponse createdOrganizer = organizerManagementService.createOrganizer(request);
        return new ResponseEntity<>(createdOrganizer, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<Page<OrganizerResponse>> getAllOrganizers(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<OrganizerResponse> organizers = organizerManagementService.getAllOrganizers(pageable);
        return ResponseEntity.ok(organizers);
    }

    @GetMapping("/{organizerId}")
    public ResponseEntity<OrganizerResponse> getOrganizerById(@PathVariable UUID organizerId) {
        OrganizerResponse organizer = organizerManagementService.getOrganizerById(organizerId);
        return ResponseEntity.ok(organizer);
    }

    @PutMapping("/{organizerId}")
    public ResponseEntity<OrganizerResponse> updateOrganizer(
            @PathVariable UUID organizerId,
            @Valid @RequestBody OrganizerUpdateRequest request) {
        OrganizerResponse updatedOrganizer = organizerManagementService.updateOrganizer(organizerId, request);
        return ResponseEntity.ok(updatedOrganizer);
    }

    @DeleteMapping("/{organizerId}")
    public ResponseEntity<Void> deleteOrganizer(@PathVariable UUID organizerId) {
        organizerManagementService.softDeleteOrganizer(organizerId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{organizerId}/toggle-status")
    public ResponseEntity<OrganizerResponse> toggleOrganizerStatus(@PathVariable UUID organizerId) {
        OrganizerResponse organizer = organizerManagementService.toggleOrganizerStatus(organizerId);
        return ResponseEntity.ok(organizer);
    }
}
