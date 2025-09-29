package com.ticket.ticket_booking_system.controller.admin;

import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.request.UserUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.UserResponse;
import com.ticket.ticket_booking_system.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;
    
    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        UserResponse createdUser = userService.createUser(request);
        return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        
        Page<UserResponse> users;
        
        if (role != null && !role.isEmpty()) {
            users = userService.getUsersByRole(role, pageable);
        } else if (query != null && !query.isEmpty()) {
            users = userService.searchUsers(query, pageable);
        } else {
            users = userService.getAllUsers(pageable);
        }
        
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID userId) {
        UserResponse user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UserUpdateRequest request) {
        
        UserResponse updatedUser = userService.updateUser(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{userId}/toggle-status")
    public ResponseEntity<Map<String, String>> toggleUserStatus(@PathVariable UUID userId) {
        userService.toggleUserStatus(userId);
        return ResponseEntity.ok(Map.of("message", "User status toggled successfully"));
    }

    @PatchMapping("/{userId}/change-role")
    public ResponseEntity<Map<String, String>> changeUserRole(
            @PathVariable UUID userId,
            @RequestParam String role) {
        
        userService.changeUserRole(userId, role);
        return ResponseEntity.ok(Map.of("message", "User role updated successfully"));
    }
}