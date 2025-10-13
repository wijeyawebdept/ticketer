package com.ticket.ticket_booking_system.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketCategoryResponse {

    private UUID id;

    private String categoryName;

    private BigDecimal price;

    private Integer capacity;

    private String description;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}