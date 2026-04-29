package com.ticket.ticket_booking_system.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileDTO {

    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String profilePicture;
    private String role;
    private boolean active;
    private boolean emailVerified;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private LocalDateTime updatedAt;
    private boolean loginEmailEnabled;
    private boolean emailNotificationsEnabled;
    private boolean smsNotificationsEnabled;
    private boolean marketingEmailsEnabled;

    // Organizer-specific fields
    private String organizationName;
    private String businessRegistrationNumber;
    private String taxId;
    private String businessAddress;
    private String businessPhone;

    // Banking / payout details
    private String bankName;
    private String bankAccountNumber;
    private String bankRoutingNumber;
}