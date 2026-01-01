package com.ticket.ticket_booking_system.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.ProfileDTO;
import com.ticket.ticket_booking_system.dto.ProfileUpdateDTO;
import com.ticket.ticket_booking_system.service.ProfileService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    
    private final ProfileService profileService;
    
    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }
    
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ProfileDTO> getProfile(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();
        
        ProfileDTO profile = profileService.getProfileByEmail(email);
        return ResponseEntity.ok(profile);
    }
    
    @PutMapping
    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ProfileDTO> updateProfile(
            @Valid @RequestBody ProfileUpdateDTO profileUpdateDTO,
            Authentication authentication) {
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();
        
        ProfileDTO updatedProfile = profileService.updateProfile(email, profileUpdateDTO);
        return ResponseEntity.ok(updatedProfile);
    }
    
    @PostMapping("/upload-picture")
    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> uploadProfilePicture(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();
        
        String profilePictureUrl = profileService.uploadProfilePicture(email, file);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Profile picture uploaded successfully");
        response.put("profilePictureUrl", profilePictureUrl);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/change-password")
    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody Map<String, String> passwordData,
            Authentication authentication) {
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();
        
        String currentPassword = passwordData.get("currentPassword");
        String newPassword = passwordData.get("newPassword");
        
        if (currentPassword == null || currentPassword.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Current password is required");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        if (newPassword == null || newPassword.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "New password is required");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        try {
            profileService.changePassword(email, currentPassword, newPassword);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password changed successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    @PostMapping("/change-email")
    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> changeEmail(
            @RequestBody Map<String, String> emailData,
            Authentication authentication) {
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String currentEmail = userDetails.getUsername();
        
        String newEmail = emailData.get("newEmail");
        String password = emailData.get("password");
        
        if (newEmail == null || newEmail.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "New email is required");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        if (password == null || password.isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Password is required for verification");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        try {
            profileService.changeEmail(currentEmail, newEmail, password);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Email changed successfully. Please log in with your new email.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}