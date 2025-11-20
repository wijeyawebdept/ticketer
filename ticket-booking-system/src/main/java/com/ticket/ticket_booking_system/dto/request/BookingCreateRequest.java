package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingCreateRequest {
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Event ID is required")
    private UUID eventId;
    
    /**
     * Optional: Specific schedule (date/time slot) for the booking
     * If not provided, assumes event has no schedules or uses default
     */
    private UUID scheduleId;
    
    @NotNull(message = "At least one seat is required")
    private List<UUID> seatIds;
    
    /**
     * Total amount calculated on frontend
     * Backend will validate this
     */
    @NotNull(message = "Total amount is required")
    private BigDecimal totalAmount;
    
    /**
     * Optional notes from customer
     */
    private String notes;
}
