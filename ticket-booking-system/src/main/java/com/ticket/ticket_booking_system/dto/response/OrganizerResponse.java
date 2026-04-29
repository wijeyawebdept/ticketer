package com.ticket.ticket_booking_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerResponse {
    
    // Identity
    private UUID organizerId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private LocalDate dateOfBirth;

    // Status
    private boolean active;
    private boolean emailVerified;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private LocalDateTime updatedAt;

    // Business info
    private String organizationName;
    private String businessRegistrationNumber;
    private String taxId;
    private String businessAddress;
    private String businessPhone;

    // Banking / payout
    private String bankName;
    private String bankAccountNumber;
    private String bankRoutingNumber;
}
