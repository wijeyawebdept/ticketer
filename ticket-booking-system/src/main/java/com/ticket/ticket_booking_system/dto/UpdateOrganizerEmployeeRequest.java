package com.ticket.ticket_booking_system.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrganizerEmployeeRequest {
    private String firstName;
    private String lastName;
    
    @Email(message = "Invalid email format")
    private String email;
    
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private UUID organizerId;
    private String employeePosition;
    private String department;
    private LocalDate hireDate;
    private Boolean active;
}
