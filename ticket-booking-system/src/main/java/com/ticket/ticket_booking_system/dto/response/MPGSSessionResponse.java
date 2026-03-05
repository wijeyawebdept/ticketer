package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO containing MPGS session details for frontend payment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MPGSSessionResponse {

    /**
     * MPGS session ID - used by frontend to initialize payment
     */
    private String sessionId;

    /**
     * Merchant ID for MPGS configuration
     */
    private String merchantId;

    /**
     * Full URL to MPGS checkout.js script
     */
    private String checkoutScriptUrl;

    /**
     * Payment amount
     */
    private BigDecimal amount;

    /**
     * Currency code (e.g., "LKR", "USD")
     */
    private String currency;

    /**
     * Booking ID created in pending state
     */
    private UUID bookingId;

    /**
     * Success redirect URL
     */
    private String successUrl;

    /**
     * Cancel redirect URL
     */
    private String cancelUrl;

    /**
     * Error redirect URL
     */
    private String errorUrl;

    /**
     * Order reference for the payment (used in Checkout.configure)
     */
    private String orderReference;

    /**
     * MPGS successIndicator returned during session creation.
     * Must be compared against resultIndicator returned in the redirect URL to verify payment.
     */
    private String successIndicator;
}
