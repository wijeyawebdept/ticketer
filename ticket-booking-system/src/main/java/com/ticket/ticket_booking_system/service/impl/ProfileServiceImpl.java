package com.ticket.ticket_booking_system.service.impl;

import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.ProfileDTO;
import com.ticket.ticket_booking_system.dto.ProfileUpdateDTO;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.exception.ResourceNotFoundException;
import com.ticket.ticket_booking_system.repository.UserRepository;
import com.ticket.ticket_booking_system.service.FileUploadService;
import com.ticket.ticket_booking_system.service.ProfileService;

@Service
public class ProfileServiceImpl implements ProfileService {
    
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;
    
    public ProfileServiceImpl(UserRepository userRepository, FileUploadService fileUploadService) {
        this.userRepository = userRepository;
        this.fileUploadService = fileUploadService;
    }
    
    @Override
    public ProfileDTO getProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        
        return convertToProfileDTO(user);
    }
    
    @Override
    public ProfileDTO updateProfile(String email, ProfileUpdateDTO profileUpdateDTO) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        
        // Update user fields
        user.setFirstName(profileUpdateDTO.getFirstName());
        user.setLastName(profileUpdateDTO.getLastName());
        user.setEmail(profileUpdateDTO.getEmail());
        user.setPhoneNumber(profileUpdateDTO.getPhoneNumber());
        user.setDateOfBirth(profileUpdateDTO.getDateOfBirth());
        
        if (profileUpdateDTO.getProfilePicture() != null) {
            user.setProfilePicture(profileUpdateDTO.getProfilePicture());
        }
        
        User updatedUser = userRepository.save(user);
        return convertToProfileDTO(updatedUser);
    }
    
    @Override
    public String uploadProfilePicture(String email, MultipartFile file) throws IOException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        
        // Delete old profile picture if exists
        if (user.getProfilePicture() != null && !user.getProfilePicture().isEmpty()) {
            fileUploadService.deleteProfilePicture(user.getProfilePicture());
        }
        
        // Upload new profile picture
        String profilePicturePath = fileUploadService.uploadProfilePicture(file);
        
        // Update user profile picture path
        user.setProfilePicture(profilePicturePath);
        userRepository.save(user);
        
        return profilePicturePath;
    }
    
    private ProfileDTO convertToProfileDTO(User user) {
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
}