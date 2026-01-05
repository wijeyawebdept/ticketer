package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.ticket.ticket_booking_system.dto.request.BulkEventCategoryOperationRequest;
import com.ticket.ticket_booking_system.dto.request.EventCategoryRequest;
import com.ticket.ticket_booking_system.dto.response.EventCategoryResponse;

public interface EventCategoryService {
    EventCategoryResponse createCategory(EventCategoryRequest request);
    EventCategoryResponse updateCategory(UUID id, EventCategoryRequest request);
    EventCategoryResponse getCategoryById(UUID id);
    List<EventCategoryResponse> getAllCategories();
    List<EventCategoryResponse> getActiveCategories();
    void deleteCategory(UUID id);
    void softDeleteCategory(UUID id);
    void restoreCategory(UUID id);
    Map<String, Object> bulkOperation(BulkEventCategoryOperationRequest request);
    EventCategoryResponse activateCategory(UUID id);
    EventCategoryResponse deactivateCategory(UUID id);
}
