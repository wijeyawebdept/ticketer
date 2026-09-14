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
public class AssignGateStaffRequest {

    @NotNull(message = "Event ID is required")
    private UUID eventId;

    /**
     * List of Schedule IDs to assign.
     * If empty or null, staff is assigned to ALL schedules for the event.
     */
    private List<UUID> scheduleIds;

    @NotEmpty(message = "At least one gate staff user ID is required")
    private List<UUID> staffUserIds;

    private String notes;
}
