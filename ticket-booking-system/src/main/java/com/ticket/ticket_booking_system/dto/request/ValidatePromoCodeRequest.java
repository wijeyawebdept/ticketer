package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidatePromoCodeRequest {

    @NotBlank(message = "Promo code is required")
    private String code;

    @NotNull(message = "Event ID is required")
    private UUID eventId;

    private List<SelectedSeatItem> seats;

    private List<SelectedSharedAreaItem> sharedAreas;

    @NotNull(message = "Subtotal is required")
    private BigDecimal subTotal;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SelectedSeatItem {
        private String seatId;
        private UUID categoryId;
        private String categoryName;
        private String venueSeatCategoryName;
        private BigDecimal price;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SelectedSharedAreaItem {
        private UUID categoryId;
        private String categoryName;
        private Integer sharedAreaNumber;
        private Integer ticketCount;
        private BigDecimal pricePerTicket;
    }
}
