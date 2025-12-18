package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatResponse {
    
    private UUID seatId;
    private UUID venueId;
    private String venueName;
    private UUID eventId;
    private String eventName;
    private String section;
    private String rowNumber;
    private String seatNumber;
    private Integer xPosition;
    private Integer yPosition;
    private String seatType;
    private BigDecimal price;
    private Boolean isAvailable;
    private Boolean isBlocked;
    private Boolean isPermanentHold;
    private LocalDateTime holdExpiresAt;
    private UUID heldByUser;
    private LocalDateTime createdAt;
}
