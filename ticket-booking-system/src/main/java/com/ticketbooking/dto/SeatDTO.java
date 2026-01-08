package com.ticketbooking.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatDTO {
    private String seatId;
    private String section;
    private String rowLabel;
    private Integer seatNumber;
    private String category;
    private String colorCode;
    private BigDecimal xPosition;
    private BigDecimal yPosition;
    private Boolean isAisleSeat;
    private Boolean isAccessible;
    private String status; // AVAILABLE, BOOKED, TEMPORARY_HOLD, LOCKED, NOT_FOR_SALE
    private BigDecimal currentPrice;
}
