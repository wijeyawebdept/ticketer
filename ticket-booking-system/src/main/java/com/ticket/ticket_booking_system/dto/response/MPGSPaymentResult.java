package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Internal DTO wrapping MPGS API payment result
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MPGSPaymentResult {

    /**
     * Whether the payment was successful
     */
    private boolean success;

    /**
     * MPGS result indicator (e.g., "SUCCESS", "FAILURE")
     */
    private String resultIndicator;

    /**
     * MPGS session version
     */
    private String sessionVersion;

    /**
     * Order ID from MPGS
     */
    private String orderId;

    /**
     * Transaction ID from MPGS
     */
    private String transactionId;

    /**
     * Payment amount
     */
    private BigDecimal amount;

    /**
     * Currency
     */
    private String currency;

    /**
     * Gateway code (e.g., "APPROVED", "DECLINED")
     */
    private String gatewayCode;

    /**
     * Error message if payment failed
     */
    private String errorMessage;

    /**
     * Raw JSON response from MPGS for auditing
     */
    private String rawResponse;

    /**
     * Card type used (e.g., "VISA", "MASTERCARD")
     */
    private String cardType;

    /**
     * Last 4 digits of card number
     */
    private String cardLast4;
}
