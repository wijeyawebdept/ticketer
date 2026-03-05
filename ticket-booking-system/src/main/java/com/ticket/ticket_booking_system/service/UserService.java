package com.ticket.ticket_booking_system.service;

import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.ticket.ticket_booking_system.dto.request.BulkUserOperationRequest;
import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.request.UserUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.UserDetailResponse;
import com.ticket.ticket_booking_system.dto.response.UserResponse;

public interface UserService {
    
    UserResponse createUser(UserCreateRequest request);
    
    UserResponse getUserById(UUID id);
    
    UserResponse getUserByEmail(String email);
    
    Page<UserResponse> getAllUsers(Pageable pageable);
    
    Page<UserResponse> getUsersByRole(String role, Pageable pageable);
    
    Page<UserResponse> searchUsers(String query, Pageable pageable);
    
    /**
     * Advanced search with multiple filters
     */
    Page<UserResponse> searchUsersAdvanced(String searchTerm, String role, Boolean active, Pageable pageable);
    
    /**
     * Get detailed user information including bookings and activity logs
     */
    UserDetailResponse getUserDetails(UUID id);
    
    UserResponse updateUser(UUID id, UserUpdateRequest request);
    
    void softDeleteUser(UUID id);
    
    void deleteUser(UUID id);
    
    void toggleUserStatus(UUID id);
    
    UserResponse activateUser(UUID id);
    
    UserResponse deactivateUser(UUID id);
    
    void changeUserRole(UUID id, String role);
    
    /**
     * Perform bulk operations on multiple users
     */
    Map<String, Object> bulkOperation(BulkUserOperationRequest request);
    
    void resetPassword(UUID id, String newPassword);

    /**
     * Initiates the forgot-password flow: generates a token and sends a reset email.
     */
    void forgotPassword(String email);

    /**
     * Validates the reset token and updates the user's password.
     */
    void resetPasswordWithToken(String token, String newPassword);

    boolean isEmailExists(String email);

    /**
     * Generates a 6-digit verification code, saves it, and emails it to the user.
     */
    void sendVerificationCode(String email);

    /**
     * Validates the verification code for the given email and marks the account as verified.
     */
    void verifyEmail(String email, String code);
}