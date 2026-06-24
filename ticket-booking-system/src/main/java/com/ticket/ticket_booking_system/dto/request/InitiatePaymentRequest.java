package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for initiating payment and creating MPGS session
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitiatePaymentRequest {

    @NotNull(message = "Event ID is required")
    private UUID eventId;

    @NotNull(message = "Schedule ID is required")
    private UUID scheduleId;

    // Seat IDs - optional if only booking shared area tickets
    // VenueSeat uses String seatId (format: SECTION-ROW-NUMBER, e.g., "L-A-01")
    private List<String> seatIds;

    // Shared area ticket requests
    private List<SharedAreaTicketRequest> sharedAreaTickets;

    @NotNull(message = "Total amount is required")
    private BigDecimal totalAmount;

    private BigDecimal discountAmount;

    private String discountInfo;

    @Builder.Default
    private String currency = "LKR";

    // Customer information for booking
    @NotNull(message = "Customer info is required")
    @Valid
    private CustomerInfo customerInfo;

    // ADD THESE (sent from frontend)
    @NotBlank(message = "Return URL is required")
    private String returnUrl;

    @NotBlank(message = "Cancel URL is required")
    private String cancelUrl;
    /**
     * Customer information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {
        @NotBlank(message = "First name is required")
        private String firstName;

        @NotBlank(message = "Last name is required")
        private String lastName;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Phone is required")
        private String phone;

        private String nic; // National Identity Card - optional
    }

    /**
     * Request for shared area tickets (reused from ConfirmBookingRequest)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SharedAreaTicketRequest {
        private UUID categoryId;
        private String categoryName;

        @NotNull(message = "Shared area number is required")
        private Integer sharedAreaNumber;

        @NotNull(message = "Ticket count is required")
        private Integer ticketCount;

        @NotNull(message = "Price per ticket is required")
        private BigDecimal pricePerTicket;

        @NotBlank(message = "Return URL is required")
        private String returnUrl;

        @NotBlank(message = "Cancel URL is required")
        private String cancelUrl;

    }
}
