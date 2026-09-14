package com.ticket.ticket_booking_system.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GateStaffAssignmentDTO {
    private UUID assignmentId;
    
    // Gate Staff info
    private UUID staffUserId;
    private String staffName;
    private String staffEmail;
    private String staffPhone;

    // Event info
    private UUID eventId;
    private String eventTitle;
    private String venueName;

    // Schedule info (if specific schedule)
    private UUID scheduleId;
    private LocalDate scheduleDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean isAllSchedules;

    // Assignment metadata
    private UUID assignedById;
    private String assignedByName;
    private LocalDateTime assignedAt;
    private String notes;
    private Boolean isActive;
}
