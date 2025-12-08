package com.ticket.ticket_booking_system.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.CreateOrganizerEmployeeRequest;
import com.ticket.ticket_booking_system.dto.OrganizerEmployeeDTO;
import com.ticket.ticket_booking_system.dto.UpdateOrganizerEmployeeRequest;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrganizerEmployeeManagementService {

    private final OrganizerEmployeeRepository employeeRepository;
    private final OrganizerRepository organizerRepository;
    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecycleBinService recycleBinService;

    @Transactional(readOnly = true)
    public Page<OrganizerEmployeeDTO> getAllEmployees(Pageable pageable) {
        return employeeRepository.findByActiveNot(-1, pageable)
                .map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public Page<OrganizerEmployeeDTO> getEmployeesByOrganizer(UUID organizerId, Pageable pageable) {
        return employeeRepository.findByOrganizer_OrganizerIdAndActiveTrue(organizerId, pageable)
                .map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public OrganizerEmployeeDTO getEmployeeById(UUID employeeId) {
        OrganizerEmployee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));
        return convertToDTO(employee);
    }

    @Transactional
    public OrganizerEmployeeDTO createEmployee(CreateOrganizerEmployeeRequest request) {
        // Check if email already exists
        if (employeeRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists: " + request.getEmail());
        }

        // Verify organizer exists
        Organizer organizer = organizerRepository.findById(request.getOrganizerId())
                .orElseThrow(() -> new RuntimeException("Organizer not found with id: " + request.getOrganizerId()));

        // Create employee
        OrganizerEmployee employee = OrganizerEmployee.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .dateOfBirth(request.getDateOfBirth())
                .role(OrganizerEmployee.Role.ORGANIZER_EMPLOYEE)
                .active(1)
                .emailVerified(false)
                .organizer(organizer)
                .employeePosition(request.getEmployeePosition())
                .department(request.getDepartment())
                .hireDate(request.getHireDate())
                .build();

        OrganizerEmployee savedEmployee = employeeRepository.save(employee);
        return convertToDTO(savedEmployee);
    }

    @Transactional
    public OrganizerEmployeeDTO updateEmployee(UUID employeeId, UpdateOrganizerEmployeeRequest request) {
        OrganizerEmployee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));

        // Update basic fields
        if (request.getFirstName() != null) {
            employee.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            employee.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(employee.getEmail())) {
            if (employeeRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already exists: " + request.getEmail());
            }
            employee.setEmail(request.getEmail());
        }
        if (request.getPhoneNumber() != null) {
            employee.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getDateOfBirth() != null) {
            employee.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getEmployeePosition() != null) {
            employee.setEmployeePosition(request.getEmployeePosition());
        }
        if (request.getDepartment() != null) {
            employee.setDepartment(request.getDepartment());
        }
        if (request.getHireDate() != null) {
            employee.setHireDate(request.getHireDate());
        }
        if (request.getActive() != null) {
            employee.setActive(request.getActive() ? 1 : 0);
        }

        // Update organizer if provided
        if (request.getOrganizerId() != null && !request.getOrganizerId().equals(employee.getOrganizer().getOrganizerId())) {
            Organizer newOrganizer = organizerRepository.findById(request.getOrganizerId())
                    .orElseThrow(() -> new RuntimeException("Organizer not found with id: " + request.getOrganizerId()));
            employee.setOrganizer(newOrganizer);
        }

        OrganizerEmployee updatedEmployee = employeeRepository.save(employee);
        return convertToDTO(updatedEmployee);
    }

    @Transactional
    public void deleteEmployee(UUID employeeId) {
        OrganizerEmployee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));
        
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String authenticatedEmail = authentication.getName();
        User deletedBy = findAuthenticatedUser(authenticatedEmail);
        
        // Move to recycle bin
        recycleBinService.moveToRecycleBin(
            "ORGANIZER_EMPLOYEE",
            employee.getEmployeeId(),
            employee.getFirstName() + " " + employee.getLastName(),
            employee,
            deletedBy,
            "Organizer Employee soft deleted by " + deletedBy.getEmail()
        );
        
        // Soft delete - moved to recycle bin
        employee.setActive(-1);
        employee.setUpdatedAt(LocalDateTime.now());
        employeeRepository.save(employee);
    }

    @Transactional
    public void restoreEmployee(UUID employeeId) {
        OrganizerEmployee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));
        
        employee.setActive(1); // Reactivate employee
        employee.setUpdatedAt(LocalDateTime.now());
        employeeRepository.save(employee);
    }

    @Transactional(readOnly = true)
    public long countActiveEmployees() {
        return employeeRepository.countByActiveTrue();
    }

    private User findAuthenticatedUser(String email) {
        // Check users table
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            return user;
        }
        
        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            // Convert Admin to User for recycle bin tracking
            return User.builder()
                    .id(admin.getAdminId())
                    .email(admin.getEmail())
                    .firstName(admin.getFirstName())
                    .lastName(admin.getLastName())
                    .build();
        }
        
        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            // Convert Organizer to User for recycle bin tracking
            return User.builder()
                    .id(organizer.getOrganizerId())
                    .email(organizer.getEmail())
                    .firstName(organizer.getFirstName())
                    .lastName(organizer.getLastName())
                    .build();
        }
        
        // Check organizer employees table
        OrganizerEmployee employee = employeeRepository.findByEmail(email).orElse(null);
        if (employee != null) {
            // Convert OrganizerEmployee to User for recycle bin tracking
            return User.builder()
                    .id(employee.getEmployeeId())
                    .email(employee.getEmail())
                    .firstName(employee.getFirstName())
                    .lastName(employee.getLastName())
                    .build();
        }
        
        throw new RuntimeException("Authenticated user not found: " + email);
    }

    private OrganizerEmployeeDTO convertToDTO(OrganizerEmployee employee) {
        return OrganizerEmployeeDTO.builder()
                .employeeId(employee.getEmployeeId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .email(employee.getEmail())
                .password(employee.getPassword())
                .phoneNumber(employee.getPhoneNumber())
                .dateOfBirth(employee.getDateOfBirth())
                .profilePicture(employee.getProfilePicture())
                .role(employee.getRole().name())
                .active(employee.isActive())
                .emailVerified(employee.isEmailVerified())
                .lastLoginAt(employee.getLastLoginAt())
                .organizerId(employee.getOrganizer() != null ? employee.getOrganizer().getOrganizerId() : null)
                .organizerName(employee.getOrganizer() != null ? 
                        employee.getOrganizer().getFirstName() + " " + employee.getOrganizer().getLastName() : null)
                .organizationName(employee.getOrganizer() != null ? employee.getOrganizer().getOrganizationName() : null)
                .employeePosition(employee.getEmployeePosition())
                .department(employee.getDepartment())
                .hireDate(employee.getHireDate())
                .createdAt(employee.getCreatedAt())
                .updatedAt(employee.getUpdatedAt())
                .build();
    }
    
    @Transactional
    public OrganizerEmployeeDTO activateEmployee(UUID employeeId) {
        OrganizerEmployee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));
        
        employee.setActive(1);
        employee.setUpdatedAt(LocalDateTime.now());
        OrganizerEmployee updatedEmployee = employeeRepository.save(employee);
        
        return convertToDTO(updatedEmployee);
    }
    
    @Transactional
    public OrganizerEmployeeDTO deactivateEmployee(UUID employeeId) {
        OrganizerEmployee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));
        
        employee.setActive(0);
        employee.setUpdatedAt(LocalDateTime.now());
        OrganizerEmployee updatedEmployee = employeeRepository.save(employee);
        
        return convertToDTO(updatedEmployee);
    }
}
