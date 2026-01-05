package com.ticket.ticket_booking_system.dto.response;

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
public class EventCategoryResponse {
    private UUID id;
    private String categoryName;
    private String description;
    private int active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
