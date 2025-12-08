package com.ticket.ticket_booking_system.dto;

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
public class EventEmployeeAssignmentDTO {
    private UUID assignmentId;
    private UUID eventId;
    private String eventName;
    private UUID employeeId;
    private String employeeName;
    private String employeeEmail;
    private UUID assignedByOrganizerId;
    private String assignedByOrganizerName;
    private LocalDateTime assignedAt;
    private String roleDescription;
    private String notes;
    private Boolean isActive;
}
