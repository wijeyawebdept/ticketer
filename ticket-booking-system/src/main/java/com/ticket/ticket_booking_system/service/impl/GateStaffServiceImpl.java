package com.ticket.ticket_booking_system.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.CreateGateStaffRequest;
import com.ticket.ticket_booking_system.dto.GateStaffDTO;
import com.ticket.ticket_booking_system.dto.UpdateGateStaffRequest;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.GateStaff;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.GateStaffAssignmentRepository;
import com.ticket.ticket_booking_system.repository.GateStaffRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.GateStaffService;
import com.ticket.ticket_booking_system.service.RecycleBinService;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class GateStaffServiceImpl implements GateStaffService {

    private final GateStaffRepository gateStaffRepository;
    private final GateStaffAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final RecycleBinService recycleBinService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<GateStaffDTO> getAllGateStaff() {
        List<GateStaff> staffList = gateStaffRepository.findByActive(1);
        return staffList.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GateStaffDTO> getGateStaffPage(Pageable pageable, String search, Integer active) {
        Specification<GateStaff> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            } else {
                // Exclude soft deleted (-1) by default
                predicates.add(cb.notEqual(root.get("active"), -1));
            }

            if (search != null && !search.trim().isEmpty()) {
                String searchLower = "%" + search.trim().toLowerCase() + "%";
                Predicate firstNamePred = cb.like(cb.lower(root.get("firstName")), searchLower);
                Predicate lastNamePred = cb.like(cb.lower(root.get("lastName")), searchLower);
                Predicate emailPred = cb.like(cb.lower(root.get("email")), searchLower);
                Predicate phonePred = cb.like(cb.lower(root.get("phoneNumber")), searchLower);
                predicates.add(cb.or(firstNamePred, lastNamePred, emailPred, phonePred));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<GateStaff> page = gateStaffRepository.findAll(spec, pageable);
        List<GateStaffDTO> dtos = page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList());
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public GateStaffDTO getGateStaffById(UUID id) {
        GateStaff staff = gateStaffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gate staff member not found with ID: " + id));
        return mapToDTO(staff);
    }

    @Override
    @Transactional
    public GateStaffDTO createGateStaff(CreateGateStaffRequest request) {
        if (gateStaffRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("A gate staff member with email " + request.getEmail() + " already exists.");
        }

        GateStaff staff = GateStaff.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .nic(request.getNic())
                .notes(request.getNotes())
                .role(GateStaff.Role.GATE_STAFF)
                .active(1)
                .emailVerified(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        GateStaff saved = gateStaffRepository.save(staff);
        log.info("Created new Gate Staff member: {} ({}) in gate_staff table", saved.getEmail(), saved.getGateStaffId());
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public GateStaffDTO updateGateStaff(UUID id, UpdateGateStaffRequest request) {
        GateStaff staff = gateStaffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gate staff member not found with ID: " + id));

        staff.setFirstName(request.getFirstName());
        staff.setLastName(request.getLastName());
        staff.setPhoneNumber(request.getPhoneNumber());
        staff.setNic(request.getNic());
        staff.setNotes(request.getNotes());
        staff.setUpdatedAt(LocalDateTime.now());

        if (request.getActive() != null) {
            staff.setActive(request.getActive());
        }

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            staff.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        GateStaff updated = gateStaffRepository.save(staff);
        log.info("Updated Gate Staff member: {}", updated.getGateStaffId());
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public void toggleGateStaffStatus(UUID id, int active) {
        GateStaff staff = gateStaffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gate staff member not found with ID: " + id));

        staff.setActive(active);
        staff.setUpdatedAt(LocalDateTime.now());
        gateStaffRepository.save(staff);
        log.info("Updated Gate Staff status to {}: {}", active, id);
    }

    @Override
    @Transactional
    public void deleteGateStaff(UUID id) {
        GateStaff staff = gateStaffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gate staff member not found with ID: " + id));

        // Get authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication != null ? authentication.getName() : "system@ticketer.lk";
        User deletedBy = findAuthenticatedUser(authenticatedEmail);

        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "GATE_STAFF",
            staff.getGateStaffId(),
            staff.getFirstName() + " " + staff.getLastName(),
            staff,
            deletedBy,
            "Gate Staff soft deleted by " + (deletedBy != null ? deletedBy.getEmail() : authenticatedEmail)
        );

        staff.setActive(-1); // Soft delete
        staff.setUpdatedAt(LocalDateTime.now());
        gateStaffRepository.save(staff);
        log.info("Soft deleted Gate Staff member and moved to recycle bin: {}", id);
    }

    private User findAuthenticatedUser(String email) {
        if (email == null || email.trim().isEmpty()) {
            User sysUser = new User();
            sysUser.setId(UUID.randomUUID());
            sysUser.setEmail("system@ticketer.lk");
            sysUser.setFirstName("System");
            sysUser.setLastName("Admin");
            return sysUser;
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            return user;
        }

        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            User tempUser = new User();
            tempUser.setId(admin.getAdminId());
            tempUser.setEmail(admin.getEmail());
            tempUser.setFirstName(admin.getFirstName());
            tempUser.setLastName(admin.getLastName());
            return tempUser;
        }

        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            User tempUser = new User();
            tempUser.setId(organizer.getOrganizerId());
            tempUser.setEmail(organizer.getEmail());
            tempUser.setFirstName(organizer.getFirstName());
            tempUser.setLastName(organizer.getLastName());
            return tempUser;
        }

        User fallback = new User();
        fallback.setId(UUID.randomUUID());
        fallback.setEmail(email);
        fallback.setFirstName("Admin");
        fallback.setLastName("User");
        return fallback;
    }

    private GateStaffDTO mapToDTO(GateStaff staff) {
        int assignmentsCount = 0;
        try {
            assignmentsCount = assignmentRepository.findByStaffUserId(staff.getGateStaffId()).size();
        } catch (Exception e) {
            // ignore if empty
        }

        return GateStaffDTO.builder()
                .id(staff.getGateStaffId())
                .firstName(staff.getFirstName())
                .lastName(staff.getLastName())
                .email(staff.getEmail())
                .phoneNumber(staff.getPhoneNumber())
                .nic(staff.getNic())
                .notes(staff.getNotes())
                .role("GATE_STAFF")
                .active(staff.getActive())
                .emailVerified(staff.isEmailVerified())
                .createdAt(staff.getCreatedAt())
                .lastLoginAt(staff.getLastLoginAt())
                .activeAssignmentsCount(assignmentsCount)
                .build();
    }
}
