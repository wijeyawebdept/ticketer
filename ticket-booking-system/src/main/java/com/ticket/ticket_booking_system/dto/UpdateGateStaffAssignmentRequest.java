package com.ticket.ticket_booking_system.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGateStaffAssignmentRequest {

    private UUID staffUserId;
    private UUID scheduleId; // null = all showtimes
    private Boolean isAllSchedules;
    private String notes;
}
