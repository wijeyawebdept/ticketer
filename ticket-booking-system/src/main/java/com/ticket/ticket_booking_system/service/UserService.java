package com.ticket.ticket_booking_system.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.request.UserUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.UserResponse;

public interface UserService {
    
    UserResponse createUser(UserCreateRequest request);
    
    UserResponse getUserById(UUID id);
    
    UserResponse getUserByEmail(String email);
    
    Page<UserResponse> getAllUsers(Pageable pageable);
    
    Page<UserResponse> getUsersByRole(String role, Pageable pageable);
    
    Page<UserResponse> searchUsers(String query, Pageable pageable);
    
    UserResponse updateUser(UUID id, UserUpdateRequest request);
    
    void deleteUser(UUID id);
    
    void toggleUserStatus(UUID id);
    
    UserResponse activateUser(UUID id);
    
    UserResponse deactivateUser(UUID id);
    
    void changeUserRole(UUID id, String role);
    
    void resetPassword(UUID id, String newPassword);
    
    boolean isEmailExists(String email);
}