package com.ticket.ticket_booking_system.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

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
    private String categoryName;
    private String colorCode;
    
    @JsonProperty("xPosition")
    private BigDecimal xPosition;
    
    @JsonProperty("yPosition")
    private BigDecimal yPosition;
    
    private Boolean isAisleSeat;
    private Boolean isAccessible;
    private String status;
    private BigDecimal currentPrice;
}
