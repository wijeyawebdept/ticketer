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

import com.ticket.ticket_booking_system.dto.request.OrganizerCreateRequest;
import com.ticket.ticket_booking_system.dto.request.OrganizerUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.OrganizerResponse;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Event;
import com.ticket.ticket_booking_system.entity.EventSchedule;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.EventRepository;
import com.ticket.ticket_booking_system.repository.EventScheduleRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.OrganizerManagementService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import jakarta.persistence.criteria.Predicate;

@Service
public class OrganizerManagementServiceImpl implements OrganizerManagementService {

    private final OrganizerRepository organizerRepository;
    private final UserRepository userRepository;     // Used by findAuthenticatedUser for soft-delete audit
    private final AdminRepository adminRepository;   // Used by findAuthenticatedUser for soft-delete audit
    private final OrganizerEmployeeRepository organizerEmployeeRepository;
    private final EventRepository eventRepository;
    private final EventScheduleRepository eventScheduleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecycleBinService recycleBinService;

    public OrganizerManagementServiceImpl(
            OrganizerRepository organizerRepository,
            UserRepository userRepository,
            AdminRepository adminRepository,
            OrganizerEmployeeRepository organizerEmployeeRepository,
            EventRepository eventRepository,
            EventScheduleRepository eventScheduleRepository,
            PasswordEncoder passwordEncoder,
            RecycleBinService recycleBinService) {
        this.organizerRepository = organizerRepository;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerEmployeeRepository = organizerEmployeeRepository;
        this.eventRepository = eventRepository;
        this.eventScheduleRepository = eventScheduleRepository;
        this.passwordEncoder = passwordEncoder;
        this.recycleBinService = recycleBinService;
    }

    @Override
    @Transactional
    public OrganizerResponse createOrganizer(OrganizerCreateRequest request) {
        // Only check email uniqueness within the organizer authentication domain.
        // Regular users (users table) can also register as organizers — the tables are completely separate.
        if (organizerRepository.existsByEmail(request.getEmail()) ||
            organizerEmployeeRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered as an organizer or organizer employee: " + request.getEmail());
        }

        // Create organizer entity
        Organizer organizer = Organizer.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .organizationName(request.getOrganizationName())
                .active(1)
                .emailVerified(false)
                .build();

        Organizer savedOrganizer = organizerRepository.save(organizer);
        System.out.println("Organizer created with ID: " + savedOrganizer.getOrganizerId() + ", Organization: " + savedOrganizer.getOrganizationName());

        return mapOrganizerToResponse(savedOrganizer);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrganizerResponse> getAllOrganizers(Pageable pageable) {
        Page<Organizer> organizers = organizerRepository.findByActiveNot(-1, pageable);
        return organizers.map(this::mapOrganizerToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrganizerResponse> searchOrganizers(String searchTerm, Integer active, Pageable pageable) {
        Specification<Organizer> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Search in firstName, lastName, email, and organizationName
            if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                String searchPattern = "%" + searchTerm.toLowerCase() + "%";
                Predicate firstNamePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("firstName")), searchPattern);
                Predicate lastNamePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("lastName")), searchPattern);
                Predicate emailPredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("email")), searchPattern);
                Predicate organizationPredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("organizationName")), searchPattern);
                
                predicates.add(criteriaBuilder.or(firstNamePredicate, lastNamePredicate, 
                        emailPredicate, organizationPredicate));
            }

            // Filter by active status
            if (active != null) {
                predicates.add(criteriaBuilder.equal(root.get("active"), active));
            } else {
                // Default: exclude soft-deleted organizers
                predicates.add(criteriaBuilder.notEqual(root.get("active"), -1));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<Organizer> organizers = organizerRepository.findAll(spec, pageable);
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
            // Only check uniqueness within the organizer domain
            if (!organizer.getEmail().equals(request.getEmail()) &&
                (organizerRepository.existsByEmail(request.getEmail()) ||
                 organizerEmployeeRepository.existsByEmail(request.getEmail()))) {
                throw new IllegalArgumentException("Email is already registered as an organizer or organizer employee: " + request.getEmail());
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

        System.out.println("=== SOFT DELETE ORGANIZER WITH CASCADE ===");
        System.out.println("Organizer ID: " + organizerId);
        System.out.println("Organizer Name: " + organizer.getFirstName() + " " + organizer.getLastName());
        
        // 1. Find and soft delete all employees of this organizer
        List<OrganizerEmployee> employees = organizerEmployeeRepository.findByOrganizer_OrganizerId(organizerId);
        System.out.println("Found " + employees.size() + " employees to soft delete");
        
        for (OrganizerEmployee employee : employees) {
            // Move each employee to recycle bin
            recycleBinService.moveToRecycleBin(
                "ORGANIZER_EMPLOYEE",
                employee.getEmployeeId(),
                employee.getFirstName() + " " + employee.getLastName(),
                employee,
                deletedBy,
                "Employee soft deleted due to organizer deletion"
            );
            
            // Soft delete - moved to recycle bin
            employee.setActive(-1);
            organizerEmployeeRepository.save(employee);
            System.out.println("Employee " + employee.getEmail() + " moved to recycle bin");
        }
        
        // 2. Find and soft delete all events of this organizer (with their schedules)
        List<Event> events = eventRepository.findByOrganizer_OrganizerId(organizerId);
        System.out.println("Found " + events.size() + " events to soft delete");
        
        for (Event event : events) {
            // First, move all schedules of this event to recycle bin
            List<EventSchedule> schedules = eventScheduleRepository.findByEvent_EventIdAndIsDeletedFalseOrderByScheduleDateAscStartTimeAsc(event.getEventId());
            for (EventSchedule schedule : schedules) {
                recycleBinService.moveToRecycleBin(
                    "SCHEDULE",
                    schedule.getScheduleId(),
                    event.getName() + " - " + schedule.getScheduleDate() + " " + schedule.getStartTime(),
                    schedule,
                    deletedBy,
                    "Schedule soft deleted due to organizer deletion"
                );
                schedule.setIsDeleted(true);
                eventScheduleRepository.save(schedule);
            }
            
            // Move each event to recycle bin
            recycleBinService.moveToRecycleBin(
                "EVENT",
                event.getEventId(),
                event.getName(),
                event,
                deletedBy,
                "Event soft deleted due to organizer deletion"
            );
            
            // Mark event as deleted - use active = -1
            event.setActive(-1);
            event.setIsDeleted(true);
            eventRepository.save(event);
            System.out.println("Event " + event.getName() + " and its schedules moved to recycle bin");
        }
        
        // 3. Finally, move organizer to recycle bin
        recycleBinService.moveToRecycleBin(
            "ORGANIZER",
            organizer.getOrganizerId(),
            organizer.getFirstName() + " " + organizer.getLastName(),
            organizer,
            deletedBy,
            "Organizer soft deleted by " + deletedBy.getEmail()
        );

        // Soft delete - moved to recycle bin
        organizer.setActive(-1);
        organizerRepository.save(organizer);

        System.out.println("Organizer " + organizer.getEmail() + " and all related entities moved to recycle bin by " + deletedBy.getEmail());
        System.out.println("=== SOFT DELETE CASCADE COMPLETE ===");
    }

    @Override
    @Transactional
    public OrganizerResponse toggleOrganizerStatus(UUID organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));

        organizer.setActive(organizer.getActive() == 1 ? 0 : 1); // Toggle between active (1) and deactivated (0)
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

    @Override
    @Transactional
    public OrganizerResponse activateOrganizer(UUID organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));
        
        // Activate the organizer
        organizer.setActive(1);
        Organizer updatedOrganizer = organizerRepository.save(organizer);
        
        // CASCADE: Activate all employees associated with this organizer
        List<OrganizerEmployee> employees = organizerEmployeeRepository.findByOrganizer_OrganizerId(organizerId);
        if (!employees.isEmpty()) {
            employees.forEach(employee -> employee.setActive(1));
            organizerEmployeeRepository.saveAll(employees);
            System.out.println("Activated " + employees.size() + " employees for organizer " + updatedOrganizer.getEmail());
        }
        
        System.out.println("Organizer " + updatedOrganizer.getEmail() + " activated");
        
        return mapOrganizerToResponse(updatedOrganizer);
    }
    
    @Override
    @Transactional
    public OrganizerResponse deactivateOrganizer(UUID organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer", "id", organizerId.toString()));
        
        // Deactivate the organizer
        organizer.setActive(0);
        Organizer updatedOrganizer = organizerRepository.save(organizer);
        
        // CASCADE: Deactivate all employees associated with this organizer
        List<OrganizerEmployee> employees = organizerEmployeeRepository.findByOrganizer_OrganizerId(organizerId);
        if (!employees.isEmpty()) {
            employees.forEach(employee -> employee.setActive(0));
            organizerEmployeeRepository.saveAll(employees);
            System.out.println("Deactivated " + employees.size() + " employees for organizer " + updatedOrganizer.getEmail());
        }
        
        System.out.println("Organizer " + updatedOrganizer.getEmail() + " deactivated");
        
        return mapOrganizerToResponse(updatedOrganizer);
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
                .dateOfBirth(organizer.getDateOfBirth())
                .active(organizer.isActive())
                .emailVerified(organizer.isEmailVerified())
                .createdAt(organizer.getCreatedAt())
                .lastLoginAt(organizer.getLastLoginAt())
                .updatedAt(organizer.getUpdatedAt())
                // Business info
                .organizationName(organizer.getOrganizationName())
                .businessRegistrationNumber(organizer.getBusinessRegistrationNumber())
                .taxId(organizer.getTaxId())
                .businessAddress(organizer.getBusinessAddress())
                .businessPhone(organizer.getBusinessPhone())
                // Banking
                .bankName(organizer.getBankName())
                .bankAccountNumber(organizer.getBankAccountNumber())
                .bankRoutingNumber(organizer.getBankRoutingNumber())
                .build();
    }
}
