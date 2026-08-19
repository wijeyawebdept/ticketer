package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

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
    
    @NotNull(message = "Schedule ID is required")
    private UUID scheduleId;
    
    // Seat IDs - optional if only booking shared area tickets
    private List<UUID> seatIds;
    
    // Shared area ticket requests
    private List<SharedAreaTicketRequest> sharedAreaTickets;
    
    @NotNull(message = "Payment ID is required")
    private String paymentId; // Stripe/Payment Gateway transaction ID
    
    private String paymentMethod; // e.g., "STRIPE", "PAYPAL"
    
    @NotNull(message = "Total amount is required")
    private BigDecimal totalAmount;

    private BigDecimal discountAmount;

    private String discountInfo;

    private String promoCode;

    private BigDecimal promoDiscountAmount;
    
    /**
     * Request for shared area tickets
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SharedAreaTicketRequest {
        @NotNull(message = "Category ID is required")
        private UUID categoryId;
        
        private String categoryName;
        
        @NotNull(message = "Shared area number is required")
        private Integer sharedAreaNumber;
        
        @NotNull(message = "Ticket count is required")
        private Integer ticketCount;
        
        @NotNull(message = "Price per ticket is required")
        private BigDecimal pricePerTicket;
    }
}
