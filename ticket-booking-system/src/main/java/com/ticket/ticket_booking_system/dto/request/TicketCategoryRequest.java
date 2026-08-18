package com.ticket.ticket_booking_system.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class TicketCategoryRequest {

    @NotBlank(message = "Category name is required")
    private String categoryName;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be greater than zero")
    private BigDecimal price;

    @NotNull(message = "Capacity is required")
    @Positive(message = "Capacity must be greater than zero")
    private Integer capacity;

    private String description;
    
    // Shared area support
    private Boolean isSharedArea = false;
    private Integer sharedAreaNumber;

    /** The venue's SeatCategory name this ticket covers (e.g. "Platinum"). Used for seat price mapping. */
    private String venueSeatCategoryName;

    // Sales timeline support (e.g. for Early Bird tickets)
    private LocalDateTime salesStartDate;
    private LocalDateTime salesEndDate;
    private BigDecimal earlyBirdPrice;
    private Integer earlyBirdCapacity;
}