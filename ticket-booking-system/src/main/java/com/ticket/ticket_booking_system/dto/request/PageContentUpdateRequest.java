package com.ticket.ticket_booking_system.dto.request;

import com.ticket.ticket_booking_system.entity.PageType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageContentUpdateRequest {
    private PageType pageType;
    private String title;
    private String content;
}
