package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for payment verification result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentVerificationResponse {

    /**
     * Whether payment was successful
     */
    private boolean success;

    /**
     * Payment status (SUCCESS, FAILED, PENDING, CANCELLED)
     */
    private String status;

    /**
     * Transaction ID
     */
    private String transactionId;

    /**
     * Booking ID
     */
    private UUID bookingId;

    /**
     * Booking reference code
     */
    private String bookingReference;

    /**
     * User-friendly message
     */
    private String message;

    /**
     * Payment amount
     */
    private BigDecimal amount;

    /**
     * Payment method used
     */
    private String paymentMethod;

    // ── Receipt / download fields ──────────────────────────────────────────────

    private String eventName;
    private String eventDate;
    private String eventTime;
    private String venueName;
    private Integer ticketCount;
    /** Newline-separated seat/ticket details */
    private String seatDetails;
    private String paymentDate;
}
