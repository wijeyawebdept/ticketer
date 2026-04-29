package com.ticket.ticket_booking_system.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.request.AdminCreateRequest;
import com.ticket.ticket_booking_system.dto.request.AdminUpdateRequest;
import com.ticket.ticket_booking_system.dto.request.BulkAdminOperationRequest;
import com.ticket.ticket_booking_system.dto.response.AdminResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.AdminManagementService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import jakarta.persistence.criteria.Predicate;

@Service
public class AdminManagementServiceImpl implements AdminManagementService {

    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final OrganizerRepository organizerRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecycleBinService recycleBinService;

    public AdminManagementServiceImpl(
            AdminRepository adminRepository,
            UserRepository userRepository,
            OrganizerRepository organizerRepository,
            PasswordEncoder passwordEncoder,
            RecycleBinService recycleBinService) {
        this.adminRepository = adminRepository;
        this.userRepository = userRepository;
        this.organizerRepository = organizerRepository;
        this.passwordEncoder = passwordEncoder;
        this.recycleBinService = recycleBinService;
    }

    @Override
    @Transactional
    public AdminResponse createAdmin(AdminCreateRequest request) {
        // Each role table is an independent authentication domain.
        // The same email is allowed across users/admins/organizers/organizer_employees.
        // Only block if the email already exists in the admins table itself.
        if (adminRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered as an admin: " + request.getEmail());
        }

        // Parse role enum
        Admin.Role role;
        try {
            role = Admin.Role.valueOf(request.getRole());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + request.getRole() + ". Must be ADMIN or SUPER_ADMIN");
        }

        // Create admin entity with appropriate permissions based on role
        Admin.AccessLevel accessLevel;
        Boolean canDeleteUsers;
        Boolean canModifySystemSettings;
        
        if (role == Admin.Role.SUPER_ADMIN) {
            // Super admins get full permissions
            accessLevel = Admin.AccessLevel.SUPER;
            canDeleteUsers = true;
            canModifySystemSettings = true;
        } else {
            // Regular admins get standard permissions
            accessLevel = Admin.AccessLevel.STANDARD;
            canDeleteUsers = false;
            canModifySystemSettings = false;
        }

        Admin admin = Admin.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .role(role)
                .accessLevel(accessLevel)
                .canDeleteUsers(canDeleteUsers)
                .canModifySystemSettings(canModifySystemSettings)
                .active(1)
                .emailVerified(false)
                .build();

        Admin savedAdmin = adminRepository.save(admin);
        System.out.println("Admin created with ID: " + savedAdmin.getAdminId() + ", Role: " + role + ", Access Level: " + accessLevel);

        return mapAdminToResponse(savedAdmin);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminResponse> searchAdmins(String searchTerm, Boolean active, Pageable pageable) {
        Specification<Admin> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Search in firstName, lastName, and email
            if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                String searchPattern = "%" + searchTerm.toLowerCase() + "%";
                Predicate firstNamePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("firstName")), searchPattern);
                Predicate lastNamePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("lastName")), searchPattern);
                Predicate emailPredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("email")), searchPattern);
                
                predicates.add(criteriaBuilder.or(firstNamePredicate, lastNamePredicate, emailPredicate));
            }

            // Filter by active status
            if (active != null) {
                int activeValue = active ? 1 : 0;
                predicates.add(criteriaBuilder.equal(root.get("active"), activeValue));
            } else {
                // Default: exclude soft-deleted admins
                predicates.add(criteriaBuilder.notEqual(root.get("active"), -1));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<Admin> admins = adminRepository.findAll(spec, pageable);
        return admins.map(this::mapAdminToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminResponse> getAllAdmins(Pageable pageable) {
        Page<Admin> admins = adminRepository.findByActiveNot(-1, pageable);
        return admins.map(this::mapAdminToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminResponse getAdminById(UUID adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));
        return mapAdminToResponse(admin);
    }

    @Override
    @Transactional
    public AdminResponse updateAdmin(UUID adminId, AdminUpdateRequest request) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));

        // Update fields if provided
        if (request.getFirstName() != null && !request.getFirstName().trim().isEmpty()) {
            admin.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null && !request.getLastName().trim().isEmpty()) {
            admin.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            // Only check uniqueness within the admins table
            if (!admin.getEmail().equals(request.getEmail()) &&
                adminRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email is already registered as an admin: " + request.getEmail());
            }
            admin.setEmail(request.getEmail());
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            admin.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().trim().isEmpty()) {
            admin.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            try {
                Admin.Role role = Admin.Role.valueOf(request.getRole());
                admin.setRole(role);
                
                // Automatically update permissions based on role
                if (role == Admin.Role.SUPER_ADMIN) {
                    admin.setAccessLevel(Admin.AccessLevel.SUPER);
                    admin.setCanDeleteUsers(true);
                    admin.setCanModifySystemSettings(true);
                } else {
                    // When downgrading from SUPER_ADMIN to ADMIN, set standard permissions
                    if (admin.getAccessLevel() == Admin.AccessLevel.SUPER) {
                        admin.setAccessLevel(Admin.AccessLevel.STANDARD);
                        admin.setCanDeleteUsers(false);
                        admin.setCanModifySystemSettings(false);
                    }
                }
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid role: " + request.getRole());
            }
        }

        Admin updatedAdmin = adminRepository.save(admin);
        System.out.println("Admin updated: " + updatedAdmin.getAdminId() + ", Role: " + updatedAdmin.getRole() + ", Access Level: " + updatedAdmin.getAccessLevel());

        return mapAdminToResponse(updatedAdmin);
    }

    @Override
    @Transactional
    public void softDeleteAdmin(UUID adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));

        // Get current authenticated user - check all tables
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication.getName();

        // Create a temporary User object for the authenticated user
        User deletedBy = findAuthenticatedUser(authenticatedEmail);

        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "ADMIN",
            admin.getAdminId(),
            admin.getFirstName() + " " + admin.getLastName(),
            admin,
            deletedBy,
            "Admin soft deleted by " + deletedBy.getEmail()
        );

        // Soft delete - moved to recycle bin
        admin.setActive(-1);
        adminRepository.save(admin);

        System.out.println("Admin " + admin.getEmail() + " moved to recycle bin by " + deletedBy.getEmail());
    }

    @Override
    @Transactional
    public AdminResponse toggleAdminStatus(UUID adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));

        admin.setActive(admin.getActive() == 1 ? 0 : 1); // Toggle between active (1) and deactivated (0)
        Admin updatedAdmin = adminRepository.save(admin);

        System.out.println("Admin " + updatedAdmin.getEmail() + " status toggled to: " + updatedAdmin.isActive());

        return mapAdminToResponse(updatedAdmin);
    }

    /**
     * Helper method to find authenticated user across all tables
     */
    private User findAuthenticatedUser(String email) {
        // Try users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            return user;
        }

        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            // Create temporary User object
            User tempUser = new User();
            tempUser.setId(admin.getAdminId());
            tempUser.setEmail(admin.getEmail());
            tempUser.setFirstName(admin.getFirstName());
            tempUser.setLastName(admin.getLastName());
            return tempUser;
        }

        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            // Create temporary User object
            User tempUser = new User();
            tempUser.setId(organizer.getOrganizerId());
            tempUser.setEmail(organizer.getEmail());
            tempUser.setFirstName(organizer.getFirstName());
            tempUser.setLastName(organizer.getLastName());
            return tempUser;
        }

        throw new IllegalStateException("Current authenticated user not found in any table");
    }

    @Override
    @Transactional
    public AdminResponse activateAdmin(UUID adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));
        
        admin.setActive(1);
        Admin updatedAdmin = adminRepository.save(admin);
        
        System.out.println("Admin " + updatedAdmin.getEmail() + " activated");
        
        return mapAdminToResponse(updatedAdmin);
    }
    
    @Override
    @Transactional
    public AdminResponse deactivateAdmin(UUID adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));
        
        admin.setActive(0);
        Admin updatedAdmin = adminRepository.save(admin);
        
        System.out.println("Admin " + updatedAdmin.getEmail() + " deactivated");
        
        return mapAdminToResponse(updatedAdmin);
    }

    @Override
    @Transactional
    public int bulkOperation(BulkAdminOperationRequest request) {
        int successCount = 0;
        
        for (UUID adminId : request.getAdminIds()) {
            try {
                Admin admin = adminRepository.findById(adminId)
                        .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId.toString()));
                
                switch (request.getOperation()) {
                    case ACTIVATE:
                        admin.setActive(1);
                        adminRepository.save(admin);
                        successCount++;
                        break;
                        
                    case DEACTIVATE:
                        admin.setActive(0);
                        adminRepository.save(admin);
                        successCount++;
                        break;
                        
                    case CHANGE_ROLE:
                        if (request.getNewRole() != null && !request.getNewRole().trim().isEmpty()) {
                            try {
                                Admin.Role newRole = Admin.Role.valueOf(request.getNewRole());
                                admin.setRole(newRole);
                                
                                // Update permissions based on role
                                if (newRole == Admin.Role.SUPER_ADMIN) {
                                    admin.setAccessLevel(Admin.AccessLevel.SUPER);
                                    admin.setCanDeleteUsers(true);
                                } else {
                                    admin.setAccessLevel(Admin.AccessLevel.STANDARD);
                                    admin.setCanDeleteUsers(false);
                                }
                                
                                adminRepository.save(admin);
                                successCount++;
                            } catch (IllegalArgumentException e) {
                                System.err.println("Invalid role for admin " + adminId + ": " + request.getNewRole());
                            }
                        }
                        break;
                        
                    case DELETE:
                        // Soft delete
                        admin.setActive(-1);
                        adminRepository.save(admin);
                        
                        // Note: Recycle bin entry will be created by the individual delete endpoint if needed
                        successCount++;
                        break;
                }
            } catch (Exception e) {
                System.err.println("Error processing admin " + adminId + ": " + e.getMessage());
            }
        }
        
        return successCount;
    }

    /**
     * Map Admin entity to AdminResponse DTO
     */
    private AdminResponse mapAdminToResponse(Admin admin) {
        return AdminResponse.builder()
                .adminId(admin.getAdminId())
                .firstName(admin.getFirstName())
                .lastName(admin.getLastName())
                .email(admin.getEmail())
                .phoneNumber(admin.getPhoneNumber())
                .role(admin.getRole().name())
                .active(admin.isActive())
                .emailVerified(admin.isEmailVerified())
                .dateOfBirth(admin.getDateOfBirth())
                .profilePicture(admin.getProfilePicture())
                .notes(admin.getNotes())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }
}
