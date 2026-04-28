package com.ticket.ticket_booking_system.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryCreateRequest {
    private String title;
    private String description;
    private String category;
    private Integer displayOrder;
}
