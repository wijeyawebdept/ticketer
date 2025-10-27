package com.ticket.ticket_booking_system.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class PasswordEncoderUtil {
    public static void main(String[] args) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        
        // Encode the super admin password
        String rawPassword = "1131025760Lm#";
        String encodedPassword = passwordEncoder.encode(rawPassword);
        
        System.out.println("========================================");
        System.out.println("Password Encoder Utility");
        System.out.println("========================================");
        System.out.println("Raw Password: " + rawPassword);
        System.out.println("Encoded Password: " + encodedPassword);
        System.out.println("========================================");
        System.out.println("\nSQL Update Command:");
        System.out.println("UPDATE users SET password = '" + encodedPassword + "' WHERE email = 'superadmin@ticketbooking.com';");
        System.out.println("========================================");
        
        // Test verification
        boolean matches = passwordEncoder.matches(rawPassword, encodedPassword);
        System.out.println("\nVerification Test: " + (matches ? "✅ SUCCESS" : "❌ FAILED"));
    }
}
