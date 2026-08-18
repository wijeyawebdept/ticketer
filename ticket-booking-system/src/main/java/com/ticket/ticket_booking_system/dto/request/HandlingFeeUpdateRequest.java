package com.ticket.ticket_booking_system.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HandlingFeeUpdateRequest {
    @NotNull(message = "Handling fee amount is required")
    @DecimalMin(value = "0.0", message = "Handling fee must not be negative")
    private BigDecimal handlingFee;

    private Boolean isEnabled;
    private String description;
}
