package com.ticket.ticket_booking_system.config;

import java.time.LocalDate;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.ticket.ticket_booking_system.entity.Admin;
import com.ticket.ticket_booking_system.repository.AdminRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * This component will run on application startup and create an admin user
 * if one doesn't already exist in the database.
 */
@Component
@Slf4j
public class AdminSeeder implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    
    public AdminSeeder(AdminRepository adminRepository, PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        createDefaultAdmin();
        createDefaultSuperAdmin();
    }

    private void createDefaultAdmin() {
        String adminEmail = "admin@ticketbooking.com";
        
        // Check if admin already exists
        if (adminRepository.existsByEmail(adminEmail)) {
            log.info("Admin user already exists: {}", adminEmail);
            return;
        }

        // Create new admin user directly in admins table
        String encodedPassword = passwordEncoder.encode("1234");
        Admin admin = Admin.builder()
                .email(adminEmail)
                .password(encodedPassword) // Default password
                .firstName("System")
                .lastName("Administrator")
                .phoneNumber("+94771234567")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .role(Admin.Role.ADMIN)
                .emailVerified(true)
                .active(1)
                .accessLevel(Admin.AccessLevel.STANDARD)
                .canDeleteUsers(false)
                .canModifySystemSettings(false)
                .build();

        adminRepository.save(admin);
        
        log.info("Default admin user created successfully!");
        log.info("Email: {}", adminEmail);
        log.info("Password: admin1234");
        log.info("IMPORTANT: Please change this password immediately after first login!");
    }

    private void createDefaultSuperAdmin() {
        String superAdminEmail = "superadmin@ticketbooking.com";
        
        // Check if super admin already exists
        if (adminRepository.existsByEmail(superAdminEmail)) {
            log.info("Super admin user already exists: {}", superAdminEmail);
            return;
        }

        // Create new super admin user
        String encodedPassword = passwordEncoder.encode("superadmin1234");
        Admin superAdmin = Admin.builder()
                .email(superAdminEmail)
                .password(encodedPassword) // Default password
                .firstName("System")
                .lastName("Super Administrator")
                .phoneNumber("+94770000000")
                .dateOfBirth(LocalDate.of(1985, 1, 1))
                .role(Admin.Role.SUPER_ADMIN)
                .emailVerified(true)
                .active(1)
                .accessLevel(Admin.AccessLevel.SUPER)
                .canDeleteUsers(true)
                .canModifySystemSettings(true)
                .build();

        adminRepository.save(superAdmin);
        
        log.info("Default super admin user created successfully!");
        log.info("Email: {}", superAdminEmail);
        log.info("Password: superadmin1234");
        log.info("IMPORTANT: Please change this password immediately after first login!");
    }
}