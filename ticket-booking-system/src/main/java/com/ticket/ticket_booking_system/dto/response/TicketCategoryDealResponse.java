package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.TicketCategory;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketCategoryDealResponse {

    private UUID categoryId;
    private String categoryName;
    private String description;
    private BigDecimal originalPrice;

    /** For PERCENTAGE_DISCOUNT: price after discount. For BUY_X_GET_Y_FREE: same as originalPrice. */
    private BigDecimal discountedPrice;

    // Common deal metadata
    private String dealType;      // "PERCENTAGE_DISCOUNT" | "BUY_X_GET_Y_FREE"
    private String dealLabel;
    private boolean dealActive;
    private Integer capacity;
    private boolean isSharedArea;
    private Integer sharedAreaNumber;

    // PERCENTAGE_DISCOUNT specific
    private BigDecimal dealDiscountPercentage;

    // BUY_X_GET_Y_FREE specific
    private Integer dealBuyQuantity;
    private Integer dealFreeQuantity;

    // Event info
    private UUID eventId;
    private String eventName;
    private String eventImageUrl;
    private String eventStartDateTime;
    private String venueName;
    private BigDecimal eventMinPrice;
    private String eventSlug;

    public static TicketCategoryDealResponse fromEntity(TicketCategory tc) {
        String type = tc.getDealType() != null ? tc.getDealType() : "PERCENTAGE_DISCOUNT";

        BigDecimal discounted = tc.getPrice();
        if ("PERCENTAGE_DISCOUNT".equals(type)
                && Boolean.TRUE.equals(tc.getDealActive())
                && tc.getDealDiscountPercentage() != null) {
            BigDecimal factor = BigDecimal.ONE.subtract(
                tc.getDealDiscountPercentage().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
            );
            discounted = tc.getPrice().multiply(factor).setScale(2, RoundingMode.HALF_UP);
        }

        // Auto-generate label if not explicitly provided
        String label = tc.getDealLabel();
        if (label == null || label.isBlank()) {
            if ("BUY_X_GET_Y_FREE".equals(type) && tc.getDealBuyQuantity() != null && tc.getDealFreeQuantity() != null) {
                label = "Buy " + tc.getDealBuyQuantity() + " Get " + tc.getDealFreeQuantity() + " Free";
            } else if ("PERCENTAGE_DISCOUNT".equals(type) && tc.getDealDiscountPercentage() != null) {
                label = tc.getDealDiscountPercentage().stripTrailingZeros().toPlainString() + "% OFF";
            }
        }

        BigDecimal minPrice = tc.getPrice();
        if (tc.getEvent() != null && tc.getEvent().getTicketCategories() != null && !tc.getEvent().getTicketCategories().isEmpty()) {
            minPrice = tc.getEvent().getTicketCategories().stream()
                .map(TicketCategory::getPrice)
                .min(BigDecimal::compareTo)
                .orElse(tc.getPrice());
        }

        return TicketCategoryDealResponse.builder()
            .categoryId(tc.getCategoryId())
            .categoryName(tc.getCategoryName())
            .description(tc.getDescription())
            .originalPrice(tc.getPrice())
            .discountedPrice(discounted)
            .dealType(type)
            .dealDiscountPercentage(tc.getDealDiscountPercentage())
            .dealBuyQuantity(tc.getDealBuyQuantity())
            .dealFreeQuantity(tc.getDealFreeQuantity())
            .dealLabel(label)
            .dealActive(Boolean.TRUE.equals(tc.getDealActive()))
            .capacity(tc.getCapacity())
            .isSharedArea(Boolean.TRUE.equals(tc.getIsSharedArea()))
            .sharedAreaNumber(tc.getSharedAreaNumber())
            .eventId(tc.getEvent() != null ? tc.getEvent().getEventId() : null)
            .eventName(tc.getEvent() != null ? tc.getEvent().getName() : null)
            .eventImageUrl(tc.getEvent() != null ? tc.getEvent().getImageUrl() : null)
            .venueName(tc.getEvent() != null ? tc.getEvent().getVenueName() : null)
            .eventMinPrice(minPrice)
            .eventSlug(tc.getEvent() != null ? tc.getEvent().getSlug() : null)
            .build();
    }
}
