package com.ticket.ticket_booking_system.controller.admin;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.AdminCreateRequest;
import com.ticket.ticket_booking_system.dto.request.AdminUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.AdminResponse;
import com.ticket.ticket_booking_system.security.AdminPermission;
import com.ticket.ticket_booking_system.security.SuperAdminOnly;
import com.ticket.ticket_booking_system.service.AdminManagementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/admins")
@AdminPermission
public class AdminManagementController {

    private final AdminManagementService adminManagementService;

    public AdminManagementController(AdminManagementService adminManagementService) {
        this.adminManagementService = adminManagementService;
    }

    @PostMapping
    @SuperAdminOnly
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<AdminResponse> createAdmin(@Valid @RequestBody AdminCreateRequest request) {
        AdminResponse createdAdmin = adminManagementService.createAdmin(request);
        return new ResponseEntity<>(createdAdmin, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<Page<AdminResponse>> getAllAdmins(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<AdminResponse> admins = adminManagementService.getAllAdmins(pageable);
        return ResponseEntity.ok(admins);
    }

    @GetMapping("/{adminId}")
    public ResponseEntity<AdminResponse> getAdminById(@PathVariable UUID adminId) {
        AdminResponse admin = adminManagementService.getAdminById(adminId);
        return ResponseEntity.ok(admin);
    }

    @PutMapping("/{adminId}")
    public ResponseEntity<AdminResponse> updateAdmin(
            @PathVariable UUID adminId,
            @Valid @RequestBody AdminUpdateRequest request) {
        AdminResponse updatedAdmin = adminManagementService.updateAdmin(adminId, request);
        return ResponseEntity.ok(updatedAdmin);
    }

    @DeleteMapping("/{adminId}")
    public ResponseEntity<Void> deleteAdmin(@PathVariable UUID adminId) {
        adminManagementService.softDeleteAdmin(adminId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{adminId}/toggle-status")
    @SuperAdminOnly
    public ResponseEntity<AdminResponse> toggleAdminStatus(@PathVariable UUID adminId) {
        AdminResponse admin = adminManagementService.toggleAdminStatus(adminId);
        return ResponseEntity.ok(admin);
    }
}
