package com.ticket.ticket_booking_system.config;

import java.time.LocalDateTime;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.Organizer;
import com.ticket.ticket_booking_system.entity.OrganizerEmployee;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.OrganizerEmployeeRepository;
import com.ticket.ticket_booking_system.repository.OrganizerRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;

@Component
public class LoginSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(LoginSuccessHandler.class);
    
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizerEmployeeRepository organizerEmployeeRepository;

    public LoginSuccessHandler(
            UserRepository userRepository,
            AdminRepository adminRepository,
            OrganizerRepository organizerRepository,
            OrganizerEmployeeRepository organizerEmployeeRepository) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.organizerRepository = organizerRepository;
        this.organizerEmployeeRepository = organizerEmployeeRepository;
    }

    /**
     * Updates the last login timestamp for a user after successful authentication.
     * 
     * @param email The user's email address
     * @return true if update was successful, false otherwise
     */
    public boolean updateLastLogin(String email) {
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found: " + email));
            
            int rowsUpdated = userRepository.updateLastLoginAt(user.getId(), LocalDateTime.now());
            
            if (rowsUpdated > 0) {
                logger.debug("Updated last_login_at for user: {} (ID: {})", email, user.getId());
                return true;
            } else {
                logger.warn("Failed to update last_login_at for user: {} (ID: {})", email, user.getId());
                return false;
            }
        } catch (Exception e) {
            logger.error("Error updating last_login_at for user: {}", email, e);
            return false;
        }
    }
    
    /**
     * Updates the last login timestamp for a user by UUID.
     * 
     * @param userId The user's UUID
     * @return true if update was successful, false otherwise
     */
    public boolean updateLastLoginById(UUID userId) {
        try {
            int rowsUpdated = userRepository.updateLastLoginAt(userId, LocalDateTime.now());
            
            if (rowsUpdated > 0) {
                logger.debug("Updated last_login_at for user ID: {}", userId);
                return true;
            } else {
                logger.warn("Failed to update last_login_at for user ID: {}", userId);
                return false;
            }
        } catch (Exception e) {
            logger.error("Error updating last_login_at for user ID: {}", userId, e);
            return false;
        }
    }
    
    /**
     * Updates the last login timestamp for an Admin after successful authentication.
     * 
     * @param email The admin's email address
     * @return true if update was successful, false otherwise
     */
    public boolean updateAdminLastLogin(String email) {
        try {
            Admin admin = adminRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Admin not found: " + email));
            
            int rowsUpdated = adminRepository.updateLastLoginAt(admin.getAdminId(), LocalDateTime.now());
            
            if (rowsUpdated > 0) {
                logger.debug("Updated last_login_at for admin: {} (ID: {})", email, admin.getAdminId());
                return true;
            } else {
                logger.warn("Failed to update last_login_at for admin: {} (ID: {})", email, admin.getAdminId());
                return false;
            }
        } catch (Exception e) {
            logger.error("Error updating last_login_at for admin: {}", email, e);
            return false;
        }
    }
    
    /**
     * Updates the last login timestamp for an Organizer after successful authentication.
     * 
     * @param email The organizer's email address
     * @return true if update was successful, false otherwise
     */
    public boolean updateOrganizerLastLogin(String email) {
        try {
            Organizer organizer = organizerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Organizer not found: " + email));
            
            int rowsUpdated = organizerRepository.updateLastLoginAt(organizer.getOrganizerId(), LocalDateTime.now());
            
            if (rowsUpdated > 0) {
                logger.debug("Updated last_login_at for organizer: {} (ID: {})", email, organizer.getOrganizerId());
                return true;
            } else {
                logger.warn("Failed to update last_login_at for organizer: {} (ID: {})", email, organizer.getOrganizerId());
                return false;
            }
        } catch (Exception e) {
            logger.error("Error updating last_login_at for organizer: {}", email, e);
            return false;
        }
    }
    
    /**
     * Updates the last login timestamp for an OrganizerEmployee after successful authentication.
     * 
     * @param email The organizer employee's email address
     * @return true if update was successful, false otherwise
     */
    public boolean updateOrganizerEmployeeLastLogin(String email) {
        try {
            OrganizerEmployee employee = organizerEmployeeRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Organizer employee not found: " + email));
            
            int rowsUpdated = organizerEmployeeRepository.updateLastLoginAt(employee.getEmployeeId(), LocalDateTime.now());
            
            if (rowsUpdated > 0) {
                logger.debug("Updated last_login_at for organizer employee: {} (ID: {})", email, employee.getEmployeeId());
                return true;
            } else {
                logger.warn("Failed to update last_login_at for organizer employee: {} (ID: {})", email, employee.getEmployeeId());
                return false;
            }
        } catch (Exception e) {
            logger.error("Error updating last_login_at for organizer employee: {}", email, e);
            return false;
        }
    }
}
