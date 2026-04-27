package com.ticket.ticket_booking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO returned by GET /api/venue-seats/layout/{venueId}/categories
 * Contains each distinct seat category in a venue with its seat count.
 * Used by the event creation wizard to auto-populate ticket categories.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VenueSeatCategoryDTO {

    /** The venue's seat category name (e.g. "Platinum", "Gold") */
    private String categoryName;

    /** Hex color code for this category (e.g. "#FFD700") */
    private String colorCode;

    /** Number of seats in this category for the venue */
    private int seatCount;
}
