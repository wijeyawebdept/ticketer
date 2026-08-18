package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketCategoryResponse {

    private UUID id;

    private String categoryName;

    private BigDecimal price;

    private Integer capacity;

    private String description;
    
    // Shared area support
    private Boolean isSharedArea;
    private Integer sharedAreaNumber;
    
    // Explicit mapping to venue seat zone
    private String venueSeatCategoryName;

    // Deal fields
    private Boolean dealActive;
    private String dealType;                  // "PERCENTAGE_DISCOUNT" | "BUY_X_GET_Y_FREE"
    private BigDecimal dealDiscountPercentage;
    private Integer dealBuyQuantity;
    private Integer dealFreeQuantity;
    private String dealLabel;

    /** Computed: price * (1 - dealDiscountPercentage/100). Equals price when no deal is active. */
    public BigDecimal getDiscountedPrice() {
        if (Boolean.TRUE.equals(dealActive) && dealDiscountPercentage != null && price != null) {
            BigDecimal factor = BigDecimal.ONE.subtract(
                dealDiscountPercentage.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
            );
            return price.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        }
        return price;
    }

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Sales timeline support (e.g. for Early Bird tickets)
    private LocalDateTime salesStartDate;
    private LocalDateTime salesEndDate;
    private BigDecimal earlyBirdPrice;
    private Integer earlyBirdCapacity;
}