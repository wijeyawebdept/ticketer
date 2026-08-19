package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.PromoCode.PromoCodeScope;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoCodeResponse {

    private UUID id;
    private String code;
    private String description;
    private BigDecimal discountPercentage;
    private BigDecimal maxDiscountAmount;
    private PromoCodeScope scope;

    private UUID eventId;
    private String eventName;

    private UUID ticketCategoryId;
    private String ticketCategoryName;

    private UUID organizerId;
    private String organizerName;

    private String createdByRole;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer usageLimit;
    private Integer usageCount;
    private BigDecimal minOrderAmount;
    private Boolean isActive;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
