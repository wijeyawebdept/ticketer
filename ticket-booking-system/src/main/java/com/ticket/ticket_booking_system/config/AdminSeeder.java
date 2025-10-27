package com.ticket.ticket_booking_system.config;

import java.time.LocalDate;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.entity.User;
import com.ticket.ticket_booking_system.repository.AdminRepository;
import com.ticket.ticket_booking_system.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * This component will run on application startup and create an admin user
 * if one doesn't already exist in the database.
 */
@Component
@Slf4j
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    
    public AdminSeeder(UserRepository userRepository, AdminRepository adminRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        createDefaultAdmin();
    }

    private void createDefaultAdmin() {
        String adminEmail = "admin@ticketbooking.com";
        
        // Check if admin already exists
        if (userRepository.existsByEmail(adminEmail)) {
            log.info("Admin user already exists: {}", adminEmail);
            return;
        }

        // Create new admin user
        String encodedPassword = passwordEncoder.encode("1234");
        User admin = User.builder()
                .email(adminEmail)
                .password(encodedPassword) // Default password
                .firstName("System")
                .lastName("Administrator")
                .phoneNumber("+94771234567")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .role(User.Role.ADMIN)
                .emailVerified(true)
                .active(true)
                .build();

        User savedAdmin = userRepository.save(admin);
        
        // Create Admin record
        Admin adminRecord = Admin.builder()
                .user(savedAdmin)
                .accessLevel(Admin.AccessLevel.STANDARD)
                .canDeleteUsers(false)
                .canModifySystemSettings(false)
                .position("Administrator")
                .department("Administration")
                .build();
        
        adminRepository.save(adminRecord);
        
        log.info("Default admin user created successfully!");
        log.info("Email: {}", adminEmail);
        log.info("Password: 1234");
        log.info("IMPORTANT: Please change this password immediately after first login!");
    }
}