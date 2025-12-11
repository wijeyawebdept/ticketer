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
public class OrganizerEmployeeDTO {
    private UUID employeeId;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String profilePicture;
    private String role;
    private int active; // 1 = active, 0 = deactivated, -1 = soft deleted
    private boolean emailVerified;
    private LocalDateTime lastLoginAt;
    
    // Employee-specific fields
    private UUID organizerId;
    private String organizerName;
    private String organizationName;
    private String employeePosition;
    private String department;
    private LocalDate hireDate;
    
    // Audit fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
