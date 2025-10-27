package com.ticket.ticket_booking_system.service.impl;

import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.UserCreateRequest;
import com.ticket.ticket_booking_system.dto.request.UserUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.UserResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.Role;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.RoleRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.RecycleBinService;
import com.ticket.ticket_booking_system.service.UserService;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecycleBinService recycleBinService;

    public UserServiceImpl(
            UserRepository userRepository, 
            RoleRepository roleRepository,
            AdminRepository adminRepository,
            OrganizerRepository organizerRepository,
            PasswordEncoder passwordEncoder,
            RecycleBinService recycleBinService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.passwordEncoder = passwordEncoder;
        this.recycleBinService = recycleBinService;
    }

    @Override
    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use: " + request.getEmail());
        }

        // Determine role - use provided role or default to USER
        String roleName = (request.getRole() != null && !request.getRole().trim().isEmpty()) 
                ? request.getRole().toUpperCase() 
                : "USER";
        
        // Try to find role entity from roles table
        Role roleEntity = roleRepository.findByRoleName(roleName).orElse(null);
        User.Role enumRole = User.Role.USER;
        
        try {
            enumRole = User.Role.valueOf(roleName);
        } catch (IllegalArgumentException e) {
            // If role doesn't exist as enum, use USER as default
            System.out.println("⚠️ Role " + roleName + " not found in enum, defaulting to USER");
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
                .roleEntity(roleEntity)
                .active(true)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);
        System.out.println("✅ User created with ID: " + savedUser.getId() + ", Role: " + roleName);

        // Create corresponding Admin or Organizer record based on role
        createRoleSpecificRecord(savedUser, roleName);

        return mapUserToResponse(savedUser);
    }

    /**
     * Creates Admin or Organizer record based on user role
     */
    private void createRoleSpecificRecord(User user, String roleName) {
        // Check if role is ADMIN or SUPER_ADMIN (both should create admin records)
        if ("ADMIN".equals(roleName) || "SUPER_ADMIN".equals(roleName) || roleName.contains("ADMIN")) {
            // Create Admin record
            boolean isSuperAdmin = "SUPER_ADMIN".equals(roleName);
            
            Admin admin = Admin.builder()
                    .user(user)
                    .accessLevel(isSuperAdmin ? Admin.AccessLevel.SUPER : Admin.AccessLevel.STANDARD)
                    .canDeleteUsers(isSuperAdmin)
                    .canModifySystemSettings(isSuperAdmin)
                    .position(isSuperAdmin ? "Super Administrator" : "Administrator")
                    .department("Administration")
                    .build();
            
            adminRepository.save(admin);
            System.out.println("✅ Admin record created for user: " + user.getEmail() + " with access level: " + admin.getAccessLevel());
            
        } else if ("ORGANIZER".equals(roleName) || roleName.contains("ORGANIZER")) {
            // Create Organizer record
            Organizer organizer = Organizer.builder()
                    .user(user)
                    .organizationName(user.getFirstName() + " " + user.getLastName())
                    .isVerified(false)
                    .isEmployee(false)
                    .canCreateEmployees(true)
                    .build();
            
            organizerRepository.save(organizer);
            System.out.println("✅ Organizer record created for user: " + user.getEmail());
        }
        // USER role doesn't need additional record
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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return mapUserToResponse(user);
    }

    @Override
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
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
        System.out.println("🔄 Starting user update for ID: " + id);
        System.out.println("📝 Update request: " + request);

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
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email is already in use: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
            user.setEmailVerified(false); // Reset email verification status
        }

        // FIX: Handle password updates with proper encoding
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            String rawPassword = request.getPassword();
            System.out.println("🔐 Raw password provided for update: " + rawPassword);

            String encodedPassword = passwordEncoder.encode(rawPassword);
            System.out.println("🔐 Password encoded successfully");

            // Verify the encoding works (for debugging)
            boolean matches = passwordEncoder.matches(rawPassword, encodedPassword);
            System.out.println("🔐 Password verification test: " + matches);

            user.setPassword(encodedPassword);
            System.out.println("🔐 Password updated for user: " + user.getEmail());
        }

        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        // Handle role updates
        String oldRoleName = (user.getRoleEntity() != null) ? user.getRoleEntity().getRoleName() : user.getRole().name();
        String newRoleName = null;
        
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            try {
                newRoleName = request.getRole().toUpperCase();
                
                // First, try to find the role in the roles table
                Role roleEntity = roleRepository.findByRoleName(newRoleName).orElse(null);
                
                if (roleEntity != null) {
                    // Use the role entity from the roles table
                    user.setRoleEntity(roleEntity);
                    System.out.println("🔄 Role entity updated to: " + roleEntity.getRoleName());
                } else {
                    // Fall back to enum if role not found in roles table
                    User.Role enumRole = User.Role.valueOf(newRoleName);
                    user.setRole(enumRole);
                    user.setRoleEntity(null);
                    System.out.println("🔄 Role enum updated to: " + enumRole);
                }
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid role: " + request.getRole());
            }
        }

        User savedUser = userRepository.save(user);
        
        // Handle role-specific record changes if role was updated
        if (newRoleName != null && !oldRoleName.equals(newRoleName)) {
            handleRoleChange(savedUser, oldRoleName, newRoleName);
        }
        
        System.out.println("✅ User update completed successfully");
        return mapUserToResponse(savedUser);
    }

    /**
     * Handles Admin/Organizer record changes when user role is updated
     */
    private void handleRoleChange(User user, String oldRoleName, String newRoleName) {
        System.out.println("🔄 Handling role change from " + oldRoleName + " to " + newRoleName);
        
        // Remove old role-specific record
        if (oldRoleName.contains("ADMIN") || oldRoleName.equals("SUPER_ADMIN")) {
            adminRepository.findByUser_Id(user.getId()).ifPresent(admin -> {
                adminRepository.delete(admin);
                System.out.println("🗑️ Deleted Admin record for user: " + user.getEmail());
            });
        } else if (oldRoleName.contains("ORGANIZER")) {
            organizerRepository.findByUser_Id(user.getId()).ifPresent(organizer -> {
                organizerRepository.delete(organizer);
                System.out.println("🗑️ Deleted Organizer record for user: " + user.getEmail());
            });
        }
        
        // Create new role-specific record
        createRoleSpecificRecord(user, newRoleName);
    }

    @Override
    @Transactional
    public void softDeleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));
        
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User deletedBy = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Current user not found"));
        
        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "USER",
            user.getId(),
            user.getFirstName() + " " + user.getLastName(),
            user,
            deletedBy,
            "User soft deleted by " + deletedBy.getEmail()
        );
        
        // Deactivate the user instead of deleting
        user.setActive(false);
        userRepository.save(user);
        
        System.out.println("✅ User " + user.getEmail() + " moved to recycle bin by " + deletedBy.getEmail());
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

        user.setActive(!user.isActive());
        userRepository.save(user);
    }

    @Override
    @Transactional
    public UserResponse activateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        user.setActive(true);
        User savedUser = userRepository.save(user);
        return mapUserToResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse deactivateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id.toString()));

        user.setActive(false);
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
    public boolean isEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    private UserResponse mapUserToResponse(User user) {
        // Use roleEntity if available, otherwise fall back to enum role
        String roleName = (user.getRoleEntity() != null) ? user.getRoleEntity().getRoleName() : user.getRole().name();
        
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .role(roleName)
                .active(user.isActive())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}