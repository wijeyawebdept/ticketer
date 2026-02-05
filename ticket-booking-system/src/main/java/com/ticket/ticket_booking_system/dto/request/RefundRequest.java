package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for initiating a refund
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequest {

    @NotNull(message = "Booking ID is required")
    private UUID bookingId;

    /**
     * Refund amount - if null, full amount will be refunded
     */
    private BigDecimal amount;

    @NotBlank(message = "Refund reason is required")
    private String reason;

    /**
     * Optional notes for internal tracking
     */
    private String notes;
}
