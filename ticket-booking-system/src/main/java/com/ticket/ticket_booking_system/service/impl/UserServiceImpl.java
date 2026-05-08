package com.ticket.ticket_booking_system.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.BulkUserOperationRequest;
import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.request.UserUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.UserDetailResponse;
import com.ticket.ticket_booking_system.dto.response.UserResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Booking;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.BookingRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.EmailService;
import com.ticket.ticket_booking_system.service.RecycleBinService;
import com.ticket.ticket_booking_system.service.UserService;

import jakarta.persistence.criteria.Predicate;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository employeeRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecycleBinService recycleBinService;
    private final EmailService emailService;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendUrl;

    public UserServiceImpl(
            UserRepository userRepository, 
            AdminRepository adminRepository,
            OrganizerRepository organizerRepository,
            OrganizerEmployeeRepository employeeRepository,
            BookingRepository bookingRepository,
            PasswordEncoder passwordEncoder,
            RecycleBinService recycleBinService,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.employeeRepository = employeeRepository;
        this.bookingRepository = bookingRepository;
        this.passwordEncoder = passwordEncoder;
        this.recycleBinService = recycleBinService;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        // Each role table is an independent authentication domain.
        // Only block if the email already exists in the users table itself.
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered as a user: " + request.getEmail());
        }

        // Determine role - use provided role or default to USER
        String roleName = (request.getRole() != null && !request.getRole().trim().isEmpty()) 
                ? request.getRole().toUpperCase() 
                : "USER";
        
        User.Role enumRole = User.Role.USER;
        
        try {
            enumRole = User.Role.valueOf(roleName);
        } catch (IllegalArgumentException e) {
            // If role doesn't exist as enum, use USER as default
            System.out.println("Role " + roleName + " not found in enum, defaulting to USER");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .dateOfBirth(request.getDateOfBirth())
                .profilePicture(request.getProfilePicture())
                .role(enumRole)
                .active(1)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);
        System.out.println("User created with ID: " + savedUser.getId() + ", Role: " + roleName);

        // Create corresponding Admin or Organizer record based on role
        createRoleSpecificRecord(savedUser, roleName);

        // Send email verification code so the user can activate their account
        if ("USER".equals(roleName)) {
            sendVerificationCode(savedUser.getEmail());
        }

        return mapUserToResponse(savedUser);
    }

    private void createRoleSpecificRecord(User user, String roleName) {
        System.out.println("ℹcreateRoleSpecificRecord called but no action needed - separate tables architecture");
    }

    @Override
    @Cacheable(value = "users", key = "#id")
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));
        return mapUserToResponse(user);
    }

    @Override
    @Cacheable(value = "users", key = "#email")
    public UserResponse getUserByEmail(String email) {
        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            return mapUserToResponse(user);
        }
        
        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            return mapAdminToResponse(admin);
        }
        
        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            return mapOrganizerToResponse(organizer);
        }
        
        // Check organizer employees table
        OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
        if (employee != null) {
            return mapEmployeeToResponse(employee);
        }
        
        throw new ResourceNotFoundException("User", "email", email);
    }

    @Override
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        // return all active and deactivated users (exclude soft-deleted ones with active = -1)
        return userRepository.findByActiveNot(-1, pageable)
                .map(this::mapUserToResponse);
    }

    @Override
    public Page<UserResponse> getUsersByRole(String role, Pageable pageable) {
        User.Role userRole;
        try {
            userRole = User.Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }

        return userRepository.findByRole(userRole, pageable)
                .map(this::mapUserToResponse);
    }

    @Override
    public Page<UserResponse> searchUsers(String query, Pageable pageable) {
        return userRepository
                .findByFirstNameContainingOrLastNameContainingOrEmailContaining(query, query, query, pageable)
                .map(this::mapUserToResponse);
    }

    @Override
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public UserResponse updateUser(UUID id, UserUpdateRequest request) {
        System.out.println("Starting user update for ID: " + id);
        System.out.println("Update request: " + request);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        // Only update fields that are provided
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }

        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }

        if (request.getEmail() != null && !user.getEmail().equals(request.getEmail())) {
            // Only check uniqueness within the users table
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email is already registered as a user: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
            user.setEmailVerified(false); // Reset email verification status
        }

        // FIX: Handle password updates with proper encoding
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            String rawPassword = request.getPassword();
            System.out.println("Raw password provided for update: " + rawPassword);

            String encodedPassword = passwordEncoder.encode(rawPassword);
            System.out.println("Password encoded successfully");

            // Verify the encoding works (for debugging)
            boolean matches = passwordEncoder.matches(rawPassword, encodedPassword);
            System.out.println("Password verification test: " + matches);

            user.setPassword(encodedPassword);
            System.out.println("Password updated for user: " + user.getEmail());
        }

        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        // Handle role updates
        String oldRoleName = user.getRole().name();
        String newRoleName = null;
        
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            try {
                newRoleName = request.getRole().toUpperCase();
                User.Role enumRole = User.Role.valueOf(newRoleName);
                user.setRole(enumRole);
                System.out.println("Role updated to: " + enumRole);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid role: " + request.getRole());
            }
        }

        User savedUser = userRepository.save(user);
        
        // Handle role-specific record changes if role was updated
        if (newRoleName != null && !oldRoleName.equals(newRoleName)) {
            handleRoleChange(savedUser, oldRoleName, newRoleName);
        }
        
        System.out.println("User update completed successfully");
        return mapUserToResponse(savedUser);
    }

    /**
     * No longer needed - Admin, Organizer, and User are completely separate tables.
     * Role changes between USER/ADMIN/ORGANIZER would require creating entries in different tables.
     */
    private void handleRoleChange(User user, String oldRoleName, String newRoleName) {
        System.out.println("Role change requested but not supported - separate tables architecture");
        System.out.println("Users table only contains USER role");
        System.out.println("To change roles, create a new entry in the target table (admins/organizers)");
        // After migration, this functionality is not supported
        // Users can only be USER role
        // To make someone an admin or organizer, create a new record in those tables
    }

    @Override
    @Transactional
    public void softDeleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));
        
        // Get current authenticated user - check all tables
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication.getName();
        
        // Try to find authenticated user in any of the tables
        User deletedBy = userRepository.findByEmail(authenticatedEmail).orElse(null);
        
        // If not found in users table, create a temporary User object for the recycle bin
        if (deletedBy == null) {
            // Check if it's an admin
            Admin admin = adminRepository.findByEmail(authenticatedEmail).orElse(null);
            if (admin != null) {
                // Create a temporary User object to pass to recycle bin
                deletedBy = new User();
                deletedBy.setId(admin.getAdminId());
                deletedBy.setEmail(admin.getEmail());
                deletedBy.setFirstName(admin.getFirstName());
                deletedBy.setLastName(admin.getLastName());
            } else {
                // Check if it's an organizer
                Organizer organizer = organizerRepository.findByEmail(authenticatedEmail).orElse(null);
                if (organizer != null) {
                    // Create a temporary User object to pass to recycle bin
                    deletedBy = new User();
                    deletedBy.setId(organizer.getOrganizerId());
                    deletedBy.setEmail(organizer.getEmail());
                    deletedBy.setFirstName(organizer.getFirstName());
                    deletedBy.setLastName(organizer.getLastName());
                } else {
                    throw new IllegalStateException("Current authenticated user not found in any table");
                }
            }
        }
        
        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "USER",
            user.getId(),
            user.getFirstName() + " " + user.getLastName(),
            user,
            deletedBy,
            "User soft deleted by " + deletedBy.getEmail()
        );
        
        // Soft delete - moved to recycle bin
        user.setActive(-1);
        userRepository.save(user);
        
        System.out.println("User " + user.getEmail() + " moved to recycle bin by " + deletedBy.getEmail());
    }

    @Override
    @Transactional
    public void deleteUser(UUID id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id.toString());
        }
        userRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void toggleUserStatus(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        user.setActive(user.getActive() == 1 ? 0 : 1); // Toggle between active (1) and deactivated (0)
        userRepository.save(user);
    }

    @Override
    @Transactional
    public UserResponse activateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        user.setActive(1); // Activate user
        User savedUser = userRepository.save(user);
        return mapUserToResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse deactivateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        user.setActive(0); // Deactivate user (can be reactivated)
        User savedUser = userRepository.save(user);
        return mapUserToResponse(savedUser);
    }

    @Override
    @Transactional
    public void changeUserRole(UUID id, String roleName) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        User.Role role;
        try {
            role = User.Role.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + roleName);
        }

        user.setRole(role);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void resetPassword(UUID id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void forgotPassword(String email, String roleHint) {
        String trimmedEmail = email.trim().toLowerCase();
        System.out.println("Processing forgotPassword request for: " + trimmedEmail + " (Hint: " + roleHint + ")");
        
        boolean processed = false;

        // 1. Priority based on roleHint
        if ("admin".equalsIgnoreCase(roleHint)) {
            // Try Admin table first
            processed = processAdminForgotPassword(trimmedEmail);
        } else if ("organizer".equalsIgnoreCase(roleHint)) {
            // Try Organizer or Employee first
            processed = processOrganizerForgotPassword(trimmedEmail);
            if (!processed) {
                processed = processEmployeeForgotPassword(trimmedEmail);
            }
        }

        // 2. Fallback search if not yet processed
        if (!processed) {
            // Check in order: Admin -> Organizer -> Employee -> User
            if (processAdminForgotPassword(trimmedEmail)) return;
            if (processOrganizerForgotPassword(trimmedEmail)) return;
            if (processEmployeeForgotPassword(trimmedEmail)) return;
            if (processUserForgotPassword(trimmedEmail)) return;
        }
    }

    private boolean processUserForgotPassword(String email) {
        return userRepository.findByEmail(email).map(user -> {
            System.out.println("Found user in USER table: " + user.getEmail());
            String token = UUID.randomUUID().toString();
            user.setResetPasswordToken(token);
            user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(24));
            userRepository.save(user);
            sendResetEmail(user.getEmail(), user.getFirstName(), token);
            return true;
        }).orElse(false);
    }

    private boolean processAdminForgotPassword(String email) {
        return adminRepository.findByEmail(email).map(admin -> {
            System.out.println("Found user in ADMIN table: " + admin.getEmail());
            String token = UUID.randomUUID().toString();
            admin.setResetPasswordToken(token);
            admin.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(24));
            adminRepository.save(admin);
            sendResetEmail(admin.getEmail(), admin.getFirstName(), token);
            return true;
        }).orElse(false);
    }

    private boolean processOrganizerForgotPassword(String email) {
        return organizerRepository.findByEmail(email).map(organizer -> {
            System.out.println("Found user in ORGANIZER table: " + organizer.getEmail());
            String token = UUID.randomUUID().toString();
            organizer.setResetPasswordToken(token);
            organizer.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(24));
            organizerRepository.save(organizer);
            sendResetEmail(organizer.getEmail(), organizer.getFirstName(), token);
            return true;
        }).orElse(false);
    }

    private boolean processEmployeeForgotPassword(String email) {
        return employeeRepository.findByEmail(email).map(employee -> {
            System.out.println("Found user in EMPLOYEE table: " + employee.getEmail());
            String token = UUID.randomUUID().toString();
            employee.setResetPasswordToken(token);
            employee.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(24));
            employeeRepository.save(employee);
            sendResetEmail(employee.getEmail(), employee.getFirstName(), token);
            return true;
        }).orElse(false);
    }

    private void sendResetEmail(String email, String firstName, String token) {
        System.out.println("Initiating email send to: " + email);
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(email, firstName, resetLink);
    }

    @Override
    @Transactional
    public void resetPasswordWithToken(String token, String newPassword) {
        String encodedPassword = passwordEncoder.encode(newPassword);
        boolean found = false;

        // Try Users
        Optional<User> userOpt = userRepository.findByResetPasswordToken(token);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            validateExpiry(user.getResetPasswordTokenExpiry());
            user.setPassword(encodedPassword);
            user.setResetPasswordToken(null);
            user.setResetPasswordTokenExpiry(null);
            userRepository.save(user);
            found = true;
        }

        if (!found) {
            // Try Admins
            Optional<Admin> adminOpt = adminRepository.findByResetPasswordToken(token);
            if (adminOpt.isPresent()) {
                Admin admin = adminOpt.get();
                validateExpiry(admin.getResetPasswordTokenExpiry());
                admin.setPassword(encodedPassword);
                admin.setResetPasswordToken(null);
                admin.setResetPasswordTokenExpiry(null);
                adminRepository.save(admin);
                found = true;
            }
        }

        if (!found) {
            // Try Organizers
            Optional<Organizer> organizerOpt = organizerRepository.findByResetPasswordToken(token);
            if (organizerOpt.isPresent()) {
                Organizer organizer = organizerOpt.get();
                validateExpiry(organizer.getResetPasswordTokenExpiry());
                organizer.setPassword(encodedPassword);
                organizer.setResetPasswordToken(null);
                organizer.setResetPasswordTokenExpiry(null);
                organizerRepository.save(organizer);
                found = true;
            }
        }

        if (!found) {
            // Try Organizer Employees
            Optional<OrganizerEmployee> employeeOpt = employeeRepository.findByResetPasswordToken(token);
            if (employeeOpt.isPresent()) {
                OrganizerEmployee employee = employeeOpt.get();
                validateExpiry(employee.getResetPasswordTokenExpiry());
                employee.setPassword(encodedPassword);
                employee.setResetPasswordToken(null);
                employee.setResetPasswordTokenExpiry(null);
                employeeRepository.save(employee);
                found = true;
            }
        }

        if (!found) {
            throw new IllegalArgumentException("Invalid or expired password reset link.");
        }
    }

    private void validateExpiry(LocalDateTime expiry) {
        if (expiry == null || expiry.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Password reset link has expired. Please request a new one.");
        }
    }

    @Override
    public void sendVerificationCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No account found for email: " + email));

        // Generate a random 6-digit code
        String code = String.format("%06d", new java.util.Random().nextInt(1_000_000));

        user.setEmailVerificationCode(code);
        user.setEmailVerificationCodeExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        emailService.sendEmailVerificationCode(user.getEmail(), user.getFirstName(), code);
    }

    @Override
    @Transactional
    public void verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No account found for this email."));

        if (user.isEmailVerified()) {
            return; // already verified
        }

        if (user.getEmailVerificationCode() == null || !user.getEmailVerificationCode().equals(code)) {
            throw new IllegalArgumentException("Invalid verification code. Please check the code and try again.");
        }

        if (user.getEmailVerificationCodeExpiry() == null ||
                user.getEmailVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Verification code has expired. Please request a new one.");
        }

        userRepository.verifyUserEmail(email);

        // Send welcome email now that verification is complete
        emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName());
    }

    @Override
    public boolean isEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    private UserResponse mapUserToResponse(User user) {
        String roleName = user.getRole().name();
        
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .password(user.getPassword())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .role(roleName)
                .active(user.isActive())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
    
    private UserResponse mapAdminToResponse(Admin admin) {
        return UserResponse.builder()
                .id(admin.getAdminId())
                .firstName(admin.getFirstName())
                .lastName(admin.getLastName())
                .email(admin.getEmail())
                .password(admin.getPassword())
                .phoneNumber(admin.getPhoneNumber())
                .dateOfBirth(admin.getDateOfBirth())
                .role(admin.getRole().name())
                .active(admin.isActive())
                .emailVerified(admin.isEmailVerified())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }
    
    private UserResponse mapOrganizerToResponse(Organizer organizer) {
        return UserResponse.builder()
                .id(organizer.getOrganizerId())
                .firstName(organizer.getFirstName())
                .lastName(organizer.getLastName())
                .email(organizer.getEmail())
                .password(organizer.getPassword())
                .phoneNumber(organizer.getPhoneNumber())
                .dateOfBirth(organizer.getDateOfBirth())
                .role(organizer.getRole().name())
                .active(organizer.isActive())
                .emailVerified(organizer.isEmailVerified())
                .createdAt(organizer.getCreatedAt())
                .lastLoginAt(organizer.getLastLoginAt())
                .build();
    }
    
    private UserResponse mapEmployeeToResponse(OrganizerEmployee employee) {
        return UserResponse.builder()
                .id(employee.getEmployeeId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .email(employee.getEmail())
                .password(employee.getPassword())
                .phoneNumber(employee.getPhoneNumber())
                .dateOfBirth(employee.getDateOfBirth())
                .role(employee.getRole().name())
                .active(employee.isActive())
                .emailVerified(employee.isEmailVerified())
                .createdAt(employee.getCreatedAt())
                .lastLoginAt(employee.getLastLoginAt())
                .build();
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsersAdvanced(String searchTerm, String role, Boolean active, Pageable pageable) {
        Specification<User> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Search term filter (searches in firstName, lastName, email, phoneNumber)
            if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                String searchPattern = "%" + searchTerm.toLowerCase() + "%";
                Predicate searchPredicate = criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("firstName")), searchPattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("lastName")), searchPattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), searchPattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("phoneNumber")), searchPattern)
                );
                predicates.add(searchPredicate);
            }
            
            // Role filter
            if (role != null && !role.trim().isEmpty()) {
                try {
                    User.Role enumRole = User.Role.valueOf(role.toUpperCase());
                    predicates.add(criteriaBuilder.equal(root.get("role"), enumRole));
                } catch (IllegalArgumentException e) {
                    // Invalid role, ignore this filter
                }
            }
            
            // Active status filter
            if (active != null) {
                predicates.add(criteriaBuilder.equal(root.get("active"), active ? 1 : 0));
            }
            
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
        
        Page<User> users = userRepository.findAll(spec, pageable);
        return users.map(this::mapUserToResponse);
    }
    
    @Override
    @Transactional(readOnly = true)
    public UserDetailResponse getUserDetails(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        
        // Get user bookings
        Page<Booking> bookingsPage = bookingRepository.findByUser(user, Pageable.ofSize(10));
        List<Booking> bookings = bookingsPage.getContent();
        
        // Map bookings to summary
        List<UserDetailResponse.BookingSummary> bookingSummaries = bookings.stream()
                .map(booking -> UserDetailResponse.BookingSummary.builder()
                        .bookingId(booking.getBookingId())
                        .eventName(booking.getEvent() != null ? booking.getEvent().getName() : "N/A")
                        .bookingDate(booking.getBookingTime())
                        .status(booking.getStatus().name())
                        .totalAmount(booking.getTotalAmount())
                        .ticketCount(booking.getBookingSeats() != null ? booking.getBookingSeats().size() : 0)
                        .build())
                .toList();
        
        // Create activity logs (simplified - you can expand this based on your audit log system)
        List<UserDetailResponse.ActivityLog> activityLogs = new ArrayList<>();
        activityLogs.add(UserDetailResponse.ActivityLog.builder()
                .action("ACCOUNT_CREATED")
                .timestamp(user.getCreatedAt())
                .description("User account was created")
                .build());
        
        if (user.getLastLoginAt() != null) {
            activityLogs.add(UserDetailResponse.ActivityLog.builder()
                    .action("LAST_LOGIN")
                    .timestamp(user.getLastLoginAt())
                    .description("User last logged in")
                    .build());
        }
        
        // Build detailed response
        return UserDetailResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .role(user.getRole().name())
                .active(user.isActive())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .totalBookings((int) bookingsPage.getTotalElements())
                .recentBookings(bookingSummaries)
                .activityLogs(activityLogs)
                .build();
    }
    
    @Override
    @Transactional
    public Map<String, Object> bulkOperation(BulkUserOperationRequest request) {
        List<UUID> successfulIds = new ArrayList<>();
        List<Map<String, String>> errors = new ArrayList<>();
        
        for (UUID userId : request.getUserIds()) {
            try {
                switch (request.getOperation()) {
                    case ACTIVATE:
                        activateUser(userId);
                        successfulIds.add(userId);
                        break;
                    case DEACTIVATE:
                        deactivateUser(userId);
                        successfulIds.add(userId);
                        break;
                    case CHANGE_ROLE:
                        if (request.getNewRole() == null || request.getNewRole().trim().isEmpty()) {
                            throw new IllegalArgumentException("New role is required for role change operation");
                        }
                        changeUserRole(userId, request.getNewRole());
                        successfulIds.add(userId);
                        break;
                    case DELETE:
                        softDeleteUser(userId);
                        successfulIds.add(userId);
                        break;
                    default:
                        throw new IllegalArgumentException("Unknown operation type: " + request.getOperation());
                }
            } catch (Exception e) {
                Map<String, String> error = new HashMap<>();
                error.put("userId", userId.toString());
                error.put("error", e.getMessage());
                errors.add(error);
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("successful", successfulIds.size());
        result.put("failed", errors.size());
        result.put("successfulIds", successfulIds);
        result.put("errors", errors);
        result.put("message", String.format("Bulk operation completed: %d successful, %d failed", 
                successfulIds.size(), errors.size()));
        
        return result;
    }
}