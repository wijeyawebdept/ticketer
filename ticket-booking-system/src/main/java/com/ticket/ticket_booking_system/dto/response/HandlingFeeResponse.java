package com.ticket.ticket_booking_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HandlingFeeResponse {
    private BigDecimal handlingFee;
    private Boolean isEnabled;
    private String description;
    private LocalDateTime updatedAt;
    private String updatedBy;
}
