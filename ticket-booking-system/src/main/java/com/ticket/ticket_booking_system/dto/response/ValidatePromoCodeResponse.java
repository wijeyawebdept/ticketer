package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidatePromoCodeResponse {

    private boolean valid;
    private String code;
    private String description;
    private BigDecimal discountPercentage;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
    private String message;
    private String scope;
    private String appliedTarget; // e.g. "Entire Event", "VIP Platinum", "Standing Area 1"
}
