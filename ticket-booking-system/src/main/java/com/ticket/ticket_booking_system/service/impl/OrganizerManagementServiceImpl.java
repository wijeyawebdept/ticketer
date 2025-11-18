package com.ticket.ticket_booking_system.service.impl;

import com.ticket.ticket_booking_system.dto.request.OrganizerCreateRequest;
import com.ticket.ticket_booking_system.dto.request.OrganizerUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.OrganizerResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.OrganizerManagementService;
import com.ticket.ticket_booking_system.service.RecycleBinService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class OrganizerManagementServiceImpl implements OrganizerManagementService {

    private final OrganizerRepository organizerRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecycleBinService recycleBinService;

    public OrganizerManagementServiceImpl(
            OrganizerRepository organizerRepository,
            UserRepository userRepository,
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder,
            RecycleBinService recycleBinService) {
        this.organizerRepository = organizerRepository;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.recycleBinService = recycleBinService;
    }

    @Override
    @Transactional
    public OrganizerResponse createOrganizer(OrganizerCreateRequest request) {
        // Check if email already exists in any table
        if (userRepository.existsByEmail(request.getEmail()) ||
            adminRepository.existsByEmail(request.getEmail()) ||
            organizerRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use: " + request.getEmail());
        }

        // Create organizer entity
        Organizer organizer = Organizer.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .organizationName(request.getOrganizationName())
                .active(true)
                .emailVerified(false)
                .build();

        Organizer savedOrganizer = organizerRepository.save(organizer);
        System.out.println("Organizer created with ID: " + savedOrganizer.getOrganizerId() + ", Organization: " + savedOrganizer.getOrganizationName());

        return mapOrganizerToResponse(savedOrganizer);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrganizerResponse> getAllOrganizers(Pageable pageable) {
        Page<Organizer> organizers = organizerRepository.findByActiveTrue(pageable);
        return organizers.map(this::mapOrganizerToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizerResponse getOrganizerById(UUID organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));
        return mapOrganizerToResponse(organizer);
    }

    @Override
    @Transactional
    public OrganizerResponse updateOrganizer(UUID organizerId, OrganizerUpdateRequest request) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

        // Update fields if provided
        if (request.getFirstName() != null && !request.getFirstName().trim().isEmpty()) {
            organizer.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null && !request.getLastName().trim().isEmpty()) {
            organizer.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            // Check if new email is already in use by another organizer
            if (!organizer.getEmail().equals(request.getEmail()) &&
                (userRepository.existsByEmail(request.getEmail()) ||
                 adminRepository.existsByEmail(request.getEmail()) ||
                 organizerRepository.existsByEmail(request.getEmail()))) {
                throw new IllegalArgumentException("Email is already in use: " + request.getEmail());
            }
            organizer.setEmail(request.getEmail());
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            organizer.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().trim().isEmpty()) {
            organizer.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getOrganizationName() != null && !request.getOrganizationName().trim().isEmpty()) {
            organizer.setOrganizationName(request.getOrganizationName());
        }

        Organizer updatedOrganizer = organizerRepository.save(organizer);
        System.out.println("Organizer updated: " + updatedOrganizer.getOrganizerId());

        return mapOrganizerToResponse(updatedOrganizer);
    }

    @Override
    @Transactional
    public void softDeleteOrganizer(UUID organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

        // Get current authenticated user - check all tables
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication.getName();

        // Create a temporary User object for the authenticated user
        User deletedBy = findAuthenticatedUser(authenticatedEmail);

        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "ORGANIZER",
            organizer.getOrganizerId(),
            organizer.getFirstName() + " " + organizer.getLastName(),
            organizer,
            deletedBy,
            "Organizer soft deleted by " + deletedBy.getEmail()
        );

        // Deactivate the organizer instead of deleting
        organizer.setActive(false);
        organizerRepository.save(organizer);

        System.out.println("Organizer " + organizer.getEmail() + " moved to recycle bin by " + deletedBy.getEmail());
    }

    @Override
    @Transactional
    public OrganizerResponse toggleOrganizerStatus(UUID organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

        organizer.setActive(!organizer.isActive());
        Organizer updatedOrganizer = organizerRepository.save(organizer);

        System.out.println("Organizer " + updatedOrganizer.getEmail() + " status toggled to: " + updatedOrganizer.isActive());

        return mapOrganizerToResponse(updatedOrganizer);
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

    /**
     * Map Organizer entity to OrganizerResponse DTO
     */
    private OrganizerResponse mapOrganizerToResponse(Organizer organizer) {
        return OrganizerResponse.builder()
                .organizerId(organizer.getOrganizerId())
                .firstName(organizer.getFirstName())
                .lastName(organizer.getLastName())
                .email(organizer.getEmail())
                .phoneNumber(organizer.getPhoneNumber())
                .organizationName(organizer.getOrganizationName())
                .active(organizer.isActive())
                .emailVerified(organizer.isEmailVerified())
                .createdAt(organizer.getCreatedAt())
                .lastLoginAt(organizer.getLastLoginAt())
                .build();
    }
}
