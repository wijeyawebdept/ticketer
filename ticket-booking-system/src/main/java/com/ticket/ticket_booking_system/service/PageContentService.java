package com.ticket.ticket_booking_system.service;

import java.util.UUID;

import com.ticket.ticket_booking_system.dto.request.PageContentUpdateRequest;
import com.ticket.ticket_booking_system.dto.response.PageContentResponse;

public interface PageContentService {
    /**
     * Get page content by type
     */
    PageContentResponse getPageContent(String pageType);

    /**
     * Update page content by type
     */
    PageContentResponse updatePageContent(String pageType, PageContentUpdateRequest request, String updatedBy);

    /**
     * Get page content by ID - searches through all content tables
     */
    PageContentResponse getPageContentById(UUID contentId);
}
