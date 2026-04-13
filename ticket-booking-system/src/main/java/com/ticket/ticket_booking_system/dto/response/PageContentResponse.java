package com.ticket.ticket_booking_system.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.ticket.ticket_booking_system.entity.PageType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageContentResponse {
    private UUID contentId;
    private PageType pageType;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String updatedBy;
}
