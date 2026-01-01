package com.ticket.ticket_booking_system.service;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import com.ticket.ticket_booking_system.dto.ProfileDTO;
import com.ticket.ticket_booking_system.dto.ProfileUpdateDTO;

public interface ProfileService {
    
    ProfileDTO getProfileByEmail(String email);
    
    ProfileDTO updateProfile(String email, ProfileUpdateDTO profileUpdateDTO);
    
    String uploadProfilePicture(String email, MultipartFile file) throws IOException;
    
    void changePassword(String email, String currentPassword, String newPassword);
    
    void changeEmail(String currentEmail, String newEmail, String password);
}