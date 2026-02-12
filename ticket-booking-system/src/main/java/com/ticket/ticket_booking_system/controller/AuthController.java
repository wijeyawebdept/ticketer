package com.ticket.ticket_booking_system.controller;

import java.util.HashMap;
import java.util.Map;

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

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final GoogleOAuthService googleOAuthService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginSuccessHandler loginSuccessHandler;
    
    public AuthController(
            UserService userService, 
            AuthenticationManager authenticationManager, 
            JwtService jwtService,
            GoogleOAuthService googleOAuthService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            LoginSuccessHandler loginSuccessHandler) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.googleOAuthService = googleOAuthService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginSuccessHandler = loginSuccessHandler;
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
}