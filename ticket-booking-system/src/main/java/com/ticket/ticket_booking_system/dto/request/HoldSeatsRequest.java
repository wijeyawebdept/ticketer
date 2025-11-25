package com.ticket.ticket_booking_system.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for holding/locking seats temporarily
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HoldSeatsRequest {
    
    @NotNull(message = "Event ID is required")
    private UUID eventId;
    
    @NotEmpty(message = "At least one seat must be selected")
    private List<UUID> seatIds;
    
    @Builder.Default
    private Integer holdDurationMinutes = 5; // Default 5 minutes hold
}
