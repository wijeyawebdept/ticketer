package com.ticket.ticket_booking_system.controller.admin;

import java.util.Map;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.dto.request.BulkUserOperationRequest;
import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.request.UserUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.UserDetailResponse;
import com.ticket.ticket_booking_system.dto.response.UserResponse;
import com.ticket.ticket_booking_system.security.AdminPermission;
import com.ticket.ticket_booking_system.security.Permissions;
import com.ticket.ticket_booking_system.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/users")
@AdminPermission
public class AdminUserController {

    private final UserService userService;
    
    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @AdminPermission(value = Permissions.MANAGE_USERS)
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        UserResponse createdUser = userService.createUser(request);
        return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
    }

    @GetMapping
    @AdminPermission(value = Permissions.VIEW_USERS)
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        
        Page<UserResponse> users;
        
        // Use advanced search if search parameter is provided with optional filters
        if (search != null && !search.trim().isEmpty()) {
            users = userService.searchUsersAdvanced(search, role, active, pageable);
        } else if (role != null && !role.isEmpty()) {
            users = userService.getUsersByRole(role, pageable);
        } else if (query != null && !query.isEmpty()) {
            users = userService.searchUsers(query, pageable);
        } else if (active != null) {
            // Filter by active status only
            users = userService.searchUsersAdvanced(null, null, active, pageable);
        } else {
            users = userService.getAllUsers(pageable);
        }
        
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{userId}")
    @AdminPermission(value = Permissions.VIEW_USERS)
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID userId) {
        UserResponse user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }
    
    /**
     * Get detailed user information including bookings and activity logs
     */
    @GetMapping("/{userId}/details")
    @AdminPermission(value = Permissions.VIEW_USERS)
    public ResponseEntity<UserDetailResponse> getUserDetails(@PathVariable UUID userId) {
        UserDetailResponse userDetails = userService.getUserDetails(userId);
        return ResponseEntity.ok(userDetails);
    }

    @PutMapping("/{userId}")
    @AdminPermission(value = Permissions.MANAGE_USERS)
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UserUpdateRequest request) {
        
        UserResponse updatedUser = userService.updateUser(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{userId}")
    @AdminPermission(value = Permissions.MANAGE_USERS)
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId) {
        userService.softDeleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}/permanent")
    @AdminPermission(value = Permissions.DELETE_USERS, accessLevel = "SENIOR", superAdminBypass = true)
    public ResponseEntity<Void> permanentlyDeleteUser(@PathVariable UUID userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{userId}/toggle-status")
    public ResponseEntity<Map<String, String>> toggleUserStatus(@PathVariable UUID userId) {
        userService.toggleUserStatus(userId);
        return ResponseEntity.ok(Map.of("message", "User status toggled successfully"));
    }
    
    @PatchMapping("/{userId}/activate")
    public ResponseEntity<UserResponse> activateUser(@PathVariable UUID userId) {
        UserResponse user = userService.activateUser(userId);
        return ResponseEntity.ok(user);
    }
    
    @PatchMapping("/{userId}/deactivate")
    public ResponseEntity<UserResponse> deactivateUser(@PathVariable UUID userId) {
        UserResponse user = userService.deactivateUser(userId);
        return ResponseEntity.ok(user);
    }

    @PatchMapping("/{userId}/change-role")
    public ResponseEntity<Map<String, String>> changeUserRole(
            @PathVariable UUID userId,
            @RequestParam String role) {
        
        userService.changeUserRole(userId, role);
        return ResponseEntity.ok(Map.of("message", "User role updated successfully"));
    }
    
    /**
     * Perform bulk operations on multiple users
     */
    @PostMapping("/bulk-operation")
    @AdminPermission(value = Permissions.MANAGE_USERS)
    public ResponseEntity<Map<String, Object>> bulkOperation(@Valid @RequestBody BulkUserOperationRequest request) {
        Map<String, Object> result = userService.bulkOperation(request);
        return ResponseEntity.ok(result);
    }
}