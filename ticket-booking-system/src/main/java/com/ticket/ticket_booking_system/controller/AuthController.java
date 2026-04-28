package com.ticket.ticket_booking_system.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.config.JwtService;
import com.ticket.ticket_booking_system.config.LoginSuccessHandler;
import com.ticket.ticket_booking_system.dto.request.LoginRequest;
import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.response.UserResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.GoogleOAuthService;
import com.ticket.ticket_booking_system.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;

    private final JwtService jwtService;
    private final GoogleOAuthService googleOAuthService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginSuccessHandler loginSuccessHandler;
    private final EmailService emailService;
    
    public AuthController(
            UserService userService, 
            JwtService jwtService,
            GoogleOAuthService googleOAuthService,
            UserRepository userRepository,
            AdminRepository adminRepository,
            OrganizerRepository organizerRepository,
            OrganizerEmployeeRepository organizerEmployeeRepository,
            PasswordEncoder passwordEncoder,
            LoginSuccessHandler loginSuccessHandler,
            EmailService emailService) {
        this.userService = userService;

        this.jwtService = jwtService;
        this.googleOAuthService = googleOAuthService;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.organizerEmployeeRepository = organizerEmployeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginSuccessHandler = loginSuccessHandler;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody UserCreateRequest request) {
        UserResponse createdUser = userService.createUser(request);
        return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
    }

    @PostMapping("/send-verification")
    public ResponseEntity<Map<String, Object>> sendVerificationCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Email is required."));
        }
        try {
            userService.sendVerificationCode(email);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Verification code sent to " + email));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code  = body.get("code");
        if (email == null || code == null || email.isBlank() || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Email and code are required."));
        }
        try {
            userService.verifyEmail(email, code);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Email verified successfully! You can now sign in."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> loginUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Public portal: authenticate ONLY against the users (customers) table.
            // Admins, organizers, and organizer employees who share the same email must
            // use the restricted login portal. This means a staff member can have a
            // separate customer account under the same email and buy tickets normally.
            com.ticket.ticket_booking_system.entity.User user =
                    userRepository.findByEmail(loginRequest.getEmail()).orElse(null);

            if (user == null || !passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Invalid email or password");
                response.put("error_code", "INVALID_CREDENTIALS");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Block if account is inactive / soft-deleted
            if (!user.isEnabled()) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Account is disabled. Please contact administrator.");
                response.put("error_code", "USER_DISABLED");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Block login if email is not verified
            if (!user.isEmailVerified()) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Please verify your email before logging in. Check your inbox for the verification code.");
                response.put("error_code", "EMAIL_NOT_VERIFIED");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            try {
                if (user.isLoginEmailEnabled()) {
                    emailService.sendLoginNotificationEmail(user.getEmail(), user.getFirstName());
                }
            } catch (Exception emailEx) {
                logger.warn("Failed to send login notification email to {}: {}", user.getEmail(), emailEx.getMessage());
            }

            // Update last login timestamp
            loginSuccessHandler.updateLastLogin(loginRequest.getEmail());

            // Generate JWT token — User entity implements UserDetails (ROLE_USER authority)
            String token = jwtService.generateToken(user);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole().name(),
                "email", user.getEmail()
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Login failed: " + e.getMessage());
            response.put("error_code", "AUTHENTICATION_ERROR");
            response.put("error_details", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @PostMapping("/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Authenticate directly against the admins table — prevents users table (role=USER)
            // from shadowing an admin if both entries share the same email.
            Admin admin = adminRepository.findByEmail(loginRequest.getEmail())
                .orElse(null);

            if (admin == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Access denied. Only administrators can access the admin panel.");
                response.put("error_code", "INSUFFICIENT_PRIVILEGES");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            // Verify password against the admin's stored password
            if (!passwordEncoder.matches(loginRequest.getPassword(), admin.getPassword())) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Invalid email or password");
                response.put("error_code", "INVALID_CREDENTIALS");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Check account is active
            if (!admin.isEnabled()) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Account is disabled. Please contact administrator.");
                response.put("error_code", "USER_DISABLED");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Update last login timestamp for Admin
            loginSuccessHandler.updateAdminLastLogin(loginRequest.getEmail());

            // Generate JWT token using Admin as UserDetails
            String token = jwtService.generateToken(admin);

            String adminRole = admin.getRole().name();

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Admin login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", admin.getAdminId(),
                "firstName", admin.getFirstName(),
                "lastName", admin.getLastName(),
                "role", adminRole,
                "email", admin.getEmail(),
                "isSuperAdmin", "SUPER_ADMIN".equals(adminRole)
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Login failed: " + e.getMessage());
            response.put("error_code", "AUTHENTICATION_ERROR");
            response.put("error_details", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @PostMapping("/organizer/login")
    public ResponseEntity<Map<String, Object>> organizerLogin(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Authenticate directly against the organizers table — this prevents the
            // users table (role=USER) from shadowing an organizer who also has a customer account.
            Organizer organizer = organizerRepository.findByEmail(loginRequest.getEmail())
                .orElse(null);

            if (organizer == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Access denied. Only organizers can access the organizer panel.");
                response.put("error_code", "INSUFFICIENT_PRIVILEGES");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            // Verify password against the organizer's stored password
            if (!passwordEncoder.matches(loginRequest.getPassword(), organizer.getPassword())) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Invalid email or password");
                response.put("error_code", "INVALID_CREDENTIALS");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Check account is active
            if (!organizer.isEnabled()) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Account is disabled. Please contact administrator.");
                response.put("error_code", "USER_DISABLED");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Update last login timestamp for Organizer
            loginSuccessHandler.updateOrganizerLastLogin(loginRequest.getEmail());

            // Generate JWT token using Organizer as UserDetails (its getAuthorities() returns ROLE_ORGANIZER)
            String token = jwtService.generateToken(organizer);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Organizer login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", organizer.getOrganizerId(),
                "firstName", organizer.getFirstName(),
                "lastName", organizer.getLastName(),
                "role", "ORGANIZER",
                "email", organizer.getEmail()
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Login failed: " + e.getMessage());
            response.put("error_code", "AUTHENTICATION_ERROR");
            response.put("error_details", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @PostMapping("/organizer-employee/login")
    public ResponseEntity<Map<String, Object>> organizerEmployeeLogin(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Authenticate directly against the organizer_employees table — this prevents
            // the users table (role=USER) from shadowing an employee who also has a customer account.
            OrganizerEmployee employee = organizerEmployeeRepository.findByEmail(loginRequest.getEmail())
                .orElse(null);

            if (employee == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Access denied. Only organizer employees can access this panel.");
                response.put("error_code", "INSUFFICIENT_PRIVILEGES");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            // Verify password against the employee's stored password
            if (!passwordEncoder.matches(loginRequest.getPassword(), employee.getPassword())) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Invalid email or password");
                response.put("error_code", "INVALID_CREDENTIALS");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Check account is active
            if (!employee.isEnabled()) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Account is disabled. Please contact administrator.");
                response.put("error_code", "USER_DISABLED");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // Update last login timestamp for OrganizerEmployee
            loginSuccessHandler.updateOrganizerEmployeeLastLogin(loginRequest.getEmail());

            // Generate JWT token using OrganizerEmployee as UserDetails
            String token = jwtService.generateToken(employee);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Organizer employee login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", employee.getEmployeeId(),
                "firstName", employee.getFirstName(),
                "lastName", employee.getLastName(),
                "role", "ORGANIZER_EMPLOYEE",
                "email", employee.getEmail()
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Login failed: " + e.getMessage());
            response.put("error_code", "AUTHENTICATION_ERROR");
            response.put("error_details", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @PostMapping("/google-login")
    @Transactional
    public ResponseEntity<Map<String, Object>> googleLogin(@RequestBody com.ticket.ticket_booking_system.dto.request.GoogleLoginRequest request) {
        try {
            String idToken = request.getToken();
            if (idToken == null || idToken.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Google ID token is required");
                response.put("error_code", "MISSING_TOKEN");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            logger.info("Processing Google OAuth login (ID token flow)");
            // Verify Google ID token and extract user info
            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload = googleOAuthService.verifyGoogleToken(idToken);
            GoogleOAuthService.GoogleUserInfo googleUserInfo = new GoogleOAuthService.GoogleUserInfo(payload);
            if (!googleUserInfo.isEmailVerified()) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Email is not verified by Google");
                response.put("error_code", "EMAIL_NOT_VERIFIED");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            // User linking/creation logic
            com.ticket.ticket_booking_system.entity.User user = userRepository.findByGoogleId(googleUserInfo.getGoogleId())
                .orElse(null);
            if (user == null) {
                user = userRepository.findByEmail(googleUserInfo.getEmail())
                    .orElse(null);
                if (user != null) {
                    // Link Google account
                    user.setGoogleId(googleUserInfo.getGoogleId());
                    if (googleUserInfo.getPictureUrl() != null && !googleUserInfo.getPictureUrl().isEmpty()
                        && (user.getProfilePicture() == null || user.getProfilePicture().isEmpty())) {
                        user.setProfilePicture(googleUserInfo.getPictureUrl());
                    }
                    userRepository.save(user);
                } else {
                    // Create new user
                    // NOTE: googleId is intentionally NOT set in the builder to avoid a Lombok
                    // @Builder.Default + @AllArgsConstructor interaction where builder fields
                    // may not be persisted correctly on first em.persist() call.
                    // It is set explicitly via setter below before save.
                    user = com.ticket.ticket_booking_system.entity.User.builder()
                        .email(googleUserInfo.getEmail())
                        .firstName(googleUserInfo.getFirstName() != null && !googleUserInfo.getFirstName().isEmpty() ? googleUserInfo.getFirstName() : "User")
                        .lastName(googleUserInfo.getLastName() != null && !googleUserInfo.getLastName().isEmpty() ? googleUserInfo.getLastName() : "")
                        .role(com.ticket.ticket_booking_system.entity.User.Role.USER)
                        .active(1)
                        .emailVerified(true)
                        .profilePicture(googleUserInfo.getPictureUrl())
                        .password(passwordEncoder.encode(UUID.randomUUID().toString())) // Random password for OAuth users
                        .build();
                    user.setGoogleId(googleUserInfo.getGoogleId()); // Set explicitly to ensure it persists
                    user = userRepository.save(user);
                    // Send welcome email for new Google-registered users
                    try {
                        emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName());
                        logger.info("Welcome email sent to new Google user: {}", user.getEmail());
                    } catch (Exception emailEx) {
                        logger.warn("Failed to send welcome email for Google user {}: {}", user.getEmail(), emailEx.getMessage());
                    }
                }
            }
            if (user.getActive() != 1) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Account is disabled. Please contact administrator.");
                response.put("error_code", "USER_DISABLED");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            loginSuccessHandler.updateLastLogin(user.getEmail());

            // Send login notification email (fire-and-forget)
            try {
                if (user.isLoginEmailEnabled()) {
                    emailService.sendLoginNotificationEmail(user.getEmail(), user.getFirstName());
                }
            } catch (Exception emailEx) {
                logger.warn("Failed to send login notification email to {}: {}", user.getEmail(), emailEx.getMessage());
            }

            org.springframework.security.core.userdetails.User userDetails =
                new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPassword(),
                    user.getAuthorities()
                );
            String token = jwtService.generateToken(userDetails);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Google login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole().name(),
                "email", user.getEmail()
            ));
            logger.info("Google login successful for user: {}", user.getEmail());
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            logger.error("Security exception during Google login: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", e.getMessage());
            response.put("error_code", "SECURITY_ERROR");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (Exception e) {
            logger.error("Error during Google authentication: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Google authentication failed: " + e.getMessage());
            response.put("error_code", "AUTHENTICATION_ERROR");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }
        // Always return 200 to avoid exposing whether the email exists
        userService.forgotPassword(email.trim().toLowerCase());
        return ResponseEntity.ok(Map.of("message", "If an account with that email exists, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reset token is required."));
        }
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters."));
        }
        try {
            userService.resetPasswordWithToken(token.trim(), newPassword);
            return ResponseEntity.ok(Map.of("message", "Password has been reset successfully. You can now log in."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error resetting password: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred. Please try again."));
        }
    }
}