package com.ticket.ticket_booking_system.service.impl;

import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.ProfileDTO;
import com.ticket.ticket_booking_system.dto.ProfileUpdateDTO;
import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.FileUploadService;
import com.ticket.ticket_booking_system.service.ProfileService;

@Service
public class ProfileServiceImpl implements ProfileService {
    
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final FileUploadService fileUploadService;
    
    public ProfileServiceImpl(UserRepository userRepository, AdminRepository adminRepository,
                             OrganizerRepository organizerRepository, FileUploadService fileUploadService) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.fileUploadService = fileUploadService;
    }
    
    @Override
    public ProfileDTO getProfileByEmail(String email) {
        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            return convertUserToProfileDTO(user);
        }
        
        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            return convertAdminToProfileDTO(admin);
        }
        
        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            return convertOrganizerToProfileDTO(organizer);
        }
        
        throw new ResourceNotFoundException("User", "email", email);
    }
    
    @Override
    public ProfileDTO updateProfile(String email, ProfileUpdateDTO profileUpdateDTO) {
        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            user.setFirstName(profileUpdateDTO.getFirstName());
            user.setLastName(profileUpdateDTO.getLastName());
            user.setEmail(profileUpdateDTO.getEmail());
            user.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
            user.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
            if (profileUpdateDTO.getProfilePicture() != null) {
                user.setProfilePicture(profileUpdateDTO.getProfilePicture());
            }
            User updatedUser = userRepository.save(user);
            return convertUserToProfileDTO(updatedUser);
        }
        
        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            admin.setFirstName(profileUpdateDTO.getFirstName());
            admin.setLastName(profileUpdateDTO.getLastName());
            admin.setEmail(profileUpdateDTO.getEmail());
            admin.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
            admin.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
            if (profileUpdateDTO.getProfilePicture() != null) {
                admin.setProfilePicture(profileUpdateDTO.getProfilePicture());
            }
            Admin updatedAdmin = adminRepository.save(admin);
            return convertAdminToProfileDTO(updatedAdmin);
        }
        
        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            organizer.setFirstName(profileUpdateDTO.getFirstName());
            organizer.setLastName(profileUpdateDTO.getLastName());
            organizer.setEmail(profileUpdateDTO.getEmail());
            organizer.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
            organizer.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
            if (profileUpdateDTO.getProfilePicture() != null) {
                organizer.setProfilePicture(profileUpdateDTO.getProfilePicture());
            }
            Organizer updatedOrganizer = organizerRepository.save(organizer);
            return convertOrganizerToProfileDTO(updatedOrganizer);
        }
        
        throw new ResourceNotFoundException("User", "email", email);
    }
    
    @Override
    public String uploadProfilePicture(String email, MultipartFile file) throws IOException {
        // Check users table first
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            if (user.getProfilePicture() != null && !user.getProfilePicture().isEmpty()) {
                fileUploadService.deleteProfilePicture(user.getProfilePicture());
            }
            String profilePicturePath = fileUploadService.uploadProfilePicture(file);
            user.setProfilePicture(profilePicturePath);
            userRepository.save(user);
            return profilePicturePath;
        }
        
        // Check admins table
        Admin admin = adminRepository.findByEmail(email).orElse(null);
        if (admin != null) {
            if (admin.getProfilePicture() != null && !admin.getProfilePicture().isEmpty()) {
                fileUploadService.deleteProfilePicture(admin.getProfilePicture());
            }
            String profilePicturePath = fileUploadService.uploadProfilePicture(file);
            admin.setProfilePicture(profilePicturePath);
            adminRepository.save(admin);
            return profilePicturePath;
        }
        
        // Check organizers table
        Organizer organizer = organizerRepository.findByEmail(email).orElse(null);
        if (organizer != null) {
            if (organizer.getProfilePicture() != null && !organizer.getProfilePicture().isEmpty()) {
                fileUploadService.deleteProfilePicture(organizer.getProfilePicture());
            }
            String profilePicturePath = fileUploadService.uploadProfilePicture(file);
            organizer.setProfilePicture(profilePicturePath);
            organizerRepository.save(organizer);
            return profilePicturePath;
        }
        
        throw new ResourceNotFoundException("User", "email", email);
    }
    
    private ProfileDTO convertUserToProfileDTO(User user) {
        return ProfileDTO.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .profilePicture(user.getProfilePicture())
                .role(user.getRole().name())
                .active(user.isActive())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
    
    private ProfileDTO convertAdminToProfileDTO(Admin admin) {
        return ProfileDTO.builder()
                .userId(admin.getAdminId())
                .firstName(admin.getFirstName())
                .lastName(admin.getLastName())
                .email(admin.getEmail())
                .phoneNumber(admin.getPhoneNumber())
                .dateOfBirth(admin.getDateOfBirth())
                .profilePicture(admin.getProfilePicture())
                .role(admin.getRole().name())
                .active(admin.isActive())
                .emailVerified(admin.isEmailVerified())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .updatedAt(admin.getUpdatedAt())
                .build();
    }
    
    private ProfileDTO convertOrganizerToProfileDTO(Organizer organizer) {
        return ProfileDTO.builder()
                .userId(organizer.getOrganizerId())
                .firstName(organizer.getFirstName())
                .lastName(organizer.getLastName())
                .email(organizer.getEmail())
                .phoneNumber(organizer.getPhoneNumber())
                .dateOfBirth(organizer.getDateOfBirth())
                .profilePicture(organizer.getProfilePicture())
                .role(organizer.getRole().name())
                .active(organizer.isActive())
                .emailVerified(organizer.isEmailVerified())
                .createdAt(organizer.getCreatedAt())
                .lastLoginAt(organizer.getLastLoginAt())
                .updatedAt(organizer.getUpdatedAt())
                .build();
    }
}