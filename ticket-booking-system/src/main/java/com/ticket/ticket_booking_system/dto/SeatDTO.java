package com.ticket.ticket_booking_system.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
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
    private BigDecimal earlyBirdPrice;
    private String notes;
    
    // Hold/Booking information for admin real-time view
    private java.util.UUID heldByUserId;
    private String heldByUserName;
    private String heldByUserEmail;
    private LocalDateTime holdExpiresAt;
    private LocalDateTime holdCreatedAt;
    private Boolean isPermanentHold;
    
    // Booking & Check-In information
    private String bookingReference;
    private LocalDateTime bookedAt;
    private String ticketCode;
    private Boolean checkedIn;
    private LocalDateTime checkedInAt;
    private Boolean isSharedAreaTicket;
    private Integer sharedAreaNumber;
    
    // Deal properties for checkout calculation
    private Boolean dealActive;
    private String dealType;
    private BigDecimal dealDiscountPercentage;
    private Integer dealBuyQuantity;
    private Integer dealFreeQuantity;
    private String dealLabel;
}
