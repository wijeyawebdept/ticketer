package com.ticket.ticket_booking_system.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ticket.ticket_booking_system.config.JwtService;
import com.ticket.ticket_booking_system.config.LoginSuccessHandler;
import com.ticket.ticket_booking_system.dto.request.LoginRequest;
import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.response.UserResponse;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.GoogleOAuthService;
import com.ticket.ticket_booking_system.service.UserService;

import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.service.EmailService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final GoogleOAuthService googleOAuthService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginSuccessHandler loginSuccessHandler;
    private final EmailService emailService;
    
    public AuthController(
            UserService userService, 
            AuthenticationManager authenticationManager, 
            JwtService jwtService,
            GoogleOAuthService googleOAuthService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            LoginSuccessHandler loginSuccessHandler,
            EmailService emailService) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.googleOAuthService = googleOAuthService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginSuccessHandler = loginSuccessHandler;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody UserCreateRequest request) {
        UserResponse createdUser = userService.createUser(request);
        return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> loginUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Authenticate the user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getEmail(),
                    loginRequest.getPassword()
                )
            );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            // Get user details
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            UserResponse user = userService.getUserByEmail(loginRequest.getEmail());
            
            // Update last login timestamp
            loginSuccessHandler.updateLastLogin(loginRequest.getEmail());
            
            // Generate JWT token
            String token = jwtService.generateToken(userDetails);
            
            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole(),
                "email", user.getEmail()
            ));
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.authentication.DisabledException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Account is disabled. Please contact administrator.");
            response.put("error_code", "USER_DISABLED");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Invalid email or password");
            response.put("error_code", "INVALID_CREDENTIALS");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
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
            // Authenticate the user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getEmail(),
                    loginRequest.getPassword()
                )
            );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            // Get user details
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            UserResponse user = userService.getUserByEmail(loginRequest.getEmail());
            
            // Check if user has ADMIN or SUPER_ADMIN role
            String userRole = user.getRole();
            if (!"ADMIN".equals(userRole) && !"SUPER_ADMIN".equals(userRole)) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Access denied. Only administrators can access the admin panel.");
                response.put("error_code", "INSUFFICIENT_PRIVILEGES");
                
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Update last login timestamp for Admin
            loginSuccessHandler.updateAdminLastLogin(loginRequest.getEmail());
            
            // Generate JWT token
            String token = jwtService.generateToken(userDetails);
            
            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Admin login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole(),
                "email", user.getEmail(),
                "isSuperAdmin", "SUPER_ADMIN".equals(userRole)
            ));
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.authentication.DisabledException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Account is disabled. Please contact administrator.");
            response.put("error_code", "USER_DISABLED");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Invalid email or password");
            response.put("error_code", "INVALID_CREDENTIALS");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
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
            // Authenticate the user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getEmail(),
                    loginRequest.getPassword()
                )
            );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            // Get user details
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            UserResponse user = userService.getUserByEmail(loginRequest.getEmail());
            
            // Check if user has ORGANIZER role
            String userRole = user.getRole();
            if (!"ORGANIZER".equals(userRole)) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Access denied. Only organizers can access the organizer panel.");
                response.put("error_code", "INSUFFICIENT_PRIVILEGES");
                
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Update last login timestamp for Organizer
            loginSuccessHandler.updateOrganizerLastLogin(loginRequest.getEmail());
            
            // Generate JWT token
            String token = jwtService.generateToken(userDetails);
            
            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Organizer login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole(),
                "email", user.getEmail()
            ));
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.authentication.DisabledException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Account is disabled. Please contact administrator.");
            response.put("error_code", "USER_DISABLED");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Invalid email or password");
            response.put("error_code", "INVALID_CREDENTIALS");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
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
            // Authenticate the user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getEmail(),
                    loginRequest.getPassword()
                )
            );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            // Get user details
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            UserResponse user = userService.getUserByEmail(loginRequest.getEmail());
            
            // Check if user has ORGANIZER_EMPLOYEE role
            String userRole = user.getRole();
            if (!"ORGANIZER_EMPLOYEE".equals(userRole)) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "error");
                response.put("message", "Access denied. Only organizer employees can access this panel.");
                response.put("error_code", "INSUFFICIENT_PRIVILEGES");
                
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Update last login timestamp for OrganizerEmployee
            loginSuccessHandler.updateOrganizerEmployeeLastLogin(loginRequest.getEmail());
            
            // Generate JWT token
            String token = jwtService.generateToken(userDetails);
            
            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Organizer employee login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole(),
                "email", user.getEmail()
            ));
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.authentication.DisabledException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Account is disabled. Please contact administrator.");
            response.put("error_code", "USER_DISABLED");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Invalid email or password");
            response.put("error_code", "INVALID_CREDENTIALS");
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
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