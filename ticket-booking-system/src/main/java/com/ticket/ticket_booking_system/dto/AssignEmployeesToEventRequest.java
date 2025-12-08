package com.ticket.ticket_booking_system.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignEmployeesToEventRequest {
    
    @NotNull(message = "Event ID is required")
    private UUID eventId;
    
    @NotEmpty(message = "At least one employee must be assigned")
    private List<EmployeeAssignment> employees;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeAssignment {
        @NotNull(message = "Employee ID is required")
        private UUID employeeId;
        
        private String roleDescription;
        private String notes;
    }
}
