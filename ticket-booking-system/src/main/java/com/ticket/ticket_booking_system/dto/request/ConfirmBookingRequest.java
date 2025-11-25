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
 * Request DTO for confirming seat booking after payment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmBookingRequest {
    
    @NotNull(message = "Event ID is required")
    private UUID eventId;
    
    @NotEmpty(message = "At least one seat must be selected")
    private List<UUID> seatIds;
    
    @NotNull(message = "Payment ID is required")
    private String paymentId; // Stripe/Payment Gateway transaction ID
    
    private String paymentMethod; // e.g., "STRIPE", "PAYPAL"
}
