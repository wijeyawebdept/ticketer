package com.ticket.ticket_booking_system.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.ticket.ticket_booking_system.dto.ProfileDTO;
import com.ticket.ticket_booking_system.dto.ProfileUpdateDTO;
import com.ticket.ticket_booking_system.dto.response.AuditLogResponse;
import com.ticket.ticket_booking_system.service.AdminAuditService;
import com.ticket.ticket_booking_system.service.ProfileService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {
    
    private final ProfileService profileService;
    private final AdminAuditService auditService;
    
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

    @PatchMapping("/login-email-preference")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> updateLoginEmailPreference(
            @RequestBody Map<String, Boolean> body,
            Authentication authentication) {

        Boolean enabled = body.get("loginEmailEnabled");
        if (enabled == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "loginEmailEnabled field is required");
            return ResponseEntity.badRequest().body(err);
        }

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();

        boolean updated = profileService.toggleLoginEmailPreference(email, enabled);
        Map<String, Object> response = new HashMap<>();
        response.put("loginEmailEnabled", updated);
        response.put("message", updated ? "Login email notifications enabled." : "Login email notifications disabled.");
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/notification-preferences")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> updateNotificationPreferences(
            @RequestBody Map<String, Boolean> body,
            Authentication authentication) {

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();

        boolean emailNotifications = body.getOrDefault("emailNotifications", true);
        boolean smsNotifications = body.getOrDefault("smsNotifications", false);
        boolean marketingEmails = body.getOrDefault("marketingEmails", false);

        profileService.updateNotificationPreferences(email, emailNotifications, smsNotifications, marketingEmails);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Notification preferences saved successfully.");
        response.put("emailNotifications", emailNotifications);
        response.put("smsNotifications", smsNotifications);
        response.put("marketingEmails", marketingEmails);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-email-otp")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> sendEmailOtp(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();
        profileService.sendEmailVerificationOtp(email);
        Map<String, String> resp = new HashMap<>();
        resp.put("message", "OTP sent to " + email + ". Valid for 10 minutes.");
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/verify-email-otp")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> verifyEmailOtp(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();
        String otp = body.get("otp");

        boolean verified = profileService.verifyEmailOtp(email, otp);
        Map<String, Object> resp = new HashMap<>();
        if (verified) {
            resp.put("verified", true);
            resp.put("message", "Email verified successfully!");
        } else {
            resp.put("verified", false);
            resp.put("message", "Invalid or expired OTP. Please try again.");
        }
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('USER', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getMyAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            Pageable pageable,
            Authentication authentication) {
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();
        ProfileDTO profile = profileService.getProfileByEmail(email);
        
        // Use the existing findByFilters but filter by userId too?
        // Wait, AdminAuditService doesn't have findByFiltersAndUser yet.
        // But for now, getAuditLogsByAdmin is fine.
        
        Page<AuditLogResponse> page = auditService.getAuditLogsByAdmin(profile.getUserId(), pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("data", page.getContent());
        response.put("currentPage", page.getNumber());
        response.put("totalItems", page.getTotalElements());
        response.put("totalPages", page.getTotalPages());

        return ResponseEntity.ok(response);
    }
}
