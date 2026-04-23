package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

import lombok.Data;

@Data
public class TicketDealRequest {

    /** The ticket category to apply/remove the deal on */
    private UUID categoryId;

    /** Whether the deal should be active */
    private boolean dealActive;

    /**
     * Deal type: "PERCENTAGE_DISCOUNT" or "BUY_X_GET_Y_FREE"
     * Defaults to PERCENTAGE_DISCOUNT if not supplied.
     */
    private String dealType;

    // ── PERCENTAGE_DISCOUNT ─────────────────────────────────
    /** Discount percentage (0-100). Required when dealType = PERCENTAGE_DISCOUNT. */
    private BigDecimal dealDiscountPercentage;

    // ── BUY_X_GET_Y_FREE ────────────────────────────────────
    /** Buy X tickets. Required when dealType = BUY_X_GET_Y_FREE. */
    private Integer dealBuyQuantity;

    /** Get Y tickets free. Required when dealType = BUY_X_GET_Y_FREE. */
    private Integer dealFreeQuantity;

    /** Human-readable label shown as a badge (optional — auto-generated if not provided). */
    private String dealLabel;
}
