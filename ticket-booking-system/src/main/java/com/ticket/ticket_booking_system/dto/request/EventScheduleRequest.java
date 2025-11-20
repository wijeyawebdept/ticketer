package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventScheduleRequest {

    @NotNull(message = "Schedule date is required")
    @FutureOrPresent(message = "Schedule date must be today or in the future")
    private LocalDate scheduleDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    @Max(value = 100000, message = "Capacity cannot exceed 100,000")
    private Integer capacity;

    @DecimalMin(value = "-1000000.00", message = "Price adjustment cannot be less than -1,000,000")
    @DecimalMax(value = "1000000.00", message = "Price adjustment cannot exceed 1,000,000")
    private BigDecimal priceAdjustment;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;
}
