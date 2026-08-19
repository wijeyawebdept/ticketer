package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.PromoCode.PromoCodeScope;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class PromoCodeRequest {

    @NotBlank(message = "Promo code is required")
    private String code;

    private String description;

    @NotNull(message = "Discount percentage is required")
    @DecimalMin(value = "0.01", message = "Discount percentage must be greater than 0")
    @DecimalMax(value = "100.00", message = "Discount percentage cannot exceed 100")
    private BigDecimal discountPercentage;

    private BigDecimal maxDiscountAmount;

    @NotNull(message = "Scope is required")
    private PromoCodeScope scope; // ALL_EVENTS, EVENT, TICKET_CATEGORY

    private UUID eventId; // Required if scope is EVENT or TICKET_CATEGORY

    private UUID ticketCategoryId; // Required if scope is TICKET_CATEGORY

    private String ticketCategoryName;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Integer usageLimit;

    private BigDecimal minOrderAmount;

    @Builder.Default
    private Boolean isActive = true;
}
