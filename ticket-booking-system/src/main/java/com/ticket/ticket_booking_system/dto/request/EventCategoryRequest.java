package com.ticket.ticket_booking_system.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventCategoryRequest {
    private String categoryName;
    private String description;
}
